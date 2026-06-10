'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import {
  Search,
  Users,
  RefreshCw,
  Clock,
  Copy,
  Shield,
  RotateCcw,
  Eye,
  LogIn,
  MoreHorizontal,
  Trash2,
  Loader2,
} from 'lucide-react';

interface SystemUser {
  id: number;
  username: string;
  email: string | null;
  phone?: string | null;
  role: string;
  package?: string | null;
  shop: {
    id: number;
    name: string | null;
    slug: string | null;
    package?: string | null;
    branchCount?: number;
    subscription_status?: string | null;
    plan?: string | null;
    activated_at?: string | null;
    expires_at?: string | null;
    remaining_seconds?: number | null;
    remaining_days?: number | null;
    is_trial?: boolean;
  } | null;
  branch: { id: number; name: string | null } | null;
  last_seen_at: string | null;
  last_login_at?: string | null;
  created_at: string;
  is_active: number | boolean | null;
  /** API may send boolean or numeric 0/1 from MySQL JSON */
  disabled?: boolean | number | string;
  storeCount?: number | null;
  branchCount?: number | null;
  subscription_status?: string | null;
  plan?: string | null;
  activated_at?: string | null;
  expires_at?: string | null;
  remaining_seconds?: number | null;
  remaining_days?: number | null;
  is_trial?: boolean;
}

interface SystemUsersResponse {
  ok: boolean;
  items: SystemUser[];
  nextOffset: number | null;
}

function userIsAccountDisabled(u: SystemUser): boolean {
  const d = u.disabled;
  if (d === true || d === 1) return true;
  if (typeof d === 'string' && d.trim() === '1') return true;
  if (typeof d === 'string' && d.trim().toLowerCase() === 'true') return true;
  if (typeof d === 'string' && d.trim().toLowerCase() === 'disabled') return true;
  return false;
}

function ActionsDropdown({
  u,
  isSuperAdmin,
  isAr,
  active,
  impersonateLoading,
  onResetSub,
  onViewStatus,
  onImpersonate,
  onResetPassword,
  onToggleStatus,
  statusUpdatingId,
  onDelete,
}: {
  u: SystemUser;
  isSuperAdmin: boolean;
  isAr: boolean;
  active: boolean;
  impersonateLoading: number | null;
  onResetSub: () => void;
  onViewStatus: () => void;
  onImpersonate: () => void;
  onResetPassword: () => void;
  onToggleStatus: () => void;
  statusUpdatingId: number | null;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [open]);

  const close = () => setOpen(false);

  const menuContent = open && typeof document !== 'undefined' && btnRef.current && createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={close} aria-hidden="true" />
      <div
        className="fixed z-[9999] min-w-[180px] rounded-lg border border-cyan-500/30 bg-[#0b1220] py-1 shadow-xl"
        style={(() => {
          const rect = btnRef.current!.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const menuH = 220;
          const menuW = 180;
          const sideOffset = 8;
          let top = rect.bottom + sideOffset;
          let left = rect.right - menuW;
          if (isAr) left = rect.left;
          if (top + menuH > vh - 10) top = rect.top - menuH - sideOffset;
          if (left < 10) left = 10;
          if (left + menuW > vw - 10) left = vw - menuW - 10;
          return { top, left };
        })()}
      >
        {isSuperAdmin && u.role !== 'super_admin' && u.shop && (
          <>
            <button onClick={() => { onResetSub(); close(); }} className="w-full px-3 py-2 text-left text-xs text-amber-300 hover:bg-amber-500/10 flex items-center gap-2 whitespace-nowrap">
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />{isAr ? 'إعادة تعيين الاشتراك' : 'Reset subscription'}
            </button>
            <button onClick={() => { onViewStatus(); close(); }} className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-cyan-500/10 flex items-center gap-2 whitespace-nowrap">
              <Eye className="h-3.5 w-3.5 shrink-0" />{isAr ? 'عرض حالة الاشتراك' : 'View subscription'}
            </button>
            <button onClick={() => { onImpersonate(); close(); }} disabled={impersonateLoading === u.id} className="w-full px-3 py-2 text-left text-xs text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-2 disabled:opacity-60 whitespace-nowrap min-w-[180px]">
              <LogIn className="h-3.5 w-3.5 shrink-0" />{impersonateLoading === u.id ? (isAr ? 'جاري...' : 'Loading...') : isAr ? 'تسجيل الدخول كمستخدم' : 'Login as user'}
            </button>
          </>
        )}
        <button onClick={() => { onResetPassword(); close(); }} className="w-full px-3 py-2 text-left text-xs text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-2 whitespace-nowrap">
          <Shield className="h-3.5 w-3.5 shrink-0" />{isAr ? 'إعادة تعيين كلمة المرور' : 'Reset password'}
        </button>
        <button onClick={() => { onToggleStatus(); close(); }} disabled={statusUpdatingId === u.id} className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 disabled:opacity-60 whitespace-nowrap ${active ? 'text-red-300 hover:bg-red-500/10' : 'text-emerald-300 hover:bg-emerald-500/10'}`}>
          <Users className="h-3.5 w-3.5 shrink-0" />{statusUpdatingId === u.id ? (isAr ? 'جاري...' : 'Updating...') : active ? (isAr ? 'تعطيل الحساب' : 'Disable account') : (isAr ? 'تفعيل الحساب' : 'Enable account')}
        </button>
        {isSuperAdmin && u.role !== 'super_admin' && (
          <button onClick={() => { onDelete(); close(); }} className="w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/10 flex items-center gap-2 whitespace-nowrap">
            <Trash2 className="h-3.5 w-3.5 shrink-0" />{isAr ? 'حذف الحساب' : 'Delete account'}
          </button>
        )}
      </div>
    </>,
    document.body
  );

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg border border-cyan-500/30 text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-200"
        title={isAr ? 'إجراءات' : 'Actions'}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menuContent}
    </div>
  );
}

export default function SystemUsersPage() {
  const router = useRouter();
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole, impersonate } = useAuth();
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
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [resetSubModal, setResetSubModal] = useState<SystemUser | null>(null);
  const [resetSubLoading, setResetSubLoading] = useState(false);
  const [statusModal, setStatusModal] = useState<{ user: SystemUser; data: any } | null>(null);
  const [impersonateLoading, setImpersonateLoading] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<SystemUser | null>(null);
  const [deletePreview, setDeletePreview] = useState<{ summary: Record<string, number>; hasData: boolean; message?: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { allowed } = useRouteGuard(user, authLoading, {
    feature: 'admin',
    effectiveRole,
    showDenied: true,
  });
  const isSuperAdmin = user?.role === 'super_admin';

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

        const res: any = await apiRequest(`/system/users?${params.toString()}`);
        if (res?.ok === false) {
          setError(language === 'ar' ? 'فشل تحميل المستخدمين' : 'Failed to load users');
          setItems([]);
          setNextOffset(null);
          return;
        }
        const list = Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.users)
          ? res.users
          : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        setItems((prev) => (append ? [...prev, ...list] : list));
        const nextOffsetRaw = res?.nextOffset ?? res?.next_offset ?? null;
        const nextOffsetValue =
          typeof nextOffsetRaw === 'number'
            ? nextOffsetRaw
            : nextOffsetRaw != null
            ? Number(nextOffsetRaw)
            : null;
        setNextOffset(Number.isFinite(nextOffsetValue as number) ? (nextOffsetValue as number) : null);
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

  const handleToggleStatus = async (target: SystemUser) => {
    if (!target) return;
    const currentlyDisabled = userIsAccountDisabled(target) || !resolveActive(target.is_active);
    const wantDisable = !currentlyDisabled;
    setStatusUpdatingId(target.id);
    setError(null);
    try {
      const res: { ok?: boolean; is_active?: number | boolean; disabled?: boolean } = await apiRequest(
        `/system/users/${target.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ disabled: wantDisable }),
        }
      );
      if (!res?.ok) {
        throw new Error(language === 'ar' ? 'تعذر تحديث الحالة' : 'Failed to update status');
      }
      await load(0, false);
      toast.success(
        language === 'ar'
          ? wantDisable
            ? 'تم التعطيل'
            : 'تم التفعيل'
          : wantDisable
          ? 'User disabled'
          : 'User enabled'
      );
    } catch (err: any) {
      const msg = err?.message || (language === 'ar' ? 'تعذر تحديث الحالة' : 'Failed to update status');
      setError(msg);
      toast.error(msg);
    } finally {
      setStatusUpdatingId(null);
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

  const handleResetSubscription = async (target: SystemUser) => {
    if (!target) return;
    setResetSubLoading(true);
    setError(null);
    try {
      const res: { ok?: boolean } = await apiRequest('/admin/subscription/reset', {
        method: 'POST',
        body: JSON.stringify({ userId: target.id, shopId: target.shop?.id, reason: 'testing restart' }),
      });
      if (res?.ok) {
        setResetSubModal(null);
        void load(0, false);
        toast.success(language === 'ar' ? 'تم إعادة تعيين الاشتراك' : 'Subscription reset');
      } else {
        throw new Error(language === 'ar' ? 'فشل إعادة التعيين' : 'Reset failed');
      }
    } catch (err: any) {
      setError(err?.message || (language === 'ar' ? 'فشل إعادة تعيين الاشتراك' : 'Failed to reset subscription'));
      toast.error(err?.message);
    } finally {
      setResetSubLoading(false);
    }
  };

  const handleViewStatus = async (target: SystemUser) => {
    if (!target) return;
    try {
      const res: any = await apiRequest(
        `/admin/subscription/status?userId=${target.id}${target.shop?.id ? `&shopId=${target.shop.id}` : ''}`
      );
      setStatusModal({ user: target, data: res });
    } catch (err: any) {
      setError(err?.message);
      toast.error(err?.message);
    }
  };

  const handleDeletePreview = useCallback(async (target: SystemUser) => {
    try {
      const res: any = await apiRequest(`/admin/users/${target.id}/delete-preview`);
      if (res?.ok) {
        setDeletePreview({
          summary: res.summary || {},
          hasData: res.hasData || false,
          message: res.message,
        });
      } else {
        setDeletePreview({ summary: {}, hasData: false });
      }
    } catch {
      setDeletePreview({ summary: {}, hasData: false });
    }
  }, []);

  useEffect(() => {
    if (deleteModal) {
      setDeletePreview(null);
      setDeleteConfirm('');
      void handleDeletePreview(deleteModal);
    } else {
      setDeletePreview(null);
      setDeleteConfirm('');
    }
  }, [deleteModal, handleDeletePreview]);

  const handleDeleteUser = async () => {
    if (!deleteModal || deleteConfirm.trim().toUpperCase() !== 'DELETE') return;
    setDeleteLoading(true);
    setError(null);
    try {
      const res: any = await apiRequest(`/admin/users/${deleteModal.id}?force=true`, { method: 'DELETE' });
      if (res?.ok) {
        toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
        setDeleteModal(null);
        setDeleteConfirm('');
        setDeletePreview(null);
        void load(0, false);
      } else {
        throw new Error(res?.error || (language === 'ar' ? 'فشل الحذف' : 'Delete failed'));
      }
    } catch (err: any) {
      setError(err?.message);
      toast.error(err?.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleImpersonate = async (target: SystemUser) => {
    if (!target || target.role === 'super_admin') return;
    setImpersonateLoading(target.id);
    setError(null);
    try {
      const res: { ok?: boolean; token?: string; user?: any } = await apiRequest('/admin/impersonate', {
        method: 'POST',
        body: JSON.stringify({ userId: target.id }),
      });
      if (res?.ok && res.token && res.user) {
        impersonate(res.token, {
          id: res.user.id,
          username: res.user.username,
          role: res.user.role,
          package: res.user.package || 'bronze',
          shopId: res.user.shopId,
        });
        router.push('/dashboard');
      } else {
        throw new Error((res as any)?.error || (language === 'ar' ? 'فشل التشغيل' : 'Impersonation failed'));
      }
    } catch (err: any) {
      setError(err?.message);
      toast.error(err?.message);
    } finally {
      setImpersonateLoading(null);
    }
  };

  if (authLoading || !allowed) return null;

  const dir = direction;
  const isAr = language === 'ar';

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return isAr ? 'غير متصل' : 'Offline';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(isAr ? 'ar-EG' : 'en-US');
  };

  const formatDateOrDash = (value: string | null | undefined) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US');
  };

  const isOnline = (value: string | null) => {
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;
    const diffMs = Date.now() - d.getTime();
    return diffMs >= 0 && diffMs <= 15 * 60 * 1000;
  };

  const resolveActive = (value: SystemUser['is_active']) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'boolean') return value;
    return Number(value) !== 0;
  };

  return (
    <div className="min-h-screen flex" dir={dir}>
      <Sidebar />
      <main
        className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#020617]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="max-w-7xl mx-auto">
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
              <Search
                className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 ${isAr ? 'right-3' : 'left-3'}`}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isAr ? 'بحث في الاسم أو البريد أو اسم المتجر...' : 'Search username, email, or shop...'
                }
                className={`w-full h-11 rounded-xl border border-cyan-500/25 bg-black/30 text-slate-100 placeholder:text-slate-500 text-sm ${
                  isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'
                }`}
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
              {/* Desktop: compact grouped columns (no ultra-wide horizontal strip) */}
              <div className="hidden md:block rounded-2xl border border-cyan-500/20 bg-white/5 min-w-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="text-cyan-400 border-b border-cyan-500/20 bg-black/25">
                      <tr>
                        <th className="py-3 px-4 text-start align-bottom font-semibold w-[24%]">{isAr ? 'المستخدم' : 'User'}</th>
                        <th className="py-3 px-4 text-start align-bottom font-semibold w-[22%]">{isAr ? 'الاشتراك' : 'Subscription'}</th>
                        <th className="py-3 px-4 text-start align-bottom font-semibold w-[18%]">{isAr ? 'المتجر' : 'Store'}</th>
                        <th className="py-3 px-4 text-start align-bottom font-semibold w-[18%]">{isAr ? 'النشاط' : 'Activity'}</th>
                        <th className="py-3 px-4 text-start align-bottom font-semibold w-[8%]">{isAr ? 'الحالة' : 'Status'}</th>
                        <th className="py-3 px-4 text-start align-bottom font-semibold w-[10%]">{isAr ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((u) => {
                        const accountDisabled = userIsAccountDisabled(u);
                        const active = accountDisabled ? false : resolveActive(u.is_active);
                        const planRaw = u.plan ?? u.shop?.plan ?? u.package ?? u.shop?.package ?? 'none';
                        const isTrial = u.is_trial ?? u.shop?.is_trial ?? false;
                        const planLabel = planRaw === 'none' ? '-' : isTrial ? `${planRaw} (${isAr ? 'تجريبي' : 'Trial'})` : planRaw;
                        const subStatus = u.subscription_status ?? u.shop?.subscription_status ?? 'inactive';
                        const remainingDays = u.remaining_days ?? u.shop?.remaining_days ?? null;
                        const remainingSec = u.remaining_seconds ?? u.shop?.remaining_seconds ?? null;
                        const statusLabel =
                          subStatus === 'active'
                            ? isAr
                              ? 'نشط'
                              : 'Active'
                            : subStatus === 'expired'
                            ? isAr
                              ? 'منتهي'
                              : 'Expired'
                            : subStatus === 'inactive'
                            ? isAr
                              ? 'غير مفعل'
                              : 'Inactive'
                            : '-';
                        const remainingLabel =
                          remainingDays != null
                            ? remainingDays > 0
                              ? `${remainingDays} ${isAr ? 'يوم' : 'days'}`
                              : isAr
                              ? 'انتهى'
                              : 'Expired'
                            : remainingSec != null && remainingSec > 0
                            ? remainingSec >= 86400
                              ? `${Math.ceil(remainingSec / 86400)} ${isAr ? 'يوم' : 'days'}`
                              : remainingSec >= 3600
                              ? `${Math.ceil(remainingSec / 3600)} ${isAr ? 'ساعة' : 'h'}`
                              : `${Math.ceil(remainingSec / 60)} ${isAr ? 'دقيقة' : 'min'}`
                            : subStatus === 'expired' || (remainingSec != null && remainingSec <= 0)
                            ? isAr
                              ? 'انتهى'
                              : 'Expired'
                            : subStatus === 'active' && remainingDays == null && (remainingSec == null || remainingSec <= 0)
                            ? isAr
                              ? 'مدى الحياة'
                              : 'Lifetime'
                            : '-';
                        const expiresDisplay =
                          u.expires_at ?? u.shop?.expires_at
                            ? formatDateOrDash(u.expires_at ?? u.shop?.expires_at)
                            : subStatus === 'active'
                            ? isAr
                              ? 'مدى الحياة'
                              : 'Lifetime'
                            : '-';
                        return (
                          <tr
                            key={u.id}
                            className={`border-b border-cyan-500/10 align-top hover:bg-white/[0.02] ${
                              statusUpdatingId === u.id ? 'opacity-75 pointer-events-none' : ''
                            }`}
                          >
                            <td className="py-3 px-4 align-top">
                              <div className="flex flex-col gap-1.5">
                                <span className="font-semibold text-slate-100 break-words" title={u.username}>
                                  {u.username}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                                  {isAr ? 'رقم المستخدم:' : 'User ID:'} {u.id}
                                </span>
                                {u.email && (
                                  <span className="text-xs text-slate-400 break-all" title={u.email}>
                                    {u.email}
                                  </span>
                                )}
                                {u.phone && (
                                  <span className="text-xs text-slate-500" title={u.phone}>
                                    {u.phone}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 pt-0.5">
                                  {u.role === 'super_admin' && <Shield className="h-3.5 w-3.5 text-fuchsia-300 shrink-0" />}
                                  <span>
                                    {isAr ? 'الدور:' : 'Role:'} <span className="text-slate-100">{u.role}</span>
                                  </span>
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 align-top">
                              <div className="flex flex-col gap-1.5 text-xs">
                                <div>
                                  <span className="text-slate-500 block mb-0.5">{isAr ? 'الخطة' : 'Plan'}</span>
                                  <span className="text-slate-100">{planLabel}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block mb-0.5">{isAr ? 'حالة الاشتراك' : 'Subscription'}</span>
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                                      subStatus === 'active'
                                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                                        : subStatus === 'expired'
                                        ? 'bg-red-500/15 text-red-300 border border-red-500/40'
                                        : subStatus === 'inactive'
                                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                                        : 'bg-slate-500/15 text-slate-400 border border-slate-500/40'
                                    }`}
                                  >
                                    {statusLabel}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500">{isAr ? 'التفعيل:' : 'Activated:'}</span>{' '}
                                  <span className="text-slate-200 tabular-nums">{formatDateOrDash(u.activated_at ?? u.shop?.activated_at)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">{isAr ? 'الانتهاء:' : 'Expires:'}</span>{' '}
                                  <span className="text-slate-200 tabular-nums">{expiresDisplay}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">{isAr ? 'المتبقي:' : 'Remaining:'}</span>{' '}
                                  <span className="text-slate-200">{remainingLabel}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 align-top">
                              <div className="flex flex-col gap-1 text-xs text-slate-300">
                                {u.shop ? (
                                  <>
                                    <span className="text-slate-100 font-medium break-words" title={u.shop.name || `Shop #${u.shop.id}`}>
                                      {u.shop.name || `Shop #${u.shop.id}`}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-mono">ID: {u.shop.id}</span>
                                    {typeof u.shop.branchCount === 'number' && (
                                      <span className="text-slate-400">
                                        {u.shop.branchCount} {isAr ? 'فرع' : 'branches'}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-500">{isAr ? 'بدون متجر' : 'No shop'}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 align-top">
                              <div className="flex flex-col gap-1.5 text-xs text-slate-400">
                                <div>
                                  <span className="text-slate-500 block mb-0.5">{isAr ? 'تاريخ الإنشاء' : 'Created'}</span>
                                  <span className="text-slate-300 tabular-nums" title={formatDateTime(u.created_at)}>
                                    {formatDateTime(u.created_at)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block mb-0.5">{isAr ? 'آخر ظهور' : 'Last seen'}</span>
                                  <span className="text-slate-300 tabular-nums">{formatDateTime(u.last_seen_at)}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block mb-0.5">{isAr ? 'آخر تسجيل دخول' : 'Last login'}</span>
                                  <span className="text-slate-300 tabular-nums">{formatDateTime(u.last_login_at ?? u.last_seen_at)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 align-top">
                              {statusUpdatingId === u.id ? (
                                <span className="inline-flex items-center gap-2 text-[11px] text-slate-400">
                                  <Loader2 className="h-4 w-4 animate-spin shrink-0 text-cyan-400" aria-hidden />
                                  {isAr ? 'جاري الحفظ...' : 'Saving...'}
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${
                                    active
                                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-red-500/15 text-red-300 border border-red-500/40'
                                  }`}
                                >
                                  <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                  {active ? (isAr ? 'نشط' : 'Active') : isAr ? 'معطل' : 'Disabled'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 align-top">
                              <ActionsDropdown
                                u={u}
                                isSuperAdmin={!!isSuperAdmin}
                                isAr={isAr}
                                active={active}
                                impersonateLoading={impersonateLoading}
                                onResetSub={() => setResetSubModal(u)}
                                onViewStatus={() => void handleViewStatus(u)}
                                onImpersonate={() => void handleImpersonate(u)}
                                onResetPassword={() => {
                                  setResetModal(u);
                                  setResetPassword('');
                                  setGeneratedPassword(null);
                                }}
                                onToggleStatus={() => void handleToggleStatus(u)}
                                statusUpdatingId={statusUpdatingId}
                                onDelete={() => setDeleteModal(u)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {items.map((u) => {
                  const online = isOnline(u.last_seen_at);
                  const accountDisabled = userIsAccountDisabled(u);
                  const active = accountDisabled ? false : resolveActive(u.is_active);
                  const planRaw = u.plan ?? u.shop?.plan ?? u.package ?? u.shop?.package ?? 'none';
                  const isTrial = u.is_trial ?? u.shop?.is_trial ?? false;
                  const planLabel = planRaw === 'none' ? '-' : isTrial ? `${planRaw} (${isAr ? 'تجريبي' : 'Trial'})` : planRaw;
                  const subStatus = u.subscription_status ?? u.shop?.subscription_status ?? 'inactive';
                  const remainingDays = u.remaining_days ?? u.shop?.remaining_days ?? null;
                  const remainingSec = u.remaining_seconds ?? u.shop?.remaining_seconds ?? null;
                  const statusLabel =
                    subStatus === 'active'
                      ? isAr
                        ? 'نشط'
                        : 'Active'
                      : subStatus === 'expired'
                      ? isAr
                        ? 'منتهي'
                        : 'Expired'
                      : subStatus === 'inactive'
                      ? isAr
                        ? 'غير مفعل'
                        : 'Inactive'
                      : '-';
                  const remainingLabel =
                    remainingDays != null
                      ? remainingDays > 0
                        ? `${remainingDays} ${isAr ? 'يوم' : 'days'}`
                        : isAr
                        ? 'انتهى'
                        : 'Expired'
                      : remainingSec != null && remainingSec > 0
                      ? remainingSec >= 86400
                        ? `${Math.ceil(remainingSec / 86400)} ${isAr ? 'يوم' : 'days'}`
                        : remainingSec >= 3600
                        ? `${Math.ceil(remainingSec / 3600)} ${isAr ? 'ساعة' : 'h'}`
                        : `${Math.ceil(remainingSec / 60)} ${isAr ? 'دقيقة' : 'min'}`
                      : subStatus === 'expired' || (remainingSec != null && remainingSec <= 0)
                      ? isAr
                        ? 'انتهى'
                        : 'Expired'
                      : subStatus === 'active' && !remainingSec
                      ? isAr
                        ? 'مدى الحياة'
                        : 'Lifetime'
                      : '-';
                  return (
                    <div
                      key={u.id}
                      className={`rounded-2xl border border-cyan-500/20 bg-white/5 p-4 ${
                        statusUpdatingId === u.id ? 'opacity-75 pointer-events-none' : ''
                      }`}
                      dir={isAr ? 'rtl' : 'ltr'}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-100 break-words">{u.username}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {isAr ? 'رقم المستخدم:' : 'User ID:'} {u.id}
                          </div>
                          {u.email && (
                            <div className="text-xs text-slate-400 break-words">{u.email}</div>
                          )}
                          {u.phone && (
                            <div className="text-xs text-slate-500 break-words">{u.phone}</div>
                          )}
                          <div className="mt-1 text-xs text-slate-300 flex flex-wrap items-center gap-1">
                            <span>{u.role}</span>
                            {u.role === 'super_admin' && (
                              <Shield className="h-3 w-3 text-fuchsia-300 inline-block ml-1" />
                            )}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {isAr ? 'الخطة: ' : 'Plan: '}
                            <span className="text-slate-200">{planLabel}</span>
                            {' · '}
                            {isAr ? 'الحالة: ' : 'Status: '}
                            <span
                              className={
                                subStatus === 'active'
                                  ? 'text-emerald-400'
                                  : subStatus === 'expired'
                                  ? 'text-red-400'
                                  : 'text-slate-300'
                              }
                            >
                              {statusLabel}
                            </span>
                            {' · '}
                            {remainingLabel}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {statusUpdatingId === u.id ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" aria-hidden />
                              {isAr ? 'جاري الحفظ...' : 'Saving...'}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
                                active
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-red-500/15 text-red-300 border border-red-500/40'
                              }`}
                            >
                              <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                  active ? 'bg-emerald-400' : 'bg-red-400'
                                }`}
                              />
                              {active ? (isAr ? 'نشط' : 'Active') : isAr ? 'معطل' : 'Disabled'}
                            </span>
                          )}
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{online ? (isAr ? 'متصل الآن' : 'Online now') : formatDateTime(u.last_seen_at)}</span>
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
                            {typeof u.shop.branchCount === 'number' && (
                              <div>
                                {isAr ? 'عدد الفروع: ' : 'Branches: '}
                                {u.shop.branchCount}
                              </div>
                            )}
                          </>
                        ) : (
                          <div>{isAr ? 'بدون متجر' : 'No shop'}</div>
                        )}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500 space-y-1">
                        <div>
                          {isAr ? 'تم الإنشاء: ' : 'Created: '}
                          {formatDateTime(u.created_at)}
                        </div>
                        <div>
                          {isAr ? 'آخر تسجيل: ' : 'Last login: '}
                          {formatDateTime(u.last_login_at ?? u.last_seen_at)}
                        </div>
                        <div>
                          {isAr ? 'آخر ظهور: ' : 'Last seen: '}
                          {formatDateTime(u.last_seen_at)}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                        {isSuperAdmin && u.role !== 'super_admin' && u.shop && (
                          <>
                            <button
                              onClick={() => setResetSubModal(u)}
                              className="text-xs text-amber-300 hover:text-amber-200"
                            >
                              {isAr ? 'إعادة الاشتراك' : 'Reset sub'}
                            </button>
                            <button
                              onClick={() => void handleViewStatus(u)}
                              className="text-xs text-slate-300 hover:text-slate-200"
                            >
                              {isAr ? 'عرض الحالة' : 'View status'}
                            </button>
                            <button
                              onClick={() => void handleImpersonate(u)}
                              disabled={impersonateLoading === u.id}
                              className="text-xs text-cyan-300 hover:text-cyan-200 disabled:opacity-60 whitespace-nowrap"
                            >
                              {isAr ? 'تسجيل الدخول كمستخدم' : 'Login as user'}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => { setResetModal(u); setResetPassword(''); setGeneratedPassword(null); }}
                          className="text-xs text-cyan-300 hover:text-cyan-200"
                        >
                          {isAr ? 'إعادة كلمة المرور' : 'Reset password'}
                        </button>
                        {isSuperAdmin && u.role !== 'super_admin' && (
                          <button onClick={() => setDeleteModal(u)} className="text-xs text-red-300 hover:text-red-200">
                            {isAr ? 'حذف الحساب' : 'Delete'}
                          </button>
                        )}
                        <button
                          onClick={() => void handleToggleStatus(u)}
                          disabled={statusUpdatingId === u.id}
                          className={`text-xs ${
                            active ? 'text-red-300 hover:text-red-200' : 'text-emerald-300 hover:text-emerald-200'
                          } disabled:opacity-60`}
                        >
                          {statusUpdatingId === u.id
                            ? isAr
                              ? 'جاري التحديث...'
                              : 'Updating...'
                            : active
                            ? isAr
                              ? 'تعطيل الحساب'
                              : 'Disable account'
                            : isAr
                            ? 'تفعيل الحساب'
                            : 'Enable account'}
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

      {resetSubModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => !resetSubLoading && setResetSubModal(null)}
        >
          <div
            className="neon-card rounded-xl p-6 max-w-md w-full mx-4 bg-[#020617] border border-amber-500/40"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-amber-200 mb-3 flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              {isAr ? 'إعادة تعيين الاشتراك' : 'Reset subscription'} — {resetSubModal.username}
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              {isAr
                ? 'سيؤدي هذا إلى تعطيل الباقة وتعيين المستخدم على غير مفعل. سيُطلب من العميل التفعيل من الإعدادات. متابعة؟'
                : 'This will disable the plan and set the user to inactive. The customer will be required to activate from settings. Continue?'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleResetSubscription(resetSubModal)}
                disabled={resetSubLoading}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold disabled:opacity-50"
              >
                {resetSubLoading ? (isAr ? 'جاري...' : 'Processing...') : isAr ? 'تأكيد' : 'Confirm'}
              </button>
              <button
                onClick={() => !resetSubLoading && setResetSubModal(null)}
                className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {statusModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setStatusModal(null)}
        >
          <div
            className="neon-card rounded-xl p-6 max-w-md w-full mx-4 bg-[#020617] border border-cyan-500/40"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-cyan-200 mb-3 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {isAr ? 'حالة الاشتراك' : 'Subscription status'} — {statusModal.user.username}
            </h3>
            <div className="text-sm text-slate-300 space-y-2">
              <div>
                <span className="text-slate-500">{isAr ? 'الخطة:' : 'Plan:'}</span>{' '}
                {statusModal.data?.plan ?? '-'}
                {statusModal.data?.is_trial && ` (${isAr ? 'تجريبي' : 'Trial'})`}
              </div>
              <div>
                <span className="text-slate-500">{isAr ? 'الحالة:' : 'Status:'}</span>{' '}
                {statusModal.data?.status ?? '-'}
              </div>
              <div>
                <span className="text-slate-500">{isAr ? 'تاريخ التفعيل:' : 'Activated:'}</span>{' '}
                {statusModal.data?.activated_at
                  ? new Date(statusModal.data.activated_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')
                  : '-'}
              </div>
              <div>
                <span className="text-slate-500">{isAr ? 'ينتهي في:' : 'Expires:'}</span>{' '}
                {statusModal.data?.expires_at
                  ? new Date(statusModal.data.expires_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')
                  : isAr ? 'مدى الحياة' : 'Lifetime'}
              </div>
              <div>
                <span className="text-slate-500">{isAr ? 'المتبقي:' : 'Remaining:'}</span>{' '}
                {statusModal.data?.remaining_days != null
                  ? `${statusModal.data.remaining_days} ${isAr ? 'يوم' : 'days'}`
                  : statusModal.data?.remaining_seconds != null
                  ? `${Math.ceil((statusModal.data.remaining_seconds || 0) / 86400)} ${isAr ? 'يوم' : 'days'}`
                  : statusModal.data?.status === 'active' && !statusModal.data?.expires_at
                  ? (isAr ? 'مدى الحياة' : 'Lifetime')
                  : '-'}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setStatusModal(null)}
                className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => !deleteLoading && setDeleteModal(null)}
        >
          <div
            className="neon-card rounded-xl p-6 max-w-md w-full mx-4 bg-[#020617] border border-red-500/40"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-red-200 mb-3 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {isAr ? 'حذف الحساب' : 'Delete account'} — {deleteModal.username}
            </h3>
            <p className="text-sm text-slate-300 mb-2">
              {deleteModal.email && <span className="block truncate">{deleteModal.email}</span>}
              {deleteModal.phone && <span className="block truncate text-slate-400">{deleteModal.phone}</span>}
              {deleteModal.shop && (
                <span className="block text-slate-400 text-xs mt-1">
                  {isAr ? 'المتجر: ' : 'Shop: '}{deleteModal.shop.name || `#${deleteModal.shop.id}`}
                </span>
              )}
            </p>
            {deletePreview && (
              <>
                {deletePreview.hasData && (
                  <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                    <p className="font-semibold mb-2">{isAr ? 'تحذير: هذا الحساب يحتوي على بيانات' : 'Warning: This account has data'}</p>
                    <div className="space-y-1">
                      {Object.entries(deletePreview.summary).map(([k, v]) => (
                        <span key={k} className="mr-2">
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-400 mb-2">
                  {isAr ? 'تاريخ الإنشاء: ' : 'Created: '}{formatDateTime(deleteModal.created_at)}
                  {' · '}{isAr ? 'آخر ظهور: ' : 'Last seen: '}{formatDateTime(deleteModal.last_seen_at)}
                </p>
              </>
            )}
            <p className="text-sm text-slate-300 mb-3">
              {isAr ? 'هل أنت متأكد؟ اكتب DELETE للتأكيد' : 'Are you sure? Type DELETE to confirm'}
            </p>
            <input
              type="text"
              placeholder="DELETE"
              className="w-full bg-[#0f172a] border border-red-500/30 rounded-lg px-3 py-2 text-sm mb-3 font-mono"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-xs">
                {error}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteUser}
                disabled={deleteLoading || deleteConfirm.trim().toUpperCase() !== 'DELETE'}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? (isAr ? 'جاري...' : 'Deleting...') : isAr ? 'حذف نهائي (Force)' : 'Delete anyway (Force)'}
              </button>
              <button
                onClick={() => !deleteLoading && setDeleteModal(null)}
                className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

