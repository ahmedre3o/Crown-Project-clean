import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend/ or repo root (same as api.ts; never depend on dist/.env)
const backendDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(backendDir, '.env') });
dotenv.config({ path: path.resolve(backendDir, '..', '.env') });

import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2/promise';
import crypto from 'crypto';
import { resolveNotificationText, isCorruptedText } from './notifications';

type UserRow = RowDataPacket & { id: number; email: string | null };

function generatePublicCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const MOJIBAKE_MARKERS = ['Ã', 'â€', 'Ø', 'Ù', '�'];

function containsReplacement(value: string | null) {
  return typeof value === 'string' && value.includes('�');
}

async function cleanupNotificationMojibake() {
  try {
    if (!MOJIBAKE_MARKERS.length) return;
    const where = MOJIBAKE_MARKERS.map(
      () => '(title_ar LIKE ? OR title_en LIKE ? OR body_ar LIKE ? OR body_en LIKE ?)'
    ).join(' OR ');
    const params = MOJIBAKE_MARKERS.flatMap((m) => [`%${m}%`, `%${m}%`, `%${m}%`, `%${m}%`]);
    const [rows] = await pool.execute(
      `SELECT id, type, title_ar, title_en, body_ar, body_en, payload, meta FROM notifications WHERE ${where} LIMIT 5000`,
      params
    );
    const items = rows as any[];
    let fixedCount = 0;
    for (const row of items) {
      const hasReplacement =
        containsReplacement(row.title_ar) ||
        containsReplacement(row.title_en) ||
        containsReplacement(row.body_ar) ||
        containsReplacement(row.body_en);
      const hasMojibake =
        isCorruptedText(row.title_ar) ||
        isCorruptedText(row.title_en) ||
        isCorruptedText(row.body_ar) ||
        isCorruptedText(row.body_en);
      if (!hasReplacement && !hasMojibake) continue;

      const resolved = resolveNotificationText(row);
      if (hasReplacement) {
        console.warn('[notifications] replaced corrupted text', { id: row.id });
      }
      await pool.execute(
        'UPDATE notifications SET title_ar = ?, title_en = ?, body_ar = ?, body_en = ?, payload = COALESCE(payload, ?) WHERE id = ?',
        [resolved.titleAr, resolved.titleEn, resolved.bodyAr, resolved.bodyEn, resolved.payload ? JSON.stringify(resolved.payload) : null, row.id]
      );
      fixedCount++;
    }
    if (fixedCount > 0) {
      console.log(`[notifications] mojibake cleanup: fixed ${fixedCount} records`);
    }
  } catch (err) {
    console.error('[notifications] mojibake cleanup failed:', (err as any)?.message || err);
  }
}

async function backfillNotificationPayload() {
  try {
    await pool.execute('UPDATE notifications SET payload = meta WHERE payload IS NULL AND meta IS NOT NULL');
  } catch (err) {
    console.error('[notifications] payload backfill failed:', (err as any)?.message || err);
  }
}

// Connection mode: socket if DB_MODE=socket OR DB_HOST starts with /cloudsql/; else IP (no throw so Cloud Shell etc can start)
const DB_MODE = (process.env.DB_MODE || '').toLowerCase();
const DB_HOST_RAW = process.env.DB_HOST || '';
const useSocket =
  DB_MODE === 'socket' || (DB_HOST_RAW && String(DB_HOST_RAW).trim().startsWith('/cloudsql/'));

const socketPath = useSocket
  ? (DB_HOST_RAW.trim().startsWith('/cloudsql/')
      ? DB_HOST_RAW.trim()
      : process.env.INSTANCE_CONNECTION_NAME
        ? `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
        : undefined)
  : undefined;

const isSocketMode = useSocket && !!socketPath;

if (process.env.NODE_ENV !== 'production') {
  if (useSocket && !socketPath) {
    console.warn('[db] Socket mode requested but INSTANCE_CONNECTION_NAME and DB_HOST/cloudsql not set; connection may fail on first use.');
  }
  if (!useSocket && (!process.env.DB_HOST || !process.env.DB_NAME)) {
    console.warn('[db] IP mode: DB_HOST/DB_NAME not set; connection may fail on first use.');
  }
}

const poolLimit = Number(process.env.DB_POOL_LIMIT || process.env.DB_POOL_SIZE || 10);
const poolQueueLimit = Number(process.env.DB_POOL_QUEUE_LIMIT || 0);
const connectTimeoutMs = Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000);

const poolConfig: mysql.PoolOptions = isSocketMode
  ? {
      socketPath,
      user: process.env.DB_USER || undefined,
      password: process.env.DB_PASSWORD || undefined,
      database: process.env.DB_NAME || undefined,
      charset: "utf8mb4",
      connectTimeout: connectTimeoutMs,
      waitForConnections: true,
      connectionLimit: Number.isFinite(poolLimit) ? poolLimit : 10,
      queueLimit: Number.isFinite(poolQueueLimit) ? poolQueueLimit : 0,
      ssl: undefined,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || undefined,
      password: process.env.DB_PASSWORD || undefined,
      database: process.env.DB_NAME || undefined,
      charset: "utf8mb4",
      connectTimeout: connectTimeoutMs,
      waitForConnections: true,
      connectionLimit: Number.isFinite(poolLimit) ? poolLimit : 10,
      queueLimit: Number.isFinite(poolQueueLimit) ? poolQueueLimit : 0,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };

if (process.env.NODE_ENV !== 'production') {
  const logParts: string[] = ['[db] mode:', isSocketMode ? 'socket' : 'ip', '| DB_NAME:', process.env.DB_NAME ?? '(not set)'];
  if (isSocketMode) {
    logParts.push('| INSTANCE_CONNECTION_NAME:', process.env.INSTANCE_CONNECTION_NAME ? '(set)' : '(not set)');
  } else {
    logParts.push('| host:', process.env.DB_HOST ?? '(not set)');
  }
  console.log(logParts.join(' '));
  console.log('DB CONNECTING TO:', process.env.DB_HOST);
}

// Create connection pool (connects lazily on first use)
export const pool = mysql.createPool(poolConfig);
// Ensure every new connection uses utf8mb4 (fix Arabic/emoji encoding globally)
pool.on('connection', (conn: any) => {
  try {
    conn.query("SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci");
  } catch (e) {
    // never crash on charset init
  }
});

const slowQueryMs = Number(process.env.DB_SLOW_QUERY_MS || 0);
const poolLogEnabled = String(process.env.DB_POOL_LOG || '').toLowerCase() === 'true';
const poolLogIntervalMs = Number(process.env.DB_POOL_LOG_INTERVAL_MS || 60000);
let lastPoolLogAt = 0;
let poolInUse = 0;
let poolEnqueued = 0;

const logPool = (label: string) => {
  if (!poolLogEnabled) return;
  const now = Date.now();
  if (now - lastPoolLogAt < poolLogIntervalMs) return;
  lastPoolLogAt = now;
  console.log('[db pool]', label, {
    inUse: poolInUse,
    enqueued: poolEnqueued,
    limit: poolConfig.connectionLimit,
  });
};

pool.on('acquire', () => {
  poolInUse += 1;
  logPool('acquire');
});
pool.on('release', () => {
  poolInUse = Math.max(0, poolInUse - 1);
  logPool('release');
});
pool.on('enqueue', () => {
  poolEnqueued += 1;
  logPool('enqueue');
});

const baseExecute = pool.execute.bind(pool);
const executeWithTiming = async (...args: any[]) => {
  const [sql, params] = args;
  const start = process.hrtime.bigint();
  try {
    return await baseExecute(sql, params);
  } finally {
    if (slowQueryMs > 0) {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      if (durationMs >= slowQueryMs) {
        console.warn('[db] slow query', {
          ms: Math.round(durationMs),
          sql: String(sql).slice(0, 2000),
          params: Array.isArray(params) ? params : undefined,
        });
      }
    }
  }
};

/** Normalize COLUMN_TYPE for comparison (e.g. "int unsigned" vs "int(10) unsigned"). */
function normColType(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function getShopsIdColumnType(): Promise<string> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COLUMN_TYPE AS ct FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shops' AND COLUMN_NAME = 'id'`
  );
  const ct = (rows as any[])[0]?.ct;
  return ct ? String(ct) : 'int';
}

function isSafeMysqlColumnType(t: string): boolean {
  return /^[a-z0-9() ]+$/i.test(String(t).trim());
}

function safeIdent(name: string): string {
  return /^[a-zA-Z0-9_]+$/.test(name) ? name : '';
}

async function dropShopFkIfAny(table: string): Promise<void> {
  const t = safeIdent(table);
  if (!t) return;
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT CONSTRAINT_NAME AS n FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       AND COLUMN_NAME = 'shop_id' AND REFERENCED_TABLE_NAME = 'shops'`,
    [t]
  );
  for (const r of rows as any[]) {
    const name = r?.n;
    if (!name) continue;
    try {
      await pool.execute(`ALTER TABLE \`${t}\` DROP FOREIGN KEY \`${String(name).replace(/`/g, '')}\``);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Align child.shop_id to actual shops.id COLUMN_TYPE (signed vs UNSIGNED, INT vs BIGINT).
 * Same pattern as CRM tables — avoids ER_FK_INCOMPATIBLE_COLUMNS / stock_reservations_ibfk_1.
 */
export async function alignShopIdColumnToShops(table: string): Promise<void> {
  const t = safeIdent(table);
  if (!t) return;
  try {
    const [tables] = await pool.execute<RowDataPacket[]>(
      `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [t]
    );
    if (!(tables as any[]).length) return;
  } catch {
    return;
  }
  let shopIdType: string;
  try {
    shopIdType = await getShopsIdColumnType();
  } catch {
    return;
  }
  if (!isSafeMysqlColumnType(shopIdType)) {
    console.warn('[db] alignShopIdColumnToShops: skip unsafe shops.id type', shopIdType);
    return;
  }
  const targetNorm = normColType(shopIdType);
  const [cols] = await pool.execute<RowDataPacket[]>(
    `SELECT COLUMN_TYPE AS ct FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'shop_id'`,
    [t]
  );
  const cur = normColType((cols as any[])[0]?.ct || '');
  if (!cur || cur === targetNorm) return;
  await dropShopFkIfAny(t);
  await pool.execute(`ALTER TABLE \`${t}\` MODIFY COLUMN shop_id ${shopIdType} NOT NULL`);
}

async function addShopForeignKeyIfMissing(table: string, constraintName: string): Promise<void> {
  const t = safeIdent(table);
  const c = safeIdent(constraintName);
  if (!t || !c) return;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
      [t, c]
    );
    if ((rows as any[]).length) return;
  } catch {
    return;
  }
  try {
    await pool.execute(
      `ALTER TABLE \`${t}\` ADD CONSTRAINT \`${c}\` FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE`
    );
  } catch (e: any) {
    console.warn(`[db] addShopForeignKeyIfMissing ${t}.${c}:`, e?.message || e);
  }
}

async function ensureStockReservationsForeignKeys(): Promise<void> {
  try {
    await alignShopIdColumnToShops('stock_reservations');
    await addShopForeignKeyIfMissing('stock_reservations', 'fk_stock_reservations_shop');
    const [fkOrder] = await pool.execute<RowDataPacket[]>(
      `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_reservations' AND CONSTRAINT_NAME = 'fk_stock_reservations_order'`
    );
    if (!(fkOrder as any[]).length) {
      await pool.execute(`
        ALTER TABLE stock_reservations
        ADD CONSTRAINT fk_stock_reservations_order FOREIGN KEY (order_id) REFERENCES online_orders(id) ON DELETE CASCADE
      `);
    }
  } catch (e: any) {
    console.warn('[db] fk_stock_reservations_order:', e?.message || e);
  }
  try {
    const [fkProd] = await pool.execute<RowDataPacket[]>(
      `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_reservations' AND CONSTRAINT_NAME = 'fk_stock_reservations_product'`
    );
    if (!(fkProd as any[]).length) {
      await pool.execute(`
        ALTER TABLE stock_reservations
        ADD CONSTRAINT fk_stock_reservations_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      `);
    }
  } catch (e: any) {
    console.warn('[db] fk_stock_reservations_product:', e?.message || e);
  }
}

// Dev-only SQL logging wrapper to help debug schema issues and keep server running on benign DDL errors
if (process.env.NODE_ENV !== 'production') {
  const originalExecute = slowQueryMs > 0 ? executeWithTiming : baseExecute;
  (pool as any).execute = async (...args: any[]) => {
    const [sql, params] = args;
    try {
      return await originalExecute(sql, params);
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const benignCodes = new Set([
        'ER_DUP_FIELDNAME',
        'ER_DUP_KEYNAME',
        'ER_FK_DUP_NAME',
        'ER_TABLE_EXISTS_ERROR',
        'ER_CANT_DROP_FIELD_OR_KEY',
        'ER_DUP_INDEX',
      ]);
      try {
        const [dbRows] = await originalExecute('SELECT DATABASE() AS db', []);
        const currentDb = (dbRows as any[])[0]?.db ?? null;
        const payload = {
          db: currentDb,
          sql,
          params,
          code,
          message: err?.message,
          stack: err?.stack,
        };
        if (benignCodes.has(code || '')) {
          console.warn('[SQL WARNING]', payload);
          // Return an empty result to keep the server running
          return [[], []];
        }
        console.error('[SQL ERROR]', payload);
      } catch {
        const payload = {
          sql,
          params,
          code,
          message: err?.message,
          stack: err?.stack,
        };
        if (benignCodes.has(code || '')) {
          console.warn('[SQL WARNING]', payload);
          return [[], []];
        }
        console.error('[SQL ERROR]', payload);
      }
      throw err;
    }
  };
} else if (slowQueryMs > 0) {
  (pool as any).execute = executeWithTiming;
}

async function ensureDatabaseExists() {
  const database = poolConfig.database;
  if (!database) return;
  const { database: _db, ...serverConfig } = poolConfig;
  const connection = await mysql.createConnection({
      charset: "utf8mb4",
...serverConfig,
    database: undefined,
  });
  try {
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  } finally {
    await connection.end();
  }
}

// Test connection
export async function testConnection() {
  try {
    console.log('[INIT] initializeDatabase called via testConnection');
    await ensureDatabaseExists();
    const connection = await pool.getConnection();
    console.log('✅ Connected to Google Cloud SQL');
    try {
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT DATABASE() AS db, @@server_uuid AS uuid, @@hostname AS host, @@port AS port, CURRENT_USER() AS user'
      );
      console.log('[DB CHECK]', rows);
    } catch (e: any) {
      console.error('[DB CHECK ERROR]', e?.message || e);
    } finally {
      connection.release();
    }
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return false;
  }
}

const INIT_DEADLOCK_BACKOFF_MS = [100, 250, 500];
function isInitDeadlock(err: any): boolean {
  if (!err) return false;
  const c = err?.code ?? err?.errno;
  const msg = String(err?.message || err?.sqlMessage || '').toLowerCase();
  return c === 'ER_LOCK_DEADLOCK' || c === 1213 || msg.includes('deadlock');
}

async function ensureReportingIndexes(): Promise<void> {
  const statements: Array<{ name: string; sql: string }> = [
    { name: 'idx_sales_shop_created', sql: 'CREATE INDEX idx_sales_shop_created ON sales (shop_id, created_at)' },
    { name: 'idx_returns_shop_created', sql: 'CREATE INDEX idx_returns_shop_created ON returns (shop_id, created_at)' },
    { name: 'idx_expenses_shop_date', sql: 'CREATE INDEX idx_expenses_shop_date ON expenses (shop_id, expense_date)' },
    { name: 'idx_online_orders_shop_created', sql: 'CREATE INDEX idx_online_orders_shop_created ON online_orders (shop_id, created_at)' },
    { name: 'idx_debt_payments_debt_created', sql: 'CREATE INDEX idx_debt_payments_debt_created ON customer_debt_payments (debt_id, created_at)' },
  ];
  for (const statement of statements) {
    try {
      await pool.execute(statement.sql);
    } catch (e: any) {
      const code = e?.code;
      const ign = new Set(['ER_DUP_KEYNAME', 'ER_DUP_INDEX', 'ER_DUP_KEY', 'ER_DUP_FIELDNAME', 'ER_NO_SUCH_TABLE', '42S02']);
      if (!ign.has(code)) {
        console.warn('[db] ensureReportingIndexes', statement.name, e?.message || e);
      }
    }
  }
}

// Initialize database tables (with deadlock retry for concurrent Cloud Run startups)
export async function initializeDatabase() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await runInitializeDatabase();
      return;
    } catch (error: any) {
      if (!isInitDeadlock(error) || attempt >= 2) {
        throw error;
      }
      const delay = INIT_DEADLOCK_BACKOFF_MS[attempt];
      console.warn('[INIT] deadlock retry', attempt + 1, 'in', delay, 'ms');
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/** Ensure tax_rates table exists (creates on first use if init missed it). Call before any tax_rates query. */
export async function ensureTaxRatesTable(): Promise<void> {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS tax_rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        type ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
        rate DECIMAL(10,2) NOT NULL DEFAULT 0,
        inclusive TINYINT(1) NOT NULL DEFAULT 0,
        apply_before_discount TINYINT(1) NOT NULL DEFAULT 1,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tax_rates_shop (shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) {
    console.warn('[db] ensureTaxRatesTable:', e?.message || e);
  }
}

/** Ensure suppliers table exists with full schema. Run on server start and before suppliers API use. */
export async function ensureSuppliersTable(): Promise<void> {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NULL,
        email VARCHAR(255) NULL,
        address TEXT NULL,
        balance DECIMAL(10,2) NOT NULL DEFAULT 0,
        shop_id INT NOT NULL,
        branch_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_suppliers_shop (shop_id),
        INDEX idx_suppliers_branch (branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // Add columns if table existed with old schema (no FK to avoid dependency on branches order)
    try {
      await pool.execute('ALTER TABLE suppliers ADD COLUMN email VARCHAR(255) NULL AFTER phone');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') console.warn('[db] suppliers email column:', e?.message || e);
    }
    try {
      await pool.execute('ALTER TABLE suppliers ADD COLUMN branch_id INT NULL AFTER shop_id');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') console.warn('[db] suppliers branch_id column:', e?.message || e);
    }
  } catch (e: any) {
    console.warn('[db] ensureSuppliersTable:', e?.message || e);
  }
}

/** Ensure all purchase and inventory movement tables exist. Run on server start and before purchase APIs. */
export async function ensurePurchaseTables(): Promise<void> {
  try {
    // purchase_orders
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        supplier_id INT NULL,
        branch_id INT NULL,
        order_number VARCHAR(64) NULL,
        status ENUM('draft','approved','received','sent','partial','cancelled') DEFAULT 'draft',
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_po_shop (shop_id),
        INDEX idx_po_supplier (supplier_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        INDEX idx_poi_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        supplier_id INT NULL,
        order_id INT NULL,
        branch_id INT NULL,
        invoice_number VARCHAR(64) NULL,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        status ENUM('draft','paid','unpaid') DEFAULT 'unpaid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pi_shop (shop_id),
        INDEX idx_pi_supplier (supplier_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_invoice_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        total_price DECIMAL(12,2) NOT NULL,
        INDEX idx_pi_items_invoice (purchase_invoice_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        supplier_id INT NULL,
        invoice_id INT NULL,
        branch_id INT NULL,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pr_shop (shop_id),
        INDEX idx_pr_supplier (supplier_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_return_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        INDEX idx_pri_return (return_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        product_id INT NOT NULL,
        type VARCHAR(32) NOT NULL DEFAULT 'purchase',
        quantity INT NOT NULL,
        reference_type VARCHAR(32) NULL,
        reference_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_im_shop (shop_id),
        INDEX idx_im_product (product_id),
        INDEX idx_im_ref (reference_type, reference_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('[db] Purchases tables verified');
  } catch (e: any) {
    console.warn('[db] ensurePurchaseTables:', e?.message || e);
  }
}

/** Ensure branch_inventory exists. Normalized schema: id, shop_id, branch_id, product_id, quantity, created_at, updated_at, UNIQUE(shop_id, branch_id, product_id). */
export async function ensureBranchInventoryTable(): Promise<void> {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS branch_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        branch_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_shop_branch_product (shop_id, branch_id, product_id),
        INDEX idx_shop (shop_id),
        INDEX idx_branch (branch_id),
        INDEX idx_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) {
    console.warn('[db] ensureBranchInventoryTable:', e?.message || e);
  }
}

/** Run on startup and before PUT branch-inventory: add quantity, created_at, updated_at and unique key if missing. Never throws. */
export async function ensureBranchInventoryColumns(): Promise<void> {
  try {
    const [tbl] = await pool.execute<RowDataPacket[]>(
      "SELECT 1 AS x FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branch_inventory'"
    );
    if (!tbl?.length) return;

    const hasCol = async (col: string): Promise<boolean> => {
      try {
        const [rows] = await pool.execute<RowDataPacket[]>(
          "SELECT 1 AS x FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branch_inventory' AND COLUMN_NAME = ?",
          [col]
        );
        return Array.isArray(rows) && rows.length > 0;
      } catch {
        return false;
      }
    };

    if (!(await hasCol('quantity'))) {
      try {
        await pool.execute('ALTER TABLE branch_inventory ADD COLUMN quantity DECIMAL(10,2) DEFAULT 0');
        console.log('[db] branch_inventory: added column quantity');
      } catch (e: any) {
        console.warn('[db] branch_inventory add quantity:', e?.message || e);
      }
    }
    if (!(await hasCol('created_at'))) {
      try {
        await pool.execute('ALTER TABLE branch_inventory ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        console.log('[db] branch_inventory: added column created_at');
      } catch (e: any) {
        console.warn('[db] branch_inventory add created_at:', e?.message || e);
      }
    }
    if (!(await hasCol('updated_at'))) {
      try {
        await pool.execute('ALTER TABLE branch_inventory ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
        console.log('[db] branch_inventory: added column updated_at');
      } catch (e: any) {
        console.warn('[db] branch_inventory add updated_at:', e?.message || e);
      }
    }

    try {
      const [uk] = await pool.execute<RowDataPacket[]>(
        "SELECT 1 AS x FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branch_inventory' AND INDEX_NAME = 'unique_shop_branch_product'"
      );
      if (!uk?.length) {
        try {
          await pool.execute('ALTER TABLE branch_inventory ADD UNIQUE KEY unique_shop_branch_product (shop_id, branch_id, product_id)');
          console.log('[db] branch_inventory: added unique_shop_branch_product');
        } catch (e: any) {
          if (e?.code === 'ER_BAD_FIELD_ERROR') {
            console.warn('[db] branch_inventory: unique_shop_branch_product skipped (column missing)');
          } else {
            console.warn('[db] branch_inventory add unique_shop_branch_product:', e?.message || e);
          }
        }
      }
    } catch (e: any) {
      console.warn('[db] ensureBranchInventoryColumns (unique key check):', e?.message || e);
    }
  } catch (e: any) {
    console.error('[db] ensureBranchInventoryColumns:', e?.message || e);
  }
}

/** Normalize branch_inventory schema: remove qty and part_id; ensure UNIQUE(shop_id, branch_id, product_id). Run after ensureBranchInventoryColumns. */
export async function normalizeBranchInventorySchema(): Promise<void> {
  try {
    const [tbl] = await pool.execute<RowDataPacket[]>(
      "SELECT 1 AS x FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branch_inventory'"
    );
    if (!tbl?.length) return;

    const hasCol = async (col: string): Promise<boolean> => {
      try {
        const [rows] = await pool.execute<RowDataPacket[]>(
          "SELECT 1 AS x FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branch_inventory' AND COLUMN_NAME = ?",
          [col]
        );
        return Array.isArray(rows) && rows.length > 0;
      } catch {
        return false;
      }
    };

    if (await hasCol('qty')) {
      try {
        await pool.execute('ALTER TABLE branch_inventory DROP COLUMN qty');
        console.log('[db] branch_inventory: dropped column qty');
      } catch (e: any) {
        console.warn('[db] branch_inventory drop qty:', e?.message || e);
      }
    }
    if (await hasCol('part_id')) {
      try {
        await pool.execute('ALTER TABLE branch_inventory DROP COLUMN part_id');
        console.log('[db] branch_inventory: dropped column part_id');
      } catch (e: any) {
        console.warn('[db] branch_inventory drop part_id:', e?.message || e);
      }
    }

    const hasIndex = async (name: string): Promise<boolean> => {
      try {
        const [rows] = await pool.execute<RowDataPacket[]>(
          "SELECT 1 AS x FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branch_inventory' AND INDEX_NAME = ?",
          [name]
        );
        return Array.isArray(rows) && rows.length > 0;
      } catch {
        return false;
      }
    };

    for (const idx of ['unique_branch_part', 'unique_product_branch']) {
      if (await hasIndex(idx)) {
        try {
          await pool.execute(`ALTER TABLE branch_inventory DROP INDEX ${idx}`);
          console.log('[db] branch_inventory: dropped index', idx);
        } catch (e: any) {
          console.warn('[db] branch_inventory drop index', idx, (e as any)?.message || e);
        }
      }
    }

    if (!(await hasIndex('unique_shop_branch_product'))) {
      try {
        await pool.execute('ALTER TABLE branch_inventory ADD UNIQUE KEY unique_shop_branch_product (shop_id, branch_id, product_id)');
        console.log('[db] branch_inventory: added unique_shop_branch_product');
      } catch (e: any) {
        console.warn('[db] branch_inventory add unique_shop_branch_product:', (e as any)?.message || e);
      }
    }
  } catch (e: any) {
    console.warn('[db] normalizeBranchInventorySchema:', e?.message || e);
  }
}

/** Ensure shop has at least one branch.
 * Creates a default branch named after the store (business_name/name) (fallback: "Main Branch").
 * Returns branch id. Used to auto-migrate normal accounts to single-branch. */
export async function ensureShopHasDefaultBranch(shopId: number): Promise<number> {
  const [shopRows] = await pool.execute<RowDataPacket[]>(
    'SELECT COALESCE(business_name_ar, business_name_en, business_name, name) AS shop_name_any, ' +
      'COALESCE(business_name_ar, name) AS shop_name_ar, ' +
      'COALESCE(business_name_en, name) AS shop_name_en ' +
      'FROM shops WHERE id = ?',
    [shopId]
  );
  const shopNameAny = String((shopRows as any[])[0]?.shop_name_any || '').trim();
  const shopNameAr = String((shopRows as any[])[0]?.shop_name_ar || '').trim();
  const shopNameEn = String((shopRows as any[])[0]?.shop_name_en || '').trim();

  const defaultName = shopNameAny || 'Main Branch';
  const defaultNameAr = shopNameAr || defaultName;
  const defaultNameEn = shopNameEn || defaultName;

  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM branches WHERE shop_id = ? LIMIT 1',
    [shopId]
  );
  if (rows && rows.length > 0) return Number(rows[0].id);
  const code = `MAIN_${shopId}`;
  await pool.execute(
    'INSERT INTO branches (shop_id, name, name_ar, name_en, code) VALUES (?, ?, ?, ?, ?)',
    [shopId, defaultNameEn, defaultNameAr, defaultNameEn, code]
  );
  const [after] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM branches WHERE shop_id = ? ORDER BY id DESC LIMIT 1',
    [shopId]
  );
  const branchId = Number((after as any[])[0]?.id ?? 0);
  if (branchId) {
    await pool.execute('UPDATE shops SET default_branch_id = ? WHERE id = ?', [branchId, shopId]).catch(() => {});
  }
  return branchId;
}

/** FORCE: Create a branch for every shop that has none. Runs on server start. Guaranteed execution. */
export async function forceCreateBranchForEveryShop(): Promise<void> {
  console.log('RUNNING forceCreateBranchForEveryShop');
  const [shopRows] = await pool.execute<RowDataPacket[]>(
    'SELECT s.id, COALESCE(s.business_name_ar, s.business_name_en, s.business_name, s.name) AS shop_name FROM shops s'
  );
  const shops = (shopRows as any[]) || [];
  for (const row of shops) {
    const shopId = Number(row.id);
    if (!shopId || Number.isNaN(shopId)) continue;
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM branches WHERE shop_id = ? LIMIT 1',
      [shopId]
    );
    if (existing && existing.length > 0) {
      console.log('Branch already exists:', shopId);
      continue;
    }
    const shopName = String(row.shop_name || '').trim() || 'Main Branch';
    const code = `MAIN_${shopId}`;
    try {
      await pool.execute(
        'INSERT INTO branches (shop_id, name, name_ar, name_en, code) VALUES (?, ?, ?, ?, ?)',
        [shopId, shopName, shopName, shopName, code]
      );
      console.log('[db] Branch created for shop_id', shopId);
      console.log('Inserted branch for shop:', shopId);
      const [after] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM branches WHERE shop_id = ? ORDER BY id DESC LIMIT 1',
        [shopId]
      );
      const branchId = Number((after as any[])[0]?.id ?? 0);
      if (branchId) {
        await pool.execute('UPDATE shops SET default_branch_id = ? WHERE id = ?', [branchId, shopId]).catch(() => {});
      }
    } catch (e: any) {
      console.error('[db] forceCreateBranchForEveryShop failed for shop_id', shopId, e?.message || e);
    }
  }
}

/** FORCE: Ensure one branch_inventory row exists for this product. Insert (quantity 0) if none. */
export async function forceEnsureBranchInventoryForProduct(shopId: number, productId: number): Promise<void> {
  const [existing] = await pool.execute<RowDataPacket[]>(
    'SELECT 1 FROM branch_inventory WHERE shop_id = ? AND product_id = ? LIMIT 1',
    [shopId, productId]
  );
  if (existing && existing.length > 0) return;
  const [branchRow] = await pool.execute<RowDataPacket[]>(
    'SELECT id FROM branches WHERE shop_id = ? ORDER BY id ASC LIMIT 1',
    [shopId]
  );
  const branchId = (branchRow as any[])[0]?.id;
  if (!branchId) return;
  await pool.execute(
    'INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, 0)',
    [shopId, branchId, productId]
  );
}

/** Ensure every product has at least one branch_inventory row (default branch, quantity 0 if new). */
export async function migrateStockToBranchInventory(shopId: number): Promise<void> {
  await ensureShopHasDefaultBranch(shopId);
  try {
    await pool.execute(
      `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity)
       SELECT p.shop_id, (SELECT id FROM branches WHERE shop_id = p.shop_id ORDER BY id ASC LIMIT 1), p.id, 0
       FROM products p
       WHERE p.shop_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM branch_inventory bi
         WHERE bi.shop_id = p.shop_id AND bi.product_id = p.id
       )`,
      [shopId]
    );
  } catch (e: any) {
    console.warn('[db] migrateStockToBranchInventory:', e?.message || e);
  }
}

/** Enforce single branch for non-multi-branch plans (Bronze/Silver/Gold).
 *  Multi-branch shops (package='branches') are not touched.
 *
 *  Best-effort: if multiple branches exist for a non-multi plan, keep the first (lowest id),
 *  delete extra branch rows + their branch_inventory rows, and update shops.default_branch_id.
 */
export async function enforceSingleBranchForNonMultiPlan(shopId: number): Promise<void> {
  try {
    const [pkgRows] = await pool.execute<RowDataPacket[]>(
      'SELECT package FROM shops WHERE id = ?',
      [shopId]
    );
    const pkg = String((pkgRows as any[])[0]?.package ?? '').trim().toLowerCase();
    if (pkg === 'branches') return;

    const keptId = await ensureShopHasDefaultBranch(shopId);
    const [idRows] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM branches WHERE shop_id = ? ORDER BY id ASC',
      [shopId]
    );
    const ids = (idRows as any[]).map((r) => Number(r.id)).filter((n) => n && !Number.isNaN(n));
    if (ids.length <= 1) return;

    const keep = ids[0];
    const deleteIds = ids.filter((id) => id !== keep);
    if (deleteIds.length === 0) return;

    const placeholders = deleteIds.map(() => '?').join(',');
    await pool
      .execute(`DELETE FROM branch_inventory WHERE shop_id = ? AND branch_id IN (${placeholders})`, [shopId, ...deleteIds])
      .catch(() => {});
    await pool
      .execute(`DELETE FROM branches WHERE shop_id = ? AND id IN (${placeholders})`, [shopId, ...deleteIds])
      .catch(() => {});

    // Update the remaining branch name to match the store name.
    const [shopRows] = await pool.execute<RowDataPacket[]>(
      'SELECT ' +
        'COALESCE(business_name_ar, business_name_en, business_name, name) AS shop_name_any, ' +
        'COALESCE(business_name_ar, name) AS shop_name_ar, ' +
        'COALESCE(business_name_en, name) AS shop_name_en ' +
        'FROM shops WHERE id = ?',
      [shopId]
    );
    const shopNameAny = String((shopRows as any[])[0]?.shop_name_any || '').trim();
    const shopNameAr = String((shopRows as any[])[0]?.shop_name_ar || '').trim();
    const shopNameEn = String((shopRows as any[])[0]?.shop_name_en || '').trim();
    const defaultName = shopNameAny || 'Main Branch';
    const defaultNameAr = shopNameAr || defaultName;
    const defaultNameEn = shopNameEn || defaultName;

    await pool
      .execute(
        'UPDATE branches SET name = ?, name_ar = ?, name_en = ? WHERE id = ? AND shop_id = ?',
        [defaultNameEn, defaultNameAr, defaultNameEn, keep, shopId]
      )
      .catch(() => {});

    await pool.execute('UPDATE shops SET default_branch_id = ? WHERE id = ?', [keep, shopId]).catch(() => {});
  } catch (e: any) {
    console.warn('[db] enforceSingleBranchForNonMultiPlan:', e?.message || e);
  }
}

/** If branch_inventory is empty, populate from products.stock_quantity for branch 1 (or first branch per shop). */
export async function populateBranchInventoryFromProducts(): Promise<void> {
  try {
    const [tables] = await pool.execute(
      "SELECT COUNT(*) as c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('branch_inventory','products')"
    );
    if (Number((tables as any[])[0]?.c) !== 2) return;
    const [countRows] = await pool.execute('SELECT COUNT(*) as c FROM branch_inventory');
    const count = Number((countRows as any[])[0]?.c ?? 0);
    if (count > 0) return;
    const [shops] = await pool.execute('SELECT id FROM shops').catch(() => [[]]);
    for (const s of (shops as any[])) {
      const shopId = Number(s.id);
      const [branchRow] = await pool.execute('SELECT id FROM branches WHERE shop_id = ? ORDER BY id ASC LIMIT 1').catch(() => [[]]);
      const branchId = (branchRow as any[])[0]?.id ?? 1;
      await pool.execute(
        `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity)
         SELECT shop_id, ?, id, COALESCE(stock_quantity, 0) FROM products WHERE shop_id = ?
         ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
        [branchId, shopId]
      ).catch(() => {});
    }
    console.log('[db] populateBranchInventoryFromProducts done');
  } catch (e: any) {
    console.warn('[db] populateBranchInventoryFromProducts:', e?.message || e);
  }
}

/** Best-effort migration: ensure each shop has a default branch and that every product
 * has at least one branch_inventory row (quantity from products.stock_quantity). */
export async function migrateAllShopsStockToBranchInventory(): Promise<void> {
  try {
    // Ensure base tables exist before attempting inserts.
    const [tables] = await pool.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('branch_inventory','products')"
    );
    const tableNames = new Set((tables as any[]).map((r) => String(r.TABLE_NAME)));
    if (!tableNames.has('branch_inventory') || !tableNames.has('products')) return;
    const [shops] = await pool.execute('SELECT id FROM shops') as [any[], any];
    for (const s of (shops as any[])) {
      const shopId = Number(s.id);
      if (!shopId || Number.isNaN(shopId)) continue;
      await ensureShopHasDefaultBranch(shopId);
      await migrateStockToBranchInventory(shopId);
    }
    console.log('[db] migrateAllShopsStockToBranchInventory done');
  } catch (e: any) {
    console.warn('[db] migrateAllShopsStockToBranchInventory:', e?.message || e);
  }
}

/** Ensure inventory_movements table exists for audit trail (purchase, sale, transfer_in, transfer_out, adjustment). */
export async function ensureInventoryMovementsTable(): Promise<void> {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        product_id INT NOT NULL,
        branch_id INT NULL,
        type VARCHAR(32) NOT NULL COMMENT 'purchase, sale, transfer_in, transfer_out, adjustment',
        quantity DECIMAL(10,2) NOT NULL,
        reference_id INT NULL COMMENT 'invoice_id, transfer_id, etc',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_shop (shop_id),
        INDEX idx_product (product_id),
        INDEX idx_branch (branch_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) {
    console.warn('[db] ensureInventoryMovementsTable:', e?.message || e);
  }
}

/** Ensure accounting tables exist (accounts, journal_entries, journal_lines). Call before any accounting API. */
export async function ensureAccountingTables(): Promise<void> {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        code VARCHAR(32) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type ENUM('asset','liability','equity','revenue','expense') NOT NULL,
        parent_id INT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_accounts_shop (shop_id),
        UNIQUE KEY uq_accounts_shop_code (shop_id, code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        entry_date DATE NOT NULL,
        reference VARCHAR(128) NULL,
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_je_shop (shop_id),
        INDEX idx_je_date (entry_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS journal_lines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        journal_entry_id INT NOT NULL,
        account_id INT NOT NULL,
        debit DECIMAL(12,2) NOT NULL DEFAULT 0,
        credit DECIMAL(12,2) NOT NULL DEFAULT 0,
        INDEX idx_jl_entry (journal_entry_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) {
    console.warn('[db] ensureAccountingTables:', e?.message || e);
  }
}

/** Ensure journal_entries has source_type and source_id (auto-fix schema on startup). */
export async function ensureJournalColumns(): Promise<void> {
  try {
    const [columns] = await pool.execute<RowDataPacket[]>(`SHOW COLUMNS FROM journal_entries`);
    const columnNames = (columns || []).map((c: any) => (c.Field || c.field || '').toString());
    if (!columnNames.includes('source_type')) {
      await pool.execute(`ALTER TABLE journal_entries ADD COLUMN source_type VARCHAR(50) NULL`);
    }
    if (!columnNames.includes('source_id')) {
      await pool.execute(`ALTER TABLE journal_entries ADD COLUMN source_id INT NULL`);
    }
    if (!columnNames.includes('branch_id')) {
      await pool.execute(`ALTER TABLE journal_entries ADD COLUMN branch_id INT NULL`);
    }
    console.log('[db] Journal table schema verified');
  } catch (err: any) {
    console.error('[db] ensureJournalColumns failed:', err?.message || err);
  }
}

/** Stock movements: IN | OUT | TRANSFER | ADJUSTMENT for ERP audit. */
export async function ensureStockMovementsTable(): Promise<void> {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        product_id INT NOT NULL,
        branch_id INT NULL,
        type VARCHAR(24) NOT NULL COMMENT 'IN, OUT, TRANSFER, ADJUSTMENT',
        quantity DECIMAL(10,2) NOT NULL,
        reference VARCHAR(128) NULL COMMENT 'sale_id, purchase_id, transfer_id',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_shop (shop_id),
        INDEX idx_product (product_id),
        INDEX idx_branch (branch_id),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await alignShopIdColumnToShops('stock_movements');
    await addShopForeignKeyIfMissing('stock_movements', 'fk_stock_movements_shop');
  } catch (e: any) {
    console.warn('[db] ensureStockMovementsTable:', e?.message || e);
  }
}

/** Repair: for products with stock_quantity but no branch_inventory rows, create rows and distribute stock across shop branches. */
export async function repairBranchInventoryFromProducts(): Promise<void> {
  try {
    await ensureBranchInventoryTable();
    await ensureBranchInventoryColumns();
    const [tables] = await pool.execute(
      "SELECT COUNT(*) as c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('branch_inventory','products','branches')"
    );
    if (Number((tables as any[])[0]?.c) !== 3) return;
    const [shops] = await pool.execute('SELECT id FROM shops').catch(() => [[]]);
    for (const s of (shops as any[])) {
      const shopId = Number(s.id);
      const [branches] = await pool.execute('SELECT id FROM branches WHERE shop_id = ? ORDER BY id ASC', [shopId]);
      const branchIds = (branches as any[]).map((r: any) => Number(r.id));
      if (branchIds.length === 0) continue;
      const [productsWithStock] = await pool.execute(
        'SELECT id, COALESCE(stock_quantity, 0) as stock_quantity FROM products WHERE shop_id = ? AND COALESCE(stock_quantity, 0) > 0',
        [shopId]
      );
      for (const prod of (productsWithStock as any[])) {
        const productId = Number(prod.id);
        const totalStock = Number(prod.stock_quantity) || 0;
        const [existing] = await pool.execute(
          'SELECT 1 FROM branch_inventory WHERE shop_id = ? AND product_id = ? LIMIT 1',
          [shopId, productId]
        );
        if ((existing as any[]).length > 0) continue;
        const perBranch = Math.floor(totalStock / branchIds.length);
        const remainder = totalStock - perBranch * branchIds.length;
        for (let i = 0; i < branchIds.length; i++) {
          const qty = perBranch + (i === 0 ? remainder : 0);
          await pool.execute(
            `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
            [shopId, branchIds[i], productId, qty]
          ).catch(() => {});
        }
      }
    }
    console.log('[db] repairBranchInventoryFromProducts done');
  } catch (e: any) {
    console.warn('[db] repairBranchInventoryFromProducts:', e?.message || e);
  }
}

/** Ensure stock_transfers and branch transfer columns exist. Run on server start and before stock-transfer API. */
export async function ensureStockTransferTables(): Promise<void> {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS stock_transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        from_warehouse_id INT NULL,
        to_warehouse_id INT NULL,
        from_branch_id BIGINT UNSIGNED NULL,
        to_branch_id BIGINT UNSIGNED NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        status ENUM('pending','completed','cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_st_shop (shop_id),
        INDEX idx_st_branches (from_branch_id, to_branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    try {
      await pool.execute('ALTER TABLE stock_transfers ADD COLUMN from_branch_id BIGINT UNSIGNED NULL AFTER to_warehouse_id');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE stock_transfers ADD COLUMN to_branch_id BIGINT UNSIGNED NULL AFTER from_branch_id');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE stock_transfers MODIFY COLUMN from_warehouse_id INT NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE stock_transfers MODIFY COLUMN to_warehouse_id INT NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    await alignShopIdColumnToShops('stock_transfers');
    await addShopForeignKeyIfMissing('stock_transfers', 'fk_stock_transfers_shop');
  } catch (e: any) {
    console.warn('[db] ensureStockTransferTables:', e?.message || e);
  }
}

async function ensureSaleItemsProductIdNullable() {
  try {
    const [fkRows] = await pool.execute(
      `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sale_items'
         AND COLUMN_NAME = 'product_id' AND REFERENCED_TABLE_NAME = 'products'
       LIMIT 1`
    );
    const fkName = (fkRows as RowDataPacket[])[0]?.CONSTRAINT_NAME as string | undefined;
    if (fkName) {
      await pool.execute(`ALTER TABLE sale_items DROP FOREIGN KEY \`${String(fkName).replace(/`/g, '')}\``);
    }
  } catch (e: any) {
    const ign = ['ER_CANT_DROP_FIELD_OR_KEY', 'ER_BAD_FIELD_ERROR', '42S02'];
    if (!ign.includes(e?.code) && e?.errno !== 1091) console.warn('[db] sale_items drop FK product_id:', e?.message || e);
  }
  try {
    await pool.execute('ALTER TABLE sale_items MODIFY COLUMN product_id INT NULL');
  } catch (e: any) {
    if (e?.code !== 'ER_BAD_FIELD_ERROR') console.warn('[db] sale_items product_id NULL:', e?.message || e);
  }
  try {
    await pool.execute(
      `ALTER TABLE sale_items ADD CONSTRAINT sale_items_product_id_fk
       FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL`
    );
  } catch (e: any) {
    const okDup = e?.code === 'ER_DUP_KEYNAME' || e?.errno === 1826 || String(e?.message || '').includes('Duplicate');
    if (!okDup) console.warn('[db] sale_items add FK product_id:', e?.message || e);
  }
}

async function runInitializeDatabase() {
  try {
    // Users table with RBAC roles
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'cashier',
        package VARCHAR(32) NULL DEFAULT 'bronze',
        shop_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_shop_id (shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure role includes warehouse and branch_manager (for existing schemas)
    try {
      await pool.execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(32) NOT NULL DEFAULT 'cashier'");
    } catch (e: any) {
      if (e?.code !== 'ER_BAD_FIELD_ERROR') {}
    }

    // Shops table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS shops (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        business_name VARCHAR(255) NULL,
        owner_name VARCHAR(255) NULL,
        activity_type VARCHAR(255) NULL,
        address TEXT NULL,
        contact_email VARCHAR(255) NULL,
        contact_phone VARCHAR(64) NULL,
        country_name VARCHAR(255) NULL,
        currency_code VARCHAR(16) NULL,
        currency_symbol VARCHAR(16) NULL,
        plan_type VARCHAR(32) NULL,
        is_active TINYINT(1) DEFAULT 0,
        trial_ends_at TIMESTAMP NULL,
        logo_url TEXT NULL,
        owner_id INT NOT NULL,
        package VARCHAR(32) NULL DEFAULT 'bronze',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_owner_id (owner_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Custom domains table (multi-tenant storefront resolution by Host header)
    // - One domain maps to one shop_id (UNIQUE domain)
    // - Allowed TLDs: .com, .net, .org, .shop, .store (enforced by CHECK + app validation)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS domains (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        domain VARCHAR(253) NOT NULL,
        status ENUM('pending', 'verified', 'active', 'inactive') DEFAULT 'pending',
        is_active TINYINT(1) DEFAULT 0,
        verification_method ENUM('txt', 'cname') DEFAULT 'txt',
        verification_token CHAR(64) NOT NULL,
        verified_at TIMESTAMP NULL,
        activated_at TIMESTAMP NULL,
        deactivated_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_domains_shop_id FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        CONSTRAINT uq_domains_domain UNIQUE (domain),
        CONSTRAINT ck_domains_domain_lower CHECK (domain = LOWER(domain)),
        CONSTRAINT ck_domains_allowed_tld CHECK (SUBSTRING_INDEX(domain, '.', -1) IN ('com', 'net', 'org', 'shop', 'store')),
        CONSTRAINT ck_domains_domain_format CHECK (
          domain REGEXP '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+(com|net|org|shop|store)$'
        ),
        INDEX idx_domains_shop_id (shop_id),
        INDEX idx_domains_resolution (domain, is_active, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Domains migrations for existing schemas (safe adds)
    const domainColumns: Array<{ name: string; definition: string }> = [
      { name: 'status', definition: `ENUM('pending', 'verified', 'active', 'inactive') DEFAULT 'pending'` },
      { name: 'is_active', definition: 'TINYINT(1) DEFAULT 0' },
      { name: 'verification_method', definition: `ENUM('txt', 'cname') DEFAULT 'txt'` },
      // NOTE: added nullable for migration safety; we backfill + tighten below
      { name: 'verification_token', definition: 'CHAR(64) NULL' },
      { name: 'verified_at', definition: 'TIMESTAMP NULL' },
      { name: 'activated_at', definition: 'TIMESTAMP NULL' },
      { name: 'deactivated_at', definition: 'TIMESTAMP NULL' },
    ];

    for (const column of domainColumns) {
      try {
        await pool.execute(`ALTER TABLE domains ADD COLUMN ${column.name} ${column.definition};`);
      } catch (error: any) {
        if (error?.code !== 'ER_DUP_FIELDNAME' && error?.code !== 'ER_NO_SUCH_TABLE') {
          throw error;
        }
      }
    }

    // Backfill missing verification tokens (if table existed before this migration)
    try {
      const [rows] = await pool.execute(
        `SELECT id FROM domains WHERE verification_token IS NULL OR verification_token = ''`
      );
      for (const row of rows as any[]) {
        const token = crypto.randomBytes(32).toString('hex');
        await pool.execute('UPDATE domains SET verification_token = ? WHERE id = ?', [token, row.id]);
      }
      try {
        await pool.execute('ALTER TABLE domains MODIFY COLUMN verification_token CHAR(64) NOT NULL');
      } catch (error: any) {
        // Ignore if already NOT NULL or table missing
        if (error?.code !== 'ER_NO_SUCH_TABLE') {
          // Some MySQL setups might reject this if constraints differ; keep it best-effort.
        }
      }
    } catch (error: any) {
      if (error?.code !== 'ER_NO_SUCH_TABLE') {
        throw error;
      }
    }

    try {
      await pool.execute('CREATE UNIQUE INDEX uq_domains_domain ON domains (domain)');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEYNAME') {
        // Ignore missing table as it will be created above
        if (error?.code !== 'ER_NO_SUCH_TABLE') throw error;
      }
    }

    try {
      await pool.execute('CREATE INDEX idx_domains_resolution ON domains (domain, is_active, status)');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEYNAME') {
        if (error?.code !== 'ER_NO_SUCH_TABLE') throw error;
      }
    }

    // Branches table (multi-branch per shop)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS branches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255) NULL,
        name_en VARCHAR(255) NULL,
        code VARCHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        UNIQUE KEY uq_branches_shop_code (shop_id, code),
        INDEX idx_branches_shop_id (shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute('ALTER TABLE branches ADD COLUMN name_ar VARCHAR(255) NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE branches ADD COLUMN name_en VARCHAR(255) NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute("UPDATE branches SET name_ar = name, name_en = CASE WHEN name = 'الفرع الرئيسي' THEN 'Main Branch' ELSE name END WHERE name_ar IS NULL OR name_en IS NULL");
    } catch (_) {}
    try {
      await pool.execute('ALTER TABLE shops ADD COLUMN default_branch_id BIGINT UNSIGNED NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    try {
      await pool.execute('ALTER TABLE shops ADD CONSTRAINT fk_shops_default_branch FOREIGN KEY (default_branch_id) REFERENCES branches(id) ON DELETE SET NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME' && e?.code !== 'ER_FK_DUP_NAME') {}
    }

    // User-branch assignments (Branch Manager restricted to assigned branch)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_branch_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        branch_id BIGINT UNSIGNED NOT NULL,
        shop_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_branch (user_id, branch_id),
        INDEX idx_uba_user (user_id),
        INDEX idx_uba_branch (branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Subscriptions (per-shop plan and expiry; stacking via subscription_activations)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL UNIQUE,
        plan_name VARCHAR(32) NOT NULL DEFAULT 'gold',
        started_at TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        last_activated_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        INDEX idx_subscriptions_shop (shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS subscription_activations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        code VARCHAR(128) NOT NULL,
        days INT NOT NULL,
        activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        previous_expires_at TIMESTAMP NULL,
        new_expires_at TIMESTAMP NULL,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        INDEX idx_sub_act_shop (shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Categories table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        shop_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_shop_id (shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Tax rates (name, rate_type as type, value as rate, is_price_inclusive as inclusive, apply_before_discount)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS tax_rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        type ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
        rate DECIMAL(10,2) NOT NULL DEFAULT 0,
        inclusive TINYINT(1) NOT NULL DEFAULT 0,
        apply_before_discount TINYINT(1) NOT NULL DEFAULT 1,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tax_rates_shop (shop_id),
        CONSTRAINT fk_tax_rates_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Products/Inventory table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        sku VARCHAR(128) NULL,
        barcode VARCHAR(128) NULL,
        qr_code VARCHAR(255) NULL,
        brand VARCHAR(255),
        category_id INT,
        buy_price DECIMAL(10, 2) NOT NULL,
        sell_price DECIMAL(10, 2) NOT NULL,
        stock_quantity INT DEFAULT 0,
        min_stock_level INT DEFAULT 5,
        image_url TEXT NULL,
        shop_id INT NOT NULL,
        is_deleted TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        INDEX idx_shop_id (shop_id),
        INDEX idx_category_id (category_id),
        INDEX idx_sku (sku),
        INDEX idx_barcode (barcode),
        INDEX idx_qr_code (qr_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Branch inventory (qty per branch); all FK columns INT to match shops.id, branches.id, products.id (avoid ER_FK_INCOMPATIBLE_COLUMNS)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS branch_inventory (
        id INT NOT NULL AUTO_INCREMENT,
        shop_id INT NOT NULL,
        branch_id BIGINT UNSIGNED NOT NULL,
        product_id INT NOT NULL,
        qty INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_branch_inventory (branch_id, product_id),
        INDEX idx_branch_inventory_shop (shop_id),
        INDEX idx_branch_inventory_branch (branch_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Sales/Transactions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        user_id INT NULL,
        invoice_number VARCHAR(32) UNIQUE NULL,
        customer_name VARCHAR(255) NULL,
        customer_phone VARCHAR(64) NULL,
        customer_address TEXT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_method ENUM('cash', 'card', 'other', 'invoice') DEFAULT 'cash',
        print_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_shop_id (shop_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute('ALTER TABLE sales ADD COLUMN branch_id BIGINT UNSIGNED NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    try {
      await pool.execute('CREATE INDEX idx_sales_branch_id ON sales(branch_id)');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME') {}
    }

    await pool.execute(`
      ALTER TABLE sales
      MODIFY COLUMN user_id BIGINT UNSIGNED NULL;

    `);

    try {
      await pool.execute(`ALTER TABLE products ADD COLUMN image_url TEXT NULL;`);
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    // Soft-delete flag for products (many queries filter on p.is_deleted)
    try {
      await pool.execute('ALTER TABLE products ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    const shopColumns: Array<{ name: string; definition: string }> = [
      { name: 'business_name', definition: 'VARCHAR(255) NULL' },
      { name: 'owner_name', definition: 'VARCHAR(255) NULL' },
      { name: 'activity_type', definition: 'VARCHAR(255) NULL' },
      { name: 'address', definition: 'TEXT NULL' },
      { name: 'contact_email', definition: 'VARCHAR(255) NULL' },
      { name: 'contact_phone', definition: 'VARCHAR(64) NULL' },
      { name: 'logo_url', definition: 'TEXT NULL' },
      { name: 'country_name', definition: 'VARCHAR(255) NULL' },
      { name: 'currency_code', definition: 'VARCHAR(16) NULL' },
      { name: 'currency_symbol', definition: 'VARCHAR(16) NULL' },
      { name: 'plan_type', definition: 'VARCHAR(32) NULL' },
      { name: 'is_active', definition: 'TINYINT(1) DEFAULT 0' },
      { name: 'trial_ends_at', definition: 'TIMESTAMP NULL' },
    ];

    for (const column of shopColumns) {
      try {
        await pool.execute(`ALTER TABLE shops ADD COLUMN ${column.name} ${column.definition};`);
      } catch (error: any) {
        if (error?.code !== 'ER_DUP_FIELDNAME') {
          throw error;
        }
      }
    }

    try {
      await pool.execute('ALTER TABLE shops MODIFY COLUMN logo_url LONGTEXT');
    } catch (error: any) {
      if (error?.code !== 'ER_BAD_FIELD_ERROR') {
        throw error;
      }
    }

    const shopUsageColumns: Array<{ name: string; definition: string }> = [
      { name: 'ai_used_month', definition: 'INT NOT NULL DEFAULT 0' },
      { name: 'ocr_used_month', definition: 'INT NOT NULL DEFAULT 0' },
      { name: 'usage_period_start', definition: 'DATE NULL' },
      { name: 'ai_limit_bonus', definition: 'INT NOT NULL DEFAULT 0' },
      { name: 'ocr_limit_bonus', definition: 'INT NOT NULL DEFAULT 0' },
    ];
    for (const column of shopUsageColumns) {
      try {
        await pool.execute(`ALTER TABLE shops ADD COLUMN ${column.name} ${column.definition};`);
      } catch (error: any) {
        if (error?.code !== 'ER_DUP_FIELDNAME') {
          throw error;
        }
      }
    }

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ai_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(64) NOT NULL,
        ai_messages INT NOT NULL DEFAULT 0,
        ocr_credits INT NOT NULL DEFAULT 0,
        expires_at TIMESTAMP NULL,
        is_used TINYINT(1) NOT NULL DEFAULT 0,
        used_by_shop_id INT NULL,
        used_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_ai_codes_code (code),
        INDEX idx_ai_codes_used (is_used),
        INDEX idx_ai_codes_shop (used_by_shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const productColumns: Array<{ name: string; definition: string }> = [
      { name: 'sku', definition: 'VARCHAR(128) NULL' },
      { name: 'barcode', definition: 'VARCHAR(128) NULL' },
      { name: 'qr_code', definition: 'VARCHAR(255) NULL' },
      { name: 'expiry_date', definition: 'DATE NULL' },
      { name: 'production_date', definition: 'DATE NULL' },
      /** Baseline qty when product was stocked — for «remaining X of Y» low-stock messaging */
      { name: 'stock_reference_qty', definition: 'INT NULL' },
    ];

    for (const column of productColumns) {
      try {
        await pool.execute(`ALTER TABLE products ADD COLUMN ${column.name} ${column.definition};`);
      } catch (error: any) {
        if (error?.code !== 'ER_DUP_FIELDNAME') {
          throw error;
        }
      }
    }

    try {
      await pool.execute('CREATE INDEX idx_sku ON products (sku)');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    // product_units + product_barcodes (multi-level packaging)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS product_units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        name_ar VARCHAR(64) NOT NULL,
        name_en VARCHAR(64) NULL,
        factor_to_base INT NOT NULL DEFAULT 1,
        level TINYINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_product_units_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS product_barcodes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        barcode_value VARCHAR(128) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_product_barcodes_value (barcode_value),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_product_barcodes_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    for (const col of [
      { name: 'carton_packs_count', def: 'INT NULL' },
      { name: 'pack_units_count', def: 'INT NULL' },
    ]) {
      try {
        await pool.execute(`ALTER TABLE products ADD COLUMN ${col.name} ${col.def}`);
      } catch (e: any) {
        if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
      }
    }
    for (const col of [
      { name: 'unit_id', def: 'INT NULL' },
      { name: 'quantity_base_units', def: 'INT NULL' },
    ]) {
      try {
        await pool.execute(`ALTER TABLE sale_items ADD COLUMN ${col.name} ${col.def}`);
      } catch (e: any) {
        if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
      }
    }

    try {
      await pool.execute('CREATE INDEX idx_barcode ON products (barcode)');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    try {
      await pool.execute('CREATE INDEX idx_qr_code ON products (qr_code)');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    try {
      await pool.execute('ALTER TABLE products ADD COLUMN import_batch_id INT NULL');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
    // Products: is_incomplete, extra_fields, missing_fields (Excel import / edit)
    try {
      await pool.execute('ALTER TABLE products ADD COLUMN is_incomplete TINYINT(1) DEFAULT 0');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE products ADD COLUMN extra_fields JSON NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE products ADD COLUMN missing_fields JSON NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    // Online product details (eCommerce)
    const productDetailColumns: Array<{ name: string; definition: string }> = [
      { name: 'description_short', definition: 'TEXT NULL' },
      { name: 'description_long', definition: 'TEXT NULL' },
      { name: 'specs_json', definition: 'JSON NULL' },
      { name: 'warranty_text', definition: 'TEXT NULL' },
      { name: 'return_policy_text', definition: 'TEXT NULL' },
      { name: 'gallery_urls_json', definition: 'JSON NULL' },
    ];
    for (const col of productDetailColumns) {
      try {
        await pool.execute(`ALTER TABLE products ADD COLUMN ${col.name} ${col.definition}`);
      } catch (e: any) {
        if (e?.code !== 'ER_DUP_FIELDNAME') {}
      }
    }
    try {
      await pool.execute('CREATE INDEX idx_products_import_batch ON products (import_batch_id)');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    // Products: tax_rate_id (FK to tax_rates) for item tax on invoices
    try {
      await pool.execute('ALTER TABLE products ADD COLUMN tax_rate_id INT NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    try {
      await pool.execute('CREATE INDEX idx_products_tax_rate ON products (tax_rate_id)');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME') {}
    }

    const salesColumns: Array<{ name: string; definition: string }> = [
      { name: 'customer_name', definition: 'VARCHAR(255) NULL' },
      { name: 'customer_phone', definition: 'VARCHAR(64) NULL' },
      { name: 'customer_address', definition: 'TEXT NULL' },
    ];

    for (const column of salesColumns) {
      try {
        await pool.execute(`ALTER TABLE sales ADD COLUMN ${column.name} ${column.definition};`);
      } catch (error: any) {
        if (error?.code !== 'ER_DUP_FIELDNAME') {
          throw error;
        }
      }
    }

    // Invoice print counter (for existing schemas)
    try {
      await pool.execute('ALTER TABLE sales ADD COLUMN print_count INT DEFAULT 0;');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    // Sales: tax/subtotal columns for invoice display
    for (const col of [
      { name: 'subtotal', def: 'DECIMAL(10,2) NULL' },
      { name: 'total_discount', def: 'DECIMAL(10,2) NULL' },
      { name: 'total_tax', def: 'DECIMAL(10,2) NULL' },
      { name: 'grand_total', def: 'DECIMAL(10,2) NULL' },
    ]) {
      try {
        await pool.execute(`ALTER TABLE sales ADD COLUMN ${col.name} ${col.def}`);
      } catch (e: any) {
        if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
      }
    }

    // Password resets table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(128) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_token (token)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await pool.execute(`ALTER TABLE sales ADD COLUMN invoice_number VARCHAR(32) UNIQUE NULL;`);
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    await pool.execute(`
      ALTER TABLE sales
      MODIFY COLUMN payment_method ENUM('cash', 'card', 'other', 'invoice') DEFAULT 'cash';
    `);

    // Sale items table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_sale_id (sale_id),
        INDEX idx_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute('ALTER TABLE sale_items ADD COLUMN branch_id BIGINT UNSIGNED NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    // Sale items: discount columns
    for (const col of [
      { name: 'unit_price_before_discount', def: 'DECIMAL(10,2) NULL' },
      { name: 'unit_discount', def: 'DECIMAL(10,2) NULL' },
      { name: 'discount_type', def: 'VARCHAR(32) NULL' },
      { name: 'discount_value', def: 'DECIMAL(10,2) NULL' },
      { name: 'discount_applied', def: 'TINYINT(1) DEFAULT 0' },
    ]) {
      try {
        await pool.execute(`ALTER TABLE sale_items ADD COLUMN ${col.name} ${col.def}`);
      } catch (e: any) {
        if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
      }
    }
    // Sale items: tax columns for invoice/receipt
    for (const col of [
      { name: 'tax_rate_id', def: 'INT NULL' },
      { name: 'tax_rate', def: 'DECIMAL(10,2) NULL' },
      { name: 'tax_amount', def: 'DECIMAL(10,2) NULL' },
      { name: 'line_total_before_tax', def: 'DECIMAL(10,2) NULL' },
      { name: 'line_total_after_tax', def: 'DECIMAL(10,2) NULL' },
    ]) {
      try {
        await pool.execute(`ALTER TABLE sale_items ADD COLUMN ${col.name} ${col.def}`);
      } catch (e: any) {
        if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
      }
    }
    // Sale items: snapshot product identity (preserve invoice items after product delete)
    for (const col of [
      { name: 'product_name_ar', def: 'VARCHAR(255) NULL' },
      { name: 'product_name_en', def: 'VARCHAR(255) NULL' },
      { name: 'product_sku', def: 'VARCHAR(255) NULL' },
      { name: 'product_barcode', def: 'VARCHAR(255) NULL' },
    ]) {
      try {
        await pool.execute(`ALTER TABLE sale_items ADD COLUMN ${col.name} ${col.def}`);
      } catch (e: any) {
        if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
      }
    }

    /** Allow NULL product_id on sale_lines when product was deleted (debt→sale conversion uses name snapshots). */
    await ensureSaleItemsProductIdNullable();

    // Invoices view (alias for sales)
    await pool.execute(`CREATE OR REPLACE VIEW invoices AS SELECT * FROM sales;`);

    // Vault transactions (الخزنة)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS vault_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        user_id INT NULL,
        type ENUM('in', 'out') NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        reason VARCHAR(255) NULL,
        notes TEXT NULL,
        related_sale_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (related_sale_id) REFERENCES sales(id) ON DELETE SET NULL,
        INDEX idx_vault_shop_id (shop_id),
        INDEX idx_vault_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Audit logs (المراجع)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        user_id INT NULL,
        action VARCHAR(128) NOT NULL,
        entity_type VARCHAR(128) NOT NULL,
        entity_id INT NULL,
        details TEXT NULL,
        ip_address VARCHAR(64) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_audit_shop_id (shop_id),
        INDEX idx_audit_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Invoice print log (every print logs: invoice_id, printed_by_user_id, printed_at, print_count_after)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS invoice_print_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        invoice_id INT NOT NULL,
        invoice_type ENUM('pos', 'online') DEFAULT 'pos',
        printed_by_user_id INT NULL,
        printed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        print_count_after INT NOT NULL,
        INDEX idx_ipl_shop_invoice (shop_id, invoice_id),
        INDEX idx_ipl_printed_at (printed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Suppliers (purchase module)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NULL,
        email VARCHAR(255) NULL,
        address TEXT NULL,
        balance DECIMAL(10,2) NOT NULL DEFAULT 0,
        shop_id INT NOT NULL,
        branch_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_suppliers_shop (shop_id),
        INDEX idx_suppliers_branch (branch_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Purchase orders
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        supplier_id INT NULL,
        branch_id INT NULL,
        order_number VARCHAR(64) NULL,
        status ENUM('draft','approved','received','sent','partial','cancelled') DEFAULT 'draft',
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_po_shop (shop_id),
        INDEX idx_po_supplier (supplier_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Purchase order line items
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        INDEX idx_poi_order (order_id),
        FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Purchase invoices (when saved: increase stock, supplier balance, accounting)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        supplier_id INT NULL,
        order_id INT NULL,
        branch_id INT NULL,
        invoice_number VARCHAR(64) NULL,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        status ENUM('draft','paid','unpaid') DEFAULT 'unpaid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pi_shop (shop_id),
        INDEX idx_pi_supplier (supplier_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
        FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Purchase invoice line items (cost_price stored as unit_price)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_invoice_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL,
        total_price DECIMAL(12,2) NOT NULL,
        FOREIGN KEY (purchase_invoice_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_pi_items_invoice (purchase_invoice_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Purchase returns (decrease stock, decrease supplier balance)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        supplier_id INT NULL,
        invoice_id INT NULL,
        branch_id INT NULL,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pr_shop (shop_id),
        INDEX idx_pr_supplier (supplier_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
        FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchase_return_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        INDEX idx_pri_return (return_id),
        FOREIGN KEY (return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Inventory movements (purchase, return, adjustment, etc.)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        product_id INT NOT NULL,
        type VARCHAR(32) NOT NULL DEFAULT 'purchase',
        quantity INT NOT NULL,
        reference_type VARCHAR(32) NULL,
        reference_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_im_shop (shop_id),
        INDEX idx_im_product (product_id),
        INDEX idx_im_ref (reference_type, reference_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Optional: add columns to existing purchase_orders / purchase_invoices
    try {
      await pool.execute('ALTER TABLE purchase_orders ADD COLUMN branch_id INT NULL AFTER supplier_id');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE purchase_invoices ADD COLUMN order_id INT NULL AFTER supplier_id');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE purchase_invoices ADD COLUMN branch_id INT NULL AFTER order_id');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute("ALTER TABLE purchase_invoices ADD COLUMN status ENUM('draft','paid','unpaid') DEFAULT 'unpaid'");
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE purchase_items ADD COLUMN expiry_date DATE NULL AFTER total_price');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE purchase_items ADD COLUMN tax_percent DECIMAL(6,3) NULL AFTER expiry_date');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE purchase_items ADD COLUMN tax_amount DECIMAL(12,4) NULL AFTER tax_percent');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }

    // Warehouses (main + branch)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        branch_id BIGINT UNSIGNED NULL,
        name VARCHAR(255) NOT NULL,
        is_main TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_warehouses_shop (shop_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Stock transfers between warehouses
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS stock_transfers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        from_warehouse_id INT NOT NULL,
        to_warehouse_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        status ENUM('pending','completed','cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_st_shop (shop_id),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
        FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Chart of accounts
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        code VARCHAR(32) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type ENUM('asset','liability','equity','revenue','expense') NOT NULL,
        parent_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_accounts_shop (shop_id),
        UNIQUE KEY uq_accounts_shop_code (shop_id, code),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES accounts(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Journal entries
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        entry_date DATE NOT NULL,
        reference VARCHAR(128) NULL,
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_je_shop (shop_id),
        INDEX idx_je_date (entry_date),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Journal lines (debit/credit per account)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS journal_lines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        journal_entry_id INT NOT NULL,
        account_id INT NOT NULL,
        debit DECIMAL(12,2) NOT NULL DEFAULT 0,
        credit DECIMAL(12,2) NOT NULL DEFAULT 0,
        INDEX idx_jl_entry (journal_entry_id),
        FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Licenses table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_key VARCHAR(128) UNIQUE NOT NULL,
        plan ENUM('bronze', 'silver', 'gold') NOT NULL,
        duration ENUM('monthly', 'quarterly', 'yearly', 'lifetime') NOT NULL,
        status ENUM('unused', 'active', 'expired') DEFAULT 'unused',
        used_by_user_id INT NULL,
        used_at TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_license_key (license_key),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute("ALTER TABLE licenses MODIFY COLUMN plan VARCHAR(32) NOT NULL DEFAULT 'bronze'");
    } catch (e: any) {
      if (e?.code !== 'ER_BAD_FIELD_ERROR') {}
    }
    try {
      await pool.execute("ALTER TABLE licenses MODIFY COLUMN duration VARCHAR(32) NOT NULL DEFAULT 'monthly'");
    } catch (e: any) {
      if (e?.code !== 'ER_BAD_FIELD_ERROR') {}
    }
    try {
      await pool.execute('ALTER TABLE licenses ADD COLUMN duration_days INT NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME' && e?.code !== 'ER_NO_SUCH_TABLE') {}
    }
    try {
      await pool.execute('ALTER TABLE licenses ADD COLUMN permissions_json JSON NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME' && e?.code !== 'ER_NO_SUCH_TABLE') {}
    }
    try {
      await pool.execute('ALTER TABLE licenses ADD COLUMN used_by_shop_id INT NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME' && e?.code !== 'ER_NO_SUCH_TABLE') {}
    }
    try {
      await pool.execute('ALTER TABLE licenses ADD COLUMN code_expires_at TIMESTAMP NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME' && e?.code !== 'ER_NO_SUCH_TABLE') {}
    }

    // License codes (plan/feature activation codes)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS license_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(64) NOT NULL UNIQUE,
        kind VARCHAR(16) NOT NULL DEFAULT 'plan',
        feature_key VARCHAR(64) NULL,
        plan_key VARCHAR(16) NULL,
        max_branches INT NULL,
        expires_at DATETIME NULL,
        used_by_shop_id INT NULL,
        used_by_user_id INT NULL,
        used_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_license_codes_code (code),
        INDEX idx_license_codes_used (used_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Shop features (e.g. multi_branch with max_limit)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS shop_features (
        shop_id INT NOT NULL,
        feature_key VARCHAR(64) NOT NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 0,
        max_limit INT NULL,
        activated_at DATETIME NULL,
        expires_at DATETIME NULL,
        PRIMARY KEY (shop_id, feature_key),
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        INDEX idx_shop_features_key (feature_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Shop subscriptions (plan + status per shop)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS shop_subscriptions (
        shop_id INT NOT NULL PRIMARY KEY,
        plan VARCHAR(16) NOT NULL DEFAULT 'bronze',
        status VARCHAR(16) NOT NULL DEFAULT 'active',
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NULL,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute('ALTER TABLE shop_subscriptions ADD COLUMN activation_code VARCHAR(128) NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME' && e?.code !== 'ER_NO_SUCH_TABLE') {}
    }
    try {
      await pool.execute('ALTER TABLE shop_subscriptions ADD COLUMN activation_source VARCHAR(32) NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME' && e?.code !== 'ER_NO_SUCH_TABLE') {}
    }
    try {
      await pool.execute('ALTER TABLE shop_subscriptions ADD COLUMN activated_by_user_id INT NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME' && e?.code !== 'ER_NO_SUCH_TABLE') {}
    }
    try {
      await pool.execute('ALTER TABLE shop_subscriptions ADD COLUMN last_activated_at DATETIME NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME' && e?.code !== 'ER_NO_SUCH_TABLE') {}
    }
    try {
      await pool.execute('ALTER TABLE shop_subscriptions ADD COLUMN last_notified_expiring_at DATETIME NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME' && e?.code !== 'ER_NO_SUCH_TABLE') {}
    }

    // Ensure every shop has a row in shop_subscriptions (default bronze)
    try {
      await pool.execute(`
        INSERT INTO shop_subscriptions (shop_id, plan, status)
        SELECT s.id, COALESCE(s.package, 'bronze'), 'active'
        FROM shops s
        LEFT JOIN shop_subscriptions ss ON ss.shop_id = s.id
        WHERE ss.shop_id IS NULL
      `);
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_ENTRY' && e?.code !== 'ER_NO_REFERENCED_ROW_2') {}
    }

    // Import staging: batches and rows
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS import_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        shop_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        status ENUM('pending', 'partial', 'committed') DEFAULT 'pending',
        imported_count INT DEFAULT 0,
        failed_count INT DEFAULT 0,
        rolled_back_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        INDEX idx_import_batch_shop (shop_id),
        INDEX idx_import_batch_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute('ALTER TABLE import_batches ADD COLUMN rolled_back_at TIMESTAMP NULL');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') throw error;
    }
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS import_batch_rows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id INT NOT NULL,
        row_index INT NOT NULL,
        raw_data JSON,
        mapped_data JSON,
        errors JSON,
        status ENUM('pending', 'valid', 'invalid', 'imported', 'fixed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE CASCADE,
        INDEX idx_import_row_batch (batch_id),
        INDEX idx_import_row_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Insert default categories if they don't exist
    await pool.execute(`
      INSERT IGNORE INTO categories (name_en, name_ar) VALUES
      ('Oil', 'زيت'),
      ('Tires', 'إطارات'),
      ('Batteries', 'بطاريات');
    `);

    // Online orders (storefront) - spec schema
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS online_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
        customer_name VARCHAR(255) NOT NULL,
        phone VARCHAR(64) NOT NULL,
        governorate VARCHAR(128) NOT NULL,
        city VARCHAR(128) NOT NULL,
        address TEXT NOT NULL,
        notes TEXT NULL,
        payment_method VARCHAR(50) NULL,
        subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
        total DECIMAL(12, 2) NOT NULL DEFAULT 0,
        currency VARCHAR(8) DEFAULT 'EGP',
        source VARCHAR(32) DEFAULT 'online',
        public_code VARCHAR(16) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        INDEX idx_online_orders_shop (shop_id),
        INDEX idx_online_orders_status (status),
        INDEX idx_online_orders_public_code (public_code),
        INDEX idx_online_orders_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute('ALTER TABLE online_orders ADD COLUMN branch_id BIGINT UNSIGNED NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    // Payments / Orders: payment_status and order_status on orders
    try {
      await pool.execute("ALTER TABLE online_orders ADD COLUMN payment_status VARCHAR(32) NULL DEFAULT 'pending'");
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute("ALTER TABLE online_orders ADD COLUMN order_status VARCHAR(32) NULL DEFAULT 'NEW'");
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE online_orders ADD COLUMN total_tax DECIMAL(12,2) NULL DEFAULT 0');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute("UPDATE online_orders SET order_status = CASE WHEN status = 'pending' THEN 'NEW' WHEN status = 'confirmed' THEN 'PROCESSING' WHEN status = 'completed' THEN 'DELIVERED' WHEN status = 'cancelled' THEN 'CANCELLED' ELSE COALESCE(order_status, 'NEW') END WHERE order_status IS NULL");
    } catch (_) {}
    // Dedicated payments table (VodafoneCash, InstaPay, Bank transfers, etc.)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        order_id INT NOT NULL,
        branch_id BIGINT UNSIGNED NULL,
        method VARCHAR(64) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        reference VARCHAR(255) NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        proof_url TEXT NULL,
        reject_reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES online_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
        INDEX idx_payments_shop (shop_id),
        INDEX idx_payments_order (order_id),
        INDEX idx_payments_status (status),
        INDEX idx_payments_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS online_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NULL,
        name_snapshot VARCHAR(255) NULL,
        sku_snapshot VARCHAR(128) NULL,
        barcode_snapshot VARCHAR(128) NULL,
        sell_price_snapshot DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        FOREIGN KEY (order_id) REFERENCES online_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        INDEX idx_online_order_items_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    for (const col of [
      { name: 'tax_amount', def: 'DECIMAL(10,2) NULL DEFAULT 0' },
      { name: 'line_total_before_tax', def: 'DECIMAL(10,2) NULL' },
      { name: 'line_total_after_tax', def: 'DECIMAL(10,2) NULL' },
    ]) {
      try {
        await pool.execute(`ALTER TABLE online_order_items ADD COLUMN ${col.name} ${col.def}`);
      } catch (e: any) {
        if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
      }
    }

    // Extend sales for online invoices
    const salesExtensions: Array<{ name: string; definition: string }> = [
      { name: 'source', definition: "VARCHAR(16) DEFAULT 'pos'" },
      { name: 'online_order_id', definition: 'INT NULL' },
      { name: 'last_printed_at', definition: 'TIMESTAMP NULL' },
      { name: 'invoice_serial', definition: 'VARCHAR(64) NULL' },
    ];
    for (const col of salesExtensions) {
      try {
        await pool.execute(`ALTER TABLE sales ADD COLUMN ${col.name} ${col.definition};`);
      } catch (err: any) {
        if (err?.code !== 'ER_DUP_FIELDNAME') throw err;
      }
    }
    try {
      await pool.execute('CREATE UNIQUE INDEX idx_sales_invoice_serial ON sales(invoice_serial);');
    } catch (err: any) {
      if (err?.code !== 'ER_DUP_KEYNAME' && err?.code !== 'ER_MULTIPLE_PRI_KEY') {
        // column may not exist or index already exists
      }
    }

    // Dedicated online invoices (separate from POS sales)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS online_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        order_id INT NOT NULL UNIQUE,
        invoice_number INT NOT NULL,
        total DECIMAL(12, 2) NOT NULL DEFAULT 0,
        printed_count INT DEFAULT 0,
        last_printed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES online_orders(id) ON DELETE CASCADE,
        INDEX idx_online_invoices_shop (shop_id),
        INDEX idx_online_invoices_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS online_invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        product_id INT NULL,
        name_snapshot VARCHAR(255) NULL,
        sku_snapshot VARCHAR(128) NULL,
        price_snapshot DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        FOREIGN KEY (invoice_id) REFERENCES online_invoices(id) ON DELETE CASCADE,
        INDEX idx_online_invoice_items_invoice (invoice_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Add public_code to existing online_orders if missing
    try {
      await pool.execute('ALTER TABLE online_orders ADD COLUMN public_code VARCHAR(16) NULL');
    } catch (err: any) {
      if (err?.code !== 'ER_DUP_FIELDNAME') {
        // ignore
      }
    }
    try {
      const [rows] = await pool.execute("SELECT id FROM online_orders WHERE public_code IS NULL OR public_code = ''");
      for (const r of rows as any[]) {
        const code = generatePublicCode();
        await pool.execute('UPDATE online_orders SET public_code = ? WHERE id = ?', [code, r.id]);
      }
    } catch {
      // best effort backfill
    }

    // Notifications (activity log: online + pos + system) - persistent forever
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        source VARCHAR(32) NOT NULL DEFAULT 'online',
        type VARCHAR(64) NOT NULL DEFAULT 'online_order_created',
        title_ar VARCHAR(255) NOT NULL DEFAULT '',
        title_en VARCHAR(255) NOT NULL DEFAULT '',
        body_ar TEXT NOT NULL,
        body_en TEXT NOT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        meta JSON NULL,
        payload JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        INDEX idx_notifications_shop_created (shop_id, created_at DESC),
        INDEX idx_notifications_shop_read (shop_id, is_read),
        INDEX idx_notifications_shop_source_created (shop_id, source, created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // Safe migrations for existing tables
    try {
      await pool.execute('ALTER TABLE notifications ADD COLUMN source VARCHAR(32) NOT NULL DEFAULT \'online\' AFTER shop_id');
    } catch (m: any) {
      if (!String(m?.message || m).includes('Duplicate column')) console.error('notifications.source:', m?.message || m);
    }
    try {
      await pool.execute('CREATE INDEX idx_notifications_shop_source_created ON notifications (shop_id, source, created_at DESC)');
    } catch (m: any) {
      if (!String(m?.message || m).includes('Duplicate')) console.error('notifications.idx_shop_source_created:', m?.message || m);
    }
    try {
      await pool.execute('ALTER TABLE notifications ADD COLUMN branch_id BIGINT UNSIGNED NULL');
    } catch (m: any) {
      if (m?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE notifications ADD COLUMN payload JSON NULL');
    } catch (m: any) {
      if (m?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE notifications CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci');
    } catch (m: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('notifications.collation:', m?.message || m);
      }
    }
    try {
      await pool.execute(
        "ALTER TABLE notifications MODIFY COLUMN title_ar VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT ''"
      );
    } catch (m: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('notifications.title_ar:', m?.message || m);
      }
    }
    try {
      await pool.execute(
        "ALTER TABLE notifications MODIFY COLUMN title_en VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT ''"
      );
    } catch (m: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('notifications.title_en:', m?.message || m);
      }
    }
    try {
      await pool.execute(
        'ALTER TABLE notifications MODIFY COLUMN body_ar TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL'
      );
    } catch (m: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('notifications.body_ar:', m?.message || m);
      }
    }
    try {
      await pool.execute(
        'ALTER TABLE notifications MODIFY COLUMN body_en TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL'
      );
    } catch (m: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('notifications.body_en:', m?.message || m);
      }
    }
    await backfillNotificationPayload();
    await cleanupNotificationMojibake();

    // Stock reservations for online orders (prevent overselling)
    // Ensure PK/FK types match INT IDs in shops / online_orders / products
    if (process.env.NODE_ENV !== 'production' && (process.env.DB_NAME || '').includes('_dev')) {
      // In dev-only databases, drop any legacy table with wrong types so we can recreate cleanly
      await pool.execute('DROP TABLE IF EXISTS stock_reservations');
    }
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS stock_reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        qty INT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'reserved',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_reservations_order (order_id),
        INDEX idx_reservations_shop_status (shop_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute('ALTER TABLE stock_reservations ADD COLUMN branch_id BIGINT UNSIGNED NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    await ensureStockReservationsForeignKeys();

    // Backfill default branch for existing shops (multi-branch)
    try {
      const [shopsRows] = await pool.execute('SELECT s.id AS shop_id FROM shops s LEFT JOIN branches b ON b.shop_id = s.id WHERE b.id IS NULL');
      for (const row of (shopsRows as any[])) {
        const [ins] = await pool.execute('INSERT INTO branches (shop_id, name, name_ar, name_en, code) VALUES (?, ?, ?, ?, ?)', [
          row.shop_id,
          'الفرع الرئيسي',
          'الفرع الرئيسي',
          'Main Branch',
          'main',
        ]);
        const insertId = (ins as any).insertId;
        await pool.execute('UPDATE shops SET default_branch_id = ? WHERE id = ?', [insertId, row.shop_id]);
      }
    } catch (e) {
      // best effort
    }

    // Extend package enum for Royal + Branches plan
    try {
      await pool.execute(
        "ALTER TABLE shops MODIFY COLUMN package VARCHAR(32) NULL DEFAULT 'bronze'"
      );
    } catch (e: any) {
      if (e?.code !== 'ER_BAD_FIELD_ERROR') {}
    }
    try {
      await pool.execute(
        "ALTER TABLE users MODIFY COLUMN package VARCHAR(32) NULL DEFAULT 'bronze'"
      );
    } catch (e: any) {
      if (e?.code !== 'ER_BAD_FIELD_ERROR') {}
    }

    // Flexible login: employee_id + email (nullable)
    try {
      await pool.execute('ALTER TABLE users ADD COLUMN employee_id VARCHAR(64) NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('CREATE INDEX idx_users_shop_username ON users (shop_id, username)');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME') {}
    }
    try {
      await pool.execute('CREATE INDEX idx_users_shop_employee_id ON users (shop_id, employee_id)');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME') {}
    }
    try {
      await pool.execute('CREATE UNIQUE INDEX ux_users_shop_employee_id ON users (shop_id, employee_id)');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME' && e?.code !== 'ER_DUP_ENTRY') {}
    }
    try {
      await pool.execute('CREATE INDEX idx_users_email ON users (email)');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE users ADD COLUMN username VARCHAR(64) NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('CREATE UNIQUE INDEX ux_users_username ON users (username)');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME') {}
    }

    // Backfill username for existing rows where username IS NULL (avoid duplicates with prefix_id)
    try {
      const [rows] = await pool.execute<UserRow[]>(
        'SELECT id, email FROM users WHERE username IS NULL OR TRIM(COALESCE(username, "")) = ""'
      );
      const pending = rows;
      const used = new Set<string>();
      const sanitize = (s: string): string =>
        String(s)
          .replace(/[^a-zA-Z0-9_\u0600-\u06FF.-]/g, '')
          .slice(0, 58);
      for (const row of pending) {
        const prefix = row.email
          ? sanitize(row.email.split('@')[0] || row.email)
          : 'user';
        const base = prefix || 'user';
        let username = base;
        if (used.has(username)) username = `${base}_${row.id}`;
        used.add(username);
        await pool.execute('UPDATE users SET username = ? WHERE id = ?', [username, row.id]);
      }
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_ENTRY' && e?.code !== 'ER_DUP_KEYNAME') {
        console.error('Username backfill warning:', e?.message || e);
      }
    }

    // Soft-delete for users and shops (admin delete account)
    try {
      await pool.execute('ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE shops ADD COLUMN deleted_at DATETIME NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }

    // user_invites: shop_id same type as shops.id (INT) for FK compatibility; idempotent
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS user_invites (
          id INT AUTO_INCREMENT PRIMARY KEY,
          shop_id INT NOT NULL,
          role VARCHAR(32) NOT NULL,
          employee_id VARCHAR(64) NULL,
          email VARCHAR(255) NULL,
          invite_code VARCHAR(64) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_invites_shop_code (shop_id, invite_code),
          INDEX idx_user_invites_expires (expires_at),
          CONSTRAINT fk_user_invites_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } catch (e: any) {
      if (e?.code !== 'ER_TABLE_EXISTS_ERROR' && e?.code !== 'ER_FK_DUP_NAME') {}
    }

    // Idempotency for offline sync (POS sales/invoices)
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
          idempotency_key VARCHAR(64) PRIMARY KEY,
          sale_id INT NOT NULL,
          shop_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e: any) {
      if (e?.code !== 'ER_TABLE_EXISTS_ERROR') {}
    }

    // user_admin_state: fallback when users table has no disabled/is_active column
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS user_admin_state (
          user_id INT PRIMARY KEY,
          disabled TINYINT(1) NOT NULL DEFAULT 0,
          disabled_at TIMESTAMP NULL,
          disabled_reason VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_user_admin_state_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    } catch (e: any) {
      if (e?.code !== 'ER_TABLE_EXISTS_ERROR' && e?.code !== 'ER_FK_DUP_NAME') {}
    }

    await ensurePrintLogsTable();
    await ensureReturnsBranchIdColumn();

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

/** Audit: who printed what, from which branch context */
export async function ensurePrintLogsTable(): Promise<void> {
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS print_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        type VARCHAR(64) NOT NULL,
        reference_id BIGINT NOT NULL DEFAULT 0,
        branch_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        printed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_shop_time (shop_id, printed_at),
        INDEX idx_type_ref (type, reference_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) {
      if (e?.code !== 'ER_TABLE_EXISTS_ERROR') console.warn('[db] ensurePrintLogsTable:', e?.message || e);
    }
    try {
      await ensureReportingIndexes();
    } catch (e: any) {
      console.warn('[db] ensureReportingIndexes:', e?.message || e);
    }
}

export async function ensureReturnsBranchIdColumn(): Promise<void> {
  try {
    await pool.execute('ALTER TABLE returns ADD COLUMN branch_id BIGINT UNSIGNED NULL');
  } catch (e: any) {
    if (e?.code !== 'ER_DUP_FIELDNAME') {}
  }
  try {
    await pool.execute('CREATE INDEX idx_returns_branch_id ON returns(branch_id)');
  } catch (e: any) {
    if (e?.code !== 'ER_DUP_KEYNAME') {}
  }
}
