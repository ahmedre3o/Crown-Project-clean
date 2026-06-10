import type { Express, Response } from 'express';
import type { Pool } from 'mysql2/promise';
import { roleHasAnyCapability, type ShopCapability } from './rbacCapabilities';
import { getPlanFeaturesForBackend } from './shared/plans';
import { logShopActivity } from './activityLog';

type Deps = {
  pool: Pool;
  authenticateToken: (req: any, res: Response, next: any) => void;
  getShopIdOrFail: (req: any, res: Response) => number | null;
};

type PlanCaps = ReturnType<typeof getPlanFeaturesForBackend>;

function planAllowsCapability(cap: ShopCapability, plan: PlanCaps): boolean {
  switch (cap) {
    case 'crm':
    case 'crm_followup':
    case 'crm_pos_pick':
    case 'crm_balance':
      return plan.crm;
    case 'accounting':
    case 'taxes':
      return plan.accounting;
    case 'reports':
      return plan.reports;
    case 'notifications':
      return plan.notifications;
    default:
      return true;
  }
}

const requireCaps =
  (...caps: ShopCapability[]) =>
  (req: any, res: Response, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const plan = getPlanFeaturesForBackend(req.user.package || req.user.plan || 'bronze');
    const planAllowsAny = caps.some((cap) => planAllowsCapability(cap, plan));
    if (!planAllowsAny) return res.status(403).json({ error: 'Feature not available in current plan' });
    const role = req.user.role;
    if (role === 'super_admin' || role === 'shop_owner') return next();
    if (roleHasAnyCapability(role, caps)) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };

/** Normalize COLUMN_TYPE for comparison (e.g. "bigint unsigned") */
function normColType(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** shops.id as reported by information_schema (must match for FK compatibility) */
async function getShopsIdColumnType(pool: Pool): Promise<string> {
  const [rows] = await pool.query<any[]>(
    `SELECT COLUMN_TYPE AS ct FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'shops' AND COLUMN_NAME = 'id'`
  );
  const ct = (rows as any[])[0]?.ct;
  return ct ? String(ct) : 'int';
}

function isSafeMysqlColumnType(t: string): boolean {
  return /^[a-z0-9 ]+$/i.test(String(t).trim());
}

async function dropShopFkIfAny(pool: Pool, table: string): Promise<void> {
  const [rows] = await pool.query<any[]>(
    `SELECT CONSTRAINT_NAME AS n FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       AND COLUMN_NAME = 'shop_id' AND REFERENCED_TABLE_NAME = 'shops'`,
    [table]
  );
  for (const r of rows as any[]) {
    const name = r?.n;
    if (!name) continue;
    try {
      await pool.execute(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${String(name).replace(/`/g, '')}\``);
    } catch {
      /* ignore */
    }
  }
}

async function addFkCrmCustomersShop(pool: Pool): Promise<void> {
  const [rows] = await pool.query<any[]>(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_customers' AND CONSTRAINT_NAME = 'fk_crm_customers_shop'`
  );
  if ((rows as any[]).length) return;
  await pool.execute(`
    ALTER TABLE crm_customers
    ADD CONSTRAINT fk_crm_customers_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  `);
}

async function addFkFollowUpsShop(pool: Pool): Promise<void> {
  const [rows] = await pool.query<any[]>(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_follow_ups' AND CONSTRAINT_NAME = 'fk_fu_shop'`
  );
  if ((rows as any[]).length) return;
  await pool.execute(`
    ALTER TABLE crm_follow_ups
    ADD CONSTRAINT fk_fu_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
  `);
}

async function addFkFollowUpsCustomer(pool: Pool): Promise<void> {
  const [rows] = await pool.query<any[]>(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_follow_ups' AND CONSTRAINT_NAME = 'fk_fu_customer'`
  );
  if ((rows as any[]).length) return;
  await pool.execute(`
    ALTER TABLE crm_follow_ups
    ADD CONSTRAINT fk_fu_customer FOREIGN KEY (customer_id) REFERENCES crm_customers(id) ON DELETE CASCADE
  `);
}

/**
 * CRM tables: avoid ER_FK_INCOMPATIBLE_COLUMNS when shops.id is BIGINT UNSIGNED (production)
 * while legacy DDL used INT. Create without FK, align shop_id type to shops.id, then add FKs.
 */
async function ensureCrmTables(pool: Pool): Promise<void> {
  const shopIdType = await getShopsIdColumnType(pool);
  if (!isSafeMysqlColumnType(shopIdType)) {
    throw new Error('Invalid shops.id column type from schema');
  }
  const targetNorm = normColType(shopIdType);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS crm_customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shop_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(64) NULL,
      email VARCHAR(255) NULL,
      notes TEXT NULL,
      owner_user_id INT NULL,
      created_by_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_crm_shop (shop_id),
      INDEX idx_crm_owner (owner_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  try {
    await pool.execute(
      'ALTER TABLE crm_customers ADD COLUMN owner_user_id INT NULL, ADD COLUMN created_by_id INT NULL'
    );
  } catch {
    /* exists */
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS crm_follow_ups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shop_id INT NOT NULL,
      customer_id INT NOT NULL,
      user_id INT NOT NULL,
      body TEXT NOT NULL,
      next_follow_up_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_fu_customer (customer_id),
      INDEX idx_fu_shop (shop_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const alignShopId = async (table: string) => {
    const [cols] = await pool.query<any[]>(
      `SELECT COLUMN_TYPE AS ct FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'shop_id'`,
      [table]
    );
    const cur = normColType((cols as any[])[0]?.ct || '');
    if (cur === targetNorm) return;
    await dropShopFkIfAny(pool, table);
    await pool.execute(`ALTER TABLE \`${table}\` MODIFY COLUMN shop_id ${shopIdType} NOT NULL`);
  };

  await alignShopId('crm_customers');
  await alignShopId('crm_follow_ups');

  await addFkCrmCustomersShop(pool);
  await addFkFollowUpsShop(pool);
  await addFkFollowUpsCustomer(pool);
}

function canSeeAllCrm(role: string): boolean {
  return role === 'super_admin' || role === 'shop_owner' || role === 'branch_manager' || role === 'multi_branch_manager';
}

export function mountCrmRoutes(app: Express, deps: Deps): void {
  const { pool, authenticateToken, getShopIdOrFail } = deps;

  /** POS / cashier: minimal customer pick list (shop-wide) */
  app.get(
    '/api/crm/pos-customers',
    authenticateToken,
    requireCaps('crm_pos_pick', 'crm', 'crm_followup'),
    async (req: any, res: Response) => {
      try {
        const shopId = getShopIdOrFail(req, res);
        if (shopId === null) return;
        await ensureCrmTables(pool);
        const [rows] = await pool.execute(
          `SELECT id, name, phone, email FROM crm_customers WHERE shop_id = ? ORDER BY name ASC LIMIT 500`,
          [shopId]
        );
        res.json(rows || []);
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  /** Accountant: balances from customer_debts */
  app.get(
    '/api/crm/customer-balances',
    authenticateToken,
    requireCaps('crm_balance', 'accounting'),
    async (req: any, res: Response) => {
      try {
        const shopId = getShopIdOrFail(req, res);
        if (shopId === null) return;
        const [rows] = await pool.execute(
          `SELECT customer_name, customer_phone, SUM(total_due) AS total_due, COUNT(*) AS debt_count
           FROM customer_debts WHERE shop_id = ? GROUP BY customer_name, customer_phone
           ORDER BY total_due DESC LIMIT 500`,
          [shopId]
        ).catch(() => [[]]);
        res.json(rows || []);
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  app.get(
    '/api/crm/customers',
    authenticateToken,
    requireCaps('crm', 'crm_followup'),
    async (req: any, res: Response) => {
      try {
        const shopId = getShopIdOrFail(req, res);
        if (shopId === null) return;
        await ensureCrmTables(pool);
        const role = req.user.role;
        let sql = `SELECT id, shop_id, name, phone, email, notes, owner_user_id, created_by_id, created_at, updated_at
                   FROM crm_customers WHERE shop_id = ?`;
        const params: any[] = [shopId];
        if (!canSeeAllCrm(role) && role === 'sales') {
          sql += ' AND owner_user_id = ?';
          params.push(req.user.id);
        }
        sql += ' ORDER BY updated_at DESC LIMIT 500';
        const [rows] = await pool.execute(sql, params);
        res.json(rows || []);
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  app.post(
    '/api/crm/customers',
    authenticateToken,
    requireCaps('crm', 'crm_followup'),
    async (req: any, res: Response) => {
      try {
        const shopId = getShopIdOrFail(req, res);
        if (shopId === null) return;
        await ensureCrmTables(pool);
        const name = String(req.body?.name || '').trim();
        if (!name) return res.status(400).json({ error: 'name required' });
        const phone = req.body?.phone ? String(req.body.phone).trim() : null;
        const email = req.body?.email ? String(req.body.email).trim() : null;
        const notes = req.body?.notes ? String(req.body.notes) : null;
        const role = req.user.role;
        let ownerUserId: number | null = req.user.id;
        if (canSeeAllCrm(role) && req.body?.owner_user_id != null) {
          const oid = Number(req.body.owner_user_id);
          if (Number.isFinite(oid) && oid > 0) ownerUserId = oid;
        }
        const [r] = await pool.execute(
          `INSERT INTO crm_customers (shop_id, name, phone, email, notes, owner_user_id, created_by_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [shopId, name, phone, email, notes, ownerUserId, req.user.id]
        );
        const id = (r as any).insertId;
        await logShopActivity(pool, {
          shopId,
          userId: req.user.id,
          action: 'crm.customer.create',
          entityType: 'crm_customer',
          entityId: id,
          meta: { name },
          req,
        });
        res.status(201).json({ id });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  app.patch(
    '/api/crm/customers/:id/reassign',
    authenticateToken,
    (req: any, res: Response, next: any) => {
      if (!req.user) return res.status(401).json({ error: 'Authentication required' });
      const role = req.user.role;
      if (
        role === 'super_admin' ||
        role === 'shop_owner' ||
        role === 'branch_manager' ||
        role === 'multi_branch_manager'
      ) {
        return next();
      }
      return res.status(403).json({ error: 'Only owner or branch managers can reassign customers' });
    },
    async (req: any, res: Response) => {
      try {
        const shopId = getShopIdOrFail(req, res);
        if (shopId === null) return;
        const id = parseInt(req.params.id, 10);
        const newOwner = Number(req.body?.owner_user_id);
        if (!id || !Number.isFinite(newOwner) || newOwner <= 0) {
          return res.status(400).json({ error: 'Invalid customer id or owner_user_id' });
        }
        await ensureCrmTables(pool);
        const [urows] = await pool.execute('SELECT id FROM users WHERE id = ? AND shop_id = ?', [newOwner, shopId]);
        if (!(urows as any[]).length) return res.status(400).json({ error: 'Target user not in shop' });
        const [result] = await pool.execute(
          'UPDATE crm_customers SET owner_user_id = ? WHERE id = ? AND shop_id = ?',
          [newOwner, id, shopId]
        );
        if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Not found' });
        await logShopActivity(pool, {
          shopId,
          userId: req.user.id,
          action: 'crm.customer.reassign',
          entityType: 'crm_customer',
          entityId: id,
          meta: { owner_user_id: newOwner },
          req,
        });
        res.json({ ok: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  app.get(
    '/api/crm/customers/:id',
    authenticateToken,
    requireCaps('crm', 'crm_followup'),
    async (req: any, res: Response) => {
      try {
        const shopId = getShopIdOrFail(req, res);
        if (shopId === null) return;
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ error: 'Invalid id' });
        await ensureCrmTables(pool);
        const role = req.user.role;
        let sql = `SELECT * FROM crm_customers WHERE id = ? AND shop_id = ?`;
        const params: any[] = [id, shopId];
        if (!canSeeAllCrm(role) && role === 'sales') {
          sql += ' AND owner_user_id = ?';
          params.push(req.user.id);
        }
        const [rows] = await pool.execute(sql, params);
        const row = (rows as any[])[0];
        if (!row) return res.status(404).json({ error: 'Not found' });
        const [fus] = await pool.execute(
          `SELECT id, user_id, body, next_follow_up_at, created_at FROM crm_follow_ups WHERE customer_id = ? AND shop_id = ? ORDER BY created_at DESC LIMIT 100`,
          [id, shopId]
        );
        res.json({ customer: row, followUps: fus || [] });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );

  app.post(
    '/api/crm/customers/:id/follow-ups',
    authenticateToken,
    requireCaps('crm_followup', 'crm'),
    async (req: any, res: Response) => {
      try {
        const shopId = getShopIdOrFail(req, res);
        if (shopId === null) return;
        const id = parseInt(req.params.id, 10);
        const body = String(req.body?.body || '').trim();
        if (!id || !body) return res.status(400).json({ error: 'body required' });
        await ensureCrmTables(pool);
        const role = req.user.role;
        let checkSql = `SELECT id FROM crm_customers WHERE id = ? AND shop_id = ?`;
        const checkParams: any[] = [id, shopId];
        if (!canSeeAllCrm(role) && role === 'sales') {
          checkSql += ' AND owner_user_id = ?';
          checkParams.push(req.user.id);
        }
        const [ex] = await pool.execute(checkSql, checkParams);
        if (!(ex as any[]).length) return res.status(404).json({ error: 'Not found' });
        const nextAt = req.body?.next_follow_up_at ? String(req.body.next_follow_up_at) : null;
        const [ins] = await pool.execute(
          `INSERT INTO crm_follow_ups (shop_id, customer_id, user_id, body, next_follow_up_at) VALUES (?, ?, ?, ?, ?)`,
          [shopId, id, req.user.id, body, nextAt]
        );
        const fid = (ins as any).insertId;
        await logShopActivity(pool, {
          shopId,
          userId: req.user.id,
          action: 'crm.followup.create',
          entityType: 'crm_follow_up',
          entityId: fid,
          meta: { customer_id: id },
          req,
        });
        res.status(201).json({ id: fid });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
    }
  );
}
