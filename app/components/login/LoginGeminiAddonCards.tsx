'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import type { PlanBillCurrency } from '@/components/PlanCards';
import { CrownServicesLogoMark } from './CrownServicesLogoMark';
import { GEMINI_ADDON_PLANS, GEMINI_ADDON_SECTION } from './loginAboutContactCopy';

type Lang = 'ar' | 'en';

type LoginGeminiAddonCardsProps = {
  language: Lang;
  /** Sync with PlanCards EGP/USD toggle */
  billCurrency: PlanBillCurrency;
  /** Opens login so user can redeem add-ons in Settings after subscribing */
  onBuyAddon?: () => void;
};

export function LoginGeminiAddonCards({ language, billCurrency, onBuyAddon }: LoginGeminiAddonCardsProps) {
  const tp = (ar: string, en: string) => (language === 'ar' ? ar : en);

  return (
    <section className="space-y-4 pt-1" aria-labelledby="gemini-addon-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <CrownServicesLogoMark size="sm" className="drop-shadow-[0_0_12px_rgba(167,139,250,0.45)]" />
          <div>
            <h2 id="gemini-addon-heading" className="text-sm font-semibold text-white tracking-tight">
              {tp(GEMINI_ADDON_SECTION.titleAr, GEMINI_ADDON_SECTION.titleEn)}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl leading-snug">
              {tp(GEMINI_ADDON_SECTION.subtitleAr, GEMINI_ADDON_SECTION.subtitleEn)}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/35 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200/95">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Gemini
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {GEMINI_ADDON_PLANS.map((plan) => {
          const bundleLine =
            language === 'ar'
              ? `${plan.messages} رسالة + ${plan.ocr} OCR`
              : `${plan.messages} messages + ${plan.ocr} OCR`;
          const priceLine =
            billCurrency === 'USD'
              ? language === 'ar'
                ? `💰 $${plan.priceUsd}`
                : `💰 $${plan.priceUsd}`
              : language === 'ar'
                ? `💰 = ${plan.priceEgp} جنيه`
                : `💰 ${plan.priceEgp} EGP`;
          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border bg-[#060a12]/95 p-4 transition-all duration-300 hover:-translate-y-0.5 ${plan.borderClass} ${plan.glowClass}`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xl leading-none select-none" aria-hidden>
                  {plan.emoji}
                </span>
                <h3 className="text-sm font-bold text-slate-100">{tp(plan.nameAr, plan.nameEn)}</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3 min-h-[2.5rem]">{bundleLine}</p>
              <div className="rounded-lg border border-white/5 bg-[#050912]/90 px-3 py-2.5">
                <p className="text-base font-bold text-cyan-300 tabular-nums">{priceLine}</p>
              </div>
            </div>
          );
        })}
      </div>
      {onBuyAddon && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onBuyAddon}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-violet-400/50 bg-violet-500/10 px-8 py-3 text-sm font-bold text-violet-100 shadow-[0_0_24px_rgba(167,139,250,0.25)] transition hover:bg-violet-500/20 hover:border-violet-300/70"
          >
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            {tp('شراء إضافة', 'Buy Add-on')}
          </button>
        </div>
      )}
    </section>
  );
}
