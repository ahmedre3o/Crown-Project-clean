'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { apiRequest } from '@/contexts/AuthContext';
import { FileText, Plus, Printer } from 'lucide-react';
import { useBranch, getBranchDisplayName } from '@/contexts/BranchContext';
import { logPrintAudit } from '@/lib/printAudit';

type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

interface Account {
  id: number;
  shop_id: number;
  code: string;
  name: string;
  type: AccountType;
  parent_id?: number | null;
  is_active?: number;
  created_at?: string;
}

export default function ChartOfAccountsPage() {
  const { language, direction } = useLanguage();
  const branchCtx = useBranch();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'accounting_coa', effectiveRole, showDenied: true });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'asset' as AccountType });

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest('/admin/accounts');
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (language === 'ar' ? 'فشل تحميل الحسابات' : 'Failed to load accounts');
      setError(msg);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (allowed) loadAccounts();
  }, [allowed, loadAccounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiRequest('/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: form.code.trim(), name: form.name.trim(), type: form.type }),
      });
      setForm({ code: '', name: '', type: 'asset' });
      setShowForm(false);
      await loadAccounts();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (language === 'ar' ? 'فشل حفظ الحساب' : 'Failed to save account');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    await logPrintAudit('chart_of_accounts', 0, branchCtx.activeBranchId ?? undefined);
    window.print();
  };

  if (authLoading || !allowed) return null;

  const title = language === 'ar' ? 'دليل الحسابات' : 'Chart of Accounts';
  const typeLabels: Record<AccountType, string> = {
    asset: language === 'ar' ? 'أصول' : 'Asset',
    liability: language === 'ar' ? 'التزامات' : 'Liability',
    equity: language === 'ar' ? 'حقوق ملكية' : 'Equity',
    revenue: language === 'ar' ? 'إيرادات' : 'Revenue',
    expense: language === 'ar' ? 'مصروفات' : 'Expense',
  };

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-cyan-200">{title}</h1>
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <Plus className="h-4 w-4" />
              {language === 'ar' ? 'إضافة حساب' : 'Add account'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
            >
              <Printer className="h-4 w-4" />
              {language === 'ar' ? 'طباعة' : 'Print'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-300 text-sm print:hidden">{error}</div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl border border-cyan-500/30 bg-slate-900/50 print:hidden">
            <h2 className="text-lg font-semibold text-cyan-200 mb-3">{language === 'ar' ? 'حساب جديد' : 'New account'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder={language === 'ar' ? 'كود' : 'Code'}
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-cyan-500/30 text-white"
                required
              />
              <input
                type="text"
                placeholder={language === 'ar' ? 'الاسم' : 'Name'}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-cyan-500/30 text-white"
                required
              />
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType }))}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-cyan-500/30 text-white"
              >
                {(Object.keys(typeLabels) as AccountType[]).map((t) => (
                  <option key={t} value={t}>{typeLabels[t]}</option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-600 text-white disabled:opacity-50">
                {saving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-500 text-slate-300">
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl border border-cyan-500/30 overflow-hidden accounting-print">
          <div className="hidden print:block print-branch text-black border-b border-gray-300 p-4">
            <div className="font-bold">Crown ERP</div>
            <div>{title}</div>
            <div>
              {language === 'ar' ? 'الفرع: ' : 'Branch: '}
              {getBranchDisplayName(branchCtx.activeBranch, language)}
            </div>
          </div>
          {loading ? (
            <p className="p-8 text-center text-gray-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          ) : accounts.length === 0 ? (
            <p className="p-8 text-center text-gray-400">{language === 'ar' ? 'لا توجد حسابات بعد' : 'No accounts yet'}</p>
          ) : (
            <div className={`table-scroll table-rtl-wrap ${direction === 'rtl' ? 'text-right' : 'text-left'}`} dir={direction}>
            <table className="data-table text-sm text-slate-200 min-w-[1000px]">
              <thead>
                <tr>
                  <th className="table-col-compact">{language === 'ar' ? 'الكود' : 'Code'}</th>
                  <th className="table-col-long">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="table-col-date">{language === 'ar' ? 'النوع' : 'Type'}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td className="data-table-num table-col-compact font-mono">{a.code}</td>
                    <td className="table-col-long">{a.name}</td>
                    <td className="table-col-date">{typeLabels[a.type] || a.type}</td>
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
