'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { useBranch } from '@/contexts/BranchContext';

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
  const { branches, loadBranches, activeBranchId, setActiveBranchId } = useBranch();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', code: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', code: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && allowed) loadBranches().finally(() => setLoading(false));
  }, [authLoading, allowed, loadBranches]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/admin/branches', {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim() || 'Branch', code: (form.code.trim() || 'branch').toLowerCase().replace(/\s+/g, '_') }),
      });
      setForm({ name: '', code: '' });
      await loadBranches();
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
      await loadBranches();
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
      await loadBranches();
    } catch (err: any) {
      setError(err.message || 'Failed');
    }
  };

  const title = language === 'ar' ? 'الفروع' : 'Branches';
  const subtitle = language === 'ar' ? 'إدارة فروع المتجر' : 'Manage store branches';

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-2">{title}</h1>
        <p className="text-sm text-slate-400 mb-6">{subtitle}</p>

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
          <div className="space-y-3">
            {branches.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-cyan-500/20 bg-[#0b1220]"
              >
                {editingId === b.id ? (
                  <>
                    <input
                      className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    />
                    <input
                      className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm w-24"
                      value={editForm.code}
                      onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value }))}
                    />
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
                  </>
                ) : (
                  <>
                    <span className="font-medium text-cyan-200">{language === 'ar' ? (b.name_ar || b.name) : (b.name_en || b.name)}</span>
                    <span className="text-slate-500 text-sm">{b.code}</span>
                    {activeBranchId === b.id && (
                      <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        {language === 'ar' ? 'الحالي' : 'Current'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveBranchId(b.id)}
                      className="text-xs text-cyan-400 hover:text-cyan-300"
                    >
                      {language === 'ar' ? 'تفعيل' : 'Use'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(b.id);
                        setEditForm({ name: b.name, code: b.code });
                      }}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      {language === 'ar' ? 'تعديل' : 'Edit'}
                    </button>
                    {branches.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        {language === 'ar' ? 'حذف' : 'Delete'}
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
