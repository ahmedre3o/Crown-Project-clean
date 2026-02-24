'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { PlanCards } from '@/components/PlanCards';
import { useLanguage } from '../contexts/LanguageContext';
import { useOffline } from '../contexts/OfflineContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { USD_RATE_STORAGE_KEY } from '@/lib/formatters';
import { apiRequest, useAuth } from '../contexts/AuthContext';
import { useRouteGuard } from '../guards/useRouteGuard';

export default function SettingsPage() {
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
    activations?: { code: string; days: number; activated_at: string; previous_expires_at?: string | null; new_expires_at?: string | null }[];
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
          daysLeft: subData.daysLeft,
          activations: subData.activations,
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
          <button className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300">
            Upgrade / Activate Subscription
          </button>
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
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif"
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
                }}
                className="text-xs text-slate-300"
              />
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
            <h2 className="text-lg font-bold text-cyan-200 mb-2">
              {language === 'ar' ? 'حالة الاشتراك' : 'Subscription Status'}
            </h2>
            {subscription?.planStatus === 'NONE' || subscription?.planStatus === 'EXPIRED' ? (
              <p className="text-sm text-amber-300">
                {language === 'ar' ? 'لا يوجد اشتراك نشط' : 'No active subscription'}
              </p>
            ) : (
              <p className="text-sm text-slate-400">
                {language === 'ar' ? 'الباقة' : 'Plan'}: {planLabel}
                {subscription?.planStatus === 'LIFETIME' && ` (${language === 'ar' ? 'مدى الحياة' : 'Lifetime'})`}
                {subscription?.planStatus === 'TRIAL' && ` (${language === 'ar' ? 'تجربة مجانية' : 'Trial'})`}
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
            {subscription?.planStatus === 'LIFETIME' ? (
              <p className="text-xs text-cyan-300 mt-1">{language === 'ar' ? 'لا ينتهي (مدى الحياة)' : 'Never expires (Lifetime)'}</p>
            ) : (
              <>
                {subscription?.expiresAt && (
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'ar' ? 'ينتهي في' : 'Expires'}: {new Date(subscription.expiresAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                  </p>
                )}
                {subscription?.daysLeft != null && (
                  <p className="text-xs text-cyan-300 mt-1">
                    {language === 'ar' ? `المتبقي: ${subscription.daysLeft} يوم` : `Days left: ${subscription.daysLeft}`}
                  </p>
                )}
              </>
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
                    loadProfile();
                  } catch (err: any) {
                    setError(err.message || (language === 'ar' ? 'فشل التفعيل' : 'Activation failed'));
                  }
                }}
                className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-semibold text-sm"
              >
                {language === 'ar' ? 'تفعيل الكود' : 'Activate Code'}
              </button>
            </div>
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
          <div className="mt-6">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-cyan-600 text-white font-semibold"
            >
              {loading ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

