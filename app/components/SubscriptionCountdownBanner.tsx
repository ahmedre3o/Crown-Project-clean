'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';

interface SubData {
  planStatus?: string;
  daysLeft?: number | null;
  is_trial?: boolean;
}

export function SubscriptionCountdownBanner() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [sub, setSub] = useState<SubData | null>(null);

  useEffect(() => {
    if (!user || user.role === 'super_admin') return;
    if (pathname === '/settings' || pathname?.startsWith?.('/settings')) return;
    apiRequest('/subscription')
      .then((data: any) => setSub({ planStatus: data?.planStatus, daysLeft: data?.daysLeft ?? data?.remainingDays, is_trial: data?.is_trial }))
      .catch(() => setSub(null));
  }, [user?.id, pathname]);

  if (!sub || sub.planStatus === 'NONE' || sub.planStatus === 'LIFETIME') return null;
  if (sub.daysLeft == null || sub.daysLeft > 5) return null;

  const isAr = language === 'ar';
  const msg =
    sub.planStatus === 'EXPIRED'
      ? sub.is_trial
        ? isAr
          ? 'انتهت الفترة التجريبية. يرجى التجديد.'
          : 'Free trial ended. Please renew.'
        : isAr
        ? 'انتهى الاشتراك. يرجى التجديد.'
        : 'Subscription expired. Please renew.'
      : sub.daysLeft === 1
      ? sub.is_trial
        ? isAr
          ? 'الفترة التجريبية تنتهي غداً.'
          : 'Free trial ends tomorrow.'
        : isAr
        ? 'الاشتراك ينتهي غداً.'
        : 'Subscription ends tomorrow.'
      : sub.is_trial
      ? isAr
        ? `الفترة التجريبية تنتهي خلال ${sub.daysLeft} أيام.`
        : `Free trial ends in ${sub.daysLeft} day(s).`
      : isAr
      ? `المتبقي ${sub.daysLeft} أيام.`
      : `Remaining ${sub.daysLeft} days.`;

  const isExpired = sub.planStatus === 'EXPIRED';

  return (
    <Link
      href="/settings"
      className={`block mb-3 rounded-lg px-3 py-2 text-xs font-medium ${
        isExpired ? 'bg-red-500/15 border border-red-500/40 text-red-300' : 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
      }`}
    >
      {msg} {isAr ? '← الإعدادات' : '→ Settings'}
    </Link>
  );
}
