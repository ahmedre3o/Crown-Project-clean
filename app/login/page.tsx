'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { PlanCards } from '@/components/PlanCards';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [username, setUsername] = useState('');
  const [shopId, setShopId] = useState('');
  const [needsShopId, setNeedsShopId] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
        friendly = language === 'ar' ? 'بيانات الدخول غير صحيحة.' : 'Invalid login credentials.';
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

  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const whatsInside = [
    { ar: 'مبيعات نقطة البيع والفواتير', en: 'POS sales & invoices' },
    { ar: 'المخزون وتنبيهات المخزون المنخفض', en: 'Inventory & low stock alerts' },
    { ar: 'التقارير (PDF / Excel / CSV) مع رسوم بيانية', en: 'Reports (PDF/Excel/CSV) with charts' },
    { ar: 'المتجر الأونلاين (Gold/Branches فقط)', en: 'Online store (Gold/Branches only)' },
    { ar: 'مساعد ذكاء اصطناعي متاح للمساعدة (Gold/Branches فقط)', en: 'AI assistant available for help (Gold/Branches only)' },
    { ar: 'إدارة الفروع (باقة الفروع)', en: 'Branch management (Branches plan)' },
  ];

  return (
    <main className="min-h-screen bg-black text-white" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header strip - Contact numbers */}
      <div className="border-b border-cyan-500/20 bg-[#0a0f18] px-4 py-2 flex flex-wrap items-center justify-center gap-6 text-sm">
        <a href="https://wa.me/201202620913" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-400 hover:text-green-300">
          <span>{t('واتساب:', 'WhatsApp:')}</span>
          <span>+201202620913</span>
        </a>
        <a href="tel:+01070045116" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300">
          <span>{t('فودافون:', 'Call:')}</span>
          <span>+01070045116</span>
        </a>
      </div>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-48px)]">
        {/* Form side */}
        <div className="flex-1 flex items-center justify-center px-6 py-12 lg:py-24">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md bg-[#0b1220] border border-cyan-500/30 rounded-2xl p-8 space-y-5 shadow-[0_0_30px_rgba(0,243,255,0.15)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-center flex-1">
                <h1 className="text-2xl font-bold text-cyan-200">{t('مرحبًا بعودتك', 'Welcome back')}</h1>
                <p className="text-sm text-slate-400 mt-1">{t('سجّل الدخول إلى حسابك في Crown', 'Sign in to your Crown account')}</p>
              </div>
              <div className="flex gap-1 rounded-lg border border-cyan-500/30 p-0.5">
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  className={`px-2 py-1 text-xs font-semibold rounded ${language === 'ar' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-cyan-300'}`}
                >
                  AR
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-1 text-xs font-semibold rounded ${language === 'en' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-cyan-300'}`}
                >
                  EN
                </button>
              </div>
            </div>
            {error && (
              <div className="text-sm text-red-400 bg-red-900/20 border border-red-500/40 rounded p-2">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="block text-sm text-gray-300">{t('البريد الإلكتروني أو اسم المستخدم أو رقم الموظف', 'Email, Username, or Employee ID')}</label>
              <input
                type="text"
                className="w-full rounded bg-[#0f172a] border border-cyan-500/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm text-gray-300">{t('كلمة المرور', 'Password')}</label>
              <input
                type="password"
                className="w-full rounded bg-[#0f172a] border border-cyan-500/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            
              {needsShopId && (
                <div className="mt-3">
                  <label className="block text-sm mb-1">Shop ID</label>
                  <input
                    name="shopId"
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                    className="w-full rounded bg-[#0f172a] border border-cyan-500/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400"
                    placeholder="مثال: 1"
                  />
                  <p className="text-xs opacity-70 mt-1">لو بتسجّل بـ Username/ID لموظف، ممكن تحتاج Shop ID لتحديد المحل.</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <Link href="/forgot-password" className="hover:text-cyan-300">
                {t('نسيت كلمة المرور؟', 'Forgot password?')}
              </Link>
              <Link href="/register" className="hover:text-cyan-300">
                {t('إنشاء حساب', 'Create account')}
              </Link>
              <Link href="/download" className="hover:text-cyan-300">
                {t('تحميل التطبيق', 'Download App')}
              </Link>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm disabled:opacity-60"
            >
              {loading ? t('جاري تسجيل الدخول...', 'Signing in...') : t('تسجيل الدخول', 'Sign in')}
            </button>
          </form>
        </div>

        {/* Overview side */}
        <div className="flex-1 overflow-y-auto px-6 py-12 lg:py-24 bg-[#0a0f18] border-t lg:border-t-0 lg:border-l border-cyan-500/20">
          <div className="max-w-2xl mx-auto space-y-10">
            {/* Plans */}
            <section>
              <h2 className="text-lg font-bold text-cyan-200 mb-4">{t('الباقات', 'Plans')}</h2>
              <PlanCards />
            </section>

            {/* What's inside */}
            <section className="rounded-xl border border-cyan-500/20 bg-[#0b1220] p-6">
              <h2 className="text-lg font-bold text-cyan-200 mb-4">
                {t('ماذا يحتوي النظام؟', 'What does the system include?')}
              </h2>
              <ul className="space-y-2 text-sm text-slate-300">
                {whatsInside.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>{t(item.ar, item.en)}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Quick report preview */}
            <section className="rounded-xl border border-cyan-500/20 bg-[#0b1220] p-6">
              <h2 className="text-lg font-bold text-cyan-200 mb-4">
                {t('نظرة سريعة على التقارير', 'Quick report preview')}
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-300">12,450</div>
                  <div className="text-xs text-slate-500 mt-1">{t('مبيعات', 'Sales')}</div>
                </div>
                <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-300">89</div>
                  <div className="text-xs text-slate-500 mt-1">{t('طلبات', 'Orders')}</div>
                </div>
                <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-300">3,210</div>
                  <div className="text-xs text-slate-500 mt-1">{t('أرباح', 'Profit')}</div>
                </div>
              </div>
              <div className="mt-4 h-24 rounded-lg border border-cyan-500/20 bg-cyan-500/5 overflow-hidden">
                <svg viewBox="0 0 300 80" className="w-full h-full" preserveAspectRatio="none">
                  <polyline fill="none" stroke="rgba(34,211,238,0.6)" strokeWidth="2" points="0,60 50,45 100,55 150,30 200,40 250,25 300,35" />
                </svg>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
