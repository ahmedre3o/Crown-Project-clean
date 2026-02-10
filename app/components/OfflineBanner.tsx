'use client';

import React from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useOffline } from '../contexts/OfflineContext';

export function OfflineBanner() {
  const { language } = useLanguage();
  const { isOnline, queueCount, syncNow } = useOffline();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  if (isOnline && queueCount === 0) return null;

  return (
    <div
      className={`flex items-center justify-center gap-3 px-4 py-2 text-sm ${
        isOnline ? 'bg-amber-500/20 border-b border-amber-500/40 text-amber-300' : 'bg-red-500/20 border-b border-red-500/40 text-red-300'
      }`}
    >
      {!isOnline ? (
        <>
          <CloudOff className="h-4 w-4 flex-shrink-0" />
          <span>{t('أنت غير متصل. سيتم حفظ المبيعات في قائمة الانتظار.', 'You are offline. Sales will be queued for sync.')}</span>
        </>
      ) : (
        <>
          <span>{t('في انتظار المزامنة:', 'Pending sync:')} {queueCount}</span>
          <button
            type="button"
            onClick={() => syncNow()}
            className="flex items-center gap-1 px-2 py-1 rounded bg-cyan-500/30 hover:bg-cyan-500/50 text-cyan-200"
          >
            <RefreshCw className="h-3 w-3" />
            {t('مزامنة الآن', 'Sync now')}
          </button>
        </>
      )}
    </div>
  );
}
