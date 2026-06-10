'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, apiFetch, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { Activity, Users, Store, Clock, Download, Upload, HardDrive } from 'lucide-react';

interface SystemStats {
  ok: boolean;
  totalUsers: number;
  totalShops: number | null;
  onlineUsers: number;
  active15m?: number;
  active60m?: number;
}

const toNumber = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeSystemStats = (raw: any): SystemStats | null => {
  if (!raw || typeof raw !== 'object') return null;
  const totalUsers = toNumber(raw.totalUsers ?? raw.total_users ?? raw.users ?? 0);
  const totalShopsRaw = raw.totalShops ?? raw.total_shops ?? raw.shops ?? null;
  const totalShops = Number.isFinite(Number(totalShopsRaw)) ? Number(totalShopsRaw) : null;
  const onlineUsers = toNumber(
    raw.onlineUsers ?? raw.online_users ?? raw.active15m ?? raw.active_15m ?? raw.online ?? 0
  );
  const active15m = toNumber(raw.active15m ?? raw.active_15m ?? raw.onlineUsers ?? raw.online_users ?? onlineUsers);
  const active60m = toNumber(raw.active60m ?? raw.active_60m ?? 0);
  return {
    ok: raw.ok !== false,
    totalUsers,
    totalShops,
    onlineUsers,
    active15m,
    active60m,
  };
};

export default function SystemDashboardPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupDownloading, setBackupDownloading] = useState(false);
  const [backupRestoring, setBackupRestoring] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [shops, setShops] = useState<{ id: number; name?: string; business_name?: string }[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | ''>('');

  const { allowed } = useRouteGuard(user, authLoading, {
    feature: 'admin',
    effectiveRole,
    showDenied: true,
  });

  useEffect(() => {
    if (!authLoading && allowed) {
      setLoading(true);
      setError(null);
      apiRequest('/system/stats')
        .then((res: any) => {
          const normalized = normalizeSystemStats(res);
          if (!normalized) {
            setError(language === 'ar' ? 'فشل تحميل الإحصائيات' : 'Failed to load stats');
            setStats(null);
            return;
          }
          setStats(normalized);
        })
        .catch((err: any) => {
          setError(err?.message || (language === 'ar' ? 'فشل تحميل الإحصائيات' : 'Failed to load stats'));
        })
        .finally(() => setLoading(false));
    }
  }, [authLoading, allowed, language]);

  useEffect(() => {
    if (allowed) {
      apiRequest('/admin/shops')
        .then((res: any) => {
          const arr = Array.isArray(res) ? res : res?.shops || res?.data || [];
          setShops(arr);
          setSelectedShopId((prev) => (arr.length > 0 && !prev ? arr[0].id : prev));
        })
        .catch(() => setShops([]));
    }
  }, [allowed]);

  if (authLoading || !allowed) return null;

  const dir = direction;
  const isAr = language === 'ar';

  return (
    <div className="min-h-screen flex" dir={dir}>
      <Sidebar />
      <main
        className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#020617]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="max-w-5xl mx-auto">
          <header className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-cyan-300" />
              <h1 className="text-2xl font-bold text-cyan-200">
                {isAr ? 'لوحة تحكم النظام' : 'System Admin Dashboard'}
              </h1>
            </div>
          </header>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
              {error}
            </div>
          )}

          {loading || !stats ? (
            <div className="text-slate-400 text-sm py-12 text-center">
              {isAr ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="rounded-2xl border border-cyan-500/30 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {isAr ? 'إجمالي المستخدمين' : 'Total Users'}
                    </span>
                    <Users className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="text-2xl font-bold text-cyan-200">{stats.totalUsers}</div>
                </div>

                <div className="rounded-2xl border border-cyan-500/30 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {isAr ? 'عدد المتاجر' : 'Total Shops'}
                    </span>
                    <Store className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="text-2xl font-bold text-cyan-200">
                    {stats.totalShops == null ? (isAr ? 'غير متاح' : 'N/A') : stats.totalShops}
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-500/30 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {isAr ? 'المتصلون الآن (آخر 15 دقيقة)' : 'Online Now (15m)'}
                    </span>
                    <Clock className="h-4 w-4 text-emerald-300" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-300">{stats.onlineUsers}</div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {isAr ? 'نشطون خلال 15 دقيقة' : 'Active last 15 minutes'}
                    </span>
                    <Activity className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="text-2xl font-bold text-cyan-200">{stats.active15m ?? stats.onlineUsers}</div>
                </div>

                <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {isAr ? 'نشطون خلال 60 دقيقة' : 'Active last 60 minutes'}
                    </span>
                    <Activity className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="text-2xl font-bold text-cyan-200">{stats.active60m ?? 0}</div>
                </div>
              </section>

              <section className="mt-8 rounded-2xl border border-cyan-500/30 bg-white/5 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <HardDrive className="h-5 w-5 text-cyan-300" />
                  <h2 className="text-lg font-bold text-cyan-200">
                    {isAr ? 'النسخ الاحتياطي' : 'Backup & Restore'}
                  </h2>
                </div>
                {backupMessage && (
                  <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${backupMessage.includes('Error') || backupMessage.includes('فشل') ? 'border border-red-500/30 bg-red-500/10 text-red-200' : 'border border-green-500/30 bg-green-500/10 text-green-200'}`}>
                    {backupMessage}
                  </div>
                )}
                <div className="flex flex-wrap gap-4 items-center">
                  {shops.length > 0 && (
                    <select
                      value={selectedShopId}
                      onChange={(e) => setSelectedShopId(e.target.value ? Number(e.target.value) : '')}
                      className="bg-[#0f172a] border border-cyan-500/30 rounded-lg px-3 py-2 text-sm"
                    >
                      {shops.map((s) => (
                        <option key={s.id} value={s.id}>
                          #{s.id} {s.business_name || s.name || ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={async () => {
                      const sid = selectedShopId || (shops[0]?.id);
                      if (!sid) {
                        setBackupMessage(isAr ? 'اختر متجراً أولاً' : 'Select a shop first');
                        return;
                      }
                      setBackupDownloading(true);
                      setBackupMessage(null);
                      try {
                        const res = await apiFetch(`/admin/backup/download?shopId=${sid}`);
                        if (!res.ok) {
                          const txt = await res.text();
                          let errMsg = 'Download failed';
                          try {
                            const j = JSON.parse(txt);
                            if (j.error) errMsg = j.error;
                          } catch (_) {}
                          throw new Error(errMsg);
                        }
                        const blob = await res.blob();
                        const cd = res.headers.get('Content-Disposition') || '';
                        const fnMatch = cd.match(/filename="?([^";\n]+)"?/);
                        const fn = fnMatch ? fnMatch[1] : `backup-shop-${sid}.xlsx`;
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fn;
                        a.click();
                        URL.revokeObjectURL(url);
                        setBackupMessage(isAr ? 'تم تحميل النسخة الاحتياطية (Excel)' : 'Backup downloaded (Excel)');
                        setTimeout(() => setBackupMessage(null), 4000);
                      } catch (e: any) {
                        setBackupMessage((e?.message || 'Error') + (isAr ? ' - فشل التحميل' : ' - Download failed'));
                      } finally {
                        setBackupDownloading(false);
                      }
                    }}
                    disabled={backupDownloading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold disabled:opacity-60"
                  >
                    {backupDownloading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {isAr ? 'تحميل نسخة احتياطية (Excel)' : 'Download backup (Excel)'}
                  </button>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".sql"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        setRestoreFile(f || null);
                        setBackupMessage(null);
                      }}
                      className="text-sm text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-cyan-600 file:text-white"
                    />
                    <button
                      onClick={async () => {
                        if (!restoreFile) {
                          setBackupMessage(isAr ? 'اختر ملف .sql أولاً' : 'Select a .sql file first');
                          return;
                        }
                        setBackupRestoring(true);
                        setBackupMessage(null);
                        try {
                          const fd = new FormData();
                          fd.append('file', restoreFile);
                          const res = await apiFetch('/admin/backup/restore', {
                            method: 'POST',
                            body: fd,
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            throw new Error(data?.error || 'Restore failed');
                          }
                          setBackupMessage(isAr ? 'تم استرجاع النسخة بنجاح' : 'Restore completed successfully');
                          setRestoreFile(null);
                          setTimeout(() => setBackupMessage(null), 5000);
                        } catch (e: any) {
                          setBackupMessage((e?.message || 'Error') + (isAr ? ' - فشل الاسترجاع' : ' - Restore failed'));
                        } finally {
                          setBackupRestoring(false);
                        }
                      }}
                      disabled={backupRestoring || !restoreFile}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/50 text-cyan-300 font-semibold disabled:opacity-60"
                    >
                      {backupRestoring ? (
                        <span className="inline-block w-4 h-4 border-2 border-cyan-300/30 border-t-cyan-300 rounded-full animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {isAr ? 'استرجاع نسخة' : 'Restore backup'}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {isAr
                    ? 'النسخة الاحتياطية: Excel لكل متجر. التلقائية: يومياً إلى Google Cloud. قبل الاسترجاع يُنشأ pre-restore-backup.sql.'
                    : 'Backup: Excel per shop. Auto: daily to Google Cloud. Before restore, pre-restore-backup.sql is created.'}
                </p>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

