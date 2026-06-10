/**
 * Monthly AI + OCR usage per shop (plan base limits + optional add-on bonuses).
 * Backward-compatible: missing columns treated as 0 via COALESCE in queries.
 */

import { pool } from '../db';

export type PlanId = 'bronze' | 'silver' | 'gold' | 'branches';

/** Gold free trial (weekly): stricter caps than paid Gold. */
export const GOLD_TRIAL_AI_CAP = 20;
export const GOLD_TRIAL_OCR_CAP = 5;

async function isGoldWeeklyTrial(shopId: number): Promise<boolean> {
  try {
    const [rows] = await pool.execute(
      `SELECT plan, activation_source, status FROM shop_subscriptions WHERE shop_id = ? LIMIT 1`,
      [shopId]
    );
    const r = (rows as any[])[0];
    if (!r) return false;
    const plan = String(r.plan || '').trim().toLowerCase();
    const src = String(r.activation_source || '').trim().toLowerCase();
    const st = String(r.status || '').trim().toLowerCase();
    return plan === 'gold' && (src === 'trial' || st === 'trial');
  } catch {
    return false;
  }
}

function normalizePlan(raw: string | null | undefined): PlanId {
  const k = String(raw || '').trim().toLowerCase();
  if (k === 'silver' || k === 'gold' || k === 'branches' || k === 'bronze') return k;
  return 'bronze';
}

export function baseAiLimit(plan: PlanId): number {
  switch (plan) {
    case 'gold':
      return 300;
    case 'branches':
      return 600;
    default:
      return 0;
  }
}

export function baseOcrLimit(plan: PlanId): number {
  switch (plan) {
    case 'silver':
      return 10;
    case 'gold':
      return 50;
    case 'branches':
      return 100;
    default:
      return 0;
  }
}

function firstOfCurrentMonthYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Reset monthly counters when period rolled */
export async function ensureUsageMonthReset(shopId: number): Promise<void> {
  const start = firstOfCurrentMonthYmd();
  await pool.execute(
    `UPDATE shops
     SET ai_used_month = 0, ocr_used_month = 0, usage_period_start = ?
     WHERE id = ?
       AND (usage_period_start IS NULL OR usage_period_start < ?)`,
    [start, shopId, start]
  );
}

export type UsageSnapshot = {
  plan: PlanId;
  aiUsed: number;
  aiLimit: number;
  ocrUsed: number;
  ocrLimit: number;
  aiPercent: number;
  ocrPercent: number;
  usagePeriodStart: string | null;
  aiNearLimit: boolean;
  ocrNearLimit: boolean;
  aiAtLimit: boolean;
  ocrAtLimit: boolean;
  /** True when shop is on Gold weekly trial (tighter AI/OCR caps). */
  goldTrialActive?: boolean;
};

const usageCache = new Map<number, { at: number; snap: UsageSnapshot }>();
const USAGE_CACHE_TTL_MS = 30_000;
let userOcrTableReady = false;

export async function getUsageSnapshot(shopId: number, skipCache = false): Promise<UsageSnapshot | null> {
  if (!skipCache) {
    const c = usageCache.get(shopId);
    if (c && Date.now() - c.at < USAGE_CACHE_TTL_MS) return c.snap;
  }

  await ensureUsageMonthReset(shopId);
  const [rows] = await pool.execute(
    `SELECT package,
            COALESCE(ai_used_month, 0) AS ai_used_month,
            COALESCE(ocr_used_month, 0) AS ocr_used_month,
            COALESCE(ai_limit_bonus, 0) AS ai_limit_bonus,
            COALESCE(ocr_limit_bonus, 0) AS ocr_limit_bonus,
            usage_period_start
     FROM shops WHERE id = ? LIMIT 1`,
    [shopId]
  );
  const row = (rows as any[])[0];
  if (!row) return null;

  const plan = normalizePlan(row.package);
  let aiBase = baseAiLimit(plan);
  let ocrBase = baseOcrLimit(plan);
  let goldTrialActive = false;
  if (plan === 'gold' && (await isGoldWeeklyTrial(shopId))) {
    goldTrialActive = true;
    aiBase = Math.min(aiBase, GOLD_TRIAL_AI_CAP);
    ocrBase = Math.min(ocrBase, GOLD_TRIAL_OCR_CAP);
  }
  const aiLimit = aiBase + Number(row.ai_limit_bonus || 0);
  const ocrLimit = ocrBase + Number(row.ocr_limit_bonus || 0);
  const aiUsed = Number(row.ai_used_month || 0);
  const ocrUsed = Number(row.ocr_used_month || 0);

  const aiPercent = aiLimit <= 0 ? 0 : Math.min(100, Math.round((aiUsed / aiLimit) * 1000) / 10);
  const ocrPercent = ocrLimit <= 0 ? 0 : Math.min(100, Math.round((ocrUsed / ocrLimit) * 1000) / 10);

  const snap: UsageSnapshot = {
    plan,
    aiUsed,
    aiLimit,
    ocrUsed,
    ocrLimit,
    aiPercent,
    ocrPercent,
    usagePeriodStart: row.usage_period_start ? String(row.usage_period_start).slice(0, 10) : null,
    aiNearLimit: aiLimit > 0 && aiPercent >= 80 && aiPercent < 100,
    ocrNearLimit: ocrLimit > 0 && ocrPercent >= 80 && ocrPercent < 100,
    aiAtLimit: aiLimit > 0 && aiUsed >= aiLimit,
    ocrAtLimit: ocrLimit > 0 && ocrUsed >= ocrLimit,
    goldTrialActive,
  };
  usageCache.set(shopId, { at: Date.now(), snap });
  return snap;
}

export function invalidateUsageCache(shopId: number) {
  usageCache.delete(shopId);
}

/** Before calling Gemini for chat: returns false if over limit (caller returns 429). */
export async function checkAiAllowed(shopId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const snap = await getUsageSnapshot(shopId, true);
  if (!snap) return { ok: false, error: 'Shop not found' };
  if (snap.aiLimit <= 0) return { ok: false, error: 'AI limit reached' };
  if (snap.aiUsed >= snap.aiLimit) return { ok: false, error: 'AI limit reached' };
  return { ok: true };
}

/** After successful AI response */
export async function recordAiMessage(shopId: number): Promise<void> {
  await ensureUsageMonthReset(shopId);
  const snap = await getUsageSnapshot(shopId, true);
  if (!snap || snap.aiLimit <= 0) return;
  await pool.execute(
    `UPDATE shops SET ai_used_month = ai_used_month + 1 WHERE id = ? AND ai_used_month < ?`,
    [shopId, snap.aiLimit]
  );
  invalidateUsageCache(shopId);
  const after = await getUsageSnapshot(shopId, true);
  if (!after) return;
  await maybeNotifyUsage(shopId, 'ai', after);
}

/** Before OCR (invoice image parse with Gemini) */
export async function checkOcrAllowed(shopId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const snap = await getUsageSnapshot(shopId, true);
  if (!snap) return { ok: false, error: 'Shop not found' };
  if (snap.ocrLimit <= 0) return { ok: false, error: 'OCR limit reached' };
  if (snap.ocrUsed >= snap.ocrLimit) return { ok: false, error: 'OCR limit reached' };
  return { ok: true };
}

function perUserOcrLimit(plan: PlanId): number {
  switch (plan) {
    case 'silver':
      return 10;
    case 'gold':
      return 50;
    case 'branches':
      return 100;
    default:
      return 0;
  }
}

async function ensureUserOcrUsageTable(): Promise<void> {
  if (userOcrTableReady) return;
  await pool.execute(
    `CREATE TABLE IF NOT EXISTS user_ocr_usage_monthly (
      user_id BIGINT NOT NULL,
      month_start DATE NOT NULL,
      ocr_used INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, month_start),
      KEY idx_user_ocr_usage_month (month_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
  userOcrTableReady = true;
}

async function getUserOcrUsedInMonth(userId: number, monthStart: string): Promise<number> {
  await ensureUserOcrUsageTable();
  const [rows] = await pool.execute(
    `SELECT ocr_used FROM user_ocr_usage_monthly WHERE user_id = ? AND month_start = ? LIMIT 1`,
    [userId, monthStart]
  );
  const row = (rows as any[])[0];
  return Number(row?.ocr_used || 0);
}

/**
 * Per-user OCR caps by plan:
 * Silver 10/month, Gold 50/month, Branches 100/month.
 * Falls back to shop-level check when user id is unavailable.
 */
export async function checkOcrAllowedForUser(
  shopId: number,
  userId: number | null | undefined
): Promise<{ ok: true } | { ok: false; error: string; used?: number; limit?: number }> {
  if (!userId || !Number.isFinite(userId) || userId <= 0) return checkOcrAllowed(shopId);
  const snap = await getUsageSnapshot(shopId, true);
  if (!snap) return { ok: false, error: 'Shop not found' };
  const limit = perUserOcrLimit(snap.plan);
  if (limit <= 0) return { ok: false, error: 'OCR limit reached', used: 0, limit: 0 };
  const monthStart = firstOfCurrentMonthYmd();
  const used = await getUserOcrUsedInMonth(Number(userId), monthStart);
  if (used >= limit) {
    return {
      ok: false,
      error: `OCR monthly limit reached (${used}/${limit})`,
      used,
      limit,
    };
  }
  return { ok: true };
}

export async function recordOcrUse(shopId: number): Promise<void> {
  await ensureUsageMonthReset(shopId);
  const snap = await getUsageSnapshot(shopId, true);
  if (!snap || snap.ocrLimit <= 0) return;
  await pool.execute(
    `UPDATE shops SET ocr_used_month = ocr_used_month + 1 WHERE id = ? AND ocr_used_month < ?`,
    [shopId, snap.ocrLimit]
  );
  invalidateUsageCache(shopId);
  const after = await getUsageSnapshot(shopId, true);
  if (!after) return;
  await maybeNotifyUsage(shopId, 'ocr', after);
}

export async function recordOcrUseForUser(
  shopId: number,
  userId: number | null | undefined
): Promise<void> {
  await recordOcrUse(shopId);
  if (!userId || !Number.isFinite(userId) || userId <= 0) return;
  const monthStart = firstOfCurrentMonthYmd();
  await ensureUserOcrUsageTable();
  await pool.execute(
    `INSERT INTO user_ocr_usage_monthly (user_id, month_start, ocr_used)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE ocr_used = ocr_used + 1`,
    [Number(userId), monthStart]
  );
}

async function maybeNotifyUsage(shopId: number, kind: 'ai' | 'ocr', snap: UsageSnapshot) {
  try {
    const pct = kind === 'ai' ? snap.aiPercent : snap.ocrPercent;
    if (pct < 80) return;
    const type = kind === 'ai' ? 'usage_ai_high' : 'usage_ocr_high';
    const [existing] = await pool.execute(
      `SELECT id FROM notifications
       WHERE shop_id = ? AND type = ?
         AND created_at >= COALESCE((SELECT usage_period_start FROM shops WHERE id = ?), DATE_FORMAT(NOW(), '%Y-%m-01'))
       LIMIT 1`,
      [shopId, type, shopId]
    );
    if ((existing as any[]).length > 0) return;
    const titleAr = kind === 'ai' ? 'تنبيه استخدام الذكاء الاصطناعي' : 'تنبيه استخدام قراءة الفواتير';
    const titleEn = kind === 'ai' ? 'AI usage alert' : 'OCR usage alert';
    const bodyAr = `أنت قريب من الحد (${Math.round(pct)}%) — فكّر في ترقية الباقة أو إضافة رصيد.`;
    const bodyEn = `You're close to your limit (${Math.round(pct)}%) — consider upgrading or adding credits.`;
    const meta = JSON.stringify({ kind, percent: pct, upgradeHint: true });
    try {
      await pool.execute(
        `INSERT INTO notifications (shop_id, source, type, title_ar, title_en, body_ar, body_en, is_read, meta, payload)
         VALUES (?, 'system', ?, ?, ?, ?, ?, 0, ?, ?)`,
        [shopId, type, titleAr, titleEn, bodyAr, bodyEn, meta, meta]
      );
    } catch {
      await pool.execute(
        `INSERT INTO notifications (shop_id, source, type, title_ar, title_en, body_ar, body_en, is_read, meta)
         VALUES (?, 'system', ?, ?, ?, ?, ?, 0, ?)`,
        [shopId, type, titleAr, titleEn, bodyAr, bodyEn, meta]
      );
    }
  } catch {
    // non-fatal
  }
}

/** Redeem AI add-on code (single-use). */
export async function redeemAiCode(shopId: number, rawCode: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { ok: false, error: 'Code is required' };

  const [rows] = await pool.execute(
    `SELECT id, ai_messages, ocr_credits, expires_at, is_used
     FROM ai_codes WHERE code = ? LIMIT 1`,
    [code]
  );
  const row = (rows as any[])[0];
  if (!row) return { ok: false, error: 'Invalid code' };
  if (Number(row.is_used)) return { ok: false, error: 'Code already used' };
  if (row.expires_at && new Date(row.expires_at) < new Date()) return { ok: false, error: 'Code expired' };

  const codeRow = row;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [u] = await conn.execute(
      `UPDATE ai_codes SET is_used = 1, used_by_shop_id = ?, used_at = NOW() WHERE id = ? AND is_used = 0`,
      [shopId, codeRow.id]
    );
    if ((u as any).affectedRows !== 1) {
      await conn.rollback();
      return { ok: false, error: 'Code already used' };
    }
    await conn.execute(
      `UPDATE shops SET ai_limit_bonus = COALESCE(ai_limit_bonus, 0) + ?, ocr_limit_bonus = COALESCE(ocr_limit_bonus, 0) + ? WHERE id = ?`,
      [Number(row.ai_messages || 0), Number(row.ocr_credits || 0), shopId]
    );
    await conn.commit();
    invalidateUsageCache(shopId);
    return { ok: true };
  } catch (e: any) {
    try {
      await conn.rollback();
    } catch {
      // ignore
    }
    return { ok: false, error: e?.message || 'Redeem failed' };
  } finally {
    conn.release();
  }
}
