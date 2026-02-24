'use client';

export type UILanguage = 'ar' | 'en';

const DEFAULT_BASE_CURRENCY = 'EGP';
export const USD_RATE_STORAGE_KEY = 'currency-rate-usd';

const FALLBACK_SYMBOLS: Record<string, string> = {
  EGP: 'ج.م',
  USD: '$',
  SAR: 'ر.س',
  AED: 'د.إ',
  KWD: 'د.ك',
  QAR: 'ر.ق',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  INR: '₹',
  CNY: '¥',
  TRY: '₺',
};

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

export function getCurrencySymbol(
  lang: UILanguage,
  currencyCode?: string | null,
  currencySymbol?: string | null
): string {
  const code = (currencyCode ?? '').trim().toUpperCase();
  if (code === 'EGP') return lang === 'ar' ? 'ج.م' : 'L.E';
  const provided = (currencySymbol ?? '').trim();
  if (provided) return provided;
  return code ? (FALLBACK_SYMBOLS[code] || code) : '';
}

function resolveUsdRate(): number {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(USD_RATE_STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  const env = Number(process.env.NEXT_PUBLIC_USD_RATE || '');
  if (Number.isFinite(env) && env > 0) return env;
  return 1;
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

  const code = (currencyCode ?? '').trim().toUpperCase() || DEFAULT_BASE_CURRENCY;
  let displayValue = n;
  if (code === 'USD' && DEFAULT_BASE_CURRENCY === 'EGP') {
    const rate = resolveUsdRate();
    displayValue = rate > 0 ? n / rate : n;
  }

  const numeric = formatNumber(displayValue, lang);
  const symbol = getCurrencySymbol(lang, code, currencySymbol);
  if (symbol) return `${numeric} ${symbol}`;
  return code ? `${numeric} ${code}` : numeric;
}
