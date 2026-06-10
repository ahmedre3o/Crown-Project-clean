'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { Copy, Plus, Tag, X } from 'lucide-react';

type Coupon = {
  id: number;
  shop_id: number;
  code: string;
  type: string;
  value: number;
  is_active: number;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  min_order_total: number | null;
  created_at: string;
};

export default function CouponsPage() {
  const { t, direction, language } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'coupons', effectiveRole, showDenied: true });
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    type: 'percent' as 'percent' | 'fixed',
    value: '',
    starts_at: '',
    expires_at: '',
    usage_limit: '',
    min_order_total: '',
  });

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest('/coupons');
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'فشل تحميل القسائم' : 'Failed to load coupons'));
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (!authLoading && allowed) loadCoupons();
  }, [authLoading, allowed, loadCoupons]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(
      () => showToast(language === 'ar' ? 'تم نسخ الكود' : 'Code copied', 'success'),
      () => showToast(language === 'ar' ? 'فشل النسخ' : 'Copy failed', 'error')
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(createForm.value);
    if (!Number.isFinite(val) || val < 0) {
      showToast(language === 'ar' ? 'القيمة يجب أن تكون رقماً موجباً' : 'Value must be a positive number', 'error');
      return;
    }
    setCreateSubmitting(true);
    setCreatedCode(null);
    try {
      const payload: Record<string, unknown> = {
        type: createForm.type,
        value: val,
      };
      if (createForm.starts_at) payload.starts_at = createForm.starts_at;
      if (createForm.expires_at) payload.expires_at = createForm.expires_at;
      if (createForm.usage_limit) payload.usage_limit = parseInt(createForm.usage_limit, 10);
      if (createForm.min_order_total) payload.min_order_total = parseFloat(createForm.min_order_total);
      const res = await apiRequest('/coupons', { method: 'POST', body: JSON.stringify(payload) });
      const coupon = (res as { coupon?: Coupon })?.coupon;
      if (coupon?.code) {
        setCreatedCode(coupon.code);
        showToast(language === 'ar' ? 'تم إنشاء القسيمة. الكود مُولّد تلقائياً.' : 'Coupon created. Code auto-generated.', 'success');
        loadCoupons();
      }
    } catch (err: any) {
      showToast(err?.message || (language === 'ar' ? 'فشل الإنشاء' : 'Create failed'), 'error');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    try {
      await apiRequest(`/coupons/${c.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: c.is_active ? 0 : 1 }),
      });
      showToast(language === 'ar' ? 'تم التحديث' : 'Updated', 'success');
      loadCoupons();
    } catch (err: any) {
      showToast(err?.message || (language === 'ar' ? 'فشل التحديث' : 'Update failed'), 'error');
    }
  };

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6 flex items-center gap-2">
          <Tag className="w-6 h-6" />
          {language === 'ar' ? 'القسائم' : 'Coupons'}
        </h1>

        {toast && (
          <div
            className={`mb-4 rounded-lg p-3 text-sm ${
              toast.type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-500/40' : 'bg-red-500/20 text-red-200 border border-red-500/40'
            }`}
          >
            {toast.msg}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}

        <div className="mb-6 flex justify-between items-center">
          <p className="text-slate-400 text-sm">
            {language === 'ar'
              ? 'الكود يُولّد تلقائياً من اسم المتجر (مثال: ahmed-10p-AB12). لا يُقبل إدخال يدوي للكود.'
              : 'Code is auto-generated from store name (e.g. ahmed-10p-AB12). Manual code input is not accepted.'}
          </p>
          <button
            onClick={() => {
              setCreateOpen(true);
              setCreatedCode(null);
              setCreateForm({ type: 'percent', value: '', starts_at: '', expires_at: '', usage_limit: '', min_order_total: '' });
            }}
            className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold flex items-center gap-2 hover:bg-cyan-500"
          >
            <Plus className="w-4 h-4" />
            {language === 'ar' ? 'إنشاء قسيمة' : 'Create Coupon'}
          </button>
        </div>

        <div className="neon-card rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
          ) : coupons.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              {language === 'ar' ? 'لا توجد قسائم. أنشئ قسيمة جديدة.' : 'No coupons. Create a new one.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-cyan-500/20 bg-cyan-500/5">
                    <th className="text-left p-3 text-cyan-200">{language === 'ar' ? 'الكود' : 'Code'}</th>
                    <th className="text-left p-3 text-cyan-200">{language === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="text-left p-3 text-cyan-200">{language === 'ar' ? 'القيمة' : 'Value'}</th>
                    <th className="text-left p-3 text-cyan-200">{language === 'ar' ? 'الاستخدام' : 'Usage'}</th>
                    <th className="text-left p-3 text-cyan-200">{language === 'ar' ? 'الحد الأدنى' : 'Min order'}</th>
                    <th className="text-left p-3 text-cyan-200">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="text-left p-3 text-cyan-200"></th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-b border-cyan-500/10 hover:bg-cyan-500/5">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-cyan-300">{c.code}</code>
                          <button
                            onClick={() => copyCode(c.code)}
                            className="p-1 rounded hover:bg-cyan-500/20 text-cyan-400"
                            title={language === 'ar' ? 'نسخ' : 'Copy'}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3 text-slate-300">{c.type === 'percent' ? '%' : 'EGP'}</td>
                      <td className="p-3 text-slate-300">{c.value}</td>
                      <td className="p-3 text-slate-300">
                        {c.usage_count}
                        {c.usage_limit != null ? ` / ${c.usage_limit}` : ''}
                      </td>
                      <td className="p-3 text-slate-300">{c.min_order_total != null ? `${c.min_order_total} EGP` : '-'}</td>
                      <td className="p-3">
                        <span className={c.is_active ? 'text-green-400' : 'text-slate-500'}>
                          {c.is_active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'معطّل' : 'Disabled')}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleActive(c)}
                          className="text-xs px-2 py-1 rounded border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                        >
                          {c.is_active ? (language === 'ar' ? 'تعطيل' : 'Disable') : (language === 'ar' ? 'تفعيل' : 'Enable')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Coupon Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0b1220] border border-cyan-500/30 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-cyan-200">{language === 'ar' ? 'إنشاء قسيمة' : 'Create Coupon'}</h2>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {createdCode ? (
              <div className="space-y-4">
                <p className="text-green-300 text-sm">
                  {language === 'ar' ? 'تم إنشاء القسيمة. انسخ الكود للمستخدمين:' : 'Coupon created. Copy the code for customers:'}
                </p>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-black/30 border border-cyan-500/20">
                  <code className="flex-1 font-mono text-cyan-300 text-lg">{createdCode}</code>
                  <button
                    onClick={() => copyCode(createdCode)}
                    className="px-3 py-2 rounded-lg bg-cyan-600 text-white flex items-center gap-2 hover:bg-cyan-500"
                  >
                    <Copy className="w-4 h-4" />
                    {language === 'ar' ? 'نسخ' : 'Copy'}
                  </button>
                </div>
                <button
                  onClick={() => {
                    setCreateOpen(false);
                    setCreatedCode(null);
                  }}
                  className="w-full py-2 rounded-lg border border-cyan-500/40 text-cyan-300"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs text-cyan-200/80 mb-1">{language === 'ar' ? 'النوع' : 'Type'}</label>
                  <select
                    value={createForm.type}
                    onChange={(e) => setCreateForm((f) => ({ ...f, type: e.target.value as 'percent' | 'fixed' }))}
                    className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
                  >
                    <option value="percent">{language === 'ar' ? 'نسبة مئوية (%)' : 'Percent (%)'}</option>
                    <option value="fixed">{language === 'ar' ? 'مبلغ ثابت (EGP)' : 'Fixed (EGP)'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-cyan-200/80 mb-1">{language === 'ar' ? 'القيمة' : 'Value'} *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step={createForm.type === 'percent' ? '1' : '0.01'}
                    value={createForm.value}
                    onChange={(e) => setCreateForm((f) => ({ ...f, value: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
                    placeholder={createForm.type === 'percent' ? '10' : '20'}
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyan-200/80 mb-1">{language === 'ar' ? 'ينتهي في' : 'Expires at'}</label>
                  <input
                    type="datetime-local"
                    value={createForm.expires_at}
                    onChange={(e) => setCreateForm((f) => ({ ...f, expires_at: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyan-200/80 mb-1">{language === 'ar' ? 'حد الاستخدام' : 'Usage limit'}</label>
                  <input
                    type="number"
                    min="0"
                    value={createForm.usage_limit}
                    onChange={(e) => setCreateForm((f) => ({ ...f, usage_limit: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
                    placeholder={language === 'ar' ? 'غير محدود' : 'Unlimited'}
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyan-200/80 mb-1">{language === 'ar' ? 'الحد الأدنى للطلب (EGP)' : 'Min order (EGP)'}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createForm.min_order_total}
                    onChange={(e) => setCreateForm((f) => ({ ...f, min_order_total: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
                    placeholder={language === 'ar' ? 'بدون حد' : 'No minimum'}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="flex-1 py-2 rounded-lg border border-cyan-500/40 text-cyan-300"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={createSubmitting}
                    className="flex-1 py-2 rounded-lg bg-cyan-600 text-white font-semibold disabled:opacity-60"
                  >
                    {createSubmitting ? (language === 'ar' ? 'جاري...' : 'Creating...') : (language === 'ar' ? 'إنشاء' : 'Create')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
