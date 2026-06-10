'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/formatters';
import { Printer, RotateCcw, Search } from 'lucide-react';

type SaleItem = {
  id: number;
  product_id: number;
  quantity: number;
  quantity_base_units?: number;
  quantity_returnable?: number;
  unit_price: number;
  total_price?: number;
  tax_amount?: number;
  line_total_after_tax?: number;
  name_ar?: string;
  name_en?: string;
};

type Sale = {
  id: number;
  invoice_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total_amount: number;
  created_at: string;
  source?: string | null;
  online_order_id?: number | null;
};

type ReturnRecord = {
  id: number;
  sale_id: number | null;
  return_number: string;
  total_amount: number;
  reason: string | null;
  created_at: string;
  created_by?: string;
  invoice_number?: string;
  original_invoice_number?: string;
  customer_name?: string;
  customer_phone?: string;
  print_count?: number;
  items_count?: number;
  type?: 'partial' | 'full';
  branch_name?: string;
  branch_name_ar?: string;
  branch_name_en?: string;
  branch_id?: number | null;
};

type BranchRecord = {
  id: number;
  name?: string;
  name_ar?: string;
  name_en?: string;
};

export default function ReturnsPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'returns', effectiveRole, showDenied: true });
  const { symbol, currency } = useCurrency();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInvoice, setSearchInvoice] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundSale, setFoundSale] = useState<Sale | null>(null);
  const [invoiceSource, setInvoiceSource] = useState<'pos' | 'online'>('pos');
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'list' | 'create'>('list');
  const [periodFilter, setPeriodFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'>('all');
  const [printingReturnId, setPrintingReturnId] = useState<number | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);

  const getShopFallbackName = useCallback((): string => {
    const u = (user || {}) as any;
    const raw =
      u.shop_name ||
      u.shopName ||
      u.store_name ||
      u.storeName ||
      u.ownerName ||
      (typeof u.username === 'string' ? String(u.username).split('@')[0] : '');
    const name = String(raw || '').trim();
    return name || (language === 'ar' ? 'الفرع الرئيسي' : 'Main Branch');
  }, [language, user]);

  const getBranchName = useCallback(
    (rec?: { branch_id?: number | null; branch_name?: string; branch_name_ar?: string; branch_name_en?: string }) => {
      const direct =
        language === 'ar'
          ? rec?.branch_name_ar || rec?.branch_name || rec?.branch_name_en
          : rec?.branch_name_en || rec?.branch_name || rec?.branch_name_ar;
      if (String(direct || '').trim()) return String(direct).trim();

      const branchId = Number(rec?.branch_id || 0);
      if (branchId > 0) {
        const b = branches.find((x) => Number(x.id) === branchId);
        const mapped = language === 'ar' ? b?.name_ar || b?.name || b?.name_en : b?.name_en || b?.name || b?.name_ar;
        if (String(mapped || '').trim()) return String(mapped).trim();
      }

      if (branches.length > 0) {
        const first = branches[0];
        const firstName = language === 'ar' ? first.name_ar || first.name || first.name_en : first.name_en || first.name || first.name_ar;
        if (String(firstName || '').trim()) return String(firstName).trim();
      }

      return getShopFallbackName();
    },
    [branches, getShopFallbackName, language]
  );

  const loadReturns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (periodFilter !== 'all') params.set('period', periodFilter);
      const data = await apiRequest(`/returns${params.toString() ? `?${params}` : ''}`);
      setReturns(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.status === 404) {
        setReturns([]);
      } else {
        setError(err?.message || (language === 'ar' ? 'فشل تحميل المرتجعات' : 'Failed to load returns'));
      }
    } finally {
      setLoading(false);
    }
  }, [language, periodFilter]);

  const loadBranches = useCallback(async () => {
    try {
      const data = await apiRequest('/branches');
      setBranches(Array.isArray(data) ? data : []);
    } catch {
      setBranches([]);
    }
  }, []);

  const handleSearchInvoice = async () => {
    const q = searchInvoice.trim();
    if (!q) return;
    try {
      setSearching(true);
      setError(null);
      const data = await apiRequest(`/sales/by-invoice?number=${encodeURIComponent(q)}`);
      const src = data?.source === 'online' ? 'online' : 'pos';
      setInvoiceSource(src);
      const sale = data?.sale;
      const items = data?.items || [];
      if (!sale || !Array.isArray(items)) {
        setFoundSale(null);
        setSaleItems([]);
        setError(language === 'ar' ? 'لم يتم العثور على فاتورة' : 'Invoice not found');
      } else {
        setFoundSale({
          ...sale,
          online_order_id: sale.online_order_id ?? (src === 'online' ? sale.id : undefined),
        });
        setSaleItems(items);
        const init: Record<number, number> = {};
        items.forEach((it: SaleItem) => {
          const maxQty = it.quantity_returnable ?? it.quantity ?? 0;
          init[it.id] = maxQty;
        });
        setReturnQuantities(init);
        setMode('create');
      }
    } catch (err: any) {
      setFoundSale(null);
      setSaleItems([]);
      setError(err?.message || (language === 'ar' ? 'لم يتم العثور على فاتورة' : 'Invoice not found'));
    } finally {
      setSearching(false);
    }
  };

  const handleFullReturn = () => {
    const init: Record<number, number> = {};
    saleItems.forEach((it) => {
      const maxQty = it.quantity_returnable ?? it.quantity ?? 0;
      init[it.id] = maxQty;
    });
    setReturnQuantities(init);
  };

  const handlePartialReturn = () => {
    setReturnQuantities({});
  };

  const handlePrintFromList = async (r: ReturnRecord) => {
    try {
      setPrintingReturnId(r.id);
      const detail = await apiRequest(`/returns/${r.id}`);
      await apiRequest(`/returns/${r.id}/print`, { method: 'POST' });
      const ret = detail?.return || detail;
      const items = detail?.items || [];
      const sale: Sale = {
        id: ret.sale_id,
        invoice_number: ret.invoice_number || ret.original_invoice_number || `#${ret.sale_id}`,
        customer_name: ret.customer_name,
        customer_phone: ret.customer_phone,
        total_amount: ret.total_amount,
        created_at: ret.created_at,
      };
      const returnedItems = items.map((i: any) => ({
        product_id: i.product_id,
        sale_item_id: i.sale_item_id != null ? Number(i.sale_item_id) : undefined,
        quantity: i.quantity,
        unit_price: parseFloat(i.unit_price) || 0,
      }));
      let allItems: SaleItem[] = [];
      if (ret?.sale_id) {
        try {
          const saleItemsRes = await apiRequest(`/sales/${ret.sale_id}/items`);
          allItems = Array.isArray(saleItemsRes) ? saleItemsRes : [];
        } catch {
          allItems = [];
        }
      }
      if (allItems.length === 0) {
        allItems = items.map((i: any) => ({
          id: i.sale_item_id != null ? Number(i.sale_item_id) : i.id,
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: parseFloat(i.unit_price) || 0,
          name_ar: i.name_ar,
          name_en: i.name_en,
        }));
      }
      printReturnReceipt(ret, sale, returnedItems, allItems);
      loadReturns();
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'فشل طباعة المرتجع' : 'Print failed'));
    } finally {
      setPrintingReturnId(null);
    }
  };

  const printReturnReceipt = (
    ret: { return_number?: string; total_amount?: number; branch_name?: string; branch_name_ar?: string; branch_name_en?: string },
    sale: Sale,
    returnedItems: Array<{ product_id: number; sale_item_id?: number; quantity: number; unit_price: number }>,
    allItems: SaleItem[]
  ) => {
    const win = window.open('', '_blank');
    if (!win) return;
    const getSaleItemForReturn = (ri: { product_id: number; sale_item_id?: number }) =>
      (ri.sale_item_id ? allItems.find((a) => a.id === ri.sale_item_id) : undefined) ||
      allItems.find((a) => a.product_id === ri.product_id);

    const getUnitPriceAfterTax = (ri: { product_id: number; sale_item_id?: number; quantity: number; unit_price: number }) => {
      const saleItem = getSaleItemForReturn(ri);
      const baseUnit = Number(saleItem?.unit_price ?? ri.unit_price ?? 0) || 0;
      const soldQty = Number(saleItem?.quantity ?? 0) || 0;
      const lineAfterTax = Number((saleItem as any)?.line_total_after_tax ?? 0) || 0;
      const lineTax = Number((saleItem as any)?.tax_amount ?? 0) || 0;
      if (soldQty > 0 && lineAfterTax > 0) return lineAfterTax / soldQty;
      if (soldQty > 0 && lineTax !== 0) return baseUnit + (lineTax / soldQty);
      return baseUnit;
    };

    const getReturnLineTaxBreakdown = (ri: { product_id: number; sale_item_id?: number; quantity: number; unit_price: number }) => {
      const saleItem = getSaleItemForReturn(ri);
      const soldQty = Number(saleItem?.quantity ?? 0) || 0;
      const retQty = ri.quantity;
      const ratio = soldQty > 0 ? retQty / soldQty : 1;
      const lineBefore = Number((saleItem as any)?.line_total_before_tax ?? 0) || 0;
      const lineTax = Number((saleItem as any)?.tax_amount ?? 0) || 0;
      const lineAfter = Number((saleItem as any)?.line_total_after_tax ?? 0) || 0;
      if (soldQty > 0 && (lineAfter > 0 || lineTax !== 0 || lineBefore > 0)) {
        return {
          beforeTax: lineBefore * ratio,
          tax: lineTax * ratio,
          afterTax: lineAfter > 0 ? lineAfter * ratio : retQty * getUnitPriceAfterTax(ri),
        };
      }
      const base = Number(saleItem?.unit_price ?? ri.unit_price ?? 0) || 0;
      const uat = getUnitPriceAfterTax(ri);
      return {
        beforeTax: retQty * base,
        tax: Math.max(0, retQty * uat - retQty * base),
        afterTax: retQty * uat,
      };
    };

    const fallbackTotal = returnedItems.reduce((s, i) => s + i.quantity * getUnitPriceAfterTax(i), 0);
    const totalAmt = ret?.total_amount ?? fallbackTotal;
    const lineRows = returnedItems.map((i) => {
      const name =
        (i.sale_item_id ? allItems.find((a) => a.id === i.sale_item_id) : undefined) ||
        allItems.find((a) => a.product_id === i.product_id);
      const unitAfterTax = getUnitPriceAfterTax(i);
      const br = getReturnLineTaxBreakdown(i);
      return { i, name, unitAfterTax, br };
    });
    const sumBefore = lineRows.reduce((s, x) => s + x.br.beforeTax, 0);
    const sumTax = lineRows.reduce((s, x) => s + x.br.tax, 0);
    const html = `
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
        <head><meta charset="UTF-8"><title>${language === 'ar' ? 'إيصال مرتجع' : 'Return Receipt'}</title>
        <style>*{margin:0;padding:0}body{font-family:system-ui;padding:24px;line-height:1.6}.r{max-width:420px;margin:0 auto;border:2px solid #f59e0b;border-radius:12px;padding:20px}.h{text-align:center;border-bottom:1px solid #f59e0b;padding-bottom:12px;margin-bottom:16px}.print-branch{font-weight:700;margin-bottom:12px}.it{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;padding:10px 0;border-bottom:1px solid #fde68a}.it .meta{font-size:11px;color:#444;margin-top:4px;line-height:1.4}.tot{margin-top:12px;padding-top:12px;border-top:1px solid #fde68a;font-weight:600;font-size:13px}.tot.grand{margin-top:8px;padding-top:12px;border-top:2px solid #f59e0b;font-weight:700;font-size:15px}@media print{.print-branch{font-weight:bold;margin-bottom:10px}}</style>
        </head>
        <body>
          <div class="r">
            <div class="h"><h2>${language === 'ar' ? 'إيصال مرتجع' : 'Return Receipt'}</h2><p>${ret?.return_number || ''}</p></div>
            <p class="print-branch">${language === 'ar' ? 'الفرع: ' : 'Branch: '}${getBranchName(ret)}</p>
            <p>${language === 'ar' ? 'الفاتورة' : 'Invoice'}: ${sale.invoice_number}</p>
            <p>${language === 'ar' ? 'التاريخ' : 'Date'}: ${new Date().toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
            <div style="margin-top:12px">
              ${lineRows
                .map(({ i, name, unitAfterTax, br }) => {
                  const metaAr = `قبل الضريبة: ${formatCurrency(br.beforeTax, 'ar', currency, symbol)} · الضريبة: ${formatCurrency(br.tax, 'ar', currency, symbol)} · بعد الضريبة: ${formatCurrency(br.afterTax, 'ar', currency, symbol)}`;
                  const metaEn = `Before tax: ${formatCurrency(br.beforeTax, 'en', currency, symbol)} · Tax: ${formatCurrency(br.tax, 'en', currency, symbol)} · After tax: ${formatCurrency(br.afterTax, 'en', currency, symbol)}`;
                  return `<div class="it"><div><div>${language === 'ar' ? name?.name_ar : name?.name_en || name?.name_ar || ''}</div><div class="meta">${language === 'ar' ? metaAr : metaEn}</div></div><div style="text-align:end;white-space:nowrap">${i.quantity}× ${formatCurrency(unitAfterTax, language === 'ar' ? 'ar' : 'en', currency, symbol)}</div></div>`;
                })
                .join('')}
            </div>
            <div class="it tot"><span>${language === 'ar' ? 'المجموع قبل الضريبة' : 'Subtotal (before tax)'}</span><span>${formatCurrency(sumBefore, language === 'ar' ? 'ar' : 'en', currency, symbol)}</span></div>
            ${sumTax > 0.005 ? `<div class="it tot"><span>${language === 'ar' ? 'إجمالي الضريبة' : 'Tax'}</span><span>${formatCurrency(sumTax, language === 'ar' ? 'ar' : 'en', currency, symbol)}</span></div>` : ''}
            <div class="it tot grand"><span>${language === 'ar' ? 'الإجمالي بعد الضريبة' : 'Total (incl. tax)'}</span><span>${formatCurrency(totalAmt, language === 'ar' ? 'ar' : 'en', currency, symbol)}</span></div>
          </div>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  const handleSubmitReturn = async () => {
    if (!foundSale) return;
    const items = saleItems
      .filter((it) => (returnQuantities[it.id] || 0) > 0)
      .map((it) => {
        const qty = returnQuantities[it.id] || 0;
        const qtyBase = it.quantity_base_units != null && it.quantity > 0
          ? Math.round((qty / it.quantity) * it.quantity_base_units)
          : qty;
        return {
          product_id: it.product_id,
          sale_item_id: it.id,
          quantity: qty,
          unit_price: it.unit_price,
          quantity_base_units: qtyBase,
        };
      });
    if (items.length === 0) {
      setError(language === 'ar' ? 'اختر أصنافاً للمرتجع' : 'Select items to return');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const payload =
        invoiceSource === 'online'
          ? {
              online_order_id: foundSale.online_order_id ?? foundSale.id,
              items,
              reason: reason || undefined,
            }
          : { sale_id: foundSale.id, items, reason: reason || undefined };
      const result = await apiRequest('/returns', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const ret = result?.return || result;
      printReturnReceipt(ret, foundSale, items, saleItems);
      setFoundSale(null);
      setSaleItems([]);
      setReturnQuantities({});
      setReason('');
      setMode('list');
      loadReturns();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('crown-dashboard-refresh', { detail: { returnId: ret?.id } }));
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'فشل إنشاء المرتجع' : 'Return failed'));
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!authLoading && allowed) {
      loadReturns();
      loadBranches();
    }
  }, [authLoading, allowed, loadBranches, loadReturns]);

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6 flex items-center gap-2">
          <RotateCcw className="w-6 h-6" />
          {language === 'ar' ? 'المرتجع' : 'Returns'}
        </h1>

        <div className="mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              placeholder={language === 'ar' ? 'رقم الفاتورة...' : 'Invoice number...'}
              className="flex-1 px-4 py-2 rounded-xl border border-cyan-500/30 bg-black/30 text-slate-100"
              onKeyDown={(e) => e.key === 'Enter' && handleSearchInvoice()}
            />
            <button
              onClick={handleSearchInvoice}
              disabled={searching}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl flex items-center gap-2 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {language === 'ar' ? 'بحث' : 'Search'}
            </button>
          </div>
          {mode === 'create' && foundSale && (
            <button
              onClick={() => { setMode('list'); setFoundSale(null); setSaleItems([]); setError(null); }}
              className="px-4 py-2 border border-cyan-500/50 rounded-xl text-cyan-300 hover:bg-cyan-500/10"
            >
              {language === 'ar' ? 'العودة للقائمة' : 'Back to list'}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        {mode === 'create' && foundSale && saleItems.length > 0 && (
          <div className="neon-card rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-cyan-300 mb-4">
              {language === 'ar' ? 'تفاصيل الفاتورة' : 'Invoice details'} — {foundSale.invoice_number}
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              {foundSale.customer_name || foundSale.customer_phone || '-'} • {formatCurrency(foundSale.total_amount, language === 'ar' ? 'ar' : 'en', currency, symbol)}
            </p>
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleFullReturn}
                className="px-3 py-1.5 bg-amber-600/80 hover:bg-amber-500 rounded-lg text-sm"
              >
                {language === 'ar' ? 'مرتجع كامل' : 'Full return'}
              </button>
              <button
                onClick={handlePartialReturn}
                className="px-3 py-1.5 bg-slate-600/80 hover:bg-slate-500 rounded-lg text-sm"
              >
                {language === 'ar' ? 'مرتجع جزئي' : 'Partial return'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-cyan-400 border-b border-cyan-500/20">
                  <tr>
                    <th className="py-2 text-left">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                    <th className="py-2 text-left">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                    <th className="py-2 text-left">{language === 'ar' ? 'مرتجع' : 'Return'}</th>
                    <th className="py-2 text-left">{language === 'ar' ? 'السعر' : 'Price'}</th>
                  </tr>
                </thead>
                <tbody className="text-slate-200">
                  {saleItems.map((it) => {
                    const maxQty = it.quantity_returnable ?? it.quantity ?? 0;
                    return (
                      <tr key={it.id} className="border-b border-cyan-500/10">
                        <td className="py-2">{language === 'ar' ? it.name_ar : it.name_en || it.name_ar}</td>
                        <td className="py-2">{it.quantity} {maxQty < it.quantity ? `(${language === 'ar' ? 'قابل للمرتجع' : 'returnable'}: ${maxQty})` : ''}</td>
                        <td className="py-2">
                          <input
                            type="number"
                            min={0}
                            max={maxQty}
                            value={returnQuantities[it.id] ?? 0}
                            onChange={(e) => setReturnQuantities((prev) => ({ ...prev, [it.id]: Math.max(0, Math.min(maxQty, parseInt(e.target.value, 10) || 0)) }))}
                            className="w-20 px-2 py-1 rounded bg-black/50 border border-cyan-500/30 text-white"
                          />
                        </td>
                        <td className="py-2">{formatCurrency(it.unit_price, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={language === 'ar' ? 'سبب المرتجع (اختياري)' : 'Reason (optional)'}
                className="w-full max-w-md px-4 py-2 rounded-xl border border-cyan-500/30 bg-black/30 text-slate-100 mb-4"
              />
              <button
                onClick={handleSubmitReturn}
                disabled={submitting}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl font-medium disabled:opacity-50"
              >
                {submitting ? (language === 'ar' ? 'جاري...' : 'Processing...') : (language === 'ar' ? 'تأكيد المرتجع' : 'Confirm Return')}
              </button>
            </div>
          </div>
        )}

        <div className="neon-card rounded-xl p-6 accounting-print">
          <h2 className="hidden print:block text-xl font-bold text-black mb-4">
            {language === 'ar' ? 'سجل المرتجعات' : 'Returns log'}
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 print:hidden">
            <h2 className="text-lg font-bold text-cyan-300">{language === 'ar' ? 'سجل المرتجعات' : 'Returns history'}</h2>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly', 'yearly', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    periodFilter === p ? 'bg-cyan-600 text-white' : 'border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10'
                  }`}
                >
                  {language === 'ar'
                    ? { daily: 'اليوم', weekly: 'الأسبوع', monthly: 'الشهر', yearly: 'السنة', all: 'الكل' }[p]
                    : { daily: 'Today', weekly: 'Week', monthly: 'Month', yearly: 'Year', all: 'All' }[p]}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <p className="text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : returns.length === 0 ? (
            <p className="text-slate-500 text-center py-8">
              {language === 'ar' ? 'لا توجد مرتجعات' : 'No returns yet'}
            </p>
          ) : (
            <div className={`table-scroll table-rtl-wrap -mx-2 md:mx-0 ${direction === 'rtl' ? 'text-right' : 'text-left'}`} dir={direction}>
              <table className="data-table text-sm text-slate-200 min-w-[1100px]">
                <thead>
                  <tr>
                    <th className="returns-col-return">{language === 'ar' ? 'رقم المرتجع' : 'Return #'}</th>
                    <th className="returns-col-invoice">{language === 'ar' ? 'الفاتورة' : 'Invoice'}</th>
                    <th className="table-col-date">{language === 'ar' ? 'الفرع' : 'Branch'}</th>
                    <th className="table-col-currency">{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                    <th className="table-col-date">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="col-center actions-column">{language === 'ar' ? 'الطباعة' : 'Print'}</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((r) => (
                    <tr key={r.id}>
                      <td className="data-table-num returns-col-return">
                        <span dir="ltr" className="tabular-nums font-mono">{r.return_number}</span>
                      </td>
                      <td className="returns-col-invoice">
                        {r.invoice_number || r.original_invoice_number || (r.sale_id ? `#${r.sale_id}` : '-')}
                      </td>
                      <td className="table-col-date">
                        {getBranchName(r)}
                      </td>
                      <td className="data-table-num table-col-currency">
                        <span dir="ltr" className="tabular-nums">{formatCurrency(r.total_amount, 'en', currency, symbol)}</span>
                      </td>
                      <td className="data-table-num table-col-date">
                        <span dir="ltr" className="tabular-nums">
                          {new Date(r.created_at).toISOString().slice(0, 10)}
                        </span>
                      </td>
                      <td className="data-table-center actions-column align-middle">
                        <div className="flex flex-col items-center justify-center gap-1 min-h-[3.5rem] py-1">
                          <button
                            type="button"
                            onClick={() => handlePrintFromList(r)}
                            disabled={printingReturnId === r.id}
                            className="px-3 py-1.5 inline-flex flex-row-reverse items-center gap-1 rounded-lg bg-amber-600/80 hover:bg-amber-500 text-white text-sm disabled:opacity-50 whitespace-nowrap"
                          >
                            <Printer className="w-4 h-4 shrink-0" />
                            {language === 'ar' ? 'طباعة' : 'Print'}
                          </button>
                          {(r.print_count ?? 0) > 0 && (
                            <span className="text-[10px] leading-tight text-slate-400 text-center max-w-[9rem]">
                              {language === 'ar' ? `طباعات: ${r.print_count}` : `×${r.print_count}`}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
