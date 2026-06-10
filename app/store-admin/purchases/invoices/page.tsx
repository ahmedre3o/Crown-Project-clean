'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/formatters';
import { Receipt, Plus, Search, Printer } from 'lucide-react';
import { useBranch, getBranchDisplayName } from '@/contexts/BranchContext';
import { logPrintAudit } from '@/lib/printAudit';
import { buildPurchaseDocumentHtml, openPurchasePrint } from '@/lib/purchasePrintHtml';

type Supplier = { id: number; name: string };
type Product = { id: number; name_en?: string; name_ar?: string; buy_price?: number };
type Invoice = {
  id: number;
  supplier_id: number | null;
  supplier_name?: string;
  order_id?: number | null;
  status: string;
  total_amount: number;
  created_at: string;
  branch_id?: number | null;
  branch_name?: string;
  branch_name_ar?: string;
  branch_name_en?: string;
};
type LineItem = { id?: number; product_id: number; product_name?: string; quantity: number; cost_price: number };
type InvLineItem = {
  purchase_invoice_id: number;
  product_id: number;
  quantity: number;
  cost_price: number;
  total_price?: number;
  name_en?: string;
  name_ar?: string;
  expiry_date?: string | null;
  tax_percent?: number | null;
  tax_amount?: number | null;
};

function invLineName(i: InvLineItem, language: string) {
  return language === 'ar' ? i.name_ar || i.name_en || `#${i.product_id}` : i.name_en || i.name_ar || `#${i.product_id}`;
}

function invLineDetailSuffix(i: InvLineItem, language: string): string {
  const parts: string[] = [];
  const ex = i.expiry_date && String(i.expiry_date).trim() ? String(i.expiry_date).slice(0, 10) : null;
  if (ex) parts.push(language === 'ar' ? `صلاحية ${ex}` : `exp ${ex}`);
  if (i.tax_percent != null && Number.isFinite(Number(i.tax_percent))) {
    parts.push(language === 'ar' ? `ضريبة ${i.tax_percent}%` : `VAT ${i.tax_percent}%`);
  } else if (i.tax_amount != null && Number.isFinite(Number(i.tax_amount)) && Number(i.tax_amount) !== 0) {
    parts.push(language === 'ar' ? `ضريبة ${i.tax_amount}` : `tax ${i.tax_amount}`);
  }
  return parts.length ? ` (${parts.join(language === 'ar' ? '، ' : ', ')})` : '';
}

export default function PurchaseInvoicesPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'purchase_invoices', effectiveRole, showDenied: true });
  const { symbol } = useCurrency();
  const branchCtx = useBranch();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [itemsByInvoice, setItemsByInvoice] = useState<Record<number, InvLineItem[]>>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [form, setForm] = useState<{ supplier_id: string; status: string; items: LineItem[] }>({
    supplier_id: '',
    status: 'unpaid',
    items: [],
  });
  const [shopProfile, setShopProfile] = useState<{ business_name?: string; business_name_ar?: string; business_name_en?: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [invRes, suppliersRes] = await Promise.all([
        apiRequest('/admin/purchase-invoices'),
        apiRequest('/admin/suppliers'),
      ]);
      const invData = invRes as { invoices?: Invoice[]; items?: InvLineItem[] };
      setInvoices(invData?.invoices ?? []);
      const items = invData?.items ?? [];
      const byInv: Record<number, InvLineItem[]> = {};
      items.forEach((i) => {
        const pid = i.purchase_invoice_id;
        if (!byInv[pid]) byInv[pid] = [];
        byInv[pid].push(i);
      });
      setItemsByInvoice(byInv);
      setSuppliers((suppliersRes as { items?: Supplier[] })?.items ?? []);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to load');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    apiRequest('/shops/profile')
      .then((p: any) => setShopProfile(p))
      .catch(() => setShopProfile(null));
  }, [allowed]);

  const loadProducts = useCallback(async () => {
    try {
      const list = await apiRequest('/admin/products');
      setProducts(Array.isArray(list) ? list : []);
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && allowed) {
      load();
      loadProducts();
    }
  }, [authLoading, allowed, load, loadProducts]);

  const openCreate = () => {
    setForm({ supplier_id: '', status: 'unpaid', items: [] });
    setModalOpen(true);
  };

  const addLine = () => {
    const first = products.find(
      (p) =>
        !form.items.some((i) => i.product_id === p.id) &&
        (productSearch === '' ||
          (p.name_en ?? '').toLowerCase().includes(productSearch.toLowerCase()) ||
          (p.name_ar ?? '').includes(productSearch))
    );
    if (first) {
      setForm((f) => ({
        ...f,
        items: [
          ...f.items,
          {
            product_id: first.id,
            product_name: language === 'ar' ? first.name_ar || first.name_en : first.name_en || first.name_ar,
            quantity: 1,
            cost_price: Number(first.buy_price) || 0,
          },
        ],
      }));
    }
  };

  const updateLine = (index: number, field: 'quantity' | 'cost_price', value: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    }));
  };

  const removeLine = (index: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  };

  const total = form.items.reduce((sum, i) => sum + (i.quantity || 0) * (i.cost_price || 0), 0);

  const printPurchaseInvoice = async (inv: Invoice) => {
    await logPrintAudit('purchase_invoice', inv.id, inv.branch_id ?? branchCtx.activeBranchId ?? undefined);
    const br =
      language === 'ar'
        ? inv.branch_name_ar || inv.branch_name || inv.branch_name_en
        : inv.branch_name_en || inv.branch_name || inv.branch_name_ar;
    const lines = itemsByInvoice[inv.id] ?? [];
    const fmtLines = lines.map((i) => {
      const qty = Number(i.quantity) || 0;
      const unit = Number(i.cost_price) || 0;
      const lt = i.total_price != null ? Number(i.total_price) : qty * unit;
      return {
        name: invLineName(i, language) + invLineDetailSuffix(i, language),
        quantity: qty,
        unitPrice: formatCurrency(unit, language === 'ar' ? 'ar' : 'en', undefined, symbol),
        lineTotal: formatCurrency(lt, language === 'ar' ? 'ar' : 'en', undefined, symbol),
      };
    });
    const metaRows: { label: string; value: string }[] = [
      { label: language === 'ar' ? 'المورد:' : 'Supplier:', value: inv.supplier_name ?? '—' },
      { label: language === 'ar' ? 'الفرع:' : 'Branch:', value: br || getBranchDisplayName(branchCtx.activeBranch, language) },
      { label: language === 'ar' ? 'الحالة:' : 'Status:', value: inv.status },
    ];
    if (inv.order_id != null && Number(inv.order_id) > 0) {
      metaRows.push({
        label: language === 'ar' ? 'أمر شراء:' : 'Purchase order:',
        value: String(inv.order_id),
      });
    }
    metaRows.push({
      label: language === 'ar' ? 'التاريخ:' : 'Date:',
      value: inv.created_at ? new Date(inv.created_at).toLocaleString() : '—',
    });
    const storeName =
      language === 'ar'
        ? shopProfile?.business_name_ar || shopProfile?.business_name || shopProfile?.business_name_en
        : shopProfile?.business_name_en || shopProfile?.business_name || shopProfile?.business_name_ar;
    const html = buildPurchaseDocumentHtml({
      dir: direction as 'rtl' | 'ltr',
      storeName: storeName || undefined,
      title: `${language === 'ar' ? 'فاتورة شراء' : 'Purchase invoice'} #${inv.id}`,
      metaRows,
      lines: fmtLines,
      colProduct: language === 'ar' ? 'الصنف' : 'Product',
      colQty: language === 'ar' ? 'الكمية' : 'Qty',
      colUnit: language === 'ar' ? 'سعر الوحدة' : 'Unit price',
      colLine: language === 'ar' ? 'الإجمالي' : 'Line total',
      totalLabel: language === 'ar' ? 'الإجمالي' : 'Total',
      totalFormatted: formatCurrency(Number(inv.total_amount), language === 'ar' ? 'ar' : 'en', undefined, symbol),
    });
    openPurchasePrint(html);
  };

  const invoiceDetailsSummary = (invoiceId: number) => {
    const lines = itemsByInvoice[invoiceId] ?? [];
    if (lines.length === 0) return '—';
    return lines
      .map((i) => `${invLineName(i, language)} × ${i.quantity}${invLineDetailSuffix(i, language)}`)
      .join(language === 'ar' ? '، ' : ', ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.items.length === 0) {
      setError(language === 'ar' ? 'أضف صنفاً واحداً على الأقل' : 'Add at least one item');
      return;
    }
    setSaving(true);
    try {
      await apiRequest('/admin/purchase-invoices', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
          status: form.status,
          items: form.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, cost_price: i.cost_price })),
        }),
      });
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      !form.items.some((i) => i.product_id === p.id) &&
      (productSearch === '' ||
        (p.name_en ?? '').toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.name_ar ?? '').includes(productSearch))
  );

  if (authLoading || !allowed) return null;

  const title = language === 'ar' ? 'فواتير الشراء' : 'Purchase Invoices';
  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">{title}</h1>
        <p className="text-gray-400 text-sm mb-4">{language === 'ar' ? 'عند حفظ الفاتورة: يزيد المخزون، رصيد المورد، وقيد محاسبي (مدين مخزون / دائن دائنون).' : 'When you save an invoice: stock increases, supplier balance and accounting entry (Debit Inventory / Credit Accounts Payable) are created.'}</p>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <div className="flex justify-end mb-4">
          <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-cyan-200 hover:bg-cyan-500/20">
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'فاتورة شراء جديدة' : 'New Purchase Invoice'}
          </button>
        </div>
        {loading ? (
          <p className="text-gray-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="rounded-xl border border-cyan-500/30 overflow-x-auto accounting-print">
            <div className="hidden print:block print-branch p-4 border-b border-gray-300">
              <div className="font-bold">Crown ERP</div>
              <div>{language === 'ar' ? 'فواتير الشراء' : 'Purchase invoices'}</div>
              <div>
                {language === 'ar' ? 'الفرع: ' : 'Branch: '}
                {getBranchDisplayName(branchCtx.activeBranch, language)}
              </div>
            </div>
            <table className="w-full text-left min-w-[1100px]">
              <thead className="bg-gray-800/80 text-cyan-200">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3 max-w-[280px]">{language === 'ar' ? 'تفاصيل الشراء' : 'Line items'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'المورد' : 'Supplier'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'الفرع' : 'Branch'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 print:hidden">{language === 'ar' ? 'طباعة' : 'Print'}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-cyan-500/20 hover:bg-cyan-500/5">
                    <td className="px-4 py-3 align-top">{inv.id}</td>
                    <td className="px-4 py-3 align-top text-sm text-gray-300 max-w-[280px]" title={invoiceDetailsSummary(inv.id)}>
                      <span className="line-clamp-3">{invoiceDetailsSummary(inv.id)}</span>
                    </td>
                    <td className="px-4 py-3 align-top">{inv.supplier_name ?? '—'}</td>
                    <td className="px-4 py-3 align-top">
                      {language === 'ar'
                        ? inv.branch_name_ar || inv.branch_name || '—'
                        : inv.branch_name_en || inv.branch_name || '—'}
                    </td>
                    <td className="px-4 py-3 align-top">{inv.status}</td>
                    <td className="px-4 py-3 align-top">{formatCurrency(Number(inv.total_amount), language === 'ar' ? 'ar' : 'en', undefined, symbol)}</td>
                    <td className="px-4 py-3 align-top">{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 print:hidden align-top">
                      <button
                        type="button"
                        onClick={() => printPurchaseInvoice(inv)}
                        className="inline-flex items-center gap-1 text-cyan-400 hover:underline text-sm"
                      >
                        <Printer className="h-4 w-4" />
                        {language === 'ar' ? 'طباعة' : 'Print'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invoices.length === 0 && !loading && <p className="p-6 text-gray-500 text-center">{language === 'ar' ? 'لا توجد فواتير شراء' : 'No purchase invoices yet'}</p>}
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !saving && setModalOpen(false)}>
            <div className="bg-gray-900 border border-cyan-500/40 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-cyan-200 mb-4">{language === 'ar' ? 'فاتورة شراء جديدة' : 'New Purchase Invoice'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'المورد' : 'Supplier'}</label>
                  <select value={form.supplier_id} onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))} className="w-full rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white">
                    <option value="">—</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={String(s.id)}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'الحالة' : 'Status'}</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white">
                    <option value="draft">Draft</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input placeholder={language === 'ar' ? 'بحث عن منتج' : 'Search product'} value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="flex-1 rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white" />
                  <button type="button" onClick={addLine} className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-cyan-200 text-sm">{language === 'ar' ? 'إضافة صنف' : 'Add item'}</button>
                </div>
                {filteredProducts.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded border border-cyan-500/20 p-2">
                    {filteredProducts.slice(0, 10).map((p) => (
                      <button type="button" key={p.id} onClick={() => { setForm((f) => ({ ...f, items: [...f.items, { product_id: p.id, product_name: language === 'ar' ? p.name_ar || p.name_en : p.name_en || p.name_ar, quantity: 1, cost_price: Number(p.buy_price) || 0 }] })); setProductSearch(''); }} className="block w-full text-left py-1.5 px-2 rounded hover:bg-cyan-500/10 text-sm">
                        {language === 'ar' ? p.name_ar || p.name_en : p.name_en || p.name_ar} — {formatCurrency(Number(p.buy_price) || 0, language === 'ar' ? 'ar' : 'en', undefined, symbol)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="border-t border-cyan-500/20 pt-2">
                  <table className="w-full text-sm">
                    <thead><tr className="text-cyan-200"><th className="text-left py-1">{language === 'ar' ? 'المنتج' : 'Product'}</th><th className="text-left py-1">{language === 'ar' ? 'الكمية' : 'Qty'}</th><th className="text-left py-1">{language === 'ar' ? 'التكلفة' : 'Cost'}</th><th></th></tr></thead>
                    <tbody>
                      {form.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-1">{it.product_name}</td>
                          <td className="py-1"><input type="number" min={1} value={it.quantity} onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value) || 0)} className="w-20 rounded bg-black border border-cyan-500/30 px-2 py-1 text-white" /></td>
                          <td className="py-1"><input type="number" step="0.01" min={0} value={it.cost_price} onChange={(e) => updateLine(idx, 'cost_price', Number(e.target.value) || 0)} className="w-24 rounded bg-black border border-cyan-500/30 px-2 py-1 text-white" /></td>
                          <td><button type="button" onClick={() => removeLine(idx)} className="text-red-400 text-xs">×</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-cyan-200 font-medium">{language === 'ar' ? 'الإجمالي' : 'Total'}: {formatCurrency(total, language === 'ar' ? 'ar' : 'en', undefined, symbol)}</p>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => !saving && setModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-500 text-gray-300">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                  <button type="submit" disabled={saving || form.items.length === 0} className="px-4 py-2 rounded-lg bg-cyan-600 text-white disabled:opacity-50">{saving ? (language === 'ar' ? 'جاري...' : 'Saving...') : (language === 'ar' ? 'حفظ (يزيد المخزون)' : 'Save (updates stock)')}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
