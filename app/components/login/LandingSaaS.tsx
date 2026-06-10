'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Calculator,
  Menu,
  Package,
  ScanLine,
  ShoppingCart,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { PlanCards, type PlanBillCurrency } from '@/components/PlanCards';
import { LoginGeminiAddonCards } from '@/components/login/LoginGeminiAddonCards';
import { LoginIndustryStrip } from '@/components/login/LoginIndustryStrip';
import { CrownServicesLogoMark } from '@/components/login/CrownServicesLogoMark';
import { CrownOutlineIcon } from '@/components/CrownOutlineIcon';
import { LandingAnimatedDashboard } from '@/components/login/LandingAnimatedDashboard';
import { LandingAnimatedInventory } from '@/components/login/LandingAnimatedInventory';
import {
  CONTACT_EMAIL,
  CONTACT_MAILTO_HREF,
  LANDING_SAAS_FEATURES,
  LANDING_SAAS_FOOTER,
  LANDING_SAAS_HERO,
  LANDING_SAAS_OCR,
  LANDING_SAAS_OCR_IMAGE_CAPTION,
  LANDING_SAAS_SALES_INVOICE,
  LANDING_SAAS_DASHBOARD,
  LANDING_SAAS_INVENTORY,
  LANDING_SAAS_VIDEO,
  LANDING_WHATSAPP_URL,
  LANDING_YOUTUBE_EMBED_SRC,
  LOGIN_ABOUT_COPY,
} from '@/components/login/loginAboutContactCopy';

type Lang = 'ar' | 'en';

const FEATURE_ICON: Record<(typeof LANDING_SAAS_FEATURES)[number]['key'], LucideIcon> = {
  pos: ShoppingCart,
  inventory: Package,
  ai: Bot,
  ocr: ScanLine,
  accounting: Calculator,
  hr: Users,
};

export type LandingSaaSProps = {
  language: Lang;
  setLanguage: (l: Lang) => void;
  billCurrency: PlanBillCurrency;
  onBillCurrencyChange: (c: PlanBillCurrency) => void;
  onOpenLogin: () => void;
};

export function LandingSaaS({
  language,
  setLanguage,
  billCurrency,
  onBillCurrencyChange,
  onOpenLogin,
}: LandingSaaSProps) {
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const isAr = language === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const scrollTo = useCallback((id: string) => {
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const about = isAr ? LOGIN_ABOUT_COPY.ar : LOGIN_ABOUT_COPY.en;

  return (
    <div className="min-h-screen text-white bg-[#0a0e17] relative overflow-x-hidden" dir={dir}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -end-40 w-[28rem] h-[28rem] bg-cyan-500/[0.07] rounded-full blur-3xl" />
        <div className="absolute top-1/3 start-0 w-96 h-96 bg-violet-600/[0.05] rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 243, 255, 0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 243, 255, 0.035) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Sticky nav */}
      <header className="sticky top-0 z-40 border-b border-cyan-500/15 bg-[#080c14]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => scrollTo('hero')}
            className="flex items-center gap-2 min-w-0 text-start hover:opacity-90 transition-opacity"
          >
            {isAr ? (
              <>
                <CrownServicesLogoMark size="sm" className="shrink-0 drop-shadow-[0_0_14px_rgba(0,243,255,0.45)]" />
                <span className="truncate text-sm font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                  Crown Services
                </span>
                <CrownOutlineIcon size={26} className="shrink-0 text-cyan-400 drop-shadow-[0_0_12px_rgba(0,243,255,0.45)]" />
              </>
            ) : (
              <>
                <CrownOutlineIcon size={26} className="shrink-0 text-cyan-400 drop-shadow-[0_0_12px_rgba(0,243,255,0.45)]" />
                <span className="truncate text-sm font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                  Crown Services
                </span>
                <CrownServicesLogoMark size="sm" className="shrink-0 drop-shadow-[0_0_14px_rgba(0,243,255,0.45)]" />
              </>
            )}
          </button>

          <nav className="hidden lg:flex items-center gap-1 text-xs font-medium text-slate-400">
            {[
              ['features', t('المميزات', 'Features')],
              ['ocr', 'OCR'],
              ['pricing', t('الأسعار', 'Pricing')],
              ['addons', t('الإضافات', 'Add-ons')],
              ['about', t('من نحن', 'About')],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className="rounded-lg px-3 py-2 hover:text-cyan-200 hover:bg-cyan-500/10 transition-colors"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex gap-0.5 rounded-lg border border-cyan-500/35 bg-cyan-500/5 p-0.5">
              <button
                type="button"
                onClick={() => setLanguage('ar')}
                className={`px-2 py-1.5 text-[11px] font-semibold rounded-md ${
                  language === 'ar' ? 'bg-cyan-400 text-[#0a0e17]' : 'text-slate-400 hover:text-cyan-300'
                }`}
              >
                AR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1.5 text-[11px] font-semibold rounded-md ${
                  language === 'en' ? 'bg-cyan-400 text-[#0a0e17]' : 'text-slate-400 hover:text-cyan-300'
                }`}
              >
                EN
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenLogin}
              className="hidden sm:inline-flex rounded-lg border border-cyan-500/40 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/10 transition-colors"
            >
              {t('دخول', 'Sign in')}
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-600 px-3 py-2 text-xs font-bold text-[#0a0e17] shadow-[0_0_18px_rgba(0,243,255,0.25)] hover:from-cyan-300 hover:to-cyan-500 transition-all"
            >
              {t(LANDING_SAAS_HERO.ctaStartAr, LANDING_SAAS_HERO.ctaStartEn)}
            </button>
            <button
              type="button"
              className="lg:hidden rounded-lg border border-cyan-500/30 p-2 text-cyan-200"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label="Menu"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="lg:hidden border-t border-cyan-500/15 px-4 py-3 flex flex-col gap-1 bg-[#0a0e17]/98">
            {[
              ['hero', t('الرئيسية', 'Home')],
              ['demo', t('الفيديو', 'Video')],
              ['features', t('المميزات', 'Features')],
              ['ocr', 'OCR'],
              ['dashboard', t('لوحة التحكم', 'Dashboard')],
              ['pricing', t('الأسعار', 'Pricing')],
              ['addons', t('إضافات AI', 'AI add-ons')],
              ['industries', t('القطاعات', 'Industries')],
              ['about', t('من نحن', 'About')],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className="text-start rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-100"
              >
                {label}
              </button>
            ))}
            <a
              href={LANDING_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-start rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-100"
            >
              {t('اتصل بنا', 'Contact')}
            </a>
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                onOpenLogin();
              }}
              className="mt-2 rounded-lg border border-cyan-500/40 py-2 text-sm font-semibold text-cyan-100"
            >
              {t('دخول', 'Sign in')}
            </button>
          </div>
        )}
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section
          id="hero"
          className="landing-animate-in scroll-mt-28 mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-20 sm:pb-28 text-center"
        >
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            SaaS · ERP · POS
          </p>
          <h1 className="mx-auto max-w-4xl text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight tracking-tight bg-gradient-to-b from-white via-cyan-50 to-cyan-300/90 bg-clip-text text-transparent [text-shadow:0_0_40px_rgba(0,243,255,0.15)]">
            {t(LANDING_SAAS_HERO.titleAr, LANDING_SAAS_HERO.titleEn)}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-slate-400 leading-relaxed">
            {t(LANDING_SAAS_HERO.subtitleAr, LANDING_SAAS_HERO.subtitleEn)}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex min-w-[10rem] items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-600 px-8 py-3.5 text-sm font-bold text-[#0a0e17] shadow-[0_0_32px_rgba(0,243,255,0.35)] transition hover:from-cyan-300 hover:to-cyan-500"
            >
              {t(LANDING_SAAS_HERO.ctaStartAr, LANDING_SAAS_HERO.ctaStartEn)}
            </button>
            <button
              type="button"
              onClick={() => scrollTo('demo')}
              className="inline-flex min-w-[10rem] items-center justify-center rounded-xl border-2 border-cyan-500/50 bg-[#0a1020]/80 px-8 py-3.5 text-sm font-semibold text-cyan-100 shadow-[0_0_24px_rgba(0,243,255,0.12)] transition hover:border-cyan-400 hover:bg-cyan-500/10"
            >
              {t(LANDING_SAAS_HERO.ctaDemoAr, LANDING_SAAS_HERO.ctaDemoEn)}
            </button>
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-3">
            <p className="text-[12px] text-slate-500 tracking-[0.02em]">
              {t('بدعم تقني عالمي من', 'Part of Google for Startups Cloud')}
            </p>
            <Image
              src="/landing/google-cloud-reverse-logo.png"
              alt="Google Cloud reverse logo"
              width={180}
              height={63}
              className="h-auto w-[180px]"
              loading="eager"
            />
          </div>
        </section>

        {/* Demo video */}
        <section id="demo" className="scroll-mt-28 border-y border-cyan-500/10 bg-[#060a12]/50 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-center text-xl sm:text-2xl font-bold text-white mb-2">
              {t(LANDING_SAAS_VIDEO.titleAr, LANDING_SAAS_VIDEO.titleEn)}
            </h2>
            <p className="text-center text-sm text-slate-500 mb-8 max-w-2xl mx-auto">
              {t(LANDING_SAAS_VIDEO.captionAr, LANDING_SAAS_VIDEO.captionEn)}
            </p>
            <div className="relative w-full overflow-hidden rounded-2xl border border-cyan-500/20 bg-black shadow-[0_0_40px_rgba(0,243,255,0.12)] aspect-video">
              <iframe
                title={t('عرض فيديو Crown', 'Crown demo video')}
                src={LANDING_YOUTUBE_EMBED_SRC}
                className="absolute inset-0 h-full w-full"
                style={{ border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <p className="mt-4 text-center text-[11px] text-slate-500">youtube.com · Crown Services demo</p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-28 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="text-center text-2xl font-bold text-white mb-3">{t('كل ما تحتاجه في منصة واحدة', 'Everything you need in one platform')}</h2>
          <p className="text-center text-sm text-slate-500 mb-12 max-w-2xl mx-auto">
            {t('وحدات متكاملة للتشغيل اليومي والتقارير.', 'Integrated modules for daily operations and reporting.')}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LANDING_SAAS_FEATURES.map((f) => {
              const Icon = FEATURE_ICON[f.key];
              return (
                <div
                  key={f.key}
                  className="group rounded-2xl border border-cyan-500/20 bg-[#070b14]/90 p-6 shadow-[inset_0_1px_0_rgba(0,243,255,0.06)] transition hover:border-cyan-400/45 hover:shadow-[0_0_28px_rgba(0,243,255,0.12)]"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/35 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition group-hover:scale-105">
                    <Icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{t(f.titleAr, f.titleEn)}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{t(f.descAr, f.descEn)}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* OCR highlight */}
        <section id="ocr" className="scroll-mt-28 border-y border-cyan-500/10 bg-gradient-to-b from-violet-950/20 to-transparent py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="order-2 lg:order-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                  {t(LANDING_SAAS_OCR.titleAr, LANDING_SAAS_OCR.titleEn)}
                </h2>
                <p className="text-slate-400 mb-6">{t(LANDING_SAAS_OCR.introAr, LANDING_SAAS_OCR.introEn)}</p>
                <ul className="space-y-3">
                  {(isAr ? LANDING_SAAS_OCR.bulletsAr : LANDING_SAAS_OCR.bulletsEn).map((b, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-200">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                      <span className="font-medium">{b}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="mt-8 inline-flex rounded-xl border border-cyan-500/40 px-5 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/10 transition-colors"
                >
                  {t('ابدأ وجرب النظام', 'Get started')}
                </button>
              </div>
              <div className="order-1 lg:order-2 relative rounded-2xl border border-cyan-500/25 bg-[#050912] p-2 shadow-[0_0_40px_rgba(167,139,250,0.12)]">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#0a1020]">
                  <Image
                    src="/landing/purchase-import-ocr-preview.png"
                    alt={t('معاينة استيراد ومسح فاتورة شراء', 'Purchase import & invoice scan preview')}
                    fill
                    className="object-contain object-top"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-500 leading-snug px-1">
                  {t(LANDING_SAAS_OCR_IMAGE_CAPTION.ar, LANDING_SAAS_OCR_IMAGE_CAPTION.en)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Sales invoice look (separate from OCR import) */}
        <section
          id="sales-invoice"
          className="scroll-mt-28 border-y border-cyan-500/10 bg-[#060a12]/50 py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="relative rounded-2xl border border-cyan-500/20 bg-[#050912] p-2 shadow-[0_0_40px_rgba(0,243,255,0.08)]">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#f8fafc]">
                  <img
                    src="/landing/invoice-sale-receipt-sample.png?v=20260409"
                    alt={t('فاتورة بيع من النظام', 'Sales invoice from Crown')}
                    className="absolute inset-0 h-full w-full object-contain object-top"
                    loading="eager"
                    decoding="async"
                  />
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-500">
                  {t(LANDING_SAAS_SALES_INVOICE.captionAr, LANDING_SAAS_SALES_INVOICE.captionEn)}
                </p>
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {t(LANDING_SAAS_SALES_INVOICE.titleAr, LANDING_SAAS_SALES_INVOICE.titleEn)}
                </h2>
                <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
                  {t(LANDING_SAAS_SALES_INVOICE.bodyAr, LANDING_SAAS_SALES_INVOICE.bodyEn)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard preview — image + copy only (split from inventory) */}
        <section id="dashboard" className="scroll-mt-28 border-y border-cyan-500/10 bg-[#070b14]/40 py-16 sm:py-24">
          <div className="mx-auto max-w-[100rem] px-4 sm:px-8">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,400px)] lg:items-start">
              <div className="min-w-0 space-y-2">
                <LandingAnimatedDashboard language={language} />
                <p className="text-center text-[11px] text-slate-500">
                  {t(LANDING_SAAS_DASHBOARD.captionAr, LANDING_SAAS_DASHBOARD.captionEn)}
                </p>
              </div>
              <div className="space-y-4 lg:pt-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {t(LANDING_SAAS_DASHBOARD.titleAr, LANDING_SAAS_DASHBOARD.titleEn)}
                </h2>
                <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
                  {t(LANDING_SAAS_DASHBOARD.bodyAr, LANDING_SAAS_DASHBOARD.bodyEn)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Inventory table — separate section */}
        <section id="inventory" className="scroll-mt-28 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)] lg:items-start">
            <div className="min-w-0 space-y-2 order-2 lg:order-1">
              <LandingAnimatedInventory language={language} />
              <p className="text-center text-[11px] text-slate-500">
                {t(LANDING_SAAS_INVENTORY.captionAr, LANDING_SAAS_INVENTORY.captionEn)}
              </p>
            </div>
            <div className="space-y-4 order-1 lg:order-2 lg:pt-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                {t(LANDING_SAAS_INVENTORY.titleAr, LANDING_SAAS_INVENTORY.titleEn)}
              </h2>
              <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
                {t(LANDING_SAAS_INVENTORY.bodyAr, LANDING_SAAS_INVENTORY.bodyEn)}
              </p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-28 border-y border-cyan-500/10 bg-[#060a12]/40 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-2xl font-bold text-cyan-100 mb-2">{t('الباقات', 'Plans')}</h2>
            <p className="text-center text-sm text-slate-500 mb-10">
              {t('اختر ما يناسب نشاطك. يمكنك الترقية لاحقاً.', 'Choose what fits your business. Upgrade anytime.')}
            </p>
            <div className="rounded-2xl border border-cyan-500/10 bg-[#050a12]/80 p-4 sm:p-6">
              <PlanCards billCurrency={billCurrency} onBillCurrencyChange={onBillCurrencyChange} />
            </div>
          </div>
        </section>

        {/* AI add-ons */}
        <section id="addons" className="scroll-mt-28 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <LoginGeminiAddonCards
            language={language}
            billCurrency={billCurrency}
            onBuyAddon={onOpenLogin}
          />
        </section>

        {/* Industries */}
        <section id="industries" className="scroll-mt-28 border-t border-cyan-500/10 bg-[#070b14]/80 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <LoginIndustryStrip language={language} />
          </div>
        </section>

        {/* About */}
        <section id="about" className="scroll-mt-28 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:pb-20">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">{about.title}</h2>
          <div className="rounded-2xl border border-cyan-500/15 bg-[#060a12]/60 p-6 sm:p-8 space-y-4 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {about.story}
          </div>
          <p className="mt-6 text-center text-sm text-cyan-200/90 whitespace-pre-line">{about.aboutMeta}</p>
        </section>

        {/* Contact strip */}
        <section id="contact" className="scroll-mt-28 border-t border-cyan-500/10 py-12 bg-[#050a12]/90">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center space-y-4">
            <h2 className="text-lg font-bold text-white">{t('تواصل معنا', 'Contact us')}</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={LANDING_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600/90 hover:bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-colors"
              >
                {t('واتساب — تحدث معنا', 'WhatsApp — chat with us')}
              </a>
              <a
                href={CONTACT_MAILTO_HREF}
                className="inline-flex text-cyan-300 hover:text-cyan-200 font-semibold text-lg"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-cyan-500/10 bg-[#040810] py-10">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
              <button type="button" onClick={() => scrollTo('about')} className="hover:text-cyan-300 transition-colors">
                {t(LANDING_SAAS_FOOTER.aboutAr, LANDING_SAAS_FOOTER.aboutEn)}
              </button>
              <a
                href={LANDING_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyan-300 transition-colors"
              >
                {t(LANDING_SAAS_FOOTER.contactAr, LANDING_SAAS_FOOTER.contactEn)}
              </a>
              <Link href="/privacy" className="hover:text-cyan-300 transition-colors">
                {t(LANDING_SAAS_FOOTER.privacyAr, LANDING_SAAS_FOOTER.privacyEn)}
              </Link>
              <Link href="/terms" className="hover:text-cyan-300 transition-colors">
                {t(LANDING_SAAS_FOOTER.termsAr, LANDING_SAAS_FOOTER.termsEn)}
              </Link>
            </div>
            <p className="text-xs text-slate-600 text-center sm:text-end">
              © {new Date().getFullYear()} Crown Services · {t(LANDING_SAAS_FOOTER.rightsAr, LANDING_SAAS_FOOTER.rightsEn)}
            </p>
          </div>
          <p className="text-center mt-6 text-[10px] text-slate-600 tracking-wider uppercase">
            POWERED BY CROWN SERVICES · CROWNCS.ORG
          </p>
        </footer>
      </main>
    </div>
  );
}
