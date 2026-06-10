'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/formatters';
import { Receipt, Plus, Pencil } from 'lucide-react';

function toYYYYMMDD(val: string | Date | null | undefined): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  const s = typeof val === 'string' ? val : val.toISOString();
  return s.includes('T') ? s.slice(0, 10) : s.slice(0, 10);
}

const EXPENSE_CATEGORIES = [
  { key: 'electricity', ar: 'كهرباء', en: 'Electricity' },
  { key: 'water', ar: 'مياه', en: 'Water' },
  { key: 'gas', ar: 'غاز', en: 'Gas' },
  { key: 'rent', ar: 'إيجار', en: 'Rent' },
  { key: 'salaries', ar: 'رواتب', en: 'Salaries' },
  { key: 'other', ar: 'أخرى', en: 'Other' },
];

type Expense = {
  id: number;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  created_at: string;
};

export default function ExpensesPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'expenses', effectiveRole, showDenied: true });
  const { symbol, currency } = useCurrency();
  const [data, setData] = useState<{ items: Expense[]; total: number }>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({ category: 'other', amount: '', description: '', expense_date: '' });
  const [saving, setSaving] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({ category: 'other', amount: '', description: '', expense_date: new Date().toISOString().slice(0, 10) });

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await apiRequest(`/expenses?${params.toString()}`);
      setData({ items: res?.items ?? [], total: res?.total ?? 0 });
    } catch (err: any) {
      if (err?.status === 404) {
        setData({ items: [], total: 0 });
        if (typeof console !== 'undefined') console.warn('[expenses] Backend route missing / not deployed');
      } else {
        setError(err?.message || (language === 'ar' ? 'فشل تحميل المصاريف' : 'Failed to load expenses'));
      }
    } finally {
      setLoading(false);
    }
  }, [language, from, to]);

  useEffect(() => {
    if (!authLoading && allowed) loadExpenses();
  }, [authLoading, allowed, loadExpenses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!Number.isFinite(amt) || amt < 0) return;
    try {
      await apiRequest('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category: form.category,
          amount: amt,
          description: form.description || null,
          expense_date: toYYYYMMDD(form.expense_date),
        }),
      });
      setCreateOpen(false);
      setForm({ category: 'other', amount: '', description: '', expense_date: new Date().toISOString().slice(0, 10) });
      loadExpenses();
    } catch (err: any) {
      setError(err?.message || 'Failed');
    }
  };

  const handleEditClick = (e: Expense) => {
    setEditExpense(e);
    setEditForm({
      category: e.category,
      amount: String(e.amount),
      description: e.description || '',
      expense_date: toYYYYMMDD(e.expense_date),
    });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExpense) return;
    const amt = parseFloat(editForm.amount);
    if (!Number.isFinite(amt) || amt < 0) return;
    try {
      setSaving(true);
      await apiRequest(`/expenses/${editExpense.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          category: editForm.category,
          amount: amt,
          description: editForm.description || null,
          expense_date: toYYYYMMDD(editForm.expense_date),
        }),
      });
      setEditExpense(null);
      loadExpenses();
    } catch (err: any) {
      setError(err?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6 flex items-center gap-2">
          <Receipt className="w-6 h-6" />
          {language === 'ar' ? 'مصاريف' : 'Expenses'}
        </h1>
        <div className="flex flex-wrap gap-4 mb-4">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 rounded-lg border border-cyan-500/40 bg-black/50 text-cyan-200"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 rounded-lg border border-cyan-500/40 bg-black/50 text-cyan-200"
          />
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
          >
            <Plus className="w-4 h-4" />
            {language === 'ar' ? 'إضافة مصروف' : 'Add Expense'}
          </button>
        </div>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>
        )}
        {loading ? (
          <p className="text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="neon-card rounded-xl p-6">
            <p className="text-lg font-bold text-amber-400 mb-4">
              {language === 'ar' ? 'الإجمالي:' : 'Total:'} {formatCurrency(data.total, language === 'ar' ? 'ar' : 'en', currency, symbol)}
            </p>
            {data.items.length === 0 ? (
              <p className="text-slate-500 text-center py-8">{language === 'ar' ? 'لا توجد مصاريف' : 'No expenses'}</p>
            ) : (
              <div className="overflow-x-auto -mx-2 md:mx-0 min-w-0">
                <table className="data-table text-sm text-slate-200 min-w-[640px]">
                  <thead>
                    <tr>
                      <th>{language === 'ar' ? 'الفئة' : 'Category'}</th>
                      <th>{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                      <th>{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                      <th>{language === 'ar' ? 'الوصف' : 'Description'}</th>
                      <th className="col-center">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((e) => (
                      <tr key={e.id}>
                        <td className="data-table-wrap">{EXPENSE_CATEGORIES.find((c) => c.key === e.category)?.[language === 'ar' ? 'ar' : 'en'] || e.category}</td>
                        <td className="data-table-num font-semibold">{formatCurrency(e.amount, language === 'ar' ? 'ar' : 'en', currency, symbol)}</td>
                        <td className="data-table-num whitespace-nowrap">{new Date(e.expense_date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</td>
                        <td className="data-table-wrap break-text max-w-[14rem]">{e.description || '-'}</td>
                        <td className="data-table-center">
                          <button
                            type="button"
                            onClick={() => handleEditClick(e)}
                            className="inline-flex flex-row-reverse items-center gap-1 px-2 py-1 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 text-sm"
                          >
                            <Pencil className="w-3.5 h-3.5 shrink-0" />
                            <span>{language === 'ar' ? 'تعديل' : 'Edit'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {editExpense && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={() => !saving && setEditExpense(null)} />
            <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl border border-cyan-500/40 bg-gray-900 p-6" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              <h3 className="text-lg font-bold text-cyan-200 mb-4">{language === 'ar' ? 'تعديل مصروف' : 'Edit Expense'}</h3>
              <form onSubmit={handleEditSave} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'الفئة' : 'Category'}</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-cyan-500/40 bg-black/50 text-cyan-200"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {language === 'ar' ? c.ar : c.en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'المبلغ' : 'Amount'}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editForm.amount}
                    onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-cyan-500/40 bg-black/50 text-cyan-200"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'التاريخ' : 'Date'}</label>
                  <input
                    type="date"
                    value={editForm.expense_date}
                    onChange={(e) => setEditForm((f) => ({ ...f, expense_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-cyan-500/40 bg-black/50 text-cyan-200"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'الوصف' : 'Description'}</label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-cyan-500/40 bg-black/50 text-cyan-200"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-600 text-white disabled:opacity-50">
                    {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
                  </button>
                  <button type="button" onClick={() => !saving && setEditExpense(null)} disabled={saving} className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 disabled:opacity-50">
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
        {createOpen && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setCreateOpen(false)} />
            <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-50 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl border border-cyan-500/40 bg-gray-900 p-6" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              <h3 className="text-lg font-bold text-cyan-200 mb-4">{language === 'ar' ? 'إضافة مصروف' : 'Add Expense'}</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'الفئة' : 'Category'}</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-cyan-500/40 bg-black/50 text-cyan-200"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {language === 'ar' ? c.ar : c.en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'المبلغ' : 'Amount'}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-cyan-500/40 bg-black/50 text-cyan-200"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'التاريخ' : 'Date'}</label>
                  <input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-cyan-500/40 bg-black/50 text-cyan-200"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'الوصف' : 'Description'}</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-cyan-500/40 bg-black/50 text-cyan-200"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 rounded-lg bg-cyan-600 text-white">
                    {language === 'ar' ? 'حفظ' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300">
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
