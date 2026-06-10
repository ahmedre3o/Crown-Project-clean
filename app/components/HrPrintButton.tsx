'use client';

import React from 'react';

/** Hides in print; triggers browser print (Save as PDF from dialog). */
export function HrPrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden px-3 py-1 rounded border border-cyan-500/50 text-cyan-200 text-sm hover:bg-cyan-500/10"
    >
      {label}
    </button>
  );
}
