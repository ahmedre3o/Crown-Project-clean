/** HR UI: date-only without ISO time suffix (e.g. 2026-03-20). */
export function formatHrDateOnly(value: unknown): string {
  if (value == null || value === '') return '—';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatHrDateTime(value: unknown, locale: string): string {
  if (value == null || value === '') return '—';
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatHrHours(value: unknown, decimals = 4): string {
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toFixed(decimals);
}
