'use client';

export type UILanguage = 'ar' | 'en';

export function getLocaleForLang(lang: UILanguage): string {
  return lang === 'ar' ? 'ar-EG' : 'en-US';
}

export function formatNumber(value: number | null | undefined, lang: UILanguage): string {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  const locale = getLocaleForLang(lang);
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatCurrency(
  value: number | null | undefined,
  lang: UILanguage,
  currencyCode: string | null | undefined,
  symbol: string | null | undefined
): string {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  const locale = getLocaleForLang(lang);

  // Prefer locale-aware decimal + explicit symbol to keep control over placement
  const numeric = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe);

  const trimmedSymbol = (symbol || '').trim();
  if (!trimmedSymbol) {
    // Fallback to currency code if symbol missing
    const code = (currencyCode || '').trim().toUpperCase();
    return code ? `${numeric} ${code}` : numeric;
  }

  // Keep existing convention: "<amount> <symbol>"
  return `${numeric} ${trimmedSymbol}`;
}

