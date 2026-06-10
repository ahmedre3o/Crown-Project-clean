'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export function InstallPrompt() {
  const { language } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (window as any).standalone === true);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!localStorage.getItem('crown-install-dismissed')) setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowPrompt(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem('crown-install-dismissed', '1');
  }, []);

  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  if (isStandalone || !showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 rounded-lg border border-cyan-500/40 bg-[#0b1220] p-4 shadow-[0_0_24px_rgba(0,243,255,0.2)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm text-cyan-200 font-semibold">{t('ثبّت التطبيق', 'Install App')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('استخدم Crown بدون متصفح', 'Use Crown without browser')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            {t('تثبيت', 'Install')}
          </button>
          <button type="button" onClick={dismiss} className="text-slate-500 hover:text-slate-300 text-sm">
            {t('لاحقاً', 'Later')}
          </button>
        </div>
      </div>
    </div>
  );
}
