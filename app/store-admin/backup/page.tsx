'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { Download, Upload, HardDrive } from 'lucide-react';

export default function BackupPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  const { allowed } = useRouteGuard(user, authLoading, {
    feature: 'backup',
    effectiveRole,
    showDenied: true,
  });

  const isAr = language === 'ar';

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen flex" dir={direction}>
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#020617]">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <HardDrive className="h-6 w-6 text-cyan-300" />
            <h1 className="text-2xl font-bold text-cyan-200">
              {isAr ? 'النسخ الاحتياطي' : 'Backup & Restore'}
            </h1>
          </div>

          {message && (
            <div
              className={`mb-4 px-4 py-3 rounded-xl text-sm ${
                message.includes('Error') || message.includes('فشل')
                  ? 'border border-red-500/30 bg-red-500/10 text-red-200'
                  : 'border border-green-500/30 bg-green-500/10 text-green-200'
              }`}
            >
              {message}
            </div>
          )}

          <div className="rounded-2xl border border-cyan-500/30 bg-white/5 p-6 space-y-6">
            <p className="text-sm text-slate-400">
              {isAr
                ? 'تصدير أو استيراد بيانات متجرك من/إلى ملف Excel'
                : 'Export or import your store data from/to Excel file'}
            </p>

            <div className="flex flex-wrap gap-4 items-center">
              <button
                onClick={async () => {
                  setDownloading(true);
                  setMessage(null);
                  try {
                    const res = await apiFetch('/store-admin/backup/download');
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
                    const fn = fnMatch ? fnMatch[1] : 'backup-store.xlsx';
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fn;
                    a.click();
                    URL.revokeObjectURL(url);
                    setMessage(isAr ? 'تم تحميل النسخة الاحتياطية' : 'Backup downloaded');
                    setTimeout(() => setMessage(null), 4000);
                  } catch (e: any) {
                    setMessage((e?.message || 'Error') + (isAr ? ' - فشل التحميل' : ' - Download failed'));
                  } finally {
                    setDownloading(false);
                  }
                }}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-cyan-600 text-white font-semibold disabled:opacity-60"
              >
                {downloading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
                {isAr ? 'تحميل نسخة احتياطية (Excel)' : 'Download backup (Excel)'}
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setRestoreFile(f || null);
                    setMessage(null);
                  }}
                  className="text-sm text-slate-300 file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:bg-cyan-600 file:text-white file:font-semibold"
                />
                <button
                  onClick={async () => {
                    if (!restoreFile) {
                      setMessage(isAr ? 'اختر ملف Excel أولاً' : 'Select an Excel file first');
                      return;
                    }
                    setRestoring(true);
                    setMessage(null);
                    try {
                      const fd = new FormData();
                      fd.append('file', restoreFile);
                      const res = await apiFetch('/store-admin/backup/restore-excel', {
                        method: 'POST',
                        body: fd,
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        throw new Error(data?.error || 'Restore failed');
                      }
                      setMessage(isAr ? 'تم استرجاع النسخة بنجاح' : 'Restore completed successfully');
                      setRestoreFile(null);
                      setTimeout(() => setMessage(null), 5000);
                    } catch (e: any) {
                      setMessage((e?.message || 'Error') + (isAr ? ' - فشل الاسترجاع' : ' - Restore failed'));
                    } finally {
                      setRestoring(false);
                    }
                  }}
                  disabled={restoring || !restoreFile}
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border border-cyan-500/50 text-cyan-300 font-semibold disabled:opacity-60"
                >
                  {restoring ? (
                    <span className="inline-block w-4 h-4 border-2 border-cyan-300/30 border-t-cyan-300 rounded-full animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                  {isAr ? 'استرجاع نسخة' : 'Restore backup'}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              {isAr
                ? 'قبل الاسترجاع، يُنشأ نسخة احتياطية تلقائياً. استخدم فقط ملفات تم تصديرها من Crown.'
                : 'Before restore, a backup is created automatically. Use only files exported from Crown.'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
