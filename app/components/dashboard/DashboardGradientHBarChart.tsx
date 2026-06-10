'use client';

import React from 'react';
import { DASHBOARD_BAR_GRADIENT_CSS } from '@/components/dashboard/DashboardRechartsTheme';

/** شريط واحد داخل الصف (نسبة طوله إلى max في نفس السلسلة) */
export type DashboardGradientHBarSegment = {
  value: number;
  max: number;
  display: string;
  /** تسمية قصيرة فوق الرقم (مثلاً: المبيعات / صافي الربح) */
  caption?: string;
};

export type DashboardGradientHBarRow = {
  key: string;
  label: string;
  segments: DashboardGradientHBarSegment[];
  trend?: { pct: number | null; dir: 'up' | 'down' | 'flat' };
};

const TRACK_CLASS =
  'w-full rounded-xl bg-slate-900/95 border border-cyan-500/35 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]';

const FILL_SHADOW =
  '0 0 10px rgba(0, 229, 255, 0.4), 0 0 12px rgba(200, 0, 255, 0.35)';

type Props = {
  rows: DashboardGradientHBarRow[];
  /** وسيلة توضيح للسلاسل (سطر واحد أو اثنين) */
  segmentLegend?: string[];
  className?: string;
};

/**
 * نفس أسلوب «أكثر المنتجات مبيعاً»: مسار داكن + تعبئة بتدرج سماوي→بنفسجي + توهج خفيف.
 * يعتمد على عرض CSS ثابت داخل flex حتى لا تنهار الأشرطة إلى 0px.
 */
export function DashboardGradientHBarChart({ rows, segmentLegend, className }: Props) {
  const segmentCount = Math.max(1, ...rows.map((r) => r.segments.length || 0));
  return (
    <div
      className={`flex flex-col h-[300px] w-full min-w-0 overflow-hidden rounded-lg border border-cyan-500/35 bg-[#030508] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] ${className ?? ''}`}
    >
      {segmentLegend && segmentLegend.length > 0 && (
        <div className="flex flex-wrap gap-3 shrink-0 px-3 pt-3 pb-1 text-xs text-slate-400">
          {segmentLegend.map((s, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-4 rounded-full"
                style={{ background: DASHBOARD_BAR_GRADIENT_CSS, boxShadow: FILL_SHADOW }}
              />
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="relative flex-1 min-h-0">
        <ul className="h-full max-h-[300px] overflow-y-auto overflow-x-hidden scroll-smooth px-3 pb-3 pt-2 crown-dashboard-chart-scroll">
          {rows.map((row) => (
            <li
              key={row.key}
              className="inline-flex align-bottom px-2 first:ps-0 last:pe-0 h-full min-w-[5rem] sm:min-w-[5.5rem] max-w-[7rem]"
              title={`${row.label}\n${row.segments.map((s) => `${s.caption ? `${s.caption}: ` : ''}${s.display}`).join('\n')}`}
            >
              <div className="flex h-full w-full flex-col justify-end">
                <div className="flex h-[202px] items-end justify-center gap-1.5 sm:gap-2">
                  {row.segments.map((seg, si) => {
                    const max = Math.max(Number(seg.max) || 0, 1e-9);
                    const raw = Number(seg.value) || 0;
                    const vAbs = Math.abs(raw);
                    const pct = Math.min(100, (vAbs / max) * 100);
                    const minPct = vAbs > 0 ? Math.max(2, pct) : 0;
                    return (
                      <div
                        key={si}
                        className={`relative flex h-full items-end ${TRACK_CLASS}`}
                        style={{ width: `calc((100% - ${(segmentCount - 1) * 8}px) / ${segmentCount})` }}
                        title={`${seg.caption ? `${seg.caption}: ` : ''}${seg.display}`}
                      >
                        <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-cyan-100/90 whitespace-nowrap">
                          {seg.display}
                        </span>
                        <div dir="ltr" className="h-full w-full flex items-end">
                          <div
                            className="w-full min-h-[2px] rounded-[10px] transition-[height,opacity] duration-300 ease-out hover:opacity-100"
                            style={{
                              height: `${minPct}%`,
                              background: DASHBOARD_BAR_GRADIENT_CSS,
                              boxShadow: FILL_SHADOW,
                              opacity: 0.8,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 space-y-0.5 text-center">
                  <span className="block text-[11px] sm:text-xs text-slate-400 leading-snug break-words">{row.label}</span>
                  {row.trend ? (
                    <span
                      className={`block text-[10px] font-semibold ${
                        row.trend.dir === 'up'
                          ? 'text-emerald-300'
                          : row.trend.dir === 'down'
                            ? 'text-rose-300'
                            : 'text-slate-400'
                      }`}
                    >
                      {row.trend.pct == null
                        ? '—'
                        : row.trend.dir === 'up'
                          ? `↑ ${row.trend.pct.toFixed(1)}%`
                          : row.trend.dir === 'down'
                            ? `↓ ${row.trend.pct.toFixed(1)}%`
                            : `${row.trend.pct.toFixed(1)}%`}
                    </span>
                  ) : null}
                  <div className="space-y-0.5">
                    {row.segments.map((seg, si) => (
                      <div key={`meta-${si}`} className="text-center leading-tight">
                        {seg.caption ? <span className="block text-[10px] text-cyan-300/90 break-words">{seg.caption}</span> : null}
                        <span className="text-[10px] sm:text-[11px] font-mono tabular-nums text-violet-200/95">{seg.display}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#030508] to-transparent" />
      </div>
    </div>
  );
}
