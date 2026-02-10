'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Check, X } from 'lucide-react';
import { PLANS, getPlanCurrencySymbol } from '../../shared/plans';

export function PlanCards() {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const lang = (language === 'ar' ? 'ar' : 'en') as 'ar' | 'en';
  const symbol = getPlanCurrencySymbol(lang);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>{t('العملة:', 'Currency:')}</span>
        <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">
          {lang === 'ar' ? 'EGP (ج.م)' : 'USD ($)'}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const pricing = plan.pricing[lang];
          const priceMonthly = pricing?.monthly ?? 0;
          const priceYearly = pricing?.yearly ?? 0;
          return (
            <div
              key={plan.id}
              className={`rounded-xl border p-5 ${
                plan.highlight
                  ? 'border-cyan-500/60 bg-cyan-500/5 shadow-[0_0_24px_rgba(0,243,255,0.15)]'
                  : 'border-cyan-500/20 bg-[#0a0f18]'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-cyan-200 capitalize">{t(plan.nameAr, plan.nameEn)}</h3>
                {plan.highlight && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                    {t('الأكثر شيوعًا', 'Most Popular')}
                  </span>
                )}
              </div>
              <div className="mb-3">
                <span className="text-2xl font-bold text-cyan-300">
                  {symbol}{priceMonthly}
                </span>
                <span className="text-sm text-slate-500 ml-1">
                  / {t('شهريًا', 'mo')}
                </span>
              </div>
              {priceYearly > 0 && (
                <div className="text-xs text-slate-500 mb-3">
                  {t('سنويًا:', 'Yearly:')} {symbol}{priceYearly}
                </div>
              )}
              <div className="text-sm text-slate-400 mb-3">
                <span className="font-semibold text-cyan-300">{plan.totalUsers}</span>{' '}
                {t('مستخدمين', 'users')} ({t(plan.rolesAr, plan.rolesEn)})
              </div>
              <ul className="space-y-2">
                {plan.displayFeatures.map((f) => (
                  <li key={f.key} className="flex items-center gap-2 text-sm">
                    {f.included ? (
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-slate-600 flex-shrink-0" />
                    )}
                    <span className={f.included ? 'text-slate-300' : 'text-slate-500'}>{t(f.ar, f.en)}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
