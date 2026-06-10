'use client';

import React from 'react';
import Link from 'next/link';
import { Download, Smartphone, Monitor, Share2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function DownloadPage() {
  const { language, direction } = useLanguage();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);

  return (
    <main className="min-h-screen bg-black text-white" dir={direction}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-cyan-200 mb-2">
          {t('تحميل / تثبيت التطبيق', 'Download / Install App')}
        </h1>
        <p className="text-slate-400 mb-8">
          {t('ثبّت Crown Services ERP على جهازك للاستخدام دون متصفح', 'Install Crown Services ERP on your device for use without a browser')}
        </p>

        <div className="space-y-8">
          {/* Android */}
          <section className="rounded-xl border border-cyan-500/20 bg-[#0b1220] p-6">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="h-8 w-8 text-cyan-400" />
              <h2 className="text-lg font-bold text-cyan-200">{t('أندرويد', 'Android')}</h2>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
              <li>{t('افتح Crown في Chrome', 'Open Crown in Chrome')}</li>
              <li>{t('اضغط على القائمة (⋮) أو نقاط ثلاثية', 'Tap the menu (⋮) or three dots')}</li>
              <li>{t('اختر "إضافة إلى الشاشة الرئيسية" أو "Install app"', 'Select "Add to Home screen" or "Install app"')}</li>
              <li>{t('اضغط "تثبيت" عند الظهور', 'Tap "Install" when prompted')}</li>
            </ol>
            {isAndroid && (
              <p className="mt-3 text-cyan-400 text-xs">
                {t('أنت على أندرويد — استخدم زر القائمة أعلاه', 'You are on Android — use the menu button above')}
              </p>
            )}
          </section>

          {/* iOS */}
          <section className="rounded-xl border border-cyan-500/20 bg-[#0b1220] p-6">
            <div className="flex items-center gap-3 mb-4">
              <Share2 className="h-8 w-8 text-cyan-400" />
              <h2 className="text-lg font-bold text-cyan-200">{t('آيفون / آيباد', 'iPhone / iPad')}</h2>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
              <li>{t('افتح Crown في Safari', 'Open Crown in Safari')}</li>
              <li>{t('اضغط زر المشاركة', 'Tap the Share button')} <span className="text-cyan-400">⎋</span></li>
              <li>{t('اختر "إضافة إلى الشاشة الرئيسية"', 'Select "Add to Home Screen"')}</li>
              <li>{t('اضغط "إضافة"', 'Tap "Add"')}</li>
            </ol>
            {isIOS && (
              <p className="mt-3 text-cyan-400 text-xs">
                {t('أنت على iOS — استخدم زر المشاركة في Safari', 'You are on iOS — use the Share button in Safari')}
              </p>
            )}
          </section>

          {/* Desktop */}
          <section className="rounded-xl border border-cyan-500/20 bg-[#0b1220] p-6">
            <div className="flex items-center gap-3 mb-4">
              <Monitor className="h-8 w-8 text-cyan-400" />
              <h2 className="text-lg font-bold text-cyan-200">{t('كمبيوتر / سطح المكتب', 'Desktop')}</h2>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
              <li>{t('افتح Crown في Chrome أو Edge', 'Open Crown in Chrome or Edge')}</li>
              <li>{t('ابحث عن أيقونة التثبيت', 'Look for the install icon')} <Download className="inline h-4 w-4 text-cyan-400" /> {t('في شريط العنوان', 'in the address bar')}</li>
              <li>{t('اضغط "تثبيت" أو "Install"', 'Click "Install" or "Install"')}</li>
            </ol>
          </section>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
          >
            {t('العودة للرئيسية', 'Back to Home')}
          </Link>
        </div>
      </div>
    </main>
  );
}
