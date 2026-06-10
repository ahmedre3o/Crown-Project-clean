/**
 * Cross-currency rates for invoice import (free CDN mirror, no API key).
 * ECB-based Frankfurter does not publish SAR/EGP; we use @fawazahmed0/currency-api on jsDelivr.
 */

const FX_CACHE = new Map<string, { rate: number; at: number }>();
const FX_TTL_MS = 55 * 60 * 1000;

const ISO = /^[A-Z]{3}$/;

export function normalizeFxCurrencyCode(raw: unknown): string | null {
  const s = String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (s.length !== 3 || !ISO.test(s)) return null;
  return s;
}

async function fetchRateFromCdn(from: string, to: string): Promise<number | null> {
  const fl = from.toLowerCase();
  const tl = to.toLowerCase();
  try {
    const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${fl}.json`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, Record<string, number>>;
    const rate = data?.[fl]?.[tl];
    if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) return rate;
  } catch {
    /* ignore */
  }
  try {
    const url2 = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${tl}.json`;
    const res2 = await fetch(url2, { headers: { Accept: 'application/json' } });
    if (!res2.ok) return null;
    const data2 = (await res2.json()) as Record<string, Record<string, number>>;
    const inv = data2?.[tl]?.[fl];
    if (typeof inv === 'number' && Number.isFinite(inv) && inv > 0) return 1 / inv;
  } catch {
    /* ignore */
  }
  return null;
}

export async function fetchCrossRate(from: string, to: string): Promise<number | null> {
  const f = normalizeFxCurrencyCode(from);
  const t = normalizeFxCurrencyCode(to);
  if (!f || !t) return null;
  if (f === t) return 1;

  const key = `${f}->${t}`;
  const now = Date.now();
  const hit = FX_CACHE.get(key);
  if (hit && now - hit.at < FX_TTL_MS) return hit.rate;

  const rate = await fetchRateFromCdn(f, t);
  if (rate != null) FX_CACHE.set(key, { rate, at: now });
  return rate;
}

export function multiplyInvoiceImportItems<T extends { buyPrice?: unknown; sellPrice?: unknown; taxAmount?: unknown }>(
  items: T[],
  rate: number
): T[] {
  return items.map((it) => {
    const next = { ...it } as Record<string, unknown>;
    if (it.buyPrice != null && String(it.buyPrice).trim() !== '') {
      const n = Number(it.buyPrice);
      if (Number.isFinite(n)) next.buyPrice = Number((n * rate).toFixed(4));
    }
    if (it.sellPrice != null && String(it.sellPrice).trim() !== '') {
      const n = Number(it.sellPrice);
      if (Number.isFinite(n)) next.sellPrice = Number((n * rate).toFixed(4));
    }
    if (it.taxAmount != null && String(it.taxAmount).trim() !== '') {
      const n = Number(it.taxAmount);
      if (Number.isFinite(n)) next.taxAmount = Number((n * rate).toFixed(4));
    }
    return next as T;
  });
}

export function scaleInvoiceMetaMoney(
  meta: { invoiceSubtotalBeforeTax?: number | null; invoiceTotalTax?: number | null } | null | undefined,
  rate: number
): { invoiceSubtotalBeforeTax?: number | null; invoiceTotalTax?: number | null } | undefined {
  if (!meta) return undefined;
  const out = { ...meta };
  if (meta.invoiceSubtotalBeforeTax != null && Number.isFinite(Number(meta.invoiceSubtotalBeforeTax))) {
    out.invoiceSubtotalBeforeTax = Number((Number(meta.invoiceSubtotalBeforeTax) * rate).toFixed(4));
  }
  if (meta.invoiceTotalTax != null && Number.isFinite(Number(meta.invoiceTotalTax))) {
    out.invoiceTotalTax = Number((Number(meta.invoiceTotalTax) * rate).toFixed(4));
  }
  return out;
}
