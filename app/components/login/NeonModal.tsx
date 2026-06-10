'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export type NeonModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Matches login page language */
  dir?: 'rtl' | 'ltr';
  /** id for aria-labelledby */
  titleId?: string;
};

/**
 * Neon / cyberpunk modal — backdrop blur, border glow. No Radix dependency for minimal surface area.
 */
export function NeonModal({ open, onClose, title, children, dir = 'ltr', titleId = 'neon-modal-title' }: NeonModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-label={dir === 'rtl' ? 'إغلاق' : 'Close'}
      />
      <div
        dir={dir}
        className="login-modal-panel relative z-10 w-full max-w-lg rounded-2xl border border-cyan-500/35 bg-[#0b1220]/98 p-6 shadow-[0_0_48px_rgba(0,243,255,0.18),inset_0_1px_0_rgba(0,243,255,0.08)] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 id={titleId} className="text-lg font-bold bg-gradient-to-r from-cyan-200 to-cyan-400 bg-clip-text text-transparent pr-2">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-cyan-500/30 p-1.5 text-cyan-300/90 hover:bg-cyan-500/10 hover:text-cyan-200 transition-colors"
            aria-label={dir === 'rtl' ? 'إغلاق' : 'Close'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="text-slate-200">{children}</div>
      </div>
    </div>
  );
}
