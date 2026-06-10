'use client';

import React from 'react';
import { CrownOutlineIcon } from '@/components/CrownOutlineIcon';

/** Sidebar / storefront crown — same outline as PWA icon, with subtle pulse. */
export function NeonCrownIcon({ className = 'h-5 w-5', size }: { className?: string; size?: number }) {
  const s = size ?? 20;
  return (
    <div
      className={className}
      style={{
        animation: 'crown-pulse 2s ease-in-out infinite',
      }}
    >
      <CrownOutlineIcon size={s} className="text-cyan-200" />
    </div>
  );
}
