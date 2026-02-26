/**
 * Shared discount calculation and coupon code generation.
 * Used by POS, storefront, and admin.
 */

import crypto from 'crypto';
import { pool } from './db';

export type DiscountType = 'none' | 'percent' | 'fixed';

/**
 * Apply product discount to a price.
 * Returns final price rounded to 2 decimals.
 */
export function applyProductDiscount(
  price: number,
  discountType: DiscountType,
  discountValue: number | null,
  discountActive: boolean | number
): number {
  if (!discountActive || discountType === 'none' || discountValue == null) {
    return round2(price);
  }
  let final = price;
  if (discountType === 'percent') {
    const pct = Math.min(100, Math.max(0, Number(discountValue)));
    final = price * (1 - pct / 100);
  } else if (discountType === 'fixed') {
    const fixed = Math.max(0, Number(discountValue));
    final = Math.max(0, price - fixed);
  }
  return round2(final);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Arabic to Latin transliteration map (common letters). Examples: أحمد=>ahmed, محمد=>mohamed */
const ARABIC_TO_LATIN: Record<string, string> = {
  ا: 'a', أ: 'a', إ: 'i', آ: 'a', ء: '',
  ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh',
  د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh',
  ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: 'a', غ: 'gh',
  ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n',
  ه: 'h', و: 'o', ى: 'a', ي: 'y',
};

function transliterateArabicToLatin(name: string): string {
  let out = '';
  for (const c of name) {
    const mapped = ARABIC_TO_LATIN[c];
    if (mapped !== undefined) out += mapped;
    else if (/[a-zA-Z0-9]/.test(c)) out += c.toLowerCase();
  }
  return out.replace(/[^a-z0-9]/g, '').substring(0, 16) || 'crown';
}

/**
 * Normalize store name for coupon prefix: lowercase, strip spaces, alphanumeric only.
 * Arabic names are transliterated to Latin. Fallback to "crown" if empty.
 */
export function normalizeStoreNameForCode(name: string | null | undefined): string {
  const raw = String(name || '').trim();
  if (!raw) return 'crown';
  const hasArabic = /[\u0600-\u06FF]/.test(raw);
  const normalized = hasArabic
    ? transliterateArabicToLatin(raw)
    : raw.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  const prefix = normalized.substring(0, 16);
  return prefix || 'crown';
}

/**
 * Generate a unique coupon code for a shop from store name.
 * Format: {prefix}-{value}p-{rand4} (percent) or {prefix}-{value}egp-{rand4} (fixed)
 * Example: ahmed-10p-AB12, mohamed-20egp-X9K2
 */
export async function generateCouponCode(
  shopId: number,
  type: 'percent' | 'fixed',
  value: number
): Promise<string> {
  const [shopRows] = await pool.execute(
    'SELECT name, business_name FROM shops WHERE id = ?',
    [shopId]
  );
  const shop = (shopRows as any[])[0];
  const storeName = shop?.name || shop?.business_name || '';
  const prefix = normalizeStoreNameForCode(storeName);

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand4 = () => {
    const buf = crypto.randomBytes(4);
    return Array.from(buf).map((b) => chars[b % chars.length]).join('');
  };

  const valuePart = type === 'percent' ? `${Math.round(value)}p` : `${Math.round(value)}egp`;
  const baseCode = `${prefix}-${valuePart}-`;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = baseCode + rand4();
    try {
      const [rows] = await pool.execute(
        'SELECT id FROM coupons WHERE shop_id = ? AND code = ?',
        [shopId, code]
      );
      if ((rows as any[]).length === 0) return code;
    } catch {
      // retry on any error (e.g. unique constraint)
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[generateCouponCode] Collision attempt ${attempt + 1} for shop ${shopId}, code ${code}`);
    }
  }
  throw new Error('Failed to generate unique coupon code after 5 attempts');
}

/**
 * Calculate coupon discount for an order total.
 */
export function calculateCouponDiscount(
  orderTotal: number,
  type: 'percent' | 'fixed',
  value: number
): number {
  if (type === 'percent') {
    const pct = Math.min(100, Math.max(0, value));
    return round2(orderTotal * (pct / 100));
  }
  return round2(Math.min(orderTotal, Math.max(0, value)));
}
