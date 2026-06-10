import { looksMojibake, tryFixLatin1Mojibake } from './encodingGuard';

export type NotificationPayload = Record<string, any>;

const FALLBACK_TITLE_AR = 'إشعار جديد';
const FALLBACK_BODY_AR = 'تم إنشاء إشعار جديد. افتح التفاصيل.';
const FALLBACK_TITLE_EN = 'New notification';
const FALLBACK_BODY_EN = 'A new notification was created. Open details.';

const STATUS_AR: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

const STATUS_EN: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function parseNotificationPayload(raw: any): NotificationPayload | null {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw as NotificationPayload;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as NotificationPayload;
    } catch {
      return null;
    }
  }
  return null;
}

function toNumber(value: any) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatMoney(amount: number | null, currency: 'EGP' | 'USD' = 'EGP') {
  if (amount == null) return null;
  const value = amount.toFixed(2);
  return currency === 'USD' ? `${value} USD` : `${value} جنيه`;
}

function safeTextFromExisting(value: any) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed.includes('�')) return null;
  if (looksMojibake(trimmed)) {
    const fixed = tryFixLatin1Mojibake(trimmed);
    if (!fixed || fixed.includes('�') || looksMojibake(fixed)) return null;
    return fixed.trim();
  }
  return trimmed;
}

export function isCorruptedText(value: any) {
  if (value == null) return false;
  const str = String(value);
  return str.includes('�') || looksMojibake(str);
}

export function buildNotificationText(type: string | null | undefined, payload: NotificationPayload | null) {
  if (!type) return null;
  const p = payload || {};
  const total = toNumber(p.total ?? p.totalAmount);
  const itemsCount = toNumber(p.itemsCount);
  const orderId = p.orderId ?? p.order_id ?? p.orderID ?? p.id;
  const invoiceId = p.invoiceId ?? p.invoice_id ?? p.saleId ?? p.sale_id;
  const invoiceNumber = p.invoiceNumber ?? p.invoice_no ?? p.invoiceNo ?? p.invoice_number ?? invoiceId;
  const printCount = toNumber(p.printCount ?? p.copyNo ?? p.copyCount);
  const statusTo = String(p.toStatus ?? p.status ?? '').trim().toLowerCase();
  const statusFrom = String(p.fromStatus ?? '').trim().toLowerCase();

  switch (type) {
    case 'pos_sale_created': {
      const titleAr = 'عملية بيع جديدة (POS)';
      const titleEn = 'New POS sale';
      const totalLabelAr = formatMoney(total, 'EGP');
      const totalLabelEn = total != null ? `${total.toFixed(2)} EGP` : null;
      const itemsLabelAr = itemsCount != null ? `${itemsCount} منتج` : null;
      const itemsLabelEn = itemsCount != null ? `${itemsCount} items` : null;
      const bodyArParts = [
        `فاتورة #${invoiceNumber ?? invoiceId ?? ''}`.trim(),
        totalLabelAr ? `بقيمة ${totalLabelAr}` : null,
        itemsLabelAr,
      ].filter(Boolean);
      const bodyEnParts = [
        `Invoice #${invoiceNumber ?? invoiceId ?? ''}`.trim(),
        totalLabelEn ? `Total: ${totalLabelEn}` : null,
        itemsLabelEn,
      ].filter(Boolean);
      const bodyAr = bodyArParts.length ? bodyArParts.join(' — ') : 'تم إنشاء عملية بيع جديدة';
      const bodyEn = bodyEnParts.length ? bodyEnParts.join(' — ') : 'A new POS sale was created';
      return { titleAr, titleEn, bodyAr, bodyEn };
    }
    case 'pos_invoice_printed': {
      const titleAr = 'طباعة فاتورة POS';
      const titleEn = 'POS invoice printed';
      const copyLabelAr = printCount != null ? `نسخة ${printCount}` : null;
      const copyLabelEn = printCount != null ? `copy ${printCount}` : null;
      const bodyArParts = [`فاتورة #${invoiceNumber ?? invoiceId ?? ''}`.trim(), copyLabelAr].filter(Boolean);
      const bodyEnParts = [`Invoice #${invoiceNumber ?? invoiceId ?? ''}`.trim(), copyLabelEn].filter(Boolean);
      const bodyAr = bodyArParts.length ? bodyArParts.join(' — ') : 'تمت طباعة فاتورة POS';
      const bodyEn = bodyEnParts.length ? bodyEnParts.join(' — ') : 'POS invoice printed';
      return { titleAr, titleEn, bodyAr, bodyEn };
    }
    case 'online_order_created': {
      const titleAr = `طلب أونلاين جديد (#${orderId ?? ''})`.trim();
      const titleEn = `New online order (#${orderId ?? ''})`.trim();
      const totalLabelAr = formatMoney(total, 'EGP');
      const totalLabelEn = total != null ? `${total.toFixed(2)} EGP` : null;
      const itemsLabelAr = itemsCount != null ? `${itemsCount} منتج` : null;
      const itemsLabelEn = itemsCount != null ? `${itemsCount} items` : null;
      const bodyArParts = [
        totalLabelAr ? `تم إنشاء طلب جديد بقيمة ${totalLabelAr}` : 'تم إنشاء طلب جديد',
        itemsLabelAr,
      ].filter(Boolean);
      const bodyEnParts = [
        totalLabelEn ? `A new order was placed. Total: ${totalLabelEn}` : 'A new order was placed',
        itemsLabelEn,
      ].filter(Boolean);
      return { titleAr, titleEn, bodyAr: bodyArParts.join(' — '), bodyEn: bodyEnParts.join(' — ') };
    }
    case 'online_order_confirmed': {
      const titleAr = `تم تأكيد طلب أونلاين (#${orderId ?? ''})`.trim();
      const titleEn = `Online order confirmed (#${orderId ?? ''})`.trim();
      const totalLabelAr = formatMoney(total, 'EGP');
      const totalLabelEn = total != null ? `${total.toFixed(2)} EGP` : null;
      const bodyAr = totalLabelAr ? `تم تأكيد الطلب بقيمة ${totalLabelAr}` : 'تم تأكيد الطلب';
      const bodyEn = totalLabelEn ? `Order confirmed. Total: ${totalLabelEn}` : 'Order confirmed';
      return { titleAr, titleEn, bodyAr, bodyEn };
    }
    case 'online_order_completed': {
      const titleAr = `تم إكمال طلب أونلاين (#${orderId ?? ''})`.trim();
      const titleEn = `Online order completed (#${orderId ?? ''})`.trim();
      const totalLabelAr = formatMoney(total, 'EGP');
      const totalLabelEn = total != null ? `${total.toFixed(2)} EGP` : null;
      const bodyAr = totalLabelAr ? `تم إكمال الطلب بقيمة ${totalLabelAr}` : 'تم إكمال الطلب';
      const bodyEn = totalLabelEn ? `Order completed. Total: ${totalLabelEn}` : 'Order completed';
      return { titleAr, titleEn, bodyAr, bodyEn };
    }
    case 'online_order_status_changed': {
      const statusAr = STATUS_AR[statusTo] || statusTo || 'غير معروف';
      const statusEn = STATUS_EN[statusTo] || statusTo || 'unknown';
      const titleAr = `تحديث حالة الطلب #${orderId ?? ''}`.trim();
      const titleEn = `Order #${orderId ?? ''} status update`.trim();
      const bodyAr = `تم تغيير حالة الطلب إلى ${statusAr}`;
      const bodyEn = `Order status changed to ${statusEn}`;
      return { titleAr, titleEn, bodyAr, bodyEn };
    }
    case 'online_order_cancelled': {
      const titleAr = `تم إلغاء طلب أونلاين (#${orderId ?? ''})`.trim();
      const titleEn = `Online order cancelled (#${orderId ?? ''})`.trim();
      const bodyAr = 'تم إلغاء الطلب';
      const bodyEn = 'Order cancelled';
      return { titleAr, titleEn, bodyAr, bodyEn };
    }
    case 'system_stock_insufficient': {
      const titleAr = 'محاولة طلب أونلاين فشلت بسبب نفاد المخزون';
      const titleEn = 'Online order failed due to insufficient stock';
      const requested = toNumber(p.requested);
      const available = toNumber(p.available);
      const bodyAr =
        requested != null && available != null
          ? `المتوفر ${available} / المطلوب ${requested}`
          : 'المنتج غير متوفر بالكمية المطلوبة';
      const bodyEn =
        requested != null && available != null
          ? `Available ${available} / Requested ${requested}`
          : 'Product not available in requested quantity';
      return { titleAr, titleEn, bodyAr, bodyEn };
    }
    case 'dead_stock_alert': {
      const deadCount = toNumber(p.deadCount ?? p.dead_count) ?? 0;
      const slowCount = toNumber(p.slowCount ?? p.slow_count) ?? 0;
      const titleAr = `تنبيه مخزون راكد/بطيء: ${deadCount} راكد | ${slowCount} بطيء`;
      const titleEn = `Dead/Slow stock alert: ${deadCount} dead | ${slowCount} slow`;
      const bodyAr = 'راجع صفحة المخزون الراكد/البطيء';
      const bodyEn = 'Review the Dead/Slow stock page';
      return { titleAr, titleEn, bodyAr, bodyEn };
    }
    case 'inventory_product_created': {
      const productId = p.productId ?? p.product_id ?? p.id;
      const nameAr = safeTextFromExisting(p.nameAr ?? p.name_ar) || safeTextFromExisting(p.nameEn ?? p.name_en) || `منتج #${productId ?? ''}`;
      const nameEn = safeTextFromExisting(p.nameEn ?? p.name_en) || `Product #${productId ?? ''}`;
      const qty = toNumber(p.totalQuantity ?? p.quantity ?? p.stock);
      const titleAr = 'منتج جديد في المخزن';
      const titleEn = 'New inventory product';
      const bodyAr = [nameAr, qty != null ? `الكمية الإجمالية: ${qty}` : null].filter(Boolean).join(' — ') || 'تمت إضافة منتج جديد';
      const bodyEn = [nameEn, qty != null ? `Total qty: ${qty}` : null].filter(Boolean).join(' — ') || 'A new product was added';
      return { titleAr, titleEn, bodyAr, bodyEn };
    }
    case 'inventory_stock_updated': {
      const productId = p.productId ?? p.product_id ?? p.id;
      const nameAr = safeTextFromExisting(p.nameAr ?? p.name_ar) || safeTextFromExisting(p.nameEn ?? p.name_en) || `منتج #${productId ?? ''}`;
      const nameEn = safeTextFromExisting(p.nameEn ?? p.name_en) || `Product #${productId ?? ''}`;
      const before = toNumber(p.quantityBefore ?? p.before);
      const after = toNumber(p.quantityAfter ?? p.after);
      const titleAr = 'تحديث كمية مخزون';
      const titleEn = 'Inventory quantity updated';
      const bodyAr =
        before != null && after != null
          ? `${nameAr} — من ${before} إلى ${after}`
          : `${nameAr} — تم تعديل الكمية`;
      const bodyEn =
        before != null && after != null
          ? `${nameEn} — from ${before} to ${after}`
          : `${nameEn} — quantity was updated`;
      return { titleAr, titleEn, bodyAr, bodyEn };
    }
    case 'subscription_expired': {
      const titleAr = 'انتهى اشتراكك';
      const titleEn = 'Subscription expired';
      const bodyAr = 'انتهت صلاحية اشتراكك. يرجى تفعيل كود جديد من إعدادات المتجر.';
      const bodyEn = 'Your subscription has expired. Please activate a new code from store settings.';
      return { titleAr, titleEn, bodyAr, bodyEn };
    }
    case 'subscription_expiring': {
      const daysLeft = toNumber(p.daysLeft ?? p.days_left) ?? 0;
      const titleAr = daysLeft <= 1 ? 'اشتراكك ينتهي قريباً' : `اشتراكك ينتهي خلال ${daysLeft} أيام`;
      const titleEn = daysLeft <= 1 ? 'Subscription expiring soon' : `Subscription expiring in ${daysLeft} days`;
      const bodyAr = 'يرجى تجديد اشتراكك من إعدادات المتجر.';
      const bodyEn = 'Please renew your subscription from store settings.';
      return { titleAr, titleEn, bodyAr, bodyEn };
    }
    default:
      return null;
  }
}

export function resolveNotificationText(row: any) {
  const payload = parseNotificationPayload(row?.payload ?? row?.meta);
  const generated = buildNotificationText(row?.type, payload);

  const titleAr = generated?.titleAr ?? safeTextFromExisting(row?.title_ar);
  const titleEn = generated?.titleEn ?? safeTextFromExisting(row?.title_en);
  const bodyAr = generated?.bodyAr ?? safeTextFromExisting(row?.body_ar);
  const bodyEn = generated?.bodyEn ?? safeTextFromExisting(row?.body_en);

  const hasAny = Boolean(titleAr || titleEn || bodyAr || bodyEn);
  return {
    payload,
    titleAr: titleAr || (hasAny ? '' : FALLBACK_TITLE_AR),
    titleEn: titleEn || (hasAny ? '' : FALLBACK_TITLE_EN),
    bodyAr: bodyAr || (hasAny ? '' : FALLBACK_BODY_AR),
    bodyEn: bodyEn || (hasAny ? '' : FALLBACK_BODY_EN),
    fallbackUsed: !hasAny,
  };
}

export function getFallbackText() {
  return {
    titleAr: FALLBACK_TITLE_AR,
    bodyAr: FALLBACK_BODY_AR,
    titleEn: FALLBACK_TITLE_EN,
    bodyEn: FALLBACK_BODY_EN,
  };
}
