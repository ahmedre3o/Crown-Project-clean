'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { Package, ArrowRight, Plus } from 'lucide-react';

type Branch = { id: number; name?: string; name_en?: string; name_ar?: string; code?: string };
type Product = { id: number; name_en?: string; name_ar?: string; stock_quantity?: number };
type Transfer = {
  id: number;
  from_branch_id: number;
  to_branch_id: number;
  product_id: number;
  quantity: number;
  status: string;
  created_at: string;
  product_name_en?: string;
  product_name_ar?: string;
  from_branch_name_en?: string;
  from_branch_name_ar?: string;
  to_branch_name_en?: string;
  to_branch_name_ar?: string;
};

export default function StockTransferPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'stock_transfer', effectiveRole, showDenied: true });
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    from_branch_id: '',
    to_branch_id: '',
    product_id: '',
    quantity: '1',
  });
  const [availableStock, setAvailableStock] = useState<number | null>(null);
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const branchesPromise = user?.package === 'branches' ? apiRequest('/branches').catch(() => []) : Promise.resolve([]);
      const [transRes, branchesRes, productsRes] = await Promise.all([
        apiRequest('/admin/stock-transfers'),
        branchesPromise,
        apiRequest('/admin/products').catch(() => []),
      ]);
      const tData = transRes as { transfers?: Transfer[] };
      setTransfers(tData?.transfers ?? []);
      setBranches(Array.isArray(branchesRes) ? branchesRes : (branchesRes as { list?: Branch[] })?.list ?? []);
      setProducts(Array.isArray(productsRes) ? productsRes : []);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to load');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [user?.package]);

  useEffect(() => {
    if (!authLoading && allowed) load();
  }, [authLoading, allowed, load]);

  useEffect(() => {
    const branchId = form.from_branch_id ? Number(form.from_branch_id) : null;
    const productId = form.product_id ? Number(form.product_id) : null;
    if (!branchId || !productId) {
      setAvailableStock(null);
      return;
    }
    let cancelled = false;
    setLoadingAvailable(true);
    apiRequest(`/admin/stock-transfers/available?branch_id=${branchId}&product_id=${productId}`)
      .then((data: { available?: number }) => {
        if (!cancelled) setAvailableStock(typeof data?.available === 'number' ? data.available : 0);
      })
      .catch(() => { if (!cancelled) setAvailableStock(null); })
      .finally(() => { if (!cancelled) setLoadingAvailable(false); });
    return () => { cancelled = true; };
  }, [form.from_branch_id, form.product_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fromId = form.from_branch_id ? Number(form.from_branch_id) : null;
    const toId = form.to_branch_id ? Number(form.to_branch_id) : null;
    const productId = form.product_id ? Number(form.product_id) : null;
    const qty = Math.max(1, parseInt(form.quantity, 10) || 1);
    if (!fromId || !toId || fromId === toId) {
      setError(language === 'ar' ? 'اختر فرع المصدر وفرع الوجهة (مختلفين)' : 'Select different From and To branches');
      return;
    }
    if (!productId) {
      setError(language === 'ar' ? 'اختر المنتج' : 'Select a product');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiRequest('/admin/stock-transfers', {
        method: 'POST',
        body: JSON.stringify({
          from_branch_id: fromId,
          to_branch_id: toId,
          product_id: productId,
          quantity: qty,
          confirm: true,
        }),
      });
      setForm({ from_branch_id: '', to_branch_id: '', product_id: '', quantity: '1' });
      load();
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to transfer');
    } finally {
      setSaving(false);
    }
  };

  const branchName = (b: Branch) => (language === 'ar' ? (b.name_ar ?? b.name) : (b.name_en ?? b.name)) || b.code || `#${b.id}`;
  const productName = (p: Product) => (language === 'ar' ? p.name_ar || p.name_en : p.name_en || p.name_ar) || '';

  if (authLoading || !allowed) return null;

  const title = language === 'ar' ? 'نقل المخزون' : 'Stock Transfer';
  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">{title}</h1>
        <p className="text-gray-400 text-sm mb-4">
          {language === 'ar' ? 'انقل الكمية من فرع إلى فرع. يتم خصم الكمية من فرع المصدر وإضافتها لفرع الوجهة فور التأكيد.' : 'Move quantity from one branch to another. Quantity is decreased at source and increased at destination on confirm.'}
        </p>
        {error && <p className="text-red-400 mb-4">{error}</p>}

        <div className="rounded-xl border border-cyan-500/30 p-6 mb-8 max-w-2xl">
          <h2 className="text-lg font-semibold text-cyan-200 mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {language === 'ar' ? 'نقل جديد' : 'New Transfer'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'من فرع' : 'From Branch'}</label>
                <select
                  value={form.from_branch_id}
                  onChange={(e) => setForm((f) => ({ ...f, from_branch_id: e.target.value }))}
                  className="w-full rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white"
                  required
                >
                  <option value="">—</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>{branchName(b)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'إلى فرع' : 'To Branch'}</label>
                <select
                  value={form.to_branch_id}
                  onChange={(e) => setForm((f) => ({ ...f, to_branch_id: e.target.value }))}
                  className="w-full rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white"
                  required
                >
                  <option value="">—</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)} disabled={String(b.id) === form.from_branch_id}>
                      {branchName(b)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'المنتج' : 'Product'}</label>
              <select
                value={form.product_id}
                onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
                className="w-full rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white"
                required
              >
                <option value="">—</option>
                {products.map((p) => (
                  <option key={p.id} value={String(p.id)}>{productName(p)}</option>
                ))}
              </select>
            </div>
            {form.from_branch_id && form.product_id && (
              <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-3 py-2 text-sm">
                {loadingAvailable ? (
                  <span className="text-gray-400">{language === 'ar' ? 'جاري التحقق من المخزون...' : 'Checking available stock...'}</span>
                ) : (
                  <span className="text-cyan-200">
                    {language === 'ar' ? 'المخزون المتاح في فرع المصدر: ' : 'Current available stock in source branch: '}
                    <strong>{availableStock ?? 0}</strong>
                  </span>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'الكمية' : 'Quantity'}</label>
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-full rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white"
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving || !form.from_branch_id || !form.to_branch_id || form.from_branch_id === form.to_branch_id || !form.product_id}
              className="flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 px-4 py-2 text-white"
            >
              <ArrowRight className="h-4 w-4" />
              {saving ? (language === 'ar' ? 'جاري النقل...' : 'Transferring...') : (language === 'ar' ? 'تأكيد النقل' : 'Confirm Transfer')}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-cyan-500/30 overflow-hidden">
          <h2 className="text-lg font-semibold text-cyan-200 px-4 py-3 border-b border-cyan-500/20 flex items-center gap-2">
            <Package className="h-5 w-5" />
            {language === 'ar' ? 'سجل النقلات' : 'Transfer History'}
          </h2>
          {loading ? (
            <p className="p-6 text-gray-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-800/80 text-cyan-200">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'من' : 'From'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'إلى' : 'To'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} className="border-t border-cyan-500/20 hover:bg-cyan-500/5">
                    <td className="px-4 py-3">{t.id}</td>
                    <td className="px-4 py-3">{language === 'ar' ? t.from_branch_name_ar || t.from_branch_name_en : t.from_branch_name_en || t.from_branch_name_ar || '—'}</td>
                    <td className="px-4 py-3">{language === 'ar' ? t.to_branch_name_ar || t.to_branch_name_en : t.to_branch_name_en || t.to_branch_name_ar || '—'}</td>
                    <td className="px-4 py-3">{language === 'ar' ? t.product_name_ar || t.product_name_en : t.product_name_en || t.product_name_ar || '—'}</td>
                    <td className="px-4 py-3">{t.quantity}</td>
                    <td className="px-4 py-3">{t.status}</td>
                    <td className="px-4 py-3">{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && transfers.length === 0 && (
            <p className="p-6 text-gray-500 text-center">{language === 'ar' ? 'لا توجد نقلات بعد' : 'No transfers yet'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
