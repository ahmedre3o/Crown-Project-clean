'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBranch, getBranchDisplayName } from '@/contexts/BranchContext';
import { logPrintAudit } from '@/lib/printAudit';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { Printer } from 'lucide-react';

interface Branch {
  id: number;
  shop_id: number;
  name: string;
  name_ar?: string | null;
  name_en?: string | null;
  code: string;
  created_at?: string;
}

export default function BranchesPage() {
  const { t, language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'branches', effectiveRole, showDenied: true });
  const { activeBranchId, setActiveBranchId } = useBranch();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', code: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', code: '' });
  const [error, setError] = useState<string | null>(null);

  const loadAdminBranches = async () => {
    const data = await apiRequest('/admin/branches');
    const list = Array.isArray(data) ? data : [];
    setBranches(list);
  };

  useEffect(() => {
    if (!authLoading && allowed) {
      loadAdminBranches().finally(() => setLoading(false));
    }
  }, [authLoading, allowed]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/admin/branches', {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim() || 'Branch', code: (form.code.trim() || 'branch').toLowerCase().replace(/\s+/g, '_') }),
      });
      setForm({ name: '', code: '' });
      await loadAdminBranches();
    } catch (err: any) {
      setError(err.message || 'Failed');
    }
  };

  const handleUpdate = async (id: number) => {
    setError(null);
    try {
      await apiRequest(`/admin/branches/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editForm.name.trim(), code: editForm.code.trim().toLowerCase().replace(/\s+/g, '_') }),
      });
      setEditingId(null);
      await loadAdminBranches();
    } catch (err: any) {
      setError(err.message || 'Failed');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(language === 'ar' ? 'حذف هذا الفرع؟' : 'Delete this branch?')) return;
    setError(null);
    try {
      await apiRequest(`/admin/branches/${id}`, { method: 'DELETE' });
      if (activeBranchId === id) setActiveBranchId(branches.find((b) => b.id !== id)?.id ?? null);
      await loadAdminBranches();
    } catch (err: any) {
      setError(err.message || 'Failed');
    }
  };

  const title = language === 'ar' ? 'الفروع' : 'Branches';
  const subtitle = language === 'ar' ? 'إدارة فروع المتجر' : 'Manage store branches';
  const activeBr = branches.find((b) => b.id === activeBranchId) ?? null;

  const handlePrintBranches = async () => {
    await logPrintAudit('branches_list', 0, activeBranchId ?? undefined);
    window.print();
  };

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-cyan-200 mb-2">{title}</h1>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => handlePrintBranches()}
            className="print:hidden inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 px-4 py-2 text-cyan-300 hover:bg-cyan-500/10"
          >
            <Printer className="h-4 w-4" />
            {language === 'ar' ? 'طباعة' : 'Print'}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="mb-8 p-4 rounded-xl border border-cyan-500/20 bg-[#0b1220] flex flex-wrap items-end gap-3">
          <input
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm min-w-[140px]"
            placeholder={language === 'ar' ? 'اسم الفرع' : 'Branch name'}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm min-w-[100px]"
            placeholder={language === 'ar' ? 'كود' : 'Code'}
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-500">
            {language === 'ar' ? 'إضافة فرع' : 'Add branch'}
          </button>
        </form>

        {loading ? (
          <p className="text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="neon-card rounded-xl overflow-hidden accounting-print">
            <div className="hidden print:block print-branch p-4 border-b border-gray-300 text-black">
              <div className="font-bold">Crown ERP</div>
              <div>{title}</div>
              <div>
                {language === 'ar' ? 'الفرع النشط: ' : 'Active branch: '}
                {getBranchDisplayName(activeBr, language)}
              </div>
            </div>
            <div className={`table-scroll table-rtl-wrap ${direction === 'rtl' ? 'text-right' : 'text-left'}`} dir={direction}>
              <table className="data-table text-sm text-slate-200 min-w-[1000px]">
                <thead>
                  <tr>
                    <th className="table-col-long">{language === 'ar' ? 'اسم الفرع' : 'Branch name'}</th>
                    <th className="table-col-compact">{language === 'ar' ? 'الكود' : 'Code'}</th>
                    <th className="table-col-date">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="col-center actions-column">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.id}>
                      {editingId === b.id ? (
                        <>
                          <td className="table-col-long">
                            <input
                              className="w-full min-w-[240px] max-w-md bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                              value={editForm.name}
                              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                            />
                          </td>
                          <td className="data-table-num table-col-compact">
                            <input
                              className="w-28 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm font-mono"
                              value={editForm.code}
                              onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value }))}
                            />
                          </td>
                          <td className="table-col-date">—</td>
                          <td className="data-table-center actions-column no-print">
                            <div className="flex flex-col gap-2 items-stretch">
                              <button
                                type="button"
                                onClick={() => handleUpdate(b.id)}
                                className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-sm"
                              >
                                {language === 'ar' ? 'حفظ' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1.5 rounded-lg border border-slate-500 text-slate-300 text-sm"
                              >
                                {language === 'ar' ? 'إلغاء' : 'Cancel'}
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="table-col-long font-medium text-cyan-200">
                            {language === 'ar' ? (b.name_ar || b.name) : (b.name_en || b.name)}
                          </td>
                          <td className="data-table-num table-col-compact font-mono text-slate-300">{b.code}</td>
                          <td className="table-col-date">
                            {activeBranchId === b.id ? (
                              <span className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">
                                {language === 'ar' ? 'الفرع الحالي' : 'Current branch'}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="data-table-center actions-column align-top no-print">
                            <div className="flex flex-col gap-2 items-stretch text-sm">
                              <button
                                type="button"
                                onClick={() => setActiveBranchId(b.id)}
                                className="px-2 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                              >
                                {language === 'ar' ? 'تفعيل' : 'Use'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(b.id);
                                  setEditForm({ name: b.name, code: b.code });
                                }}
                                className="px-2 py-1.5 rounded-lg border border-slate-500 text-slate-300 hover:bg-slate-800"
                              >
                                {language === 'ar' ? 'تعديل' : 'Edit'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(b.id)}
                                disabled={branches.length <= 1}
                                className={`px-2 py-1.5 rounded-lg border ${
                                  branches.length <= 1
                                    ? 'border-slate-700 text-slate-500 cursor-not-allowed'
                                    : 'border-red-500/40 text-red-300 hover:bg-red-500/10'
                                }`}
                                title={branches.length <= 1 ? (language === 'ar' ? 'لا يمكن حذف الفرع الوحيد' : 'Cannot delete the only branch') : ''}
                              >
                                {language === 'ar' ? 'حذف' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
