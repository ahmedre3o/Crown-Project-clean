'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LogOut } from 'lucide-react';

export function ImpersonationBanner() {
  const { user, isImpersonating, exitImpersonate } = useAuth();
  const { language } = useLanguage();

  if (!isImpersonating || !user) return null;

  const isAr = language === 'ar';

  return (
    <>
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-3 bg-amber-600/95 text-black px-4 py-2 text-sm font-medium shadow-lg"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <span>
        {isAr ? `تشغيل كـ: ${user.username}` : `Impersonating: ${user.username}`}
      </span>
      <button
        onClick={exitImpersonate}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/20 hover:bg-black/30 font-semibold transition-colors"
      >
        <LogOut className="h-4 w-4" />
        {isAr ? 'إنهاء التشغيل' : 'Exit impersonation'}
      </button>
    </div>
    <div className="h-10" aria-hidden />
    </>
  );
}
