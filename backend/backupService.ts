/**
 * Backup: Excel per shop (multi-tenant), full DB SQL to GCS, auto cron.
 * Download: GET /api/admin/backup/download?shopId=X, GET /api/store-admin/backup/download
 */
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import mysqldump from 'mysqldump';
import ExcelJS from 'exceljs';
import { Storage } from '@google-cloud/storage';
import type { Pool } from 'mysql2/promise';

const execAsync = promisify(exec);

const BACKUP_ENABLED = String(process.env.BACKUP_ENABLED || '').toLowerCase() === 'true';
const GCS_BUCKET = (process.env.BACKUP_GCS_BUCKET || process.env.GCS_BUCKET || '').trim();
const DB_MODE = (process.env.DB_MODE || '').toLowerCase();
const DB_HOST_RAW = (process.env.DB_HOST || '').trim();
const useSocket = DB_MODE === 'socket' || DB_HOST_RAW.startsWith('/cloudsql/');
const socketPath = useSocket
  ? (DB_HOST_RAW.startsWith('/cloudsql/')
      ? DB_HOST_RAW
      : process.env.INSTANCE_CONNECTION_NAME
        ? `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
        : undefined)
  : undefined;

function getConnectionConfig(): Record<string, unknown> {
  const base = {
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crown_services_dev',
    charset: 'utf8mb4',
  };
  if (useSocket && socketPath) {
    return { ...base, socketPath };
  }
  return {
    ...base,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
  };
}

let lastBackupStartedAt: number | null = null;
const MIN_INTERVAL_MS = 15 * 60 * 1000; // 15 min between auto backups

export interface BackupResult {
  ok: boolean;
  message: string;
  filePath?: string;
  gcsUrl?: string;
  durationMs?: number;
}

const tmpDir = () => {
  const d = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
};

/** Shop-scoped tables */
const SHOP_TABLES: Array<{ sheet: string; sql: string }> = [
  { sheet: 'shops', sql: 'SELECT * FROM shops WHERE id = ?' },
  { sheet: 'branches', sql: 'SELECT * FROM branches WHERE shop_id = ?' },
  // categories first so restores can map product.category_id correctly
  { sheet: 'categories', sql: 'SELECT * FROM categories WHERE shop_id = ? OR shop_id IS NULL' },
  { sheet: 'products', sql: 'SELECT * FROM products WHERE shop_id = ?' },
  { sheet: 'branch_inventory', sql: 'SELECT * FROM branch_inventory WHERE shop_id = ?' },
  { sheet: 'sales', sql: 'SELECT * FROM sales WHERE shop_id = ?' },
  { sheet: 'tax_rates', sql: 'SELECT * FROM tax_rates WHERE shop_id = ?' },
  { sheet: 'suppliers', sql: 'SELECT * FROM suppliers WHERE shop_id = ?' },
  { sheet: 'purchase_orders', sql: 'SELECT * FROM purchase_orders WHERE shop_id = ?' },
  { sheet: 'purchase_invoices', sql: 'SELECT * FROM purchase_invoices WHERE shop_id = ?' },
  { sheet: 'purchase_returns', sql: 'SELECT * FROM purchase_returns WHERE shop_id = ?' },
  { sheet: 'subscriptions', sql: 'SELECT * FROM subscriptions WHERE shop_id = ?' },
  { sheet: 'users', sql: 'SELECT id, username, role, shop_id, created_at FROM users WHERE shop_id = ?' },
  { sheet: 'domains', sql: 'SELECT * FROM domains WHERE shop_id = ?' },
  { sheet: 'stock_transfers', sql: 'SELECT * FROM stock_transfers WHERE shop_id = ?' },
];

const OPTIONAL_SHOP_TABLES: Array<{ sheet: string; sql: string }> = [
  { sheet: 'crm_customers', sql: 'SELECT * FROM crm_customers WHERE shop_id = ?' },
  { sheet: 'crm_follow_ups', sql: 'SELECT * FROM crm_follow_ups WHERE shop_id = ?' },
  { sheet: 'expenses', sql: 'SELECT * FROM expenses WHERE shop_id = ?' },
  { sheet: 'accounts', sql: 'SELECT * FROM accounts WHERE shop_id = ?' },
  { sheet: 'journal_entries', sql: 'SELECT * FROM journal_entries WHERE shop_id = ?' },
  { sheet: 'hr_employees', sql: 'SELECT * FROM hr_employees WHERE shop_id = ?' },
];

async function ensureBranchInventoryCoverage(pool: Pool, shopId: number): Promise<void> {
  try {
    await pool.execute(
      `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity)
       SELECT p.shop_id, b.id, p.id, 0
       FROM products p
       INNER JOIN branches b ON b.shop_id = p.shop_id
       WHERE p.shop_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM branch_inventory bi
         WHERE bi.shop_id = p.shop_id AND bi.branch_id = b.id AND bi.product_id = p.id
       )`,
      [shopId]
    );
  } catch (e: any) {
    console.warn('[backup] ensureBranchInventoryCoverage:', e?.message || e);
  }
}

function rowToObj(row: any): Record<string, any> {
  if (!row || typeof row !== 'object') return {};
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = v;
  }
  return out;
}

/** Generate Excel backup for a single shop (multi-tenant). Returns buffer. */
export async function generateShopBackupExcel(pool: Pool, shopId: number): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const allTables = [...SHOP_TABLES];
  for (const t of OPTIONAL_SHOP_TABLES) allTables.push(t);

  // Ensure backup contains all branches for a shop (missing rows -> quantity 0).
  await ensureBranchInventoryCoverage(pool, shopId);

  for (const { sheet, sql } of allTables) {
    try {
      const params = [shopId];
      const [rows] = await pool.execute(sql, params);
      const data = Array.isArray(rows) ? (rows as any[]) : [];

      const ws = workbook.addWorksheet(sheet, { views: [{ state: 'frozen', ySplit: 1 }] });
      if (data.length === 0) {
        ws.addRow(['(no data)']);
        continue;
      }

      const first = data[0];
      const obj = rowToObj(first);
      const headers = Object.keys(obj);
      ws.addRow(headers);
      ws.getRow(1).font = { bold: true };

      for (const r of data) {
        const o = rowToObj(r);
        ws.addRow(headers.map((h) => o[h] ?? ''));
      }
    } catch (err: any) {
      const ws = workbook.addWorksheet(sheet, { views: [{ state: 'frozen', ySplit: 1 }] });
      ws.addRow([`Error: ${err?.message || 'Unknown'}`]);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Get all shop IDs for auto backup. */
export async function getAllShopIds(pool: Pool): Promise<number[]> {
  const [rows] = await pool.execute< any[]>('SELECT id FROM shops ORDER BY id');
  const arr = Array.isArray(rows) ? rows : [];
  return arr.map((r: any) => Number(r?.id)).filter(Number.isFinite);
}

/** Generate Excel for download. Returns { buffer, fileName }. */
export async function generateShopBackupForDownload(
  pool: Pool,
  shopId: number
): Promise<{ buffer: Buffer; fileName: string }> {
  const d = new Date();
  const dateStr = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
  ].join('-');
  const buffer = await generateShopBackupExcel(pool, shopId);
  const fileName = `backup-shop-${shopId}-${dateStr}.xlsx`;
  return { buffer, fileName };
}

/** Run auto backup: per-shop Excel to GCS + full DB SQL.gz to GCS. */
export async function runAutoBackup(pool: Pool, force: boolean = false): Promise<BackupResult> {
  const start = Date.now();
  if (!BACKUP_ENABLED && !force) {
    return { ok: false, message: 'Backup is disabled (BACKUP_ENABLED is not true)' };
  }
  if (!force && lastBackupStartedAt != null) {
    const elapsed = Date.now() - lastBackupStartedAt;
    if (elapsed < MIN_INTERVAL_MS) {
      return {
        ok: false,
        message: `Backup ran recently. Wait ${Math.ceil((MIN_INTERVAL_MS - elapsed) / 60000)} min or use force=true`,
      };
    }
  }
  lastBackupStartedAt = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  try {
    const storage = GCS_BUCKET ? new Storage() : null;
    const bucket = storage?.bucket(GCS_BUCKET);

    // 1) Per-shop Excel → GCS
    const shopIds = await getAllShopIds(pool);
    for (const shopId of shopIds) {
      try {
        const buffer = await generateShopBackupExcel(pool, shopId);
        const fileName = `backup-shop-${shopId}-${timestamp}.xlsx`;
        if (bucket) {
          const dest = `backups/shop-${shopId}/${fileName}`;
          await bucket.file(dest).save(buffer);
          console.log(`[BACKUP] Shop ${shopId} → gs://${GCS_BUCKET}/${dest}`);
        }
      } catch (err: any) {
        console.error(`[BACKUP] Shop ${shopId} failed:`, err?.message);
      }
    }

    // 2) Full DB SQL.gz → GCS
    const sqlFileName = `crown-full-${timestamp}.sql.gz`;
    const tmpPath = path.join(tmpDir(), sqlFileName);
    await mysqldump({
      connection: getConnectionConfig() as any,
      dumpToFile: tmpPath,
      compressFile: true,
    });
    if (fs.existsSync(tmpPath) && bucket) {
      const dest = `backups/full/${sqlFileName}`;
      await bucket.upload(tmpPath, { destination: dest });
      console.log(`[BACKUP] Full DB → gs://${GCS_BUCKET}/${dest}`);
    }
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (_) {}

    const durationMs = Date.now() - start;
    return { ok: true, message: 'Auto backup completed', durationMs };
  } catch (err: any) {
    return {
      ok: false,
      message: err?.message || String(err),
      durationMs: Date.now() - start,
    };
  }
}

/** Legacy: full DB backup only (for /api/admin/backup/run). */
export async function runBackup(force: boolean = false): Promise<BackupResult> {
  const start = Date.now();
  if (!BACKUP_ENABLED && !force) {
    return { ok: false, message: 'Backup is disabled (BACKUP_ENABLED is not true)' };
  }
  if (!force && lastBackupStartedAt != null) {
    const elapsed = Date.now() - lastBackupStartedAt;
    if (elapsed < MIN_INTERVAL_MS) {
      return {
        ok: false,
        message: `Backup ran recently. Wait ${Math.ceil((MIN_INTERVAL_MS - elapsed) / 60000)} minutes or use force=true`,
      };
    }
  }
  lastBackupStartedAt = Date.now();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `crown-backup-${timestamp}.sql.gz`;
  const localPath = path.join(tmpDir(), fileName);

  try {
    await mysqldump({
      connection: getConnectionConfig() as any,
      dumpToFile: localPath,
      compressFile: true,
    });
    if (!fs.existsSync(localPath)) throw new Error('Dump file was not created');

    let gcsUrl: string | undefined;
    if (GCS_BUCKET) {
      const storage = new Storage();
      const b = storage.bucket(GCS_BUCKET);
      const dest = `backups/full/${fileName}`;
      await b.upload(localPath, { destination: dest });
      gcsUrl = `gs://${GCS_BUCKET}/${dest}`;
    }
    fs.unlinkSync(localPath);
    return {
      ok: true,
      message: 'Backup completed',
      gcsUrl,
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    if (fs.existsSync(localPath)) try { fs.unlinkSync(localPath); } catch (_) {}
    return {
      ok: false,
      message: err?.message || String(err),
      durationMs: Date.now() - start,
    };
  }
}

export function isBackupEnabled(): boolean {
  return BACKUP_ENABLED;
}

export function getBackupBucket(): string {
  return GCS_BUCKET || '';
}

/** Create pre-restore backup. */
export async function createPreRestoreBackup(): Promise<string> {
  const dir = tmpDir();
  const d = new Date();
  const dateStr = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join('-');
  const fileName = `pre-restore-backup-${dateStr}.sql`;
  const localPath = path.join(dir, fileName);
  await mysqldump({
    connection: getConnectionConfig() as any,
    dumpToFile: localPath,
    compressFile: false,
  });
  if (!fs.existsSync(localPath)) throw new Error('Pre-restore backup was not created');
  return localPath;
}

/** Restore shop data from Excel backup (products, branches, branch_inventory). */
export async function restoreFromExcel(pool: Pool, shopId: number, excelPath: string): Promise<{ restored: number }> {
  if (!fs.existsSync(excelPath)) throw new Error('Excel file does not exist');

  const preBackup = await generateShopBackupExcel(pool, shopId);
  const prePath = path.join(tmpDir(), `pre-restore-${shopId}-${Date.now()}.xlsx`);
  fs.writeFileSync(prePath, preBackup);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  const conn = await pool.getConnection();
  let restored = 0;
  try {
    await conn.beginTransaction();

    const shopsSheet = workbook.getWorksheet('shops');
    if (shopsSheet) {
      const shRow = shopsSheet.getRow(2);
      if (shRow && shRow.getCell(1).value) {
        const rowObj: Record<string, any> = {};
        shopsSheet.getRow(1).eachCell((c, i) => {
          const h = c.value?.toString();
          if (h) rowObj[h] = i;
        });
        const idCol = rowObj['id'] || rowObj['ID'];
        if (idCol != null) {
          const v = shRow.getCell(idCol).value;
          const excelShopId = Number(v);
          if (excelShopId !== shopId) {
            throw new Error(`Backup is for shop ${excelShopId}, not current shop ${shopId}`);
          }
        }
      }
    }

    await conn.execute('DELETE FROM branch_inventory WHERE shop_id = ?', [shopId]);
    await conn.execute('UPDATE sales SET branch_id = NULL WHERE shop_id = ?', [shopId]);
    await conn.execute('DELETE FROM user_branch_assignments WHERE shop_id = ?', [shopId]);
    await conn.execute('DELETE FROM categories WHERE shop_id = ?', [shopId]);
    await conn.execute('UPDATE shops SET default_branch_id = NULL WHERE id = ?', [shopId]);
    await conn.execute('DELETE FROM branches WHERE shop_id = ?', [shopId]);

    const branchesSheet = workbook.getWorksheet('branches');
    const branchIdMap: Record<number, number> = {};
    if (branchesSheet && branchesSheet.rowCount >= 2) {
      const headers: string[] = [];
      branchesSheet.getRow(1).eachCell((c, i) => {
        const h = c.value?.toString();
        if (h) headers[i] = h;
      });
      const idIdx = headers.findIndex((h) => h === 'id');
      for (let r = 2; r <= branchesSheet.rowCount; r++) {
        const row = branchesSheet.getRow(r);
        const vals: Record<string, any> = {};
        headers.forEach((h, i) => {
          if (h) vals[h] = row.getCell(i + 1).value;
        });
        const oldId = idIdx >= 0 ? Number(vals['id']) : r;
        const [result] = await conn.execute(
          `INSERT INTO branches (shop_id, name, name_ar, name_en, code) VALUES (?, ?, ?, ?, ?)`,
          [
            shopId,
            vals['name'] ?? '',
            vals['name_ar'] ?? vals['name'] ?? '',
            vals['name_en'] ?? vals['name'] ?? '',
            vals['code'] ?? `B${Date.now()}_${r}`,
          ]
        );
        const insertId = (result as any).insertId;
        if (insertId && oldId) branchIdMap[oldId] = insertId;
        restored++;
      }
      const firstBranchId = Object.values(branchIdMap)[0];
      if (firstBranchId) await conn.execute('UPDATE shops SET default_branch_id = ? WHERE id = ?', [firstBranchId, shopId]);
    }

    const existingCategoryIds = new Set<number>();
    try {
      const [existingCats] = await conn.execute('SELECT id FROM categories');
      for (const row of (existingCats as any[])) {
        const idVal = Number(row?.id);
        if (Number.isFinite(idVal) && idVal > 0) existingCategoryIds.add(idVal);
      }
    } catch (_) {}

    const categoriesSheet = workbook.getWorksheet('categories');
    const categoryIdMap: Record<number, number> = {};
    if (categoriesSheet && categoriesSheet.rowCount >= 2) {
      const headers: string[] = [];
      categoriesSheet.getRow(1).eachCell((c, i) => {
        const h = c.value?.toString();
        if (h) headers[i] = h;
      });
      const idIdx = headers.findIndex((h) => h === 'id');
      for (let r = 2; r <= categoriesSheet.rowCount; r++) {
        const row = categoriesSheet.getRow(r);
        const vals: Record<string, any> = {};
        headers.forEach((h, i) => {
          if (h) vals[h] = row.getCell(i + 1).value;
        });
        const oldId = idIdx >= 0 ? Number(vals['id']) : r;
        const rawShopId = vals['shop_id'];
        const rowShopId = rawShopId != null && rawShopId !== '' ? Number(rawShopId) : null;
        const nameEn = String(vals['name_en'] ?? vals['name_ar'] ?? '').trim();
        const nameAr = String(vals['name_ar'] ?? vals['name_en'] ?? '').trim();
        if (!nameEn && !nameAr) continue;

        const isGlobal = !rowShopId || !Number.isFinite(rowShopId);
        if (!isGlobal && rowShopId !== shopId) continue;

        let existingId: number | null = null;
        if (isGlobal) {
          if (Number.isFinite(oldId) && oldId > 0 && existingCategoryIds.has(oldId)) {
            existingId = oldId;
          } else {
            const [rows] = await conn.execute(
              'SELECT id FROM categories WHERE shop_id IS NULL AND (name_en = ? OR name_ar = ?) LIMIT 1',
              [nameEn || nameAr, nameAr || nameEn]
            );
            existingId = Number((rows as any[])[0]?.id || 0) || null;
          }
        }

        if (existingId) {
          if (oldId) categoryIdMap[oldId] = existingId;
          continue;
        }

        const [result] = await conn.execute(
          'INSERT INTO categories (name_en, name_ar, shop_id) VALUES (?, ?, ?)',
          [nameEn || nameAr, nameAr || nameEn, isGlobal ? null : shopId]
        );
        const insertId = (result as any).insertId;
        if (insertId) {
          existingCategoryIds.add(insertId);
          if (oldId) categoryIdMap[oldId] = insertId;
          restored++;
        }
      }
    }

    const productsSheet = workbook.getWorksheet('products');
    const productIdMap: Record<number, number> = {};
    if (productsSheet && productsSheet.rowCount >= 2) {
      const headers: string[] = [];
      productsSheet.getRow(1).eachCell((c, i) => {
        const h = c.value?.toString();
        if (h) headers[i] = h;
      });
      const idIdx = headers.findIndex((h) => h === 'id');
      for (let r = 2; r <= productsSheet.rowCount; r++) {
        const row = productsSheet.getRow(r);
        const vals: Record<string, any> = {};
        headers.forEach((h, i) => {
          if (h) vals[h] = row.getCell(i + 1).value;
        });
        if (!vals['name_en'] && !vals['name_ar']) continue;
        const oldId = idIdx >= 0 ? Number(vals['id']) : r;
        const rawCategoryId = vals['category_id'] && Number(vals['category_id']) ? Number(vals['category_id']) : null;
        let mappedCategoryId: number | null = null;
        if (rawCategoryId) {
          if (categoryIdMap[rawCategoryId]) {
            mappedCategoryId = categoryIdMap[rawCategoryId];
          } else if (existingCategoryIds.has(rawCategoryId)) {
            mappedCategoryId = rawCategoryId;
          }
        }
        const hasId = Number.isFinite(oldId) && oldId > 0;
        const insertSql = hasId
          ? `INSERT INTO products (id, name_en, name_ar, sku, barcode, qr_code, brand, category_id, buy_price, sell_price, stock_quantity, min_stock_level, image_url, shop_id, is_deleted)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               name_en = VALUES(name_en),
               name_ar = VALUES(name_ar),
               sku = VALUES(sku),
               barcode = VALUES(barcode),
               qr_code = VALUES(qr_code),
               brand = VALUES(brand),
               category_id = VALUES(category_id),
               buy_price = VALUES(buy_price),
               sell_price = VALUES(sell_price),
               stock_quantity = VALUES(stock_quantity),
               min_stock_level = VALUES(min_stock_level),
               image_url = VALUES(image_url),
               shop_id = VALUES(shop_id),
               is_deleted = VALUES(is_deleted)`
          : `INSERT INTO products (name_en, name_ar, sku, barcode, qr_code, brand, category_id, buy_price, sell_price, stock_quantity, min_stock_level, image_url, shop_id, is_deleted)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const insertParams = [
          ...(hasId ? [oldId] : []),
          vals['name_en'] ?? vals['name_ar'] ?? '',
          vals['name_ar'] ?? vals['name_en'] ?? '',
          vals['sku'] ?? null,
          vals['barcode'] ?? null,
          vals['qr_code'] ?? null,
          vals['brand'] ?? null,
          mappedCategoryId,
          Number(vals['buy_price']) || 0,
          Number(vals['sell_price']) || 0,
          Number(vals['stock_quantity']) || 0,
          Number(vals['min_stock_level']) || 5,
          vals['image_url'] ?? null,
          shopId,
          vals['is_deleted'] ? 1 : 0,
        ];
        const [result] = await conn.execute(insertSql, insertParams);
        const insertId = (result as any).insertId;
        const mappedId = hasId ? oldId : insertId;
        if (mappedId && oldId) productIdMap[oldId] = mappedId;
        restored++;
      }
    }

    const biSheet = workbook.getWorksheet('branch_inventory');
    if (biSheet && biSheet.rowCount >= 2 && Object.keys(branchIdMap).length > 0 && Object.keys(productIdMap).length > 0) {
      const headers: string[] = [];
      biSheet.getRow(1).eachCell((c, i) => {
        const h = c.value?.toString();
        if (h) headers[i] = h;
      });
      for (let r = 2; r <= biSheet.rowCount; r++) {
        const row = biSheet.getRow(r);
        const vals: Record<string, any> = {};
        headers.forEach((h, i) => {
          if (h) vals[h] = row.getCell(i + 1).value;
        });
        const branchId = branchIdMap[Number(vals['branch_id'])];
        const productId = productIdMap[Number(vals['product_id'])];
        if (branchId && productId) {
          await conn.execute(
            `INSERT IGNORE INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)`,
            [shopId, branchId, productId, Number(vals['quantity']) || Number(vals['qty']) || 0]
          );
          restored++;
        }
      }
    }

    // Ensure every branch has a row for every product (quantity 0 if missing).
    await conn.execute(
      `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity)
       SELECT p.shop_id, b.id, p.id, 0
       FROM products p
       INNER JOIN branches b ON b.shop_id = p.shop_id
       WHERE p.shop_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM branch_inventory bi
         WHERE bi.shop_id = p.shop_id AND bi.branch_id = b.id AND bi.product_id = p.id
       )`,
      [shopId]
    );

    await conn.commit();
    return { restored };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/** Restore DB from .sql file. */
export async function restoreBackup(sqlFilePath: string): Promise<void> {
  if (!fs.existsSync(sqlFilePath)) throw new Error('SQL file does not exist');
  const dbUser = process.env.DB_USER || 'root';
  const dbPass = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'crown_services_dev';
  const absPath = path.resolve(sqlFilePath);
  const env = { ...process.env, MYSQL_PWD: dbPass };
  let cmd: string;
  if (useSocket && socketPath) {
    cmd = `mysql -u "${dbUser.replace(/"/g, '\\"')}" --socket="${socketPath.replace(/"/g, '\\"')}" "${dbName.replace(/"/g, '\\"')}" < "${absPath.replace(/"/g, '\\"')}"`;
  } else {
    const host = (process.env.DB_HOST || 'localhost').replace(/"/g, '\\"');
    const port = process.env.DB_PORT || '3306';
    cmd = `mysql -h "${host}" -P ${port} -u "${dbUser.replace(/"/g, '\\"')}" "${dbName.replace(/"/g, '\\"')}" < "${absPath.replace(/"/g, '\\"')}"`;
  }
  await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024, env });
}
