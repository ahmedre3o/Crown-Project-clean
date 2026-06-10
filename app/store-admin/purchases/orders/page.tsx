'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/formatters';
import { Plus, Search, Printer, Receipt } from 'lucide-react';
import { useBranch, getBranchDisplayName } from '@/contexts/BranchContext';
import { logPrintAudit } from '@/lib/printAudit';
import { buildPurchaseDocumentHtml, openPurchasePrint } from '@/lib/purchasePrintHtml';

type Supplier = { id: number; name: string };
type Product = { id: number; name_en?: string; name_ar?: string; buy_price?: number };
type Order = {
  id: number;
  supplier_id: number | null;
  supplier_name?: string;
  status: string;
  total_amount: number;
  created_at: string;
  branch_id?: number | null;
  linked_invoice_id?: number | null;
};
type LineItem = {
  id?: number;
  order_id?: number;
  product_id: number;
  product_name?: string;
  name_en?: string;
  name_ar?: string;
  quantity: number;
  cost_price: number;
};

const PO_STATUSES = ['draft', 'approved', 'received', 'sent', 'partial', 'cancelled'] as const;

function lineProductName(i: LineItem, language: string) {
  if (i.product_name) return i.product_name;
  return language === 'ar'
    ? i.name_ar || i.name_en || `#${i.product_id}`
    : i.name_en || i.name_ar || `#${i.product_id}`;
}

function poStatusLabel(status: string, ar: boolean): string {
  const m: Record<string, [string, string]> = {
    draft: ['مسودة', 'Draft'],
    approved: ['معتمد', 'Approved'],
    received: ['مستلم', 'Received'],
    sent: ['مُرسل', 'Sent'],
    partial: ['جزئي', 'Partial'],
    cancelled: ['ملغى', 'Cancelled'],
  };
  const pair = m[status];
  return pair ? (ar ? pair[0] : pair[1]) : status;
}

export default function PurchaseOrdersPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'purchase_orders', effectiveRole, showDenied: true });
  const { symbol } = useCurrency();
  const branchCtx = useBranch();
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<number, LineItem[]>>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [creatingInvoiceId, setCreatingInvoiceId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [shopProfile, setShopProfile] = useState<{ business_name?: string; business_name_ar?: string; business_name_en?: string } | null>(null);
  const [form, setForm] = useState<{ supplier_id: string; status: string; items: LineItem[] }>({
    supplier_id: '',
    status: 'draft',
    items: [],
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersRes, suppliersRes] = await Promise.all([
        apiRequest('/admin/purchase-orders'),
        apiRequest('/admin/suppliers'),
      ]);
      const ordData = ordersRes as { orders?: Order[]; items?: LineItem[] };
      setOrders(ordData?.orders ?? []);
      const items = ordData?.items ?? [];
      const byOrder: Record<number, LineItem[]> = {};
      items.forEach((i: LineItem) => {
        const oid = i.order_id!;
        if (!byOrder[oid]) byOrder[oid] = [];
        byOrder[oid].push(i);
      });
      setItemsByOrder(byOrder);
      setSuppliers((suppliersRes as { items?: Supplier[] })?.items ?? []);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to load');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    if (!allowed) return;
    apiRequest('/shops/profile')
      .then((p: any) => setShopProfile(p))
      .catch(() => setShopProfile(null));
  }, [allowed]);

  const patchOrderStatus = async (orderId: number, status: string) => {
    setUpdatingStatusId(orderId);
    setError(null);
    try {
      const data = (await apiRequest(`/admin/purchase-orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })) as { order?: Order };
      const next = data?.order;
      if (next) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...next } : o)));
      } else {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      }
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to update status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const printPurchaseOrder = async (o: Order) => {
    await logPrintAudit('purchase_order', o.id, o.branch_id ?? branchCtx.activeBranchId ?? undefined);
    const lines = itemsByOrder[o.id] ?? [];
    const br =
      language === 'ar'
        ? (o as any).branch_name_ar || (o as any).branch_name
        : (o as any).branch_name_en || (o as any).branch_name;
    const branchLabel = br || getBranchDisplayName(branchCtx.activeBranch, language);
    const fmtLines = lines.map((i) => {
      const qty = Number(i.quantity) || 0;
      const unit = Number(i.cost_price) || 0;
      const lt = qty * unit;
      return {
        name: lineProductName(i, language),
        quantity: qty,
        unitPrice: formatCurrency(unit, language === 'ar' ? 'ar' : 'en', undefined, symbol),
        lineTotal: formatCurrency(lt, language === 'ar' ? 'ar' : 'en', undefined, symbol),
      };
    });
    const storeName =
      language === 'ar'
        ? shopProfile?.business_name_ar || shopProfile?.business_name || shopProfile?.business_name_en
        : shopProfile?.business_name_en || shopProfile?.business_name || shopProfile?.business_name_ar;
    const html = buildPurchaseDocumentHtml({
      dir: direction as 'rtl' | 'ltr',
      storeName: storeName || undefined,
      title: `${language === 'ar' ? 'أمر شراء' : 'Purchase order'} #${o.id}`,
      metaRows: [
        { label: language === 'ar' ? 'المورد:' : 'Supplier:', value: o.supplier_name ?? '—' },
        { label: language === 'ar' ? 'الفرع:' : 'Branch:', value: branchLabel },
        { label: language === 'ar' ? 'الحالة:' : 'Status:', value: poStatusLabel(o.status, language === 'ar') },
        { label: language === 'ar' ? 'التاريخ:' : 'Date:', value: o.created_at ? new Date(o.created_at).toLocaleString() : '—' },
      ],
      lines: fmtLines,
      colProduct: language === 'ar' ? 'الصنف' : 'Product',
      colQty: language === 'ar' ? 'الكمية' : 'Qty',
      colUnit: language === 'ar' ? 'سعر الوحدة' : 'Unit price',
      colLine: language === 'ar' ? 'الإجمالي' : 'Line total',
      totalLabel: language === 'ar' ? 'الإجمالي' : 'Total',
      totalFormatted: formatCurrency(Number(o.total_amount), language === 'ar' ? 'ar' : 'en', undefined, symbol),
    });
    openPurchasePrint(html);
  };

  const createInvoiceFromOrder = async (o: Order) => {
    const lines = itemsByOrder[o.id] ?? [];
    if (lines.length === 0) {
      setError(language === 'ar' ? 'لا توجد بنود في أمر الشراء' : 'No line items on this order');
      return;
    }
    if (!o.supplier_id) {
      setError(language === 'ar' ? 'اربط مورداً بأمر الشراء أولاً' : 'Link a supplier to this purchase order first');
      return;
    }
    setCreatingInvoiceId(o.id);
    setError(null);
    try {
      await apiRequest('/admin/purchase-invoices', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: o.supplier_id,
          order_id: o.id,
          status: 'unpaid',
          ...(o.branch_id != null && Number(o.branch_id) > 0 ? { branch_id: Number(o.branch_id) } : {}),
          items: lines.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            cost_price: i.cost_price,
          })),
        }),
      });
      await load();
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to create invoice');
    } finally {
      setCreatingInvoiceId(null);
    }
  };

  const openCreate = () => {
    setForm({ supplier_id: '', status: 'draft', items: [] });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.items.length === 0) {
      setError(language === 'ar' ? 'أضف صنفاً واحداً على الأقل' : 'Add at least one item');
      return;
    }
    setSaving(true);
    try {
      await apiRequest('/admin/purchase-orders', {
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

  const detailsSummary = (orderId: number) => {
    const lines = itemsByOrder[orderId] ?? [];
    if (lines.length === 0) return language === 'ar' ? '—' : '—';
    return lines
      .map((i) => `${lineProductName(i, language)} × ${i.quantity}`)
      .join(language === 'ar' ? '، ' : ', ');
  };

  if (authLoading || !allowed) return null;

  const title = language === 'ar' ? 'أوامر الشراء' : 'Purchase Orders';
  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">{title}</h1>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-cyan-200 hover:bg-cyan-500/20"
          >
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'أمر شراء جديد' : 'New Purchase Order'}
          </button>
        </div>
        {loading ? (
          <p className="text-gray-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="rounded-xl border border-cyan-500/30 overflow-x-auto">
            <table className="w-full text-left min-w-[1100px]">
              <thead className="bg-gray-800/80 text-cyan-200">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3 max-w-[280px]">{language === 'ar' ? 'تفاصيل الشراء' : 'Purchase details'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'المورد' : 'Supplier'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="px-4 py-3 whitespace-nowrap">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const hasInvoice = o.linked_invoice_id != null && Number(o.linked_invoice_id) > 0;
                  const canInvoice = !hasInvoice && o.status === 'received' && (itemsByOrder[o.id]?.length ?? 0) > 0;
                  return (
                    <tr key={o.id} className="border-t border-cyan-500/20 hover:bg-cyan-500/5">
                      <td className="px-4 py-3 align-top">{o.id}</td>
                      <td className="px-4 py-3 align-top text-sm text-gray-300 max-w-[280px]" title={detailsSummary(o.id)}>
                        <span className="line-clamp-3">{detailsSummary(o.id)}</span>
                      </td>
                      <td className="px-4 py-3 align-top">{o.supplier_name ?? '—'}</td>
                      <td className="px-4 py-3 align-top">
                        <select
                          value={o.status}
                          disabled={updatingStatusId === o.id}
                          onChange={(e) => patchOrderStatus(o.id, e.target.value)}
                          className="rounded-lg bg-black border border-cyan-500/30 px-2 py-1 text-white text-sm max-w-[140px]"
                        >
                          {PO_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {poStatusLabel(s, language === 'ar')}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 align-top">{formatCurrency(Number(o.total_amount), language === 'ar' ? 'ar' : 'en', undefined, symbol)}</td>
                      <td className="px-4 py-3 align-top">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2 items-start">
                          <button
                            type="button"
                            onClick={() => printPurchaseOrder(o)}
                            className="inline-flex items-center gap-1 text-cyan-400 hover:underline text-sm"
                          >
                            <Printer className="h-4 w-4" />
                            {language === 'ar' ? 'طباعة' : 'Print'}
                          </button>
                          {hasInvoice ? (
                            <span className="text-xs text-gray-500">
                              {language === 'ar' ? `فاتورة #${o.linked_invoice_id}` : `Invoice #${o.linked_invoice_id}`}
                            </span>
                          ) : canInvoice ? (
                            <button
                              type="button"
                              disabled={creatingInvoiceId === o.id}
                              onClick={() => createInvoiceFromOrder(o)}
                              className="inline-flex items-center gap-1 text-emerald-400 hover:underline text-sm disabled:opacity-50"
                            >
                              <Receipt className="h-4 w-4" />
                              {creatingInvoiceId === o.id
                                ? language === 'ar'
                                  ? 'جاري...'
                                  : '...'
                                : language === 'ar'
                                  ? 'فاتورة شراء'
                                  : 'Purchase invoice'}
                            </button>
                          ) : o.status !== 'received' ? (
                            <span className="text-xs text-gray-500">
                              {language === 'ar' ? 'غيّر الحالة إلى «مستلم» لإنشاء فاتورة' : 'Set status to Received to create invoice'}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {orders.length === 0 && !loading && (
              <p className="p-6 text-gray-500 text-center">{language === 'ar' ? 'لا توجد أوامر شراء' : 'No purchase orders yet'}</p>
            )}
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !saving && setModalOpen(false)}>
            <div
              className="bg-gray-900 border border-cyan-500/40 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-cyan-200 mb-4">{language === 'ar' ? 'أمر شراء جديد' : 'New Purchase Order'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'المورد' : 'Supplier'}</label>
                  <select
                    value={form.supplier_id}
                    onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
                    className="w-full rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white"
                  >
                    <option value="">—</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'الحالة' : 'Status'}</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white"
                  >
                    <option value="draft">{poStatusLabel('draft', language === 'ar')}</option>
                    <option value="approved">{poStatusLabel('approved', language === 'ar')}</option>
                    <option value="received">{poStatusLabel('received', language === 'ar')}</option>
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    placeholder={language === 'ar' ? 'بحث عن منتج' : 'Search product'}
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="flex-1 rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white"
                  />
                  <button
                    type="button"
                    onClick={addLine}
                    className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-cyan-200 text-sm"
                  >
                    {language === 'ar' ? 'إضافة صنف' : 'Add item'}
                  </button>
                </div>
                {filteredProducts.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded border border-cyan-500/20 p-2">
                    {filteredProducts.slice(0, 10).map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            items: [
                              ...f.items,
                              {
                                product_id: p.id,
                                product_name: language === 'ar' ? p.name_ar || p.name_en : p.name_en || p.name_ar,
                                quantity: 1,
                                cost_price: Number(p.buy_price) || 0,
                              },
                            ],
                          }));
                          setProductSearch('');
                        }}
                        className="block w-full text-left py-1.5 px-2 rounded hover:bg-cyan-500/10 text-sm"
                      >
                        {language === 'ar' ? p.name_ar || p.name_en : p.name_en || p.name_ar} —{' '}
                        {formatCurrency(Number(p.buy_price) || 0, language === 'ar' ? 'ar' : 'en', undefined, symbol)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="border-t border-cyan-500/20 pt-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-cyan-200">
                        <th className="text-left py-1">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                        <th className="text-left py-1">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                        <th className="text-left py-1">{language === 'ar' ? 'التكلفة' : 'Cost'}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-1">{it.product_name}</td>
                          <td className="py-1">
                            <input
                              type="number"
                              min={1}
                              value={it.quantity}
                              onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value) || 0)}
                              className="w-20 rounded bg-black border border-cyan-500/30 px-2 py-1 text-white"
                            />
                          </td>
                          <td className="py-1">
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={it.cost_price}
                              onChange={(e) => updateLine(idx, 'cost_price', Number(e.target.value) || 0)}
                              className="w-24 rounded bg-black border border-cyan-500/30 px-2 py-1 text-white"
                            />
                          </td>
                          <td>
                            <button type="button" onClick={() => removeLine(idx)} className="text-red-400 text-xs">
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-cyan-200 font-medium">
                    {language === 'ar' ? 'الإجمالي' : 'Total'}: {formatCurrency(total, language === 'ar' ? 'ar' : 'en', undefined, symbol)}
                  </p>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => !saving && setModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-500 text-gray-300">
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button type="submit" disabled={saving || form.items.length === 0} className="px-4 py-2 rounded-lg bg-cyan-600 text-white disabled:opacity-50">
                    {saving ? (language === 'ar' ? 'جاري...' : 'Saving...') : language === 'ar' ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
