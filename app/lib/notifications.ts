export type UiLanguage = 'ar' | 'en';

const GENERIC_ERROR_AR = 'حدث خطأ. حاول مرة أخرى.';

/** Human-readable labels for common notification payload keys (POS / online / system). */
const KEY_LABEL_AR: Record<string, string> = {
  saleId: 'رقم البيع',
  invoiceId: 'رقم الفاتورة',
  printCount: 'عدد النسخ',
  invoiceNumber: 'رقم الفاتورة',
  orderId: 'رقم الطلب',
  publicCode: 'رمز الطلب',
  amount: 'المبلغ',
  total: 'الإجمالي',
  currency: 'العملة',
  productCount: 'عدد الأصناف',
  customerName: 'اسم العميل',
  branchId: 'الفرع',
  shopId: 'المتجر',
};

const KEY_LABEL_EN: Record<string, string> = {
  saleId: 'Sale ID',
  invoiceId: 'Invoice ID',
  printCount: 'Print count',
  invoiceNumber: 'Invoice number',
  orderId: 'Order ID',
  publicCode: 'Order code',
  amount: 'Amount',
  total: 'Total',
  currency: 'Currency',
  productCount: 'Products',
  customerName: 'Customer',
  branchId: 'Branch',
  shopId: 'Shop',
};

function cleanText(value?: string | null) {
  const text = (value ?? '').toString().trim();
  if (!text) return '';
  if (text === GENERIC_ERROR_AR) return '';
  return text;
}

export function getNotificationTitle(
  notification: { title?: string | null; title_ar?: string | null; title_en?: string | null },
  language: UiLanguage
) {
  const explicit = cleanText(notification.title);
  const ar = cleanText(notification.title_ar);
  const en = cleanText(notification.title_en);
  if (language === 'ar') return ar || explicit || en || 'إشعار';
  return en || explicit || ar || 'Notification';
}

export function getNotificationBody(
  notification: { body?: string | null; body_ar?: string | null; body_en?: string | null },
  language: UiLanguage
) {
  const explicit = cleanText(notification.body);
  const ar = cleanText(notification.body_ar);
  const en = cleanText(notification.body_en);
  if (language === 'ar') return explicit || ar || en || '';
  return explicit || en || ar || '';
}

export function formatNotificationDate(value: unknown, language: UiLanguage) {
  if (!value) return '';
  const d = new Date(value as any);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Merge `meta` with JSON in body text (e.g. POS print payload stored as body string). */
export function getNotificationPayloadRecord(
  notification: {
    meta?: unknown;
    body?: string | null;
    body_ar?: string | null;
    body_en?: string | null;
  },
  language: UiLanguage
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const m = notification.meta;
  if (isPlainObject(m)) {
    for (const [k, v] of Object.entries(m)) {
      if (v !== undefined) out[k] = v;
    }
  } else if (typeof m === 'string' && m.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(m) as unknown;
      if (isPlainObject(parsed)) Object.assign(out, parsed);
    } catch {
      /* ignore */
    }
  }
  const raw = getNotificationBody(notification, language).trim();
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isPlainObject(parsed)) Object.assign(out, parsed);
    } catch {
      /* ignore */
    }
  }
  return out;
}

export type NotificationPayloadRow = { key: string; label: string; value: string };

export function formatPayloadRows(record: Record<string, unknown>, language: UiLanguage): NotificationPayloadRow[] {
  const rows: NotificationPayloadRow[] = [];
  const labels = language === 'ar' ? KEY_LABEL_AR : KEY_LABEL_EN;
  for (const [key, val] of Object.entries(record)) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'object') {
      try {
        rows.push({
          key,
          label: labels[key] ?? key,
          value: JSON.stringify(val),
        });
      } catch {
        rows.push({ key, label: labels[key] ?? key, value: String(val) });
      }
    } else {
      rows.push({
        key,
        label: labels[key] ?? key,
        value: String(val),
      });
    }
  }
  return rows;
}

/** One-line preview for list/collapsed cards: avoids raw JSON; uses · between fields. */
export function formatNotificationSummaryLine(
  notification: {
    meta?: unknown;
    body?: string | null;
    body_ar?: string | null;
    body_en?: string | null;
  },
  language: UiLanguage
): string {
  const raw = getNotificationBody(notification, language).trim();
  const record = getNotificationPayloadRecord(notification, language);
  const rows = formatPayloadRows(record, language);
  if (rows.length > 0) {
    return rows.map((r) => `${r.label}: ${r.value}`).join(language === 'ar' ? ' · ' : ' · ');
  }
  return raw;
}
