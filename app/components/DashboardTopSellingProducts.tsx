'use client';

import React, { useMemo } from 'react';
import { formatNumber } from '@/lib/formatters';
import { DASHBOARD_BAR_GRADIENT_CSS } from '@/components/dashboard/DashboardRechartsTheme';

export type TopSellingRow = {
  productId: number;
  nameEn?: string | null;
  nameAr?: string | null;
  qtySold: number;
};

type Props = {
  rows: TopSellingRow[];
  language: 'ar' | 'en';
};

/**
 * Horizontal gradient bars scaled vs max qty in the list; width animates when data refreshes.
 */
export function DashboardTopSellingProducts({ rows, language }: Props) {
  const isAr = language === 'ar';
  const maxQty = useMemo(() => Math.max(1, ...rows.map((r) => r.qtySold)), [rows]);

  return (
    <ul className="space-y-0 divide-y divide-gray-800/90 max-h-72 overflow-y-auto pe-1">
      {rows.map((row, idx) => {
        const name = isAr ? row.nameAr || row.nameEn || `#${row.productId}` : row.nameEn || row.nameAr || `#${row.productId}`;
        const pct = Math.min(100, (row.qtySold / maxQty) * 100);
        return (
          <li
            key={`${row.productId}-${idx}`}
            dir={isAr ? 'rtl' : 'ltr'}
            className="flex items-center gap-3 py-2.5 first:pt-0 min-w-0"
          >
            <span className="min-w-0 flex-1 text-sm text-white text-start break-words leading-snug hyphens-auto">
              {name}
            </span>
            {/* Fixed pixel width — % inside flex often collapses to 0 so bars disappeared */}
            <div
              dir="ltr"
              className="h-3 shrink-0 w-[7.5rem] sm:w-[9rem] md:w-[10.5rem] rounded-full bg-slate-900/95 border border-cyan-500/35 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
            >
              <div
                className="h-full min-w-[3px] rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  background: DASHBOARD_BAR_GRADIENT_CSS,
                  opacity: 1,
                  boxShadow: '0 0 10px rgba(0, 229, 255, 0.4), 0 0 12px rgba(200, 0, 255, 0.35)',
                }}
              />
            </div>
            <span
              className="shrink-0 text-violet-300 font-mono tabular-nums text-sm font-semibold w-[4.25rem] text-start"
              dir="ltr"
            >
              ×{formatNumber(row.qtySold, isAr ? 'ar' : 'en')}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
