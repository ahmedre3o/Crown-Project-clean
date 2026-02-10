'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiRequest, useAuth } from '../../contexts/AuthContext';
import { useRouteGuard } from '../../guards/useRouteGuard';

interface LicenseItem {
  id: number;
  license_key: string;
  plan: string;
  duration: string;
  status: string;
  used_by_user_id: number | null;
  used_at: string | null;
  created_at: string;
}

type Filter = 'all' | 'activated' | 'not_activated';

export default function AdminCodesPage() {
  const { direction, language } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'admin_codes', effectiveRole, showDenied: true });
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const loadLicenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest(`/licenses?filter=${filter}`);
      setLicenses(Array.isArray(data) ? data : []);
      setSelectedIds(new Set());
    } catch (err: any) {
      const msg = String(err?.message || 'Failed to load codes');
      setError(msg.includes('not found') || msg.includes('404') ? (language === 'ar' ? 'الخدمة غير متوفرة. تأكد من تشغيل الخادم.' : 'Service not found. Please ensure the backend is running.') : msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user || !allowed) return;
    if (user.role !== 'super_admin') return;
    loadLicenses();
  }, [authLoading, user, allowed, filter]);

  const deleteCode = async (id: number) => {
    setError(null);
    try {
      await apiRequest(`/licenses/${id}`, { method: 'DELETE' });
      await loadLicenses();
    } catch (err: any) {
      const msg = String(err?.message || 'Failed to delete');
      setError(msg.includes('not found') || msg.includes('404') ? (language === 'ar' ? 'الكود غير موجود أو تم حذفه.' : 'Code not found or already deleted.') : msg);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setError(null);
    try {
      await apiRequest('/licenses/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      await loadLicenses();
    } catch (err: any) {
      const msg = String(err?.message || 'Failed to bulk delete');
      setError(msg.includes('not found') || msg.includes('404') ? (language === 'ar' ? 'الخدمة غير متوفرة. تأكد من تشغيل الخادم.' : 'Service not found. Please ensure the backend is running.') : msg);
    }
  };

  const archiveActivated = async () => {
    setError(null);
    setSuccess(null);
    try {
      const result = await apiRequest('/licenses/archive-activated', { method: 'POST' });
      const deleted = result?.deleted ?? 0;
      setSuccess(language === 'ar' ? `تم أرشفة ${deleted} كود` : `${deleted} codes archived`);
      await loadLicenses();
    } catch (err: any) {
      const msg = String(err?.message || 'Failed to archive');
      setError(msg.includes('not found') || msg.includes('404') ? (language === 'ar' ? 'الخدمة غير متوفرة. تأكد من تشغيل الخادم.' : 'Service not found. Please ensure the backend is running.') : msg);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === licenses.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(licenses.map((l) => l.id)));
  };

  const title = language === 'ar' ? 'قائمة الأكواد' : 'Codes List';
  const subtitle = language === 'ar' ? 'إدارة أكواد التفعيل' : 'Manage activation codes';

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-cyan-200">{title}</h1>
            <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
          >
            {language === 'ar' ? 'العودة للإدارة' : 'Back to Admin'}
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm">{success}</div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
          >
            <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
            <option value="activated">{language === 'ar' ? 'المفعلة' : 'Activated'}</option>
            <option value="not_activated">{language === 'ar' ? 'غير المفعلة' : 'Not Activated'}</option>
          </select>
          {selectedIds.size > 0 && (
            <button
              onClick={bulkDelete}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-500"
            >
              {language === 'ar' ? `حذف المحدد (${selectedIds.size})` : `Delete Selected (${selectedIds.size})`}
            </button>
          )}
          {filter === 'activated' && licenses.length > 0 && (
            <button
              onClick={archiveActivated}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-500"
            >
              {language === 'ar' ? 'أرشفة الأكواد المفعلة' : 'Archive Activated Codes'}
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-cyan-500/20">
            <table className="w-full text-sm">
              <thead className="text-cyan-400 border-b border-cyan-500/20 bg-[#0f172a]">
                <tr>
                  <th className="py-2 px-3 text-left">
                    <input
                      type="checkbox"
                      checked={licenses.length > 0 && selectedIds.size === licenses.length}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'الكود' : 'Code'}</th>
                  <th className="py-2 px-3 w-10"></th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'الباقة' : 'Plan'}</th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'المدة' : 'Duration'}</th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'تاريخ التفعيل' : 'Activation Date'}</th>
                  <th className="py-2 px-3 text-left">{language === 'ar' ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((item) => (
                  <tr key={item.id} className="border-b border-cyan-500/10 hover:bg-cyan-500/5">
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="py-2 px-3 font-mono text-cyan-200">{item.license_key}</td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(item.license_key);
                          toast.success(language === 'ar' ? 'تم نسخ الكود' : 'Code copied');
                        }}
                        className="p-1.5 rounded border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-300"
                        title={language === 'ar' ? 'نسخ الكود' : 'Copy code'}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-2 px-3 capitalize">{item.plan}</td>
                    <td className="py-2 px-3 capitalize">{item.duration}</td>
                    <td className="py-2 px-3">
                      <span
                        className={
                          item.status === 'active'
                            ? 'text-green-400'
                            : item.status === 'unused'
                            ? 'text-slate-400'
                            : 'text-amber-400'
                        }
                      >
                        {item.status === 'active'
                          ? language === 'ar'
                            ? 'مفعل'
                            : 'Activated'
                          : item.status === 'unused'
                          ? language === 'ar'
                            ? 'غير مفعل'
                            : 'Not Activated'
                          : item.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {item.used_at
                        ? new Date(item.used_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')
                        : '—'}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => deleteCode(item.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        {language === 'ar' ? 'حذف' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {licenses.length === 0 && (
              <div className="py-12 text-center text-slate-500">
                {language === 'ar' ? 'لا توجد أكواد' : 'No codes found'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
