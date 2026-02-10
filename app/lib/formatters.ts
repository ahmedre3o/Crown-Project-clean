'use client';

export type UILanguage = 'ar' | 'en';

function coerceNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Format a number with locale-appropriate digits (Arabic in AR, English in EN).
 * No forced decimals: integers show as 5200, not 5200.00.
 */
export function formatNumber(
  value: number | string | null | undefined,
  lang: UILanguage
): string {
  const n = coerceNumber(value);
  if (n === null) return '0';

  const locale = lang === 'ar' ? 'ar-EG' : 'en-US';
  const isInt = Math.floor(n) === n;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: isInt ? 0 : 2,
  }).format(n);
}

/**
 * Format a value as currency with locale digits and optional symbol/code.
 * No forced .00 for integers.
 */
export function formatCurrency(
  value: number | string | null | undefined,
  lang: UILanguage,
  currencyCode?: string | null,
  currencySymbol?: string | null
): string {
  const n = coerceNumber(value);
  if (n === null) return formatNumber(0, lang);

  const numeric = formatNumber(n, lang);
  const symbol = (currencySymbol ?? '').trim();
  const code = (currencyCode ?? '').trim().toUpperCase();

  if (symbol) return `${numeric} ${symbol}`;
  if (code) return `${numeric} ${code}`;
  return numeric;
}
