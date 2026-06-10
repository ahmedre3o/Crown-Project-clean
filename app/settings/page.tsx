'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { PlanCards } from '@/components/PlanCards';
import { useLanguage } from '../contexts/LanguageContext';
import { useOffline } from '../contexts/OfflineContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { USD_RATE_STORAGE_KEY } from '@/lib/formatters';
import { apiRequest, useAuth } from '../contexts/AuthContext';
import { useRouteGuard } from '../guards/useRouteGuard';

export default function SettingsPage() {
  const router = useRouter();
  const { t, direction, language } = useLanguage();
  const { isOnline } = useOffline();
  const { user, loading: authLoading, effectiveRole, refreshUser } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'settings', effectiveRole, showDenied: true });
  const { currency, setCurrency } = useCurrency();
  const [profile, setProfile] = useState({
    businessName: '',
    businessNameAr: '',
    businessNameEn: '',
    ownerName: '',
    activityType: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    logoUrl: '',
    countryName: '',
    currencyCode: currency,
    currencySymbol: '',
  });
  const [usdRate, setUsdRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activationCode, setActivationCode] = useState('');
  const [aiAddonCode, setAiAddonCode] = useState('');
  const [aiAddonSaving, setAiAddonSaving] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [subscription, setSubscription] = useState<{
    planName?: string;
    planStatus?: string;
    status?: string;
    activationCode?: string | null;
    activationCodeMasked?: string | null;
    startedAt?: string;
    expiresAt?: string | null;
    lastActivatedAt?: string;
    daysLeft?: number | null;
    is_trial?: boolean;
    activations?: { code: string; days: number; activated_at: string; previous_expires_at?: string | null; new_expires_at?: string | null }[];
    aiAddonActivations?: {
      codeMasked: string;
      ai_messages: number;
      ocr_credits: number;
      redeemed_at: string | null;
      code_expires_at: string | null;
    }[];
  } | null>(null);

  const planLabels: Record<string, { ar: string; en: string }> = {
    bronze: { ar: 'برونزي', en: 'Bronze' },
    silver: { ar: 'فضي', en: 'Silver' },
    gold: { ar: 'ذهبي', en: 'Gold' },
    branches: { ar: 'فروع', en: 'Branches' },
  };
  const planLabel =
    subscription?.planName && planLabels[subscription.planName]
      ? planLabels[subscription.planName][language === 'ar' ? 'ar' : 'en']
      : subscription?.planName || (language === 'ar' ? 'برونزي' : 'Bronze');

  const currencyOptions = [
    { country: 'Egypt', code: 'EGP', symbol: 'ج.م' },
    { country: 'Saudi Arabia', code: 'SAR', symbol: 'ر.س' },
    { country: 'United Arab Emirates', code: 'AED', symbol: 'د.إ' },
    { country: 'Kuwait', code: 'KWD', symbol: 'د.ك' },
    { country: 'Qatar', code: 'QAR', symbol: 'ر.ق' },
    { country: 'United States', code: 'USD', symbol: '$' },
    { country: 'United Kingdom', code: 'GBP', symbol: '£' },
    { country: 'European Union', code: 'EUR', symbol: '€' },
    { country: 'Canada', code: 'CAD', symbol: 'C$' },
    { country: 'Australia', code: 'AUD', symbol: 'A$' },
    { country: 'Japan', code: 'JPY', symbol: '¥' },
    { country: 'China', code: 'CNY', symbol: '¥' },
    { country: 'India', code: 'INR', symbol: '₹' },
    { country: 'Turkey', code: 'TRY', symbol: '₺' },
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await apiRequest('/shops/profile');
      setProfile({
        businessName: data.business_name || data.name || '',
        businessNameAr: data.business_name_ar || data.business_name || '',
        businessNameEn: data.business_name_en || data.business_name || '',
        ownerName: data.owner_name || '',
        activityType: data.activity_type || '',
        address: data.address || '',
        contactEmail: data.contact_email || '',
        contactPhone: data.contact_phone || '',
        logoUrl: data.logo_url || '',
        countryName: data.country_name || '',
        currencyCode: data.currency_code || currency,
        currencySymbol: data.currency_symbol || '',
      });
      if (data.currency_code) {
        setCurrency(data.currency_code);
      }
      if (typeof window !== 'undefined') {
        const storedRate = window.localStorage.getItem(USD_RATE_STORAGE_KEY);
        if (storedRate) setUsdRate(storedRate);
      }
      const subData = await apiRequest('/subscription').catch(() => null);
      if (subData) {
        setSubscription({
          planName: subData.planName,
          planStatus: subData.planStatus,
          status: subData.status,
          activationCode: subData.activationCode ?? null,
          activationCodeMasked: subData.activationCodeMasked ?? null,
          startedAt: subData.startedAt,
          expiresAt: subData.expiresAt,
          lastActivatedAt: subData.lastActivatedAt,
          daysLeft: subData.daysLeft ?? subData.remainingDays,
          is_trial: subData.is_trial,
          activations: subData.activations,
          aiAddonActivations: Array.isArray(subData.aiAddonActivations) ? subData.aiAddonActivations : [],
        });
      } else {
        setSubscription({ planName: data.package || 'bronze' });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    }
  };

  const handleSave = async () => {
    setError(null);
    setMessage(null);
    try {
      setLoading(true);
      await apiRequest('/shops/profile', {
        method: 'PUT',
        body: JSON.stringify({
          businessName: profile.businessName,
          businessNameAr: profile.businessNameAr,
          businessNameEn: profile.businessNameEn,
          ownerName: profile.ownerName,
          activityType: profile.activityType,
          address: profile.address,
          contactEmail: profile.contactEmail,
          contactPhone: profile.contactPhone,
          logoUrl: profile.logoUrl,
          countryName: profile.countryName,
          currencyCode: profile.currencyCode,
          currencySymbol: profile.currencySymbol,
        }),
      });
      if (typeof window !== 'undefined') {
        const parsed = Number(usdRate);
        if (Number.isFinite(parsed) && parsed > 0) {
          window.localStorage.setItem(USD_RATE_STORAGE_KEY, String(parsed));
        } else {
          window.localStorage.removeItem(USD_RATE_STORAGE_KEY);
        }
      }
      setMessage('Saved successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !allowed) return null;

  if (!isOnline) {
    return (
      <div className="min-h-screen bg-black text-white flex" dir={direction}>
        <Sidebar />
        <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto flex items-center justify-center">
          <div className="neon-card rounded-xl p-8 max-w-md w-full text-center">
            <h1 className="text-xl font-bold text-amber-300 mb-3">
              {language === 'ar' ? 'يتطلب اتصالاً بالإنترنت' : 'Requires Internet Connection'}
            </h1>
            <p className="text-slate-400">
              {language === 'ar' ? 'هذه الصفحة تحتاج إلى اتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.' : 'This page requires an internet connection. Check your connection and try again.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-cyan-200">{t('settings.title')}</h1>
            <p className="text-sm text-slate-400 mt-1">Manage Account & Store Data</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-cyan-600 text-white font-semibold"
            >
              {loading ? t('common.loading') : t('common.save')}
            </button>
            <button className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300">
              Upgrade / Activate Subscription
            </button>
          </div>
        </div>
        <div className="neon-card rounded-xl p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-200">
              {message}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder={language === 'ar' ? 'اسم المتجر (عربي)' : 'Store name (Arabic)'}
              value={profile.businessNameAr}
              onChange={(e) => setProfile((prev) => ({ ...prev, businessNameAr: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder={language === 'ar' ? 'اسم المتجر (إنجليزي)' : 'Store name (English)'}
              value={profile.businessNameEn}
              onChange={(e) => setProfile((prev) => ({ ...prev, businessNameEn: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder="Full name"
              value={profile.ownerName}
              onChange={(e) => setProfile((prev) => ({ ...prev, ownerName: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder="Activity type"
              value={profile.activityType}
              onChange={(e) => setProfile((prev) => ({ ...prev, activityType: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder="Contact email"
              value={profile.contactEmail}
              onChange={(e) => setProfile((prev) => ({ ...prev, contactEmail: e.target.value }))}
            />
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder="Phone"
              value={profile.contactPhone}
              onChange={(e) => setProfile((prev) => ({ ...prev, contactPhone: e.target.value }))}
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                className="sr-only"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 500 * 1024) {
                    setError('Logo must be <= 500KB');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    setProfile((prev) => ({ ...prev, logoUrl: String(reader.result || '') }));
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => logoFileInputRef.current?.click()}
                className="inline-flex items-center justify-center rounded-lg border border-cyan-500/50 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 transition"
              >
                {language === 'ar' ? 'ارفع لوجو المحل' : 'Upload Logo'}
              </button>
              {profile.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.logoUrl} alt="Logo" className="h-12 w-12 rounded-md object-cover border border-cyan-500/20" />
              )}
            </div>
            <input
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm md:col-span-2"
              placeholder="Address"
              value={profile.address}
              onChange={(e) => setProfile((prev) => ({ ...prev, address: e.target.value }))}
            />
          </div>
          <label className="block text-sm text-slate-300 mb-2">Country & Currency</label>
          <select
            value={profile.currencyCode}
            onChange={(e) => {
              const option = currencyOptions.find((item) => item.code === e.target.value);
              if (!option) return;
              const code = option.code as typeof currency;
              setProfile((prev) => ({
                ...prev,
                countryName: option.country,
                currencyCode: code,
                currencySymbol: option.symbol,
              }));
              setCurrency(code);
            }}
            className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
          >
            {currencyOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.country} — {option.code} {option.symbol}
              </option>
            ))}
          </select>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              inputMode="decimal"
              className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
              placeholder={language === 'ar' ? 'سعر تحويل الدولار (1 USD = ? EGP)' : 'USD rate (1 USD = ? EGP)'}
              value={usdRate}
              onChange={(e) => setUsdRate(e.target.value)}
            />
            <div className="text-xs text-slate-400">
              {language === 'ar'
                ? 'يُستخدم هذا السعر لتحويل المبيعات من الجنيه إلى الدولار عند اختيار USD.'
                : 'Used to convert EGP sales to USD when USD is selected.'}
            </div>
          </div>

          <div className="mt-6 border-t border-cyan-500/20 pt-6">
            <h2 className="text-lg font-bold text-cyan-200 mb-3">
              {language === 'ar' ? 'حالة الاشتراك' : 'Subscription Status'}
            </h2>
            {/* Countdown banner: D-5 to D-0 */}
            {subscription?.planStatus === 'EXPIRED' && (
              <div className="mb-3 p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300">
                {subscription?.is_trial
                  ? (language === 'ar' ? 'انتهت الفترة التجريبية. يرجى التجديد.' : 'Free trial ended. Please renew.')
                  : (language === 'ar' ? 'انتهى الاشتراك. يرجى التجديد.' : 'Subscription expired. Please renew.')}
              </div>
            )}
            {subscription?.planStatus !== 'EXPIRED' &&
              subscription?.planStatus !== 'NONE' &&
              subscription?.daysLeft != null &&
              subscription.daysLeft <= 5 &&
              subscription.daysLeft > 0 && (
                <div
                  className={`mb-3 p-3 rounded-lg border ${
                    subscription.daysLeft <= 2 ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
                  }`}
                >
                  {subscription.daysLeft === 1
                    ? subscription?.is_trial
                      ? (language === 'ar' ? 'الفترة التجريبية تنتهي غداً. يرجى التجديد للمتابعة.' : 'Free trial ends tomorrow. Please renew to keep access.')
                      : (language === 'ar' ? 'الاشتراك ينتهي غداً. يرجى التجديد.' : 'Subscription ends tomorrow. Please renew.')
                    : subscription?.is_trial
                    ? (language === 'ar'
                        ? `الفترة التجريبية تنتهي خلال ${subscription.daysLeft} أيام. يرجى التجديد للمتابعة.`
                        : `Free trial ends in ${subscription.daysLeft} day(s). Please renew to keep access.`)
                    : (language === 'ar'
                        ? `المتبقي ${subscription.daysLeft} أيام. يرجى التجديد.`
                        : `Remaining ${subscription.daysLeft} days. Please renew.`)}
                </div>
              )}
            <div className="flex flex-wrap gap-4 mb-3 p-3 rounded-lg bg-black/20 border border-cyan-500/20">
              <div>
                <span className="text-xs text-slate-500">{language === 'ar' ? 'الباقة' : 'Plan'}: </span>
                <span className="font-semibold text-cyan-200">{planLabel}</span>
              </div>
              {subscription?.planStatus === 'LIFETIME' && (
                <span className="text-xs text-emerald-400">({language === 'ar' ? 'مدى الحياة' : 'Lifetime'})</span>
              )}
              {subscription?.planStatus === 'TRIAL' && (
                <span className="text-xs text-amber-400">({language === 'ar' ? 'تجربة مجانية' : 'Trial'})</span>
              )}
              {subscription?.expiresAt && subscription?.planStatus !== 'LIFETIME' && (
                <>
                  <div>
                    <span className="text-xs text-slate-500">{language === 'ar' ? 'ينتهي في' : 'Expires'}: </span>
                    <span className="text-sm text-slate-200">
                      {new Date(subscription.expiresAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">{language === 'ar' ? 'المتبقي' : 'Remaining'}: </span>
                    <span
                      className={`font-semibold ${
                        (subscription?.daysLeft ?? 0) <= 2 ? 'text-amber-400' : 'text-cyan-300'
                      }`}
                    >
                      {subscription?.daysLeft != null
                        ? subscription.daysLeft === 0
                          ? language === 'ar'
                            ? 'انتهى اليوم'
                            : 'Expires today'
                          : `${subscription.daysLeft} ${language === 'ar' ? 'يوم' : 'days'}`
                        : '-'}
                    </span>
                  </div>
                </>
              )}
            </div>
            {subscription?.planStatus === 'NONE' || subscription?.planStatus === 'EXPIRED' ? (
              <p className="text-sm text-amber-300">
                {language === 'ar' ? 'لا يوجد اشتراك نشط' : 'No active subscription'}
              </p>
            ) : (
              <p className="text-sm text-slate-400">
                {subscription?.planStatus === 'LIFETIME' && (
                  <span className="text-cyan-300">{language === 'ar' ? 'لا ينتهي (مدى الحياة)' : 'Never expires (Lifetime)'}</span>
                )}
              </p>
            )}
            {(subscription?.planStatus === 'NONE' || subscription?.planStatus === 'EXPIRED') && (
              <p className="text-xs text-slate-400 mt-1">
                {language === 'ar' ? 'فعّل كود اشتراك للمتابعة.' : 'Activate a subscription code to continue.'}
              </p>
            )}
            {subscription?.activationCodeMasked && (
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar' ? 'كود التفعيل' : 'Activation code'}: {subscription.activationCodeMasked}
              </p>
            )}
            {subscription?.startedAt && (
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar' ? 'تاريخ البدء' : 'Start date'}: {new Date(subscription.startedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
              </p>
            )}
            {subscription?.lastActivatedAt && (
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar' ? 'آخر تفعيل' : 'Last activated'}: {new Date(subscription.lastActivatedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
              </p>
            )}
            {subscription?.activations && subscription.activations.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 mb-1">
                  {language === 'ar' ? 'سجل التفعيلات (آخر 5)' : 'Activation history (last 5)'}
                </p>
                <ul className="text-xs text-slate-400 list-disc list-inside space-y-0.5">
                  {subscription.activations.slice(0, 5).map((a, i) => (
                    <li key={i}>
                      {a.days === 0 ? (language === 'ar' ? 'مدى الحياة' : 'Lifetime') : `${a.days} ${language === 'ar' ? 'يوم' : 'days'}`}
                      {' — '}
                      {new Date(a.activated_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                      {a.new_expires_at === null && a.days === 0 && ` → ${language === 'ar' ? 'لا ينتهي' : 'no expiry'}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"
                placeholder={language === 'ar' ? 'كود التفعيل' : 'Activation code'}
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
              />
              <button
                onClick={async () => {
                  try {
                    setError(null);
                    setMessage(null);
                    const data = await apiRequest('/activate', {
                      method: 'POST',
                      body: JSON.stringify({ code: activationCode }),
                    });
                    setSubscription((prev) => ({
                      ...prev,
                      planName: data.plan,
                      planStatus: data.planStatus || (data.expiresAt ? 'ACTIVE' : 'LIFETIME'),
                      activationCode: data.activationCode ?? activationCode,
                      activationCodeMasked: data.activationCodeMasked ?? null,
                      expiresAt: data.expiresAt ?? null,
                      lastActivatedAt: new Date().toISOString(),
                      daysLeft: data.planStatus === 'LIFETIME' ? null : (data.daysLeft ?? (data.expiresAt ? Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null)),
                    }));
                    setMessage(language === 'ar' ? 'تم تحديث الاشتراك' : 'Subscription updated');
                    setActivationCode('');
                    await refreshUser(true);
                    router.replace('/dashboard');
                  } catch (err: any) {
                    setError(err.message || (language === 'ar' ? 'فشل التفعيل' : 'Activation failed'));
                  }
                }}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold text-sm"
              >
                {language === 'ar' ? 'تفعيل الكود' : 'Activate Code'}
              </button>
            </div>
            {(effectiveRole === 'shop_owner' || effectiveRole === 'super_admin') && (
              <div className="mt-6 pt-4 border-t border-cyan-500/20">
                <h3 className="text-md font-semibold text-cyan-200 mb-2">
                  {language === 'ar' ? 'إضافات الذكاء الاصطناعي / OCR' : 'AI & OCR add-on codes'}
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  {language === 'ar'
                    ? 'أدخل كود الإضافة لزيادة حدود الرسائل والمسح الضوئي لهذا الشهر (منفصل عن كود الاشتراك).'
                    : 'Redeem an add-on code to increase AI message and OCR limits for this billing period (separate from subscription activation).'}
                </p>
                {subscription?.aiAddonActivations && subscription.aiAddonActivations.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg border border-violet-500/25 bg-violet-950/20">
                    <p className="text-xs text-violet-300/90 mb-2 font-semibold">
                      {language === 'ar' ? 'سجل أكواد الإضافة (آخر 5)' : 'Add-on code history (last 5)'}
                    </p>
                    <ul className="text-xs text-slate-300 space-y-2">
                      {subscription.aiAddonActivations.map((row, i) => {
                        const redeemed = row.redeemed_at
                          ? new Date(row.redeemed_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')
                          : '—';
                        const codeExp = row.code_expires_at
                          ? new Date(row.code_expires_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')
                          : language === 'ar'
                            ? 'بدون انتهاء للكود'
                            : 'No code expiry';
                        return (
                          <li key={i} className="border-b border-violet-500/10 pb-2 last:border-0 last:pb-0">
                            <span className="text-cyan-200/90">{row.codeMasked}</span>
                            {' — '}
                            {language === 'ar' ? 'AI' : 'AI'} {row.ai_messages} / {language === 'ar' ? 'OCR' : 'OCR'}{' '}
                            {row.ocr_credits}
                            <br />
                            <span className="text-slate-500">
                              {language === 'ar' ? 'تم التفعيل:' : 'Redeemed:'} {redeemed}
                            </span>
                            {' · '}
                            <span className="text-slate-500">
                              {language === 'ar' ? 'صلاحية الكود حتى:' : 'Code valid until:'} {codeExp}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
                    placeholder={language === 'ar' ? 'كود الإضافة' : 'Add-on code'}
                    value={aiAddonCode}
                    onChange={(e) => setAiAddonCode(e.target.value)}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    disabled={aiAddonSaving || !aiAddonCode.trim()}
                    onClick={async () => {
                      try {
                        setError(null);
                        setMessage(null);
                        setAiAddonSaving(true);
                        await apiRequest('/redeem-ai-code', {
                          method: 'POST',
                          body: JSON.stringify({ code: aiAddonCode.trim() }),
                        });
                        setMessage(
                          language === 'ar'
                            ? 'تم تطبيق كود الإضافة بنجاح.'
                            : 'Add-on code applied successfully.'
                        );
                        setAiAddonCode('');
                        await loadProfile();
                      } catch (err: any) {
                        setError(err.message || (language === 'ar' ? 'فشل تطبيق الكود' : 'Could not redeem code'));
                      } finally {
                        setAiAddonSaving(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-violet-600 text-white font-semibold text-sm disabled:opacity-50"
                  >
                    {aiAddonSaving ? t('common.loading') : language === 'ar' ? 'تطبيق' : 'Redeem'}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="mt-8 border-t border-cyan-500/20 pt-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                <a href="https://wa.me/201202620913" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-400 hover:text-green-300">
                  <span>{language === 'ar' ? 'واتساب:' : 'WhatsApp:'}</span>
                  <span>+01202620913</span>
                </a>
                <a href="tel:+01070045116" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300">
                  <span>{language === 'ar' ? 'فودافون:' : 'Vodafone Call:'}</span>
                  <span>+01070045116</span>
                </a>
              </div>
              <h2 className="text-lg font-bold text-cyan-200">
                {language === 'ar' ? 'الباقات المتاحة' : 'Available Plans'}
              </h2>
            </div>
            <PlanCards />
          </div>
        </div>
      </div>
    </div>
  );
}

