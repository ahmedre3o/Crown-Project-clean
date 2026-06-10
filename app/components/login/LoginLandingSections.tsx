'use client';

import React from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { CrownServicesLogoMark } from './CrownServicesLogoMark';
import { LANDING_FEATURE_LINES, LANDING_MASTERCLASS } from './loginAboutContactCopy';

type Lang = 'ar' | 'en';

type LoginLandingSectionsProps = {
  language: Lang;
};

export function LoginLandingSections({ language }: LoginLandingSectionsProps) {
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  return (
    <div className="space-y-10 w-full max-w-3xl mx-auto lg:mx-0">
      <section className="grid gap-6 lg:grid-cols-[1fr_minmax(220px,280px)] lg:items-stretch">
        <div className="rounded-2xl border border-cyan-500/25 bg-[#070b14]/90 p-6 shadow-[inset_0_1px_0_rgba(0,243,255,0.06)]">
          <div className="flex items-center gap-3 mb-4">
            <CrownServicesLogoMark size="sm" className="drop-shadow-[0_0_10px_rgba(0,243,255,0.45)]" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {t('🔧 ماذا يحتوي النظام؟', '🔧 What does the system include?')}
            </h2>
          </div>
          <ul className="space-y-2.5 text-sm text-slate-200 leading-relaxed">
            {LANDING_FEATURE_LINES.map((line, i) => (
              <li
                key={i}
                className="login-landing-bullet-in flex items-start gap-2"
                style={{ animationDelay: `${80 + i * 55}ms` }}
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <span>{t(line.ar, line.en)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border-2 border-emerald-400/70 bg-[#050a12]/95 p-6 shadow-[0_0_36px_rgba(52,211,153,0.28),inset_0_0_40px_rgba(52,211,153,0.05)]">
          <p className="text-sm font-medium text-white leading-relaxed text-center lg:text-start">
            {language === 'ar' ? LANDING_MASTERCLASS.quoteAr : LANDING_MASTERCLASS.quoteEn}
          </p>
          <div className="mt-6 space-y-2">
            <Link
              href={LANDING_MASTERCLASS.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(56,189,248,0.4)] transition hover:from-sky-400 hover:to-cyan-400 hover:shadow-[0_0_32px_rgba(56,189,248,0.55)]"
            >
              <Play className="h-5 w-5 shrink-0 fill-white text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]" aria-hidden />
              <span>{t(LANDING_MASTERCLASS.ctaAr, LANDING_MASTERCLASS.ctaEn)}</span>
            </Link>
            <p className="text-center lg:text-start text-[11px] text-emerald-200/80 break-all font-mono">
              {LANDING_MASTERCLASS.urlDisplay}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
