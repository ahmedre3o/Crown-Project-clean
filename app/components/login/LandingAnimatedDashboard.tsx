'use client';

import React, { useId } from 'react';
import { AlertTriangle, Box, Users } from 'lucide-react';
import { CrownServicesLogoMark } from '@/components/login/CrownServicesLogoMark';
import { formatInt, formatMoney, useLiveInt, useLiveMoney } from '@/components/login/landingLiveNumber';
import { DASHBOARD_BAR_GRADIENT_CSS } from '@/components/dashboard/DashboardRechartsTheme';

type Lang = 'ar' | 'en';

const CYAN = '#22d3ee';
const MAGENTA = '#e879f9';

type Accent = 'cyan' | 'magenta' | 'yellow' | 'rose' | 'orange';

function accentClass(accent: Accent): string {
  switch (accent) {
    case 'cyan':
      return 'text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.35)]';
    case 'magenta':
      return 'text-fuchsia-300 shadow-[0_0_14px_rgba(232,121,249,0.4)]';
    case 'yellow':
      return 'text-amber-300 shadow-[0_0_12px_rgba(250,204,21,0.35)]';
    case 'rose':
      return 'text-rose-300 shadow-[0_0_12px_rgba(251,113,133,0.35)]';
    case 'orange':
      return 'text-orange-300 shadow-[0_0_12px_rgba(251,146,60,0.35)]';
    default:
      return 'text-cyan-300';
  }
}

type ChartSpec = {
  titleAr: string;
  titleEn: string;
  bars: [number, number][];
};

const CHARTS: ChartSpec[] = [
  { titleAr: 'تحليلات المبيعات', titleEn: 'Sales analytics', bars: [[0.72, 0.48], [0.8, 0.58], [0.64, 0.52]] },
  { titleAr: 'عمليات نقاط البيع', titleEn: 'POS operations', bars: [[0.78, 0.4], [0.7, 0.55], [0.85, 0.45]] },
  { titleAr: 'مبيعات أونلاين', titleEn: 'Online sales', bars: [[0.55, 0.68], [0.68, 0.52], [0.58, 0.7]] },
  { titleAr: 'تحليلات الربح', titleEn: 'Profit analytics', bars: [[0.68, 0.5], [0.82, 0.6], [0.72, 0.55]] },
];

function MiniGroupedBarChart({
  spec,
  lang,
  gradCyan,
  gradMagenta,
}: {
  spec: ChartSpec;
  lang: Lang;
  gradCyan: string;
  gradMagenta: string;
}) {
  const w = 120;
  const h = 64;
  const days = spec.bars.length;
  const groupW = w / days - 4;
  const barW = Math.max(4, (groupW - 2) / 2);

  return (
    <div className="rounded-xl border border-cyan-500/25 bg-[#05080c] p-2.5 relative overflow-hidden">
      <p className="text-xs sm:text-[13px] font-semibold text-slate-300 mb-2 text-center leading-snug px-0.5">
        {lang === 'ar' ? spec.titleAr : spec.titleEn}
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="relative z-[2] w-full h-[64px]" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <linearGradient id={gradCyan} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CYAN} />
            <stop offset="100%" stopColor="rgba(34,211,238,0.2)" />
          </linearGradient>
          <linearGradient id={gradMagenta} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MAGENTA} />
            <stop offset="100%" stopColor="rgba(232,121,249,0.2)" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((gi) => (
          <line key={gi} x1="0" y1={14 + gi * 16} x2={w} y2={14 + gi * 16} stroke="rgba(51,65,85,0.35)" strokeWidth="0.5" />
        ))}
        {spec.bars.map(([cy, mg], di) => {
          const gx = 8 + di * (groupW + 8);
          const y0 = h - 6;
          return (
            <g key={di}>
              <rect x={gx} y={y0 - cy * 42} width={barW} height={cy * 42} fill={`url(#${gradCyan})`} rx="1.5" opacity={0.95} />
              <rect x={gx + barW + 1.5} y={y0 - mg * 42} width={barW} height={mg * 42} fill={`url(#${gradMagenta})`} rx="1.5" opacity={0.95} />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-center gap-3 mt-1 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm" style={{ background: CYAN }} />
          {lang === 'ar' ? 'مبيعات' : 'Sales'}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm" style={{ background: MAGENTA }} />
          {lang === 'ar' ? 'عمليات/أرباح' : 'Ops / profit'}
        </span>
      </div>
    </div>
  );
}

function TopSellerRow({
  row,
  label,
  isAr,
  maxQty,
}: {
  row: { qtyBase: number };
  label: string;
  isAr: boolean;
  maxQty: number;
}) {
  const qty = useLiveInt(row.qtyBase, 2600 + row.qtyBase * 17);
  const pct = Math.min(100, maxQty > 0 ? (qty / maxQty) * 100 : 0);
  return (
    <li dir={isAr ? 'rtl' : 'ltr'} className="flex items-start sm:items-center gap-2 py-2.5 first:pt-0 min-w-0">
      <span className="min-w-0 flex-1 text-[10px] sm:text-[11px] leading-snug text-slate-200 text-start break-words whitespace-normal hyphens-auto">
        {label}
      </span>
      <div
        dir="ltr"
        className="h-3 shrink-0 w-[7rem] sm:w-[8.5rem] md:w-[9.5rem] rounded-full bg-slate-900/90 border border-cyan-500/35 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.45)] mt-0.5 sm:mt-0"
      >
        <div
          className="h-full min-w-[3px] rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: DASHBOARD_BAR_GRADIENT_CSS,
            opacity: 1,
            boxShadow: '0 0 10px rgba(0, 229, 255, 0.4), 0 0 12px rgba(200, 0, 255, 0.35)',
          }}
        />
      </div>
      <span className="shrink-0 text-[11px] font-semibold text-violet-300/95 tabular-nums min-w-[2.75rem] text-start" dir="ltr">
        {qty}×
      </span>
    </li>
  );
}

export function LandingAnimatedDashboard({ language }: { language: Lang }) {
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const uid = useId().replace(/:/g, '');
  const isAr = language === 'ar';

  const sales = useLiveMoney(6096.23);
  const online = useLiveMoney(3256.15);
  const posOps = useLiveInt(31);
  const collections = useLiveMoney(22824.93);
  const returns = useLiveMoney(4648.01);
  const expenses = useLiveMoney(300);
  const netProfit = useLiveMoney(74256.73);
  const netSales = useLiveMoney(56278.22);
  const products = useLiveInt(38);
  const costSales = useLiveMoney(53419);
  const stagnant = useLiveInt(22);
  const slow = useLiveInt(6);

  const topSellers: { ar: string; en: string; qtyBase: number }[] = [
    { ar: 'Toyota Oil Filters فلاتر زيت تويوتا', en: 'Toyota Oil Filters', qtyBase: 42 },
    { ar: 'Rear Shock Absorbers مساعدين خلفي', en: 'Rear Shock Absorbers', qtyBase: 28 },
    { ar: 'Laser Spark Plugs بوجيهات ليزر', en: 'Laser Spark Plugs', qtyBase: 19 },
    { ar: 'Front Brake Pads فحمات فرامل أمامية', en: 'Front Brake Pads', qtyBase: 14 },
    { ar: 'فلتر زيت تويوتا', en: 'Toyota oil filter', qtyBase: 9 },
  ];
  const topSellerMaxQty = Math.max(1, ...topSellers.map((r) => r.qtyBase));

  const KpiShell = ({
    labelAr,
    labelEn,
    children,
  }: {
    labelAr: string;
    labelEn: string;
    children: React.ReactNode;
  }) => (
    <div className="rounded-xl border border-cyan-500/25 px-3 sm:px-3.5 py-3 bg-[#060a10]/95 shadow-[inset_0_1px_0_rgba(0,243,255,0.05)] min-w-[168px]">
      <p className="text-[10px] sm:text-[11px] leading-snug text-slate-400 mb-2">{t(labelAr, labelEn)}</p>
      {children}
    </div>
  );

  const MoneyKpi = ({
    labelAr,
    labelEn,
    amount,
    accent,
  }: {
    labelAr: string;
    labelEn: string;
    amount: number;
    accent: Accent;
  }) => (
    <KpiShell labelAr={labelAr} labelEn={labelEn}>
      <div className={`font-bold tabular-nums ${accentClass(accent)}`} dir="ltr">
        <div className="max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:thin]">
          <span className="inline-block text-sm sm:text-base md:text-lg whitespace-nowrap tracking-tight">
            {formatMoney(amount)}
          </span>
        </div>
        <span className="block text-[10px] font-semibold text-slate-500 mt-1">{t('ج.م', 'EGP')}</span>
      </div>
    </KpiShell>
  );

  const IntKpi = ({
    labelAr,
    labelEn,
    n,
    accent,
  }: {
    labelAr: string;
    labelEn: string;
    n: string;
    accent: Accent;
  }) => (
    <KpiShell labelAr={labelAr} labelEn={labelEn}>
      <p className={`text-xl sm:text-2xl font-bold tabular-nums whitespace-nowrap ${accentClass(accent)}`} dir="ltr">
        {n}
      </p>
    </KpiShell>
  );

  return (
    <div
      className="rounded-2xl border border-cyan-500/30 bg-[#070b14]/95 p-4 sm:p-6 shadow-[0_0_36px_rgba(0,242,255,0.14)] overflow-x-auto"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="flex items-center gap-2 mb-4">
        <CrownServicesLogoMark size="sm" className="opacity-95 drop-shadow-[0_0_12px_rgba(0,243,255,0.45)]" />
        <h3 className="text-base sm:text-lg font-bold text-cyan-100/95">{t('لمحة من لوحة التحكم', 'Dashboard preview')}</h3>
      </div>

      <div className="grid grid-cols-1 min-[1100px]:grid-cols-[1fr_minmax(260px,380px)] gap-6 w-full min-w-0">
        <div className="space-y-4 min-w-0">
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(176px,1fr))]">
            <MoneyKpi labelAr="إجمالي المبيعات" labelEn="Total sales" amount={sales} accent="cyan" />
            <MoneyKpi labelAr="مبيعات أونلاين (مؤكدة)" labelEn="Online sales (confirmed)" amount={online} accent="magenta" />
            <IntKpi labelAr="عمليات نقاط البيع" labelEn="POS operations" n={formatInt(posOps)} accent="cyan" />
            <MoneyKpi labelAr="تحصيلات على الحساب" labelEn="Collections on account" amount={collections} accent="cyan" />
          </div>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(176px,1fr))]">
            <MoneyKpi labelAr="إجمالي المرتجعات" labelEn="Total returns" amount={returns} accent="orange" />
            <MoneyKpi labelAr="مصروفات" labelEn="Expenses" amount={expenses} accent="rose" />
            <MoneyKpi labelAr="صافي الربح" labelEn="Net profit" amount={netProfit} accent="cyan" />
            <MoneyKpi labelAr="صافي المبيعات" labelEn="Net sales" amount={netSales} accent="cyan" />
          </div>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(176px,1fr))]">
            <div className="rounded-xl border border-fuchsia-400/45 px-3 py-2.5 flex items-start gap-2 bg-[#060a10]/95 shadow-[0_0_16px_rgba(232,121,249,0.15)] min-w-[168px]">
              <Box className="h-5 w-5 text-fuchsia-400 shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-500">{t('إجمالي المنتجات', 'Total products')}</p>
                <p className={`text-lg sm:text-xl font-bold tabular-nums ${accentClass('magenta')}`} dir="ltr">
                  {formatInt(products)}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-cyan-500/25 px-3 py-2.5 flex items-start gap-2 bg-[#060a10]/95 min-w-[168px]">
              <Users className="h-5 w-5 text-amber-400/90 shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-500">{t('الموظفون المتاحون', 'Available staff')}</p>
                <p className={`text-lg sm:text-xl font-bold tabular-nums ${accentClass('yellow')}`} dir="ltr">
                  2
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-cyan-500/25 px-3 py-2.5 bg-[#060a10]/95 min-w-[168px]">
              <p className="text-[10px] sm:text-[11px] text-slate-500 mb-1">{t('تكلفة المبيعات', 'Cost of sales')}</p>
              <div className={`font-bold tabular-nums ${accentClass('cyan')}`} dir="ltr">
                <div className="max-w-full overflow-x-auto [scrollbar-width:thin]">
                  <span className="inline-block text-sm sm:text-base whitespace-nowrap">{formatMoney(costSales)}</span>
                </div>
                <span className="block text-[10px] font-semibold text-slate-500 mt-1">{t('ج.م', 'EGP')}</span>
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/30 px-3 py-2.5 flex items-start gap-2 bg-[#060a10]/95 min-w-[168px]">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-[11px] text-slate-500">{t('راكد / بطيء', 'Stagnant / slow')}</p>
                <div className={`text-sm font-bold tabular-nums ${accentClass('yellow')} flex flex-col gap-0.5`} dir="ltr">
                  <span>
                    {t('راكد', 'Stagnant')}: {formatInt(stagnant)}
                  </span>
                  <span>
                    {t('بطيء', 'Slow')}: {formatInt(slow)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 pt-1 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            {CHARTS.map((spec, i) => (
              <MiniGroupedBarChart
                key={spec.titleEn}
                spec={spec}
                lang={language}
                gradCyan={`ld-cy-${uid}-${i}`}
                gradMagenta={`ld-mg-${uid}-${i}`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-cyan-500/30 bg-[#05080c] p-3 sm:p-4 min-[1100px]:sticky min-[1100px]:top-4 h-fit shadow-[inset_0_0_20px_rgba(0,243,255,0.04)] min-w-[260px]">
          <p className="text-xs sm:text-sm font-bold text-cyan-200/95 mb-3 text-center leading-snug">
            {t('أكثر المنتجات مبيعاً (بالكمية)', 'Top sellers (by qty)')}
          </p>
          <ul className="space-y-0 divide-y divide-slate-800/90">
            {topSellers.map((row, i) => (
              <TopSellerRow key={i} row={row} isAr={isAr} maxQty={topSellerMaxQty} label={isAr ? row.ar : row.en} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
