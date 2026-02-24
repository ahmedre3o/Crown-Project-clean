export type UiLanguage = 'ar' | 'en';

const GENERIC_ERROR_AR = 'حدث خطأ. حاول مرة أخرى.';

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
