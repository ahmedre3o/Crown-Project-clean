'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';

type TaxRow = {
  id: number;
  name: string;
  type: 'percentage' | 'fixed';
  rate: number;
  inclusive: number | boolean;
  apply_before_discount: number | boolean;
  is_active: number | boolean;
  created_at?: string;
};

export default function AccountingTaxesPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'settings', effectiveRole });
  const [list, setList] = useState<TaxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TaxRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{ name: string; type: 'percentage' | 'fixed'; rate: number; inclusive: boolean; apply_before_discount: boolean; is_active?: boolean }>({ name: '', type: 'percentage', rate: 0, inclusive: false, apply_before_discount: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest('/taxes');
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  const handleSaveNew = async () => {
    if (!form.name.trim()) {
      setError(language === 'ar' ? 'اسم الضريبة مطلوب' : 'Tax name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiRequest('/taxes', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          rate: Number(form.rate) || 0,
          inclusive: form.inclusive,
          apply_before_discount: form.apply_before_discount,
        }),
      });
      setCreating(false);
      setForm({ name: '', type: 'percentage', rate: 0, inclusive: false, apply_before_discount: true });
      await load();
    } catch (e: any) {
      setError(e?.message || (language === 'ar' ? 'فشل الحفظ' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/taxes/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name.trim() || undefined,
          type: form.type,
          rate: Number(form.rate),
          inclusive: form.inclusive,
          apply_before_discount: form.apply_before_discount,
          is_active: form.is_active,
        }),
      });
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e?.message || (language === 'ar' ? 'فشل التحديث' : 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (row: TaxRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      type: row.type,
      rate: Number(row.rate) || 0,
      inclusive: Boolean(row.inclusive),
      apply_before_discount: row.apply_before_discount !== 0 && row.apply_before_discount !== false,
      is_active: row.is_active !== 0 && row.is_active !== false,
    } as any);
  };

  const isAr = language === 'ar';

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">
          {isAr ? 'الضرائب' : 'Taxes'}
        </h1>
        <p className="text-slate-400 mb-6">
          {isAr ? 'إدارة قواعد الضرائب (ضريبة الصنف، شاملة، قبل/بعد الخصم)' : 'Manage tax rules (product tax, inclusive, before/after discount)'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <button
            onClick={() => { setCreating(true); setError(null); setForm({ name: '', type: 'percentage', rate: 0, inclusive: false, apply_before_discount: true }); }}
            className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium"
          >
            {isAr ? 'إضافة ضريبة' : 'Add tax'}
          </button>
        </div>

        {creating && (
          <div className="neon-card rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-cyan-300 mb-4">{isAr ? 'ضريبة جديدة' : 'New tax'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-cyan-300/80 mb-1">{isAr ? 'الاسم' : 'Name'}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
                  placeholder="e.g. VAT 14%"
                />
              </div>
              <div>
                <label className="block text-xs text-cyan-300/80 mb-1">{isAr ? 'نوع الضريبة' : 'Type'}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'percentage' | 'fixed' }))}
                  className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
                >
                  <option value="percentage">{isAr ? 'نسبة مئوية' : 'Percentage'}</option>
                  <option value="fixed">{isAr ? 'مبلغ ثابت' : 'Fixed'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-cyan-300/80 mb-1">{isAr ? 'نسبة الضريبة / المبلغ' : 'Rate / Amount'}</label>
                <input
                  type="number"
                  step={form.type === 'percentage' ? 0.01 : 0.01}
                  value={form.rate}
                  onChange={(e) => setForm((p) => ({ ...p, rate: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.inclusive}
                    onChange={(e) => setForm((p) => ({ ...p, inclusive: e.target.checked }))}
                    className="rounded border-cyan-500/30"
                  />
                  <span className="text-sm">{isAr ? 'الضريبة شاملة السعر' : 'Inclusive tax'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.apply_before_discount}
                    onChange={(e) => setForm((p) => ({ ...p, apply_before_discount: e.target.checked }))}
                    className="rounded border-cyan-500/30"
                  />
                  <span className="text-sm">{isAr ? 'الضريبة قبل الخصم' : 'Tax before discount'}</span>
                </label>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={handleSaveNew} disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-600 text-white">
                {saving ? (isAr ? 'جاري...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
              </button>
              <button onClick={() => setCreating(false)} className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300">
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {editing && (
          <div className="neon-card rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-cyan-300 mb-4">{isAr ? 'تعديل الضريبة' : 'Edit tax'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-cyan-300/80 mb-1">{isAr ? 'الاسم' : 'Name'}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-cyan-300/80 mb-1">{isAr ? 'نوع الضريبة' : 'Type'}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'percentage' | 'fixed' }))}
                  className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
                >
                  <option value="percentage">{isAr ? 'نسبة مئوية' : 'Percentage'}</option>
                  <option value="fixed">{isAr ? 'مبلغ ثابت' : 'Fixed'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-cyan-300/80 mb-1">{isAr ? 'نسبة الضريبة / المبلغ' : 'Rate / Amount'}</label>
                <input
                  type="number"
                  step={0.01}
                  value={form.rate}
                  onChange={(e) => setForm((p) => ({ ...p, rate: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.inclusive}
                    onChange={(e) => setForm((p) => ({ ...p, inclusive: e.target.checked }))}
                    className="rounded border-cyan-500/30"
                  />
                  <span className="text-sm">{isAr ? 'الضريبة شاملة السعر' : 'Inclusive tax'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.apply_before_discount}
                    onChange={(e) => setForm((p) => ({ ...p, apply_before_discount: e.target.checked }))}
                    className="rounded border-cyan-500/30"
                  />
                  <span className="text-sm">{isAr ? 'الضريبة قبل الخصم' : 'Tax before discount'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                    className="rounded border-cyan-500/30"
                  />
                  <span className="text-sm">{isAr ? 'مفعّل' : 'Enabled'}</span>
                </label>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={handleUpdate} disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-600 text-white">
                {saving ? (isAr ? 'جاري...' : 'Saving...') : (isAr ? 'تحديث' : 'Update')}
              </button>
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300">
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        <div className="neon-card rounded-xl overflow-hidden accounting-print">
          {loading ? (
            <p className="p-6 text-slate-400">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : list.length === 0 ? (
            <p className="p-6 text-slate-400">{isAr ? 'لا توجد ضرائب. أضف ضريبة جديدة.' : 'No taxes. Add a new tax.'}</p>
          ) : (
            <div className="table-scroll">
            <table className="data-table text-sm text-slate-200">
              <thead>
                <tr>
                  <th>{isAr ? 'الاسم' : 'Name'}</th>
                  <th>{isAr ? 'النوع' : 'Type'}</th>
                  <th>{isAr ? 'النسبة/المبلغ' : 'Rate'}</th>
                  <th className="col-center">{isAr ? 'شاملة' : 'Inclusive'}</th>
                  <th className="col-center">{isAr ? 'قبل الخصم' : 'Before discount'}</th>
                  <th className="col-center">{isAr ? 'مفعّل' : 'Active'}</th>
                  <th className="col-center actions-column no-print">{isAr ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/30">
                    <td className="data-table-wrap">{row.name}</td>
                    <td className="data-table-wrap">{row.type}</td>
                    <td className="data-table-num">{row.type === 'percentage' ? `${row.rate}%` : row.rate}</td>
                    <td className="data-table-center">{row.inclusive ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')}</td>
                    <td className="data-table-center">{row.apply_before_discount ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')}</td>
                    <td className="data-table-center">{row.is_active ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')}</td>
                    <td className="data-table-center actions-column no-print">
                      <button type="button" onClick={() => openEdit(row)} className="text-cyan-400 hover:text-cyan-300 text-xs">
                        {isAr ? 'تعديل' : 'Edit'}
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
    </div>
  );
}
