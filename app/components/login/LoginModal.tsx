'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { NeonModal } from './NeonModal';
import { CrownNeonCrown } from './CrownNeonCrown';

type Lang = 'ar' | 'en';

export type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  language: Lang;
  setLanguage: (l: Lang) => void;
};

export function LoginModal({ open, onClose, language, setLanguage }: LoginModalProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [shopId, setShopId] = useState('');
  const [needsShopId, setNeedsShopId] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const kicked = sessionStorage.getItem('auth-kicked-reason');
    if (kicked && open) {
      setError(kicked);
      sessionStorage.removeItem('auth-kicked-reason');
    }
  }, [open]);

  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const inputClass =
    'w-full rounded-lg border border-slate-200/90 bg-white text-slate-900 px-3 py-2.5 text-sm shadow-inner focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-400/25 transition-all';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (needsShopId && !shopId.trim()) {
        setError('SHOP_ID_REQUIRED');
        return;
      }
      await login(username, password, needsShopId ? shopId : undefined);
      onClose();
      router.push('/dashboard');
    } catch (err: any) {
      if (err?.code === 'SHOP_ID_REQUIRED') {
        setNeedsShopId(true);
        setError(err?.message_ar || err?.message_en || 'SHOP_ID_REQUIRED');
        return;
      }

      const msg = err?.message || 'Login failed';
      let friendly = msg;
      if (msg === 'Invalid credentials') {
        friendly = language === 'ar' ? 'كلمة المرور أو اسم المستخدم غير صحيح.' : 'Wrong username or password.';
      } else if (msg === 'Login failed') {
        friendly = language === 'ar' ? 'كلمة المرور أو اسم المستخدم غير صحيح.' : 'Wrong username or password.';
      } else if (msg === 'ACCOUNT_DISABLED') {
        friendly = language === 'ar' ? 'تم تعطيل الحساب. تواصل مع الدعم الفني.' : 'Account disabled. Please contact support.';
      } else if (msg === 'SUPER_ADMIN_EMAIL_ONLY') {
        friendly = language === 'ar' ? 'حساب مدير النظام يجب تسجيل الدخول بالبريد الإلكتروني.' : 'Super admin must sign in using email.';
      } else if (msg === 'Server error. Please try again.') {
        friendly = language === 'ar' ? 'خطأ في الخادم. يرجى المحاولة مرة أخرى.' : msg;
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <NeonModal
      open={open}
      onClose={onClose}
      title={t('تسجيل الدخول', 'Sign in')}
      dir={dir}
      titleId="login-modal-title"
    >
      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
        <div className="flex justify-center mb-1">
          <CrownNeonCrown />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-400">{t('سجّل الدخول إلى Crown', 'Sign in to Crown')}</p>
          <div className="flex gap-1 rounded-lg border border-cyan-500/35 bg-cyan-500/5 p-0.5">
            <button
              type="button"
              onClick={() => setLanguage('ar')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                language === 'ar' ? 'bg-cyan-400 text-[#0a0e17] shadow-[0_0_14px_rgba(0,243,255,0.45)]' : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              AR
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                language === 'en' ? 'bg-cyan-400 text-[#0a0e17] shadow-[0_0_14px_rgba(0,243,255,0.45)]' : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              EN
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-200 bg-red-950/50 border border-red-500/40 rounded-xl px-3 py-2">{error}</div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">
            {t('البريد أو اسم المستخدم أو رقم الموظف', 'Email, username, or employee ID')}
          </label>
          <input
            type="text"
            name="username"
            autoComplete="username"
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">{t('كلمة المرور', 'Password')}</label>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {needsShopId && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-slate-300 mb-1">Shop ID</label>
              <input
                name="shopId"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                className={inputClass}
                autoComplete="off"
              />
              <p className="text-xs opacity-70 mt-1">
                {t(
                  'قد تحتاج Shop ID عند تسجيل الدخول كموظف.',
                  'You may need Shop ID when signing in as staff.'
                )}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-[11px] text-slate-400">
          <Link href="/forgot-password" className="hover:text-cyan-300 transition-colors" onClick={onClose}>
            {t('نسيت كلمة المرور؟', 'Forgot password?')}
          </Link>
          <Link href="/register" className="hover:text-cyan-300 transition-colors" onClick={onClose}>
            {t('إنشاء حساب', 'Create account')}
          </Link>
          <Link href="/download" className="hover:text-cyan-300 transition-colors" onClick={onClose}>
            {t('تحميل التطبيق', 'Download app')}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-300 hover:to-cyan-500 text-[#0a0e17] font-bold text-sm disabled:opacity-60 transition-all shadow-[0_0_22px_rgba(0,243,255,0.3)]"
        >
          {loading ? t('جاري تسجيل الدخول...', 'Signing in...') : t('تسجيل الدخول', 'Sign in')}
        </button>
      </form>
    </NeonModal>
  );
}
