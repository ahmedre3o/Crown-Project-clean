'use client';

import React, { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest, useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useRouteGuard } from '../guards/useRouteGuard';
import { formatCurrency } from '@/lib/formatters';
import { getPlanFeatures } from '@/permissions';

interface Invoice {
  id: number;
  invoice_number: string | number;
  invoice_serial?: string | null;
  total_amount?: number;
  total?: number;
  subtotal?: number | null;
  total_tax?: number | null;
  grand_total?: number | null;
  discount_amount?: number | null;
  return_status?: 'none' | 'partial' | 'full' | null;
  payment_method?: string;
  created_at?: string;
  order_created_at?: string;
  print_count?: number;
  printed_count?: number;
  last_printed_at?: string | null;
  source?: string | null;
  online_order_id?: number | null;
  order_id?: number;
  invoiceSource?: 'pos' | 'online';
  customer_name?: string;
  customer_phone?: string;
  phone?: string;
  branch_name?: string | null;
  branch_name_ar?: string | null;
  branch_name_en?: string | null;
  public_code?: string | null;
  customer_address?: string;
  address?: string;
  cashier_name?: string;
  business_name?: string;
  owner_name?: string;
  activity_type?: string;
  contact_email?: string;
  contact_phone?: string;
  logo_url?: string;
}

type ShopProfile = {
  id?: number;
  name?: string | null;
  business_name?: string | null;
  business_name_ar?: string | null;
  business_name_en?: string | null;
  logo_url?: string | null;
  activity_type?: string | null;
  owner_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
};

const PAGE_SIZE = 25;

function formatInvoiceTableNumber(invoice: Invoice): string {
  if (invoice.invoiceSource === 'online') {
    const ref = invoice.invoice_number ?? invoice.public_code ?? invoice.id;
    return `ON-${ref}`;
  }
  return String(invoice.invoice_serial || invoice.invoice_number || invoice.id);
}

function branchLabelForInvoice(invoice: Invoice, language: string): string | null {
  const ar = invoice.branch_name_ar || invoice.branch_name;
  const en = invoice.branch_name_en || invoice.branch_name;
  if (!ar && !en && !invoice.branch_name) return null;
  return language === 'ar'
    ? ar || invoice.branch_name || en || ''
    : en || invoice.branch_name || ar || '';
}

function invoiceRowKey(inv: Pick<Invoice, 'id' | 'invoiceSource'>): string {
  return `${inv.invoiceSource}-${inv.id}`;
}

function InvoicesPageContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus');
  const sourceParam = searchParams.get('source');
  const { t, direction, language } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const planFeatures = getPlanFeatures(user?.package);
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'invoices', effectiveRole, showDenied: true });
  const { symbol, currency } = useCurrency();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [business, setBusiness] = useState<ShopProfile>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [itemsMap, setItemsMap] = useState<Record<string, any[]>>({});
  const [linkedReturnsMap, setLinkedReturnsMap] = useState<Record<string, any[]>>({});
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'pos' | 'online'>(
    sourceParam === 'online' ? 'online' : sourceParam === 'pos' ? 'pos' : 'all'
  );
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const focusHandledRef = useRef(false);

  useEffect(() => {
    if (sourceParam === 'online') setSourceFilter('online');
    else if (sourceParam === 'pos') setSourceFilter('pos');
  }, [sourceParam]);

  useEffect(() => {
    if (!authLoading && !allowed) return;
    const handler = () => loadInvoices();
    const delay = search.trim() ? 350 : 0;
    const timer = setTimeout(handler, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, allowed, sourceFilter, search, page]);

  useEffect(() => {
    if (focusId && invoices.length > 0 && !focusHandledRef.current) {
      const id = parseInt(focusId, 10);
      if (!Number.isFinite(id)) return;
      const wantOnline = sourceParam === 'online';
      const wantPos = sourceParam === 'pos';
      const inv = invoices.find((r) => {
        if (r.id !== id) return false;
        if (wantOnline) return r.invoiceSource === 'online';
        if (wantPos) return r.invoiceSource === 'pos';
        return true;
      });
      if (inv) {
        setExpanded(invoiceRowKey(inv));
        focusHandledRef.current = true;
      }
    }
  }, [focusId, invoices, sourceParam]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const printReturnReceipt = async (ret: { id: number; return_number?: string; total_amount?: number; invoice_number?: string }) => {
    try {
      const detail = await apiRequest(`/returns/${ret.id}`);
      await apiRequest(`/returns/${ret.id}/print`, { method: 'POST' });
      const items = detail?.items || [];
      const totalAmt = ret?.total_amount ?? items.reduce((s: number, i: any) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
      const win = window.open('', '_blank');
      if (!win) return;
      const html = `<!DOCTYPE html><html dir="${language === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"><title>${language === 'ar' ? 'إيصال مرتجع' : 'Return Receipt'}</title>
        <style>*{margin:0;padding:0}body{font-family:system-ui;padding:24px;line-height:1.6}.r{max-width:400px;margin:0 auto;border:2px solid #f59e0b;border-radius:12px;padding:20px}.h{text-align:center;border-bottom:1px solid #f59e0b;padding-bottom:12px;margin-bottom:16px}.it{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #fde68a}.tot{margin-top:16px;padding-top:16px;border-top:2px solid #f59e0b;font-weight:700}</style></head><body>
        <div class="r"><div class="h"><h2>${language === 'ar' ? 'إيصال مرتجع' : 'Return Receipt'}</h2><p>${ret?.return_number || ''}</p></div>
        <p>${language === 'ar' ? 'الفاتورة' : 'Invoice'}: ${ret?.invoice_number || '-'}</p>
        <p>${language === 'ar' ? 'التاريخ' : 'Date'}: ${new Date().toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
        <div style="margin-top:12px">${items.map((i: any) => `<div class="it"><span>${language === 'ar' ? i.name_ar : i.name_en || i.name_ar || ''}</span><span>${i.quantity}× ${formatCurrency(Number(i.unit_price) || 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}</span></div>`).join('')}</div>
        <div class="it tot"><span>${language === 'ar' ? 'الإجمالي' : 'Total'}</span><span>${formatCurrency(totalAmt, language === 'ar' ? 'ar' : 'en', currency, symbol)}</span></div></div></body></html>`;
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 300);
    } catch (err: any) {
      showToast(err?.message || (language === 'ar' ? 'فشل طباعة المرتجع' : 'Print failed'));
    }
  };

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      const profilePromise = apiRequest('/shops/profile').then((shopData: ShopProfile) => {
        setBusiness(shopData);
      });

      const fetchInvoiceRows = async (): Promise<void> => {
        if (sourceFilter === 'online' && !planFeatures.onlineStore) {
          setInvoices([]);
          setTotal(0);
          return;
        }
        const params = new URLSearchParams({
          source: sourceFilter,
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (search.trim()) params.set('q', search.trim());
        const data = await apiRequest(`/invoices/list?${params.toString()}`);
        const rows = (data?.rows || []) as Invoice[];
        setInvoices(rows);
        setTotal(Number(data?.total) || 0);
      };

      await Promise.all([profilePromise, fetchInvoiceRows()]);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const toggleInvoice = async (invoice: Invoice) => {
    const key = invoiceRowKey(invoice);
    if (expanded === key) {
      setExpanded(null);
      return;
    }
    setExpanded(key);
    const invoiceId = invoice.id;
    if (!itemsMap[key]) {
      try {
        const isOnline = invoice.invoiceSource === 'online';
        if (isOnline && !planFeatures.onlineStore) return;
        const items = isOnline
          ? (await apiRequest(`/admin/online-invoices/${invoiceId}`))?.items || []
          : await apiRequest(`/sales/${invoiceId}/items`);
        setItemsMap((prev) => ({ ...prev, [key]: items }));
        if (!isOnline) {
          const returns = await apiRequest(`/sales/${invoiceId}/returns`).catch(() => []);
          setLinkedReturnsMap((prev) => ({ ...prev, [key]: Array.isArray(returns) ? returns : [] }));
        }
      } catch (err) {
        // ignore
      }
    }
  };

  const printInvoice = async (invoice: Invoice) => {
    const rowKey = invoiceRowKey(invoice);
    try {
      setPrintingId(rowKey);
      setError(null);

      const isOnline = invoice.invoiceSource === 'online';
      if (isOnline && !planFeatures.onlineStore) return;
      let items = itemsMap[rowKey];
      if (!items) {
        items = isOnline
          ? (await apiRequest(`/admin/online-invoices/${invoice.id}`))?.items || []
          : await apiRequest(`/sales/${invoice.id}/items`);
        setItemsMap((prev) => ({ ...prev, [rowKey]: items }));
      }

      const prevCount = Number(invoice.print_count || invoice.printed_count || 0);
      let printCount = 0;
      let lastPrintedAt: string | null = null;
      try {
        if (isOnline) {
          const printInfo = await apiRequest(`/admin/online-invoices/${invoice.id}/print`, { method: 'POST' });
          printCount = Number(printInfo?.printCount || 0);
          lastPrintedAt = printInfo?.lastPrintedAt || null;
        } else {
          const printInfo = await apiRequest(`/sales/${invoice.id}/print`, { method: 'POST' });
          printCount = Number(printInfo?.printCount || 0);
          lastPrintedAt = printInfo?.lastPrintedAt || null;
        }
        setInvoices((prev) =>
          prev.map((row) =>
            row.id === invoice.id && row.invoiceSource === invoice.invoiceSource
              ? { ...row, print_count: printCount, printed_count: printCount, last_printed_at: lastPrintedAt }
              : row
          )
        );
      } catch {
        // If print counter fails, still allow printing
      }

      if (prevCount > 0) {
        const lastPrinted = invoice.last_printed_at
          ? new Date(invoice.last_printed_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')
          : '';
        showToast(
          language === 'ar'
            ? `تنبيه: تمت طباعة الفاتورة من قبل (آخر طباعة: ${lastPrinted})`
            : `Warning: invoice was printed before (last printed: ${lastPrinted})`
        );
      }

      const receiptWindow = window.open('', '_blank');
      if (!receiptWindow) return;

      const printInfoLabel =
        language === 'ar'
          ? `تمت الطباعة ${printCount} مرات (هذه الطباعة رقم ${printCount})`
          : `Printed ${printCount} times (this is print #${printCount})`;

      let totalBeforeDiscount = 0;
      let discountTotalSum = 0;
      let totalTaxSum = 0;
      const itemsHtml = (items || [])
        .map(
          (item: any) => {
            const name = item.name_snapshot || (language === 'ar' ? item.name_ar : item.name_en);
            const qty = Number(item.quantity || 0);
            const lineBeforeTax = Number(item.line_total_before_tax) || (item.unit_price_before_discount != null ? Number(item.unit_price_before_discount) * qty : 0);
            const lineAfterTax = Number(item.line_total_after_tax) ?? Number(item.total_price) ?? (Number(item.unit_price || item.price_snapshot || 0) * qty);
            const unitPriceBeforeTax = qty > 0 ? Math.round((lineBeforeTax / qty) * 100) / 100 : 0;
            const beforeDiscount = item.unit_price_before_discount != null ? Number(item.unit_price_before_discount) * qty : lineBeforeTax;
            const unitDisc = item.unit_discount != null ? Number(item.unit_discount) * qty : 0;
            const applied = item.discount_applied != null ? Number(item.discount_applied) : 0;
            const taxRate = item.tax_rate != null ? Number(item.tax_rate) : 0;
            const taxAmt = item.tax_amount != null ? Number(item.tax_amount) : 0;
            totalBeforeDiscount += beforeDiscount;
            discountTotalSum += unitDisc;
            totalTaxSum += taxAmt;
            const discountLine = applied && unitDisc > 0
              ? (item.discount_type === 'percent'
                  ? (language === 'ar' ? `خصم: ${item.discount_value}% (وفر ${formatCurrency(unitDisc, 'ar', currency, symbol)})` : `Discount: ${item.discount_value}% (saved ${formatCurrency(unitDisc, 'en', currency, symbol)})`)
                  : (language === 'ar' ? `خصم: ${formatCurrency(unitDisc, 'ar', currency, symbol)}` : `Discount: ${formatCurrency(unitDisc, 'en', currency, symbol)}`))
              : '';
            const taxLine = taxAmt > 0 ? (language === 'ar' ? `ضريبة: ${taxRate}% | ${formatCurrency(taxAmt, 'ar', currency, symbol)}` : `Tax: ${taxRate}% | ${formatCurrency(taxAmt, 'en', currency, symbol)}`) : '';
            const metaParts = [discountLine, taxLine].filter(Boolean);
            const metaHtml = metaParts.length ? `<div class="item-meta">${metaParts.join(' &nbsp;|&nbsp; ')}</div>` : '';
            return `
            <tr>
              <td class="col-item">${name}${metaHtml}</td>
              <td class="col-qty">${qty}x</td>
              <td class="col-price">${formatCurrency(unitPriceBeforeTax, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td>
              <td class="col-total">${formatCurrency(Number(lineAfterTax || 0), language === 'ar' ? 'ar' : 'en', currency, symbol)}</td>
            </tr>
          `;
          }
        )
        .join('');
      const receiptSubtotal = Number(invoice.subtotal) || totalBeforeDiscount;
      const receiptTaxTotal = Number(invoice.total_tax) ?? totalTaxSum;
      const receiptGrandTotal = (Number(invoice.grand_total) || Number(invoice.total_amount)) || 0;

      const hasItemDiscount = (items || []).some(
        (item: any) =>
          (item.discount_amount != null && Number(item.discount_amount) > 0.01) ||
          (item.discount_percent != null && Number(item.discount_percent) > 0.01)
      );
      const hasDiscount =
        discountTotalSum > 0.01 ||
        (invoice.discount_amount != null && Number(invoice.discount_amount) > 0.01) ||
        hasItemDiscount;

      const receiptHTML = `
        <!DOCTYPE html>
        <html dir="${language === 'ar' ? 'rtl' : 'ltr'}" lang="${language}">
          <head>
            <meta charset="UTF-8">
            <title>Receipt - ${invoice.invoice_number || invoice.id}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Inter:wght@400;500;600;700&display=swap');
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Inter', sans-serif;
                font-size: 13px;
                line-height: 1.6;
                background: #0f172a;
                color: #e2e8f0;
                padding: 24px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .receipt {
                width: 100%;
                max-width: min(820px, 100%);
                margin: 0 auto;
                background: #fff;
                color: #0f172a;
                border: 2px solid #06b6d4;
                border-radius: 8px;
                padding: 28px;
                display: flex;
                flex-direction: column;
                min-height: 70vh;
              }
              .header {
                text-align: center;
                margin-bottom: 24px;
                padding-bottom: 20px;
                border-bottom: 1px dotted #64748b;
              }
              .header .brand-name {
                font-family: 'Orbitron', monospace;
                font-size: 22px;
                font-weight: 700;
                letter-spacing: 2px;
                color: #06b6d4;
                margin: 8px 0 4px;
              }
              .header .activity {
                font-size: 12px;
                color: #64748b;
                letter-spacing: 1px;
                margin-bottom: 8px;
              }
              .copy-label {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 999px;
                border: 1px solid #06b6d4;
                color: #0891b2;
                background: #ecfeff;
                font-weight: 600;
                font-size: 11px;
              }
              .info {
                margin-bottom: 24px;
                font-size: 12px;
                color: #475569;
                line-height: 1.7;
              }
              .info p { margin-bottom: 6px; }
              .section-divider { border-top: 1px dotted #94a3b8; margin: 20px 0; }
              table.invoice-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
                table-layout: fixed;
                border: 1px solid #e2e8f0;
              }
              table.invoice-table th,
              table.invoice-table td {
                padding: 10px 10px;
                vertical-align: top;
                border: 1px solid #e2e8f0;
                line-height: 1.5;
              }
              table.invoice-table thead th {
                font-weight: 700;
                color: #0f172a;
                background: #f8fafc;
              }
              table.invoice-table .col-item { width: 42%; min-width: 0; word-wrap: break-word; overflow-wrap: break-word; }
              table.invoice-table .col-qty { width: 10%; text-align: center; }
              table.invoice-table .col-price { width: 22%; text-align: right; }
              table.invoice-table .col-total { width: 26%; text-align: right; font-weight: 600; color: #0891b2; }
              html[dir="rtl"] table.invoice-table .col-item { text-align: right; }
              html[dir="rtl"] table.invoice-table .col-qty,
              html[dir="rtl"] table.invoice-table .col-price,
              html[dir="rtl"] table.invoice-table .col-total { text-align: left; }
              .item-meta { font-size: 11px; color: #0f766e; font-weight: 600; margin-top: 4px; }
              .totals-section { margin-top: 20px; }
              table.totals-table {
                width: 100%;
                max-width: 320px;
                margin-left: auto;
                margin-right: 0;
                border-collapse: collapse;
                font-size: 13px;
                line-height: 1.6;
              }
              html[dir="rtl"] table.totals-table { margin-left: 0; margin-right: auto; }
              table.totals-table td {
                padding: 6px 0;
                vertical-align: middle;
                border-bottom: 1px solid #f1f5f9;
              }
              table.totals-table td:first-child { color: #475569; padding-right: 24px; }
              html[dir="rtl"] table.totals-table td:first-child { padding-right: 0; padding-left: 24px; }
              table.totals-table td:last-child {
                width: 120px;
                min-width: 120px;
                text-align: right;
                font-weight: 500;
              }
              html[dir="rtl"] table.totals-table td:last-child { text-align: left; }
              table.totals-table tr.grand-total td {
                border-bottom: none;
                padding-top: 14px;
                margin-top: 8px;
                border-top: 2px dotted #06b6d4;
              }
              table.totals-table tr.grand-total td:first-child { font-weight: 700; font-size: 16px; color: #06b6d4; }
              table.totals-table tr.grand-total td:last-child { font-size: 18px; font-weight: 700; color: #ec4899; }
              .footer {
                margin-top: auto;
                padding-top: 24px;
                text-align: center;
                font-size: 10px;
                color: #94a3b8;
                letter-spacing: 0.5px;
                line-height: 1.5;
              }
              @media print {
                @page { size: auto portrait; margin: 10mm; }
                body { padding: 0; background: #fff; color: #000; }
                .receipt {
                  border-color: #94a3b8;
                  box-shadow: none;
                  max-width: 100%;
                  min-height: auto;
                  page-break-inside: avoid;
                }
                .header .brand-name, .copy-label { color: #0891b2; }
                .footer { margin-top: 16px; }
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="content">
                <div class="header">
                  ${business?.logo_url ? `<img src="${business.logo_url}" alt="Logo" style="height: 44px; display: block; margin: 0 auto;" />` : ''}
                  <div class="brand-name">${business?.business_name || 'Crown Services'}</div>
                  <div class="activity">${business?.activity_type || (language === 'ar' ? 'تاج الخدمات' : 'Services ERP')}</div>
                  <div class="copy-label">${printInfoLabel}</div>
                </div>
                <div class="info">
                  <p>Invoice # / رقم الفاتورة: ${formatInvoiceTableNumber(invoice)}</p>
                  <p>Date / التاريخ: ${new Date(invoice.created_at ?? Date.now()).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
                  <p>Cashier / الكاشير: ${invoice.cashier_name || 'N/A'}</p>
                  <p>Customer / العميل: ${
                    invoice.invoiceSource === 'online'
                      ? `${invoice.customer_name || (language === 'ar' ? 'عميل أونلاين' : 'Online Customer')} (${
                          language === 'ar' ? 'أونلاين' : 'Online'
                        })`
                      : invoice.customer_name || (language === 'ar' ? 'عميل مباشر' : 'Direct Sale')
                  }</p>
                  ${(invoice.customer_phone || invoice.phone) ? `<p>Phone / الهاتف: ${invoice.customer_phone || invoice.phone}</p>` : ''}
                  ${(invoice.customer_address || invoice.address) ? `<p>Address / العنوان: ${invoice.customer_address || invoice.address}</p>` : ''}
                  ${business?.address ? `<p>Shop Address: ${business.address}</p>` : ''}
                  ${business?.contact_phone ? `<p>Shop Phone: ${business.contact_phone}</p>` : ''}
                </div>
                <div class="section-divider"></div>
                <table class="invoice-table">
                  <thead>
                    <tr>
                      <th class="col-item">Item / الصنف</th>
                      <th class="col-qty">Qty / الكمية</th>
                      <th class="col-price">${language === 'ar' ? 'سعر الوحدة (قبل الضريبة)' : 'Unit price (before tax)'}</th>
                      <th class="col-total">${language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml || ''}
                  </tbody>
                </table>
                <div class="section-divider"></div>
                <div class="totals-section">
                  <table class="totals-table">
                    ${hasDiscount ? `
                    <tr><td>${language === 'ar' ? 'الإجمالي قبل الخصم' : 'Subtotal before discount'}</td><td>${formatCurrency(totalBeforeDiscount, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>
                    <tr><td>${language === 'ar' ? 'إجمالي الخصم' : 'Total discount'}</td><td style="color:#059669;">-${formatCurrency(discountTotalSum, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>
                    ` : ''}
                    <tr><td>${language === 'ar' ? 'المجموع قبل الضريبة' : 'Subtotal (before tax)'}</td><td>${formatCurrency(receiptSubtotal, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>
                    ${receiptTaxTotal > 0 ? `<tr><td>${language === 'ar' ? 'إجمالي الضريبة' : 'Tax total'}</td><td style="color:#0f766e;font-weight:600;">${formatCurrency(receiptTaxTotal, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>` : ''}
                    <tr class="grand-total"><td>${language === 'ar' ? 'الإجمالي النهائي' : 'Grand total'}</td><td>${formatCurrency(receiptGrandTotal, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td></tr>
                  </table>
                </div>
              </div>
              <div class="footer">
                <p>Thank you for your visit! / شكراً لزيارتكم!</p>
                <p>POWERED BY CROWN SERVICES | WWW.CROWNCS.ORG</p>
              </div>
            </div>
          </body>
        </html>
      `;

      receiptWindow.document.write(receiptHTML);
      receiptWindow.document.close();
      setTimeout(() => {
        receiptWindow.print();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to print invoice');
    } finally {
      setPrintingId(null);
    }
  };

  if (authLoading || !allowed) return null;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto overflow-x-hidden">
          <h1 className="text-2xl font-bold text-cyan-200 mb-6">{t('invoices.title')}</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => {
              setPage(1);
              setSourceFilter('all');
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              sourceFilter === 'all'
                ? 'bg-cyan-600 text-white'
                : 'border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10'
            }`}
          >
            {language === 'ar' ? 'الكل' : 'All'}
          </button>
          <button
            onClick={() => {
              setPage(1);
              setSourceFilter('pos');
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              sourceFilter === 'pos'
                ? 'bg-cyan-600 text-white'
                : 'border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10'
            }`}
          >
            POS
          </button>
          <button
            onClick={() => {
              setPage(1);
              setSourceFilter('online');
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
              sourceFilter === 'online'
                ? 'bg-cyan-600 text-white'
                : 'border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10'
            }`}
          >
            {language === 'ar' ? 'أونلاين' : 'Online'}
          </button>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder={language === 'ar' ? 'ابحث برقم الفاتورة / الهاتف / اسم العميل...' : 'Search by invoice #, phone, customer name...'}
            className="flex-1 min-w-[180px] px-4 py-2 rounded-xl border border-cyan-500/30 bg-black/30 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        {toast && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            {toast}
          </div>
        )}
        <div className="neon-card rounded-xl p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {business && (
            <div className="mb-6 rounded-lg border border-cyan-500/20 p-4 text-sm text-slate-300 flex items-center gap-4">
              {business.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={business.logo_url} alt="Logo" className="h-12 w-12 rounded-md object-cover border border-cyan-500/20" />
              ) : (
                <div className="h-12 w-12 rounded-md border border-cyan-500/20 flex items-center justify-center text-cyan-300/60">
                  {business.business_name?.[0] || 'C'}
                </div>
              )}
              <div>
                <div className="font-semibold text-cyan-200">
                  {language === 'ar'
                    ? business.business_name_ar || business.business_name || business.business_name_en || business.name || 'Crown Services'
                    : business.business_name_en || business.business_name || business.business_name_ar || business.name || 'Crown Services'}
                </div>
                <div>{business.activity_type || ''}</div>
                <div>{business.address || ''}</div>
                <div>{business.contact_phone || ''}</div>
                <div>{business.contact_email || ''}</div>
              </div>
            </div>
          )}
          {loading ? (
            <div className="text-sm text-slate-300">{t('common.loading')}</div>
          ) : (
            <div className="overflow-x-auto -mx-2 md:mx-0">
              <table className="w-full text-sm min-w-[700px] table-fixed border-collapse" style={{ tableLayout: 'fixed' }} dir={direction === 'rtl' ? 'rtl' : 'ltr'}>
                <colgroup>
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead className="text-cyan-400 border-b border-cyan-500/20">
                  <tr>
                    <th className="py-2 px-3 text-right tabular-nums whitespace-normal break-words leading-relaxed border-b border-cyan-500/20">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice ID'}</th>
                    <th className="py-2 px-3 text-right tabular-nums whitespace-normal leading-relaxed border-b border-cyan-500/20">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="py-2 px-3 text-right whitespace-normal break-words leading-relaxed border-b border-cyan-500/20">{language === 'ar' ? 'العميل' : 'Customer'}</th>
                    <th className="py-2 px-3 text-right tabular-nums whitespace-normal leading-relaxed border-b border-cyan-500/20">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                    <th className="py-2 px-3 text-right whitespace-normal break-words leading-relaxed border-b border-cyan-500/20">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="py-2 px-3 text-right whitespace-normal leading-relaxed border-b border-cyan-500/20">{language === 'ar' ? 'التفاصيل' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 px-3 text-center text-slate-500">
                        {language === 'ar' ? 'لا توجد فواتير' : 'No invoices found'}
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <React.Fragment key={`${invoice.invoiceSource}-${invoice.id}`}>
                        <tr className="border-b border-cyan-500/10">
                          <td className="py-2 px-3 text-right tabular-nums whitespace-normal break-words leading-relaxed">
                            {formatInvoiceTableNumber(invoice)}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums whitespace-normal leading-relaxed">
                            {new Date(invoice.created_at ?? Date.now()).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
                          </td>
                          <td className="py-2 px-3 text-right whitespace-normal break-words leading-relaxed">
                            {invoice.invoiceSource === 'online' ? (
                              <>
                                <span>
                                  {invoice.customer_name || (language === 'ar' ? 'عميل أونلاين' : 'Online customer')}
                                </span>
                                <div className="text-xs text-cyan-400/90 mt-0.5">
                                  {language === 'ar' ? 'عميل أونلاين' : 'Online customer'}
                                </div>
                                {(invoice.customer_phone || invoice.phone) && (
                                  <div className="text-xs text-slate-400 tabular-nums break-all mt-0.5">
                                    {invoice.customer_phone || invoice.phone}
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <span>
                                  {invoice.customer_name || (language === 'ar' ? 'عميل مباشر' : 'Walk-in customer')}
                                </span>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {(() => {
                                    const br = branchLabelForInvoice(invoice, language);
                                    if (language === 'ar') {
                                      return br ? `عميل مباشر — فرع ${br}` : 'عميل مباشر';
                                    }
                                    return br ? `Walk-in · ${br}` : 'Walk-in customer';
                                  })()}
                                </div>
                                {(invoice.customer_phone || invoice.phone) && (
                                  <div className="text-xs text-slate-400 tabular-nums break-all mt-0.5">
                                    {invoice.customer_phone || invoice.phone}
                                  </div>
                                )}
                              </>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums whitespace-normal leading-relaxed">
                            {formatCurrency(
                              Number(invoice.total_amount ?? invoice.total ?? 0),
                              language === 'ar' ? 'ar' : 'en',
                              currency,
                              symbol
                            )}
                          </td>
                          <td className="py-2 px-3 text-right whitespace-normal break-words leading-relaxed">
                            <div className="flex flex-wrap gap-1.5 justify-end">
                              {(invoice.source === 'online' || invoice.online_order_id) && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-200">
                                  {language === 'ar' ? 'أونلاين' : 'Online'}
                                </span>
                              )}
                              {(!invoice.source || invoice.source === 'pos') && !invoice.online_order_id && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200">
                                  POS
                                </span>
                              )}
                              {invoice.invoiceSource === 'pos' && invoice.return_status === 'partial' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold">
                                  {language === 'ar' ? 'تم استرجاع منتج/منتجات' : 'Partial return'}
                                </span>
                              )}
                              {invoice.invoiceSource === 'pos' && invoice.return_status === 'full' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-200 font-semibold">
                                  {language === 'ar' ? 'تم استرجاع الفاتورة بالكامل' : 'Full return'}
                                </span>
                              )}
                              {((invoice.print_count ?? invoice.printed_count ?? 0) >= 1) && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-200">
                                  {language === 'ar'
                                    ? `تمت الطباعة ${invoice.print_count ?? invoice.printed_count} مرات`
                                    : `Printed ${invoice.print_count ?? invoice.printed_count}x`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => toggleInvoice(invoice)}
                              className="text-cyan-300 hover:text-cyan-200 text-xs whitespace-nowrap"
                            >
                              {expanded === invoiceRowKey(invoice)
                                ? language === 'ar'
                                  ? 'إخفاء التفاصيل'
                                  : 'Hide details'
                                : language === 'ar'
                                  ? 'عرض التفاصيل'
                                  : 'View details'}
                            </button>
                          </td>
                        </tr>
                        {expanded === invoiceRowKey(invoice) && (
                          <tr className="border-b border-cyan-500/10 bg-[#0f172a]">
                            <td colSpan={6} className="py-3 px-3">
                              <div className="text-xs text-slate-400 mb-2 space-y-1">
                                <div>{invoice.customer_address || ''}</div>
                                <div>{language === 'ar' ? 'الكاشير' : 'Cashier'}: {invoice.cashier_name || '—'}</div>
                                <div>{language === 'ar' ? 'طريقة الدفع' : 'Payment'}: {invoice.payment_method}</div>
                                <div className="pt-2">
                                  <button
                                    onClick={() => printInvoice(invoice)}
                                    disabled={printingId === invoiceRowKey(invoice)}
                                    className="text-cyan-300 hover:text-cyan-200 text-xs border border-cyan-500/30 rounded-md px-3 py-1"
                                  >
                                    {printingId === invoiceRowKey(invoice)
                                      ? language === 'ar'
                                        ? 'جاري الطباعة...'
                                        : 'Printing...'
                                      : language === 'ar'
                                        ? 'طباعة'
                                        : 'Print'}
                                  </button>
                                </div>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs table-fixed border border-cyan-500/30 border-collapse" style={{ tableLayout: 'fixed' }}>
                                  <colgroup>
                                    <col style={{ width: '5%' }} />
                                    <col style={{ width: '45%' }} />
                                    <col style={{ width: '10%' }} />
                                    <col style={{ width: '20%' }} />
                                    <col style={{ width: '20%' }} />
                                  </colgroup>
                                  <thead className="text-cyan-300">
                                    <tr>
                                      <th className="text-right py-2.5 px-3 border-b border-r border-cyan-500/30">{language === 'ar' ? 'م' : '#'}</th>
                                      <th className="text-right py-2.5 px-3 border-b border-r border-cyan-500/30">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                                      <th className="text-right py-2.5 px-3 border-b border-r border-cyan-500/30">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                                      <th className="text-right py-2.5 px-3 border-b border-r border-cyan-500/30">{language === 'ar' ? 'السعر' : 'Price'}</th>
                                      <th className="text-right py-2.5 px-3 border-b border-cyan-500/30">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(itemsMap[invoiceRowKey(invoice)] || []).map((item: any, idx: number) => {
                                      const name = item.name_snapshot || (language === 'ar' ? item.name_ar : item.name_en);
                                      const unitPrice = item.unit_price ?? item.price_snapshot ?? 0;
                                      const totalPrice = item.total_price ?? (Number(item.price_snapshot || 0) * Number(item.quantity || 0));
                                      return (
                                      <tr key={item.id || idx} className="border-b border-cyan-500/20">
                                        <td className="text-right py-2.5 px-3 border-r border-cyan-500/20 tabular-nums">{idx + 1}</td>
                                        <td className="text-right py-2.5 px-3 border-r border-cyan-500/20 break-words">{name}</td>
                                        <td className="text-right py-2.5 px-3 border-r border-cyan-500/20 tabular-nums">{item.quantity}</td>
                                        <td className="text-right py-2.5 px-3 border-r border-cyan-500/20 tabular-nums">
                                          {formatCurrency(
                                            Number(unitPrice),
                                            language === 'ar' ? 'ar' : 'en',
                                            currency,
                                            symbol
                                          )}
                                        </td>
                                        <td className="text-right py-2.5 px-3 tabular-nums">
                                          {formatCurrency(
                                            Number(totalPrice),
                                            language === 'ar' ? 'ar' : 'en',
                                            currency,
                                            symbol
                                          )}
                                        </td>
                                      </tr>
                                    );})}
                                    {(itemsMap[invoiceRowKey(invoice)] || []).length === 0 && (
                                      <tr>
                                        <td colSpan={5} className="py-2.5 px-3 text-slate-500 text-right">
                                          {language === 'ar' ? 'لا توجد عناصر' : 'No items found'}
                                        </td>
                                      </tr>
                                    )}
                                    {(itemsMap[invoiceRowKey(invoice)] || []).length > 0 && (
                                      <tr className="border-t-2 border-cyan-500/30 bg-cyan-500/5">
                                        <td colSpan={4} className="text-right py-2.5 px-3 font-semibold text-cyan-300">
                                          {language === 'ar' ? 'الإجمالي النهائي' : 'Grand total'}
                                        </td>
                                        <td className="text-right py-2.5 px-3 font-semibold tabular-nums text-cyan-200">
                                          {formatCurrency(
                                            Number(invoice.total_amount ?? invoice.total ?? 0),
                                            language === 'ar' ? 'ar' : 'en',
                                            currency,
                                            symbol
                                          )}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              {invoice.invoiceSource === 'pos' && (linkedReturnsMap[invoiceRowKey(invoice)] || []).length > 0 && (
                                <div className="mt-4 pt-3 border-t border-cyan-500/20">
                                  <h4 className="text-cyan-300 font-semibold mb-2">{language === 'ar' ? 'المرتجعات المرتبطة' : 'Linked returns'}</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {(linkedReturnsMap[invoiceRowKey(invoice)] || []).map((r: any) => (
                                      <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                        <span className="text-amber-200 font-mono">{r.return_number}</span>
                                        <span className="text-slate-400 text-xs">{formatCurrency(r.total_amount || 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}</span>
                                        <button
                                          onClick={() =>
                                            printReturnReceipt({
                                              ...r,
                                              invoice_number: formatInvoiceTableNumber(invoice),
                                            })
                                          }
                                          className="text-xs px-2 py-1 rounded bg-amber-600/80 hover:bg-amber-500 text-white"
                                        >
                                          {language === 'ar' ? 'طباعة إيصال' : 'Print receipt'}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!loading && total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-cyan-500/20">
              <p className="text-sm text-slate-400">
                {language === 'ar'
                  ? `عرض ${rangeFrom}–${rangeTo} من ${total}`
                  : `Showing ${rangeFrom}–${rangeTo} of ${total}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg text-sm border border-cyan-500/40 text-cyan-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-500/10"
                >
                  {language === 'ar' ? 'السابق' : 'Prev'}
                </button>
                <span className="text-sm text-cyan-200 tabular-nums min-w-[4.5rem] text-center">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg text-sm border border-cyan-500/40 text-cyan-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan-500/10"
                >
                  {language === 'ar' ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <InvoicesPageContent />
    </Suspense>
  );
}

