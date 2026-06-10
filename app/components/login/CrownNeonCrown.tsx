import React from 'react';
import { CrownOutlineIcon } from '@/components/CrownOutlineIcon';

/** Login card crown — same mark as PWA (scaled up). */
export function CrownNeonCrown({ className = '' }: { className?: string }) {
  return (
    <div className={`drop-shadow-[0_0_18px_rgba(0,243,255,0.65)] ${className}`}>
      <CrownOutlineIcon size={44} className="text-cyan-300" />
    </div>
  );
}
