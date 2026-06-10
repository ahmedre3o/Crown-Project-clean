'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/formatters';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';

type Supplier = { id: number; name: string; phone: string | null; address: string | null; balance: number; created_at: string; updated_at: string };

export default function SuppliersPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'suppliers', effectiveRole, showDenied: true });
  const { symbol } = useCurrency();
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', balance: '0' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest('/admin/suppliers');
      setItems((res as { items?: Supplier[] })?.items ?? []);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to load');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && allowed) load();
  }, [authLoading, allowed, load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', phone: '', address: '', balance: '0' });
    setModalOpen(true);
  };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone ?? '', address: s.address ?? '', balance: String(s.balance ?? 0) });
    setModalOpen(true);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await apiRequest(`/admin/suppliers/${editing.id}`, { method: 'PUT', body: JSON.stringify({ name: form.name, phone: form.phone || null, address: form.address || null, balance: parseFloat(form.balance) || 0 }) });
      } else {
        await apiRequest('/admin/suppliers', { method: 'POST', body: JSON.stringify({ name: form.name, phone: form.phone || null, address: form.address || null, balance: parseFloat(form.balance) || 0 }) });
      }
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id: number) => {
    if (!confirm(language === 'ar' ? 'حذف المورد؟' : 'Delete supplier?')) return;
    try {
      await apiRequest(`/admin/suppliers/${id}`, { method: 'DELETE' });
      load();
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to delete');
    }
  };

  if (authLoading || !allowed) return null;

  const title = language === 'ar' ? 'الموردون' : 'Suppliers';
  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">{title}</h1>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <div className="flex justify-end mb-4">
          <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-cyan-200 hover:bg-cyan-500/20">
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'إضافة مورد' : 'Add Supplier'}
          </button>
        </div>
        {loading ? (
          <p className="text-gray-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="rounded-xl border border-cyan-500/30 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-gray-800/80 text-cyan-200">
                <tr>
                  <th className="px-4 py-3">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'الهاتف' : 'Phone'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'العنوان' : 'Address'}</th>
                  <th className="px-4 py-3">{language === 'ar' ? 'الرصيد' : 'Balance'}</th>
                  <th className="px-4 py-3 w-24">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-t border-cyan-500/20 hover:bg-cyan-500/5">
                    <td className="px-4 py-3">{s.name}</td>
                    <td className="px-4 py-3">{s.phone ?? '—'}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{s.address ?? '—'}</td>
                    <td className="px-4 py-3">{formatCurrency(Number(s.balance), language === 'ar' ? 'ar' : 'en', undefined, symbol)}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => openEdit(s)} className="p-1.5 text-cyan-400 hover:bg-cyan-500/20 rounded"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => handleDelete(s.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && !loading && <p className="p-6 text-gray-500 text-center">{language === 'ar' ? 'لا موردين بعد' : 'No suppliers yet'}</p>}
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => !saving && setModalOpen(false)}>
            <div className="bg-gray-900 border border-cyan-500/40 rounded-xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-cyan-200 mb-4">{editing ? (language === 'ar' ? 'تعديل مورد' : 'Edit Supplier') : (language === 'ar' ? 'إضافة مورد' : 'Add Supplier')}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'الاسم' : 'Name'}</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'الهاتف' : 'Phone'}</label>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'العنوان' : 'Address'}</label>
                  <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white" rows={2} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{language === 'ar' ? 'الرصيد' : 'Balance'}</label>
                  <input type="number" step="0.01" value={form.balance} onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))} className="w-full rounded-lg bg-black border border-cyan-500/30 px-3 py-2 text-white" />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => !saving && setModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-500 text-gray-300">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-600 text-white disabled:opacity-50">{saving ? (language === 'ar' ? 'جاري...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
