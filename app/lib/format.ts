'use client';

export type UILanguage = 'ar' | 'en';

export function getLocaleForLang(lang: UILanguage): string {
  return lang === 'ar' ? 'ar-EG' : 'en-US';
}

export { formatNumber, formatCurrency, getCurrencySymbol, USD_RATE_STORAGE_KEY } from './formatters';

