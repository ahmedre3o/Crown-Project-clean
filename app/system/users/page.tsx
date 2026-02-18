'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { Search, Users, RefreshCw, Clock, Copy, Shield } from 'lucide-react';

interface SystemUser {
  id: number;
  username: string;
  email: string | null;
  role: string;
  shop: { id: number; name: string | null; slug: string | null } | null;
  branch: { id: number; name: string | null } | null;
  last_seen_at: string | null;
  created_at: string;
  is_active: number | boolean | null;
}

interface SystemUsersResponse {
  ok: boolean;
  items: SystemUser[];
  nextOffset: number | null;
}

export default function SystemUsersPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const [items, setItems] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [nextOffset, setNextOffset] = useState<number | null>(null);

  const [resetModal, setResetModal] = useState<SystemUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const { allowed } = useRouteGuard(user, authLoading, {
    feature: 'admin',
    effectiveRole,
    showDenied: true,
  });

  const load = useCallback(
    async (offset = 0, append = false) => {
      try {
        if (offset === 0) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const params = new URLSearchParams({ limit: '20', offset: String(offset) });
        if (search.trim()) params.set('q', search.trim());

        const res: SystemUsersResponse = await apiRequest(`/system/users?${params.toString()}`);
        if (res?.ok === false) {
          setError(language === 'ar' ? 'فشل تحميل المستخدمين' : 'Failed to load users');
          setItems([]);
          setNextOffset(null);
          return;
        }
        const list = Array.isArray(res.items) ? res.items : [];
        setItems((prev) => (append ? [...prev, ...list] : list));
        setNextOffset(res.nextOffset ?? null);
      } catch (err: any) {
        setError(err?.message || (language === 'ar' ? 'فشل التحميل' : 'Failed to load'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, language]
  );

  useEffect(() => {
    if (!authLoading && allowed) {
      const t = setTimeout(() => void load(0, false), search.trim() ? 350 : 0);
      return () => clearTimeout(t);
    }
  }, [authLoading, allowed, search, load]);

  const handleResetPassword = async () => {
    if (!resetModal) return;
    setResetLoading(true);
    setError(null);
    setGeneratedPassword(null);
    try {
      const body: any = {};
      const trimmed = resetPassword.trim();
      if (trimmed) {
        if (trimmed.length < 8) {
          setError(language === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
          setResetLoading(false);
          return;
        }
        body.newPassword = trimmed;
      }

      const res: { ok: boolean; tempPassword?: string } = await apiRequest(
        `/system/users/${resetModal.id}/reset-password`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        setError(language === 'ar' ? 'فشل إعادة تعيين كلمة المرور' : 'Failed to reset password');
        return;
      }

      if (res.tempPassword) {
        setGeneratedPassword(res.tempPassword);
        setResetPassword('');
      } else {
        // Manual password: close modal after success
        setResetModal(null);
        setResetPassword('');
      }
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'فشل إعادة تعيين كلمة المرور' : 'Failed to reset password'));
    } finally {
      setResetLoading(false);
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      }
    } catch {
      // ignore
    }
  };

  if (authLoading || !allowed) return null;

  const dir = direction;
  const isAr = language === 'ar';

  const formatDateTime = (value: string | null) => {
    if (!value) return isAr ? 'غير متصل' : 'Offline';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(isAr ? 'ar-EG' : 'en-US');
  };

  const isOnline = (value: string | null) => {
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    const diffMs = Date.now() - d.getTime();
    return diffMs >= 0 && diffMs <= 15 * 60 * 1000;
  };

  return (
    <div className={`min-h-screen flex ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
      <Sidebar />
      <main
        className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#020617]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="max-w-5xl mx-auto">
          <header className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-cyan-300" />
              <h1 className="text-2xl font-bold text-cyan-200">
                {isAr ? 'مستخدمو النظام' : 'System Users'}
              </h1>
            </div>
          </header>

          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute top-1/2 -translate-y-1/2 left-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isAr ? 'بحث في الاسم أو البريد أو اسم المتجر...' : 'Search username, email, or shop...'
                }
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-cyan-500/25 bg-black/30 text-slate-100 placeholder:text-slate-500 text-sm"
              />
            </div>
            <button
              onClick={() => void load(0, false)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-500/30 text-cyan-200 text-xs md:text-sm font-semibold hover:bg-cyan-500/10 disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              {isAr ? 'تحديث' : 'Refresh'}
            </button>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
              {error}
            </div>
          )}

          {loading && items.length === 0 ? (
            <div className="text-slate-400 text-sm py-12 text-center">
              {isAr ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-10 text-slate-400 text-center text-sm">
              {isAr ? 'لا يوجد مستخدمون' : 'No users found'}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-cyan-500/20 bg-white/5">
                <table className="w-full text-sm">
                  <thead className="text-cyan-400 border-b border-cyan-500/20">
                    <tr>
                      <th className="py-2 px-3 text-left">{isAr ? 'المستخدم' : 'User'}</th>
                      <th className="py-2 px-3 text-left">{isAr ? 'الدور' : 'Role'}</th>
                      <th className="py-2 px-3 text-left">{isAr ? 'المتجر / الفرع' : 'Shop / Branch'}</th>
                      <th className="py-2 px-3 text-left">{isAr ? 'آخر ظهور' : 'Last seen'}</th>
                      <th className="py-2 px-3 text-left">{isAr ? 'الحالة' : 'Status'}</th>
                      <th className="py-2 px-3 text-left">{isAr ? 'إجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((u) => {
                      const online = isOnline(u.last_seen_at);
                      return (
                        <tr key={u.id} className="border-b border-cyan-500/10">
                          <td className="py-2 px-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-100 break-words">{u.username}</span>
                              {u.email && (
                                <span className="text-xs text-slate-400 break-words">{u.email}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-flex items-center gap-1 text-xs text-slate-200">
                              {u.role === 'super_admin' && <Shield className="h-3.5 w-3.5 text-fuchsia-300" />}
                              {u.role}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-col text-xs text-slate-300">
                              {u.shop ? (
                                <>
                                  <span>{u.shop.name || `Shop #${u.shop.id}`}</span>
                                  {u.branch && (
                                    <span className="text-slate-500">
                                      {isAr ? 'فرع: ' : 'Branch: '}
                                      {u.branch.name || `#${u.branch.id}`}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-slate-500">{isAr ? 'بدون متجر' : 'No shop'}</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-400">
                            {formatDateTime(u.last_seen_at)}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                                online
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-slate-700/40 text-slate-300 border border-slate-600/40'
                              }`}
                            >
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  online ? 'bg-emerald-400' : 'bg-slate-500'
                                }`}
                              />
                              {online ? (isAr ? 'متصل' : 'Online') : isAr ? 'غير متصل' : 'Offline'}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <button
                              onClick={() => {
                                setResetModal(u);
                                setResetPassword('');
                                setGeneratedPassword(null);
                              }}
                              className="text-xs text-cyan-300 hover:text-cyan-200"
                            >
                              {isAr ? 'إعادة تعيين كلمة المرور' : 'Reset password'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {items.map((u) => {
                  const online = isOnline(u.last_seen_at);
                  return (
                    <div
                      key={u.id}
                      className="rounded-2xl border border-cyan-500/20 bg-white/5 p-4"
                      dir={isAr ? 'rtl' : 'ltr'}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-100 break-words">{u.username}</div>
                          {u.email && (
                            <div className="text-xs text-slate-400 break-words">{u.email}</div>
                          )}
                          <div className="mt-1 text-xs text-slate-300 flex flex-wrap items-center gap-1">
                            <span>{u.role}</span>
                            {u.role === 'super_admin' && (
                              <Shield className="h-3 w-3 text-fuchsia-300 inline-block ml-1" />
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
                              online
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                                : 'bg-slate-700/40 text-slate-300 border border-slate-600/40'
                            }`}
                          >
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${
                                online ? 'bg-emerald-400' : 'bg-slate-500'
                              }`}
                            />
                            {online ? (isAr ? 'متصل' : 'Online') : isAr ? 'غير متصل' : 'Offline'}
                          </span>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDateTime(u.last_seen_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-400">
                        {u.shop ? (
                          <>
                            <div>
                              {isAr ? 'المتجر: ' : 'Shop: '}
                              {u.shop.name || `#${u.shop.id}`}
                            </div>
                            {u.branch && (
                              <div>
                                {isAr ? 'الفرع: ' : 'Branch: '}
                                {u.branch.name || `#${u.branch.id}`}
                              </div>
                            )}
                          </>
                        ) : (
                          <div>{isAr ? 'بدون متجر' : 'No shop'}</div>
                        )}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => {
                            setResetModal(u);
                            setResetPassword('');
                            setGeneratedPassword(null);
                          }}
                          className="text-xs text-cyan-300 hover:text-cyan-200"
                        >
                          {isAr ? 'إعادة تعيين كلمة المرور' : 'Reset password'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {nextOffset != null && items.length > 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={() => void load(nextOffset, true)}
                disabled={loadingMore}
                className="px-6 py-2 rounded-xl border border-cyan-500/30 text-cyan-200 text-sm font-semibold hover:bg-cyan-500/10 disabled:opacity-60"
              >
                {loadingMore
                  ? isAr
                    ? 'جاري التحميل...'
                    : 'Loading...'
                  : isAr
                  ? 'تحميل المزيد'
                  : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </main>

      {resetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => !resetLoading && setResetModal(null)}
        >
          <div
            className="neon-card rounded-xl p-6 max-w-md w-full mx-4 bg-[#020617] border border-cyan-500/40"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-cyan-200 mb-3 flex items-center gap-2">
              <Users className="h-5 w-5" />
              {isAr ? 'إعادة تعيين كلمة المرور' : 'Reset password'} — {resetModal.username}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              {isAr
                ? 'يمكنك إدخال كلمة مرور جديدة يدويًا (8 أحرف على الأقل)، أو تركها فارغة ليتم إنشاء كلمة مؤقتة تلقائيًا.'
                : 'You can enter a new password manually (min 8 chars), or leave it empty to generate a temporary password.'}
            </p>
            <input
              type="password"
              placeholder={isAr ? 'كلمة المرور الجديدة (اختياري)' : 'New password (optional)'}
              className="w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm mb-3"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
            />
            {generatedPassword && (
              <div className="mb-3 p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 text-xs flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold mb-1">
                    {isAr ? 'تم إنشاء كلمة مرور مؤقتة:' : 'Temporary password generated:'}
                  </div>
                  <div className="font-mono break-all">{generatedPassword}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedPassword)}
                  className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-400/60 text-[11px]"
                >
                  <Copy className="h-3 w-3" />
                  {isAr ? 'نسخ' : 'Copy'}
                </button>
              </div>
            )}
            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-xs">
                {error}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                {resetLoading
                  ? isAr
                    ? 'جاري التنفيذ...'
                    : 'Processing...'
                  : isAr
                  ? 'تأكيد'
                  : 'Confirm'}
              </button>
              <button
                onClick={() => {
                  if (resetLoading) return;
                  setResetModal(null);
                  setResetPassword('');
                  setGeneratedPassword(null);
                  setError(null);
                }}
                className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

