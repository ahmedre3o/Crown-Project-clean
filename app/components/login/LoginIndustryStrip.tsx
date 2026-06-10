'use client';

import React from 'react';
import { Pill, ShoppingCart, Truck, Warehouse, Wrench } from 'lucide-react';
import { LANDING_INDUSTRIES, LANDING_INDUSTRIES_SECTION } from './loginAboutContactCopy';

const INDUSTRY_ICONS = [ShoppingCart, Pill, Wrench, Warehouse, Truck] as const;

type Lang = 'ar' | 'en';

type LoginIndustryStripProps = {
  language: Lang;
};

export function LoginIndustryStrip({ language }: LoginIndustryStripProps) {
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const title = t(LANDING_INDUSTRIES_SECTION.titleAr, LANDING_INDUSTRIES_SECTION.titleEn);
  const subtitle = t(LANDING_INDUSTRIES_SECTION.subtitleAr, LANDING_INDUSTRIES_SECTION.subtitleEn);
  const footnote = t(LANDING_INDUSTRIES_SECTION.footnoteAr, LANDING_INDUSTRIES_SECTION.footnoteEn);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-4 text-center space-y-1 px-1">
        <h2 className="text-sm font-bold tracking-tight text-cyan-100/95">{title}</h2>
        <p className="text-[11px] text-slate-500 leading-snug max-w-md mx-auto">{subtitle}</p>
      </div>
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
        aria-label={t('قطاعات مناسبة للنظام', 'Industries the system suits')}
      >
      {LANDING_INDUSTRIES.map((row, i) => {
        const Icon = INDUSTRY_ICONS[i] ?? ShoppingCart;
        return (
          <div
            key={i}
            className="relative rounded-xl border border-cyan-500/40 bg-[#060a12]/95 px-2.5 py-3 text-center shadow-[0_0_18px_rgba(0,243,255,0.12)] transition-transform duration-300 ease-out hover:scale-105 hover:border-cyan-300/80 hover:shadow-[0_0_28px_rgba(0,243,255,0.35)] before:absolute before:inset-x-2 before:top-0 before:h-px before:bg-cyan-400/50 before:shadow-[0_0_8px_rgba(34,211,238,0.6)] after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-cyan-400/50 after:shadow-[0_0_8px_rgba(34,211,238,0.6)]"
          >
            <div className="mx-auto mb-2 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-cyan-400/45 text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.35)]">
              <Icon className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <p className="text-xs font-bold text-white leading-tight">{t(row.arTitle, row.enTitle)}</p>
            <p className="mt-1 text-[11px] text-cyan-300/95 leading-snug">{t(row.arSub, row.enSub)}</p>
          </div>
        );
      })}
      </div>
      <p className="mt-4 text-center text-[10px] text-slate-500/90 leading-snug px-2">{footnote}</p>
    </div>
  );
}
