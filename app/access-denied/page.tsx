'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldX } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getAccessDeniedMessage } from '../guards/useRouteGuard';
import { getDefaultRedirect } from '../permissions';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '@/components/Sidebar';

export default function AccessDeniedPage() {
  const { language, direction } = useLanguage();
  const searchParams = useSearchParams();
  const { user, effectiveRole } = useAuth();
  const from = searchParams.get('from') || '/';

  const message = getAccessDeniedMessage(language as 'ar' | 'en');
  const redirectPath = getDefaultRedirect((effectiveRole ?? user?.role) as any ?? null);

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto flex items-center justify-center">
        <div className="neon-card rounded-xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-red-500/50 bg-red-500/10 mb-6">
            <ShieldX className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-red-300 mb-3">
            {language === 'ar' ? 'غير مصرح' : 'Access Denied'}
          </h1>
          <p className="text-slate-300 mb-6">{message}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={redirectPath}
              className="px-6 py-3 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition"
            >
              {language === 'ar' ? 'العودة للرئيسية' : 'Go to Home'}
            </Link>
            <Link
              href={from}
              className="px-6 py-3 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 transition"
            >
              {language === 'ar' ? 'العودة للصفحة السابقة' : 'Back'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
