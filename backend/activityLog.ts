import type { Pool } from 'mysql2/promise';

export async function ensureActivityLogTable(pool: Pool): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS shop_activity_log (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      shop_id INT NOT NULL,
      user_id INT NULL,
      action VARCHAR(160) NOT NULL,
      entity_type VARCHAR(80) NULL,
      entity_id BIGINT NULL,
      meta_json TEXT NULL,
      ip VARCHAR(45) NULL,
      user_agent VARCHAR(512) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_shop_created (shop_id, created_at),
      INDEX idx_shop_action (shop_id, action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

export type LogShopActivityOpts = {
  shopId: number;
  userId?: number | null;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  meta?: Record<string, unknown> | null;
  req?: { ip?: string; headers?: Record<string, unknown>; socket?: { remoteAddress?: string } };
};

export async function logShopActivity(pool: Pool, opts: LogShopActivityOpts): Promise<void> {
  try {
    await ensureActivityLogTable(pool);
    const ip =
      (opts.req as any)?.headers?.['x-forwarded-for']?.toString?.().split(',')[0]?.trim() ||
      (opts.req as any)?.socket?.remoteAddress ||
      null;
    const ua = (opts.req as any)?.headers?.['user-agent']?.toString?.() || null;
    const metaJson = opts.meta && Object.keys(opts.meta).length ? JSON.stringify(opts.meta) : null;
    await pool.execute(
      `INSERT INTO shop_activity_log (shop_id, user_id, action, entity_type, entity_id, meta_json, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        opts.shopId,
        opts.userId ?? null,
        opts.action,
        opts.entityType ?? null,
        opts.entityId ?? null,
        metaJson,
        ip,
        ua ? String(ua).slice(0, 512) : null,
      ]
    );
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[activityLog] log failed:', (e as any)?.message || e);
    }
  }
}
