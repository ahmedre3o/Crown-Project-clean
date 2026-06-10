'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CrownServicesLogoMark } from '@/components/login/CrownServicesLogoMark';

type LegalPageShellProps = {
  title: string;
  children: React.ReactNode;
};

/**
 * Shared neon layout for legal pages (matches login marketing theme).
 */
export function LegalPageShell({ title, children }: LegalPageShellProps) {
  const { language, setLanguage } = useLanguage();
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);

  useEffect(() => {
    document.title = `${title} | Crown Services`;
  }, [title]);

  const BackIcon = isAr ? ArrowRight : ArrowLeft;

  return (
    <main
      className="min-h-screen text-white bg-[#0a0e17] relative overflow-x-hidden overflow-y-auto"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -end-40 w-[28rem] h-[28rem] bg-cyan-500/[0.07] rounded-full blur-3xl" />
        <div className="absolute top-1/2 -start-20 w-72 h-72 bg-cyan-400/[0.06] rounded-full blur-3xl" />
        <div className="absolute bottom-0 start-1/3 w-80 h-80 bg-cyan-600/[0.05] rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 243, 255, 0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 243, 255, 0.035) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 sm:px-8 py-10 lg:py-14 pb-16">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <CrownServicesLogoMark size="lg" className="drop-shadow-[0_0_20px_rgba(0,243,255,0.55)] shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/90">Crown Services</p>
              <p className="text-sm text-slate-500">{t('نظام ERP سحابي', 'Cloud ERP')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        </header>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 hover:text-cyan-200 transition-colors mb-6 group"
        >
          <BackIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 rtl:rotate-180 rtl:group-hover:translate-x-0.5" />
          {t('العودة إلى تسجيل الدخول', 'Back to login')}
        </Link>

        <article
          className="rounded-2xl border-2 border-cyan-400/45 bg-[#0b121f]/95 backdrop-blur-xl p-6 sm:p-8 shadow-[0_0_48px_rgba(0,243,255,0.12),inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent mb-6">
            {title}
          </h1>
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line space-y-4">{children}</div>
        </article>
      </div>
    </main>
  );
}
