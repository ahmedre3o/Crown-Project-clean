'use client';

import React from 'react';
import { CrownOutlineIcon } from '@/components/CrownOutlineIcon';
import { BRAND_PAGE_BG } from '@/lib/branding';

/** Same branded splash as `app/loading.tsx` — used during auth bootstrap on /login (no blank/white flash). */
export function BrandedLoadingSplash() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ backgroundColor: BRAND_PAGE_BG, minHeight: '100dvh' }}
    >
      <div className="flex h-28 w-28 items-center justify-center rounded-[22%] border-2 border-cyan-500/80 bg-black/40 shadow-[0_0_28px_rgba(0,243,255,0.35)]">
        <CrownOutlineIcon size={56} className="text-cyan-400 drop-shadow-[0_0_12px_rgba(0,243,255,0.6)]" />
      </div>
      <p className="mt-6 text-xs font-medium tracking-wide text-cyan-200/80">Crown Services</p>
    </div>
  );
}
