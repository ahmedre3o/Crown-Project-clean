'use client';

import React, { useId } from 'react';
import { AlertTriangle, Box, Users } from 'lucide-react';
import { CrownServicesLogoMark } from './CrownServicesLogoMark';

type Lang = 'ar' | 'en';

const CYAN = '#22d3ee';
const MAGENTA = '#e879f9';
const YELLOW = '#facc15';

type Kpi = {
  labelAr: string;
  labelEn: string;
  value: string;
  subAr?: string;
  subEn?: string;
  accent: 'cyan' | 'magenta' | 'yellow' | 'rose' | 'orange';
  highlight?: boolean;
};

const KPI_ROW1: Kpi[] = [
  { labelAr: 'تحصيل (آجل)', labelEn: 'Collections (On Account)', value: '4,330.27', subAr: 'ج.م', subEn: 'EGP', accent: 'cyan' },
  { labelAr: 'معاملات (نقطة + أونلاين)', labelEn: 'Transactions (POS + Online)', value: '8', subAr: 'فواتير + طلبات مؤكدة', subEn: 'Invoices + orders', accent: 'yellow' },
  { labelAr: 'مبيعات أونلاين (مؤكدة)', labelEn: 'Online Sales (Confirmed)', value: '3,256.15', subAr: 'ج.م · طلبان', subEn: 'EGP · 2 orders', accent: 'magenta' },
  { labelAr: 'إجمالي المبيعات', labelEn: 'Total Sales', value: '10,743.55', subAr: 'ج.م', subEn: 'EGP', accent: 'cyan' },
];

const KPI_ROW2: Kpi[] = [
  { labelAr: 'صافي المبيعات', labelEn: 'Net Sales', value: '9,890.12', subAr: 'مبيعات − مرتجعات', subEn: 'Sales − returns', accent: 'cyan' },
  { labelAr: 'صافي الربح', labelEn: 'Net Profit', value: '2,104.88', subAr: 'ج.م', subEn: 'EGP', accent: 'cyan' },
  { labelAr: 'مصروفات', labelEn: 'Expenses', value: '300', subAr: 'ج.م', subEn: 'EGP', accent: 'rose' },
  { labelAr: 'إجمالي المرتجعات', labelEn: 'Total Returns', value: '853.43', subAr: 'ج.م', subEn: 'EGP', accent: 'orange' },
];

const KPI_ROW3: Kpi[] = [
  {
    labelAr: 'راكد / بطيء',
    labelEn: 'Stagnant / Slow',
    value: '27 | 6',
    subAr: 'تنبيهات المخزون',
    subEn: 'Stock alerts',
    accent: 'yellow',
  },
  { labelAr: 'موظفون متصلون', labelEn: 'Connected employees', value: '2', accent: 'yellow' },
  { labelAr: 'إجمالي المنتجات', labelEn: 'Total products', value: '61', accent: 'magenta', highlight: true },
];

type ChartSpec = {
  titleAr: string;
  titleEn: string;
  /** pairs [cyanH, magentaH] per day, 0–1 normalized heights */
  bars: [number, number][];
};

const CHARTS: ChartSpec[] = [
  { titleAr: 'تحليلات الربح', titleEn: 'Profit analytics', bars: [[0.7, 0.45], [0.85, 0.55], [0.6, 0.4]] },
  { titleAr: 'مبيعات أونلاين', titleEn: 'Online sales', bars: [[0.5, 0.65], [0.7, 0.5], [0.55, 0.72]] },
  { titleAr: 'عمليات (نقطة + أونلاين)', titleEn: 'Operations (POS + Online)', bars: [[0.8, 0.35], [0.75, 0.6], [0.9, 0.2]] },
  { titleAr: 'تحليلات المبيعات', titleEn: 'Sales analytics', bars: [[0.65, 0.5], [0.78, 0.62], [0.7, 0.58]] },
];

type StockRow = {
  nameAr: string;
  nameEn: string;
  brand?: string;
  barcode: string;
  stock: number;
  cost: string;
  sell: string;
};

const STOCK_ROWS: StockRow[] = [
  { nameAr: 'فلتر زيت تويوتا', nameEn: 'Toyota oil filter', brand: 'Toyota OEM', barcode: '6221002003003', stock: 500, cost: '120', sell: '185' },
  { nameAr: 'Shell Helix 5W-30', nameEn: 'Shell Helix 5W-30', brand: 'Shell', barcode: '5000109020301', stock: 100, cost: '890', sell: '1,150' },
  { nameAr: 'علبة كلتش ياباني', nameEn: 'Japanese clutch kit', barcode: '8801234567890', stock: 46, cost: '2,400', sell: '3,200' },
  { nameAr: 'Alizyme', nameEn: 'Alizyme', barcode: '6281234000123', stock: 250, cost: '45', sell: '72' },
  { nameAr: 'Augmentin 1gm', nameEn: 'Augmentin 1gm', barcode: '3573990012345', stock: 684, cost: '180', sell: '240' },
];

function accentClass(accent: Kpi['accent']): string {
  switch (accent) {
    case 'cyan':
      return 'text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.35)]';
    case 'magenta':
      return 'text-fuchsia-300 shadow-[0_0_12px_rgba(232,121,249,0.4)]';
    case 'yellow':
      return 'text-amber-300 shadow-[0_0_10px_rgba(250,204,21,0.35)]';
    case 'rose':
      return 'text-rose-300 shadow-[0_0_10px_rgba(251,113,133,0.35)]';
    case 'orange':
      return 'text-orange-300 shadow-[0_0_10px_rgba(251,146,60,0.35)]';
    default:
      return 'text-cyan-300';
  }
}

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
  const w = 100;
  const h = 52;
  const days = spec.bars.length;
  const groupW = w / days - 4;
  const barW = Math.max(3, (groupW - 2) / 2);

  return (
    <div className="rounded-lg border border-cyan-500/25 bg-[#05080c] p-2 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
        <div className="absolute inset-y-0 w-[45%] bg-gradient-to-r from-transparent via-cyan-200/12 to-transparent login-chart-shimmer-overlay opacity-80" />
      </div>
      <p className="relative z-[2] text-[9px] font-semibold text-slate-400 mb-1 text-center leading-tight">
        {lang === 'ar' ? spec.titleAr : spec.titleEn}
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="relative z-[2] w-full h-[52px]" preserveAspectRatio="xMidYMid meet" aria-hidden>
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
          <line key={gi} x1="0" y1={12 + gi * 14} x2={w} y2={12 + gi * 14} stroke="rgba(51,65,85,0.35)" strokeWidth="0.5" />
        ))}
        {spec.bars.map(([cy, mg], di) => {
          const gx = 6 + di * (groupW + 6);
          const y0 = h - 4;
          return (
            <g key={di}>
              <rect x={gx} y={y0 - cy * 36} width={barW} height={cy * 36} fill={`url(#${gradCyan})`} rx="1" opacity={0.95} />
              <rect x={gx + barW + 1} y={y0 - mg * 36} width={barW} height={mg * 36} fill={`url(#${gradMagenta})`} rx="1" opacity={0.95} />
            </g>
          );
        })}
      </svg>
      <div className="relative z-[2] flex justify-center gap-3 mt-0.5 text-[7px] text-slate-500">
        <span className="flex items-center gap-0.5">
          <span className="h-1.5 w-1.5 rounded-sm" style={{ background: CYAN }} />
          {lang === 'ar' ? 'مبيعات' : 'Sales'}
        </span>
        <span className="flex items-center gap-0.5">
          <span className="h-1.5 w-1.5 rounded-sm" style={{ background: MAGENTA }} />
          {lang === 'ar' ? 'أرباح/عمليات' : 'Profit/Ops'}
        </span>
      </div>
    </div>
  );
}

export function LoginDashboardPreview({ language }: { language: Lang }) {
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const uid = useId().replace(/:/g, '');
  const gradCyan = `dash-cy-${uid}`;
  const gradMagenta = `dash-mg-${uid}`;
  const isAr = language === 'ar';

  const KpiCard = ({ k }: { k: Kpi }) => (
    <div
      className={`rounded-lg border px-2 py-1.5 bg-[#060a10]/95 ${
        k.highlight
          ? 'border-fuchsia-400/60 shadow-[0_0_16px_rgba(232,121,249,0.25)]'
          : 'border-cyan-500/20 shadow-[inset_0_1px_0_rgba(0,243,255,0.04)]'
      }`}
    >
      <p className="text-[8px] leading-tight text-slate-500 mb-0.5 line-clamp-2">{t(k.labelAr, k.labelEn)}</p>
      <p className={`text-sm font-bold tabular-nums leading-none ${accentClass(k.accent)}`}>{k.value}</p>
      {k.subAr && <p className="text-[7px] text-slate-600 mt-0.5">{t(k.subAr, k.subEn!)}</p>}
    </div>
  );

  return (
    <div className="rounded-2xl border border-cyan-500/35 bg-[#070b14]/90 p-3 sm:p-4 shadow-[0_0_28px_rgba(0,242,255,0.12)]">
      <div className="flex items-center gap-2 mb-3">
        <CrownServicesLogoMark size="sm" className="opacity-95 drop-shadow-[0_0_10px_rgba(0,243,255,0.4)]" />
        <h2 className="text-sm font-bold text-cyan-100/90">{t('لمحة من لوحة التحكم', 'Dashboard preview')}</h2>
      </div>

      <div className="space-y-3">
        {/* KPI grids — inventory & sales reality */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {KPI_ROW1.map((k, i) => (
            <KpiCard key={`r1-${i}`} k={k} />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {KPI_ROW2.map((k, i) => (
            <KpiCard key={`r2-${i}`} k={k} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {KPI_ROW3.map((k, i) => (
            <div
              key={`r3-${i}`}
              className={`rounded-lg border px-2 py-1.5 flex items-start gap-2 bg-[#060a10]/95 ${
                k.highlight ? 'border-fuchsia-400/55 shadow-[0_0_14px_rgba(232,121,249,0.2)]' : 'border-cyan-500/20'
              }`}
            >
              {i === 0 && <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />}
              {i === 1 && <Users className="h-4 w-4 text-amber-400/90 shrink-0 mt-0.5" aria-hidden />}
              {i === 2 && <Box className="h-4 w-4 text-fuchsia-400 shrink-0 mt-0.5" aria-hidden />}
              <div className="min-w-0 flex-1">
                <p className="text-[8px] text-slate-500 leading-tight">{t(k.labelAr, k.labelEn)}</p>
                <p className={`text-sm font-bold tabular-nums ${accentClass(k.accent)}`}>{k.value}</p>
                {k.subAr && <p className="text-[7px] text-slate-600">{t(k.subAr, k.subEn!)}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Grouped bar charts — cyan / magenta */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
          {CHARTS.map((spec, i) => (
            <MiniGroupedBarChart key={i} spec={spec} lang={language} gradCyan={`${gradCyan}-${i}`} gradMagenta={`${gradMagenta}-${i}`} />
          ))}
        </div>

        {/* Stock / inventory table */}
        <div
          className="rounded-xl border border-cyan-500/35 bg-[#0a0e14] overflow-hidden shadow-[0_0_18px_rgba(0,242,255,0.1)]"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="px-2 py-1.5 border-b border-cyan-500/20 bg-[#05080c]">
            <span className="text-[10px] font-bold text-cyan-200/90">{t('المخزون — جدول الأصناف', 'Inventory — stock table')}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[9px]">
              <thead>
                <tr className="border-b border-slate-700/80 bg-[#060a12] text-slate-500">
                  <th className="py-1.5 px-2 font-medium text-start">{t('الصنف', 'Product')}</th>
                  <th className="py-1.5 px-1 font-medium">{t('الباركود', 'Barcode')}</th>
                  <th className="py-1.5 px-1 font-medium">{t('المخزون', 'Stock')}</th>
                  <th className="py-1.5 px-1 font-medium">{t('التكلفة', 'Cost')}</th>
                  <th className="py-1.5 px-1 font-medium">{t('سعر البيع', 'Sell')}</th>
                  <th className="py-1.5 px-1 font-medium">{t('الحالة', 'Status')}</th>
                  <th className="py-1.5 px-1 font-medium">{t('تعديل', 'Edit')}</th>
                </tr>
              </thead>
              <tbody>
                {STOCK_ROWS.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-[#070b12]' : 'bg-[#0a1018]'}>
                    <td className="py-1.5 px-2 text-start">
                      <div className="text-slate-200 leading-tight">{isAr ? row.nameAr : row.nameEn}</div>
                      {row.brand && <div className="text-[8px] text-slate-600">{row.brand}</div>}
                    </td>
                    <td className="py-1.5 px-1 text-slate-500 font-mono tabular-nums">{row.barcode}</td>
                    <td className="py-1.5 px-1 font-bold tabular-nums text-emerald-400" style={{ textShadow: '0 0 8px rgba(74,222,128,0.45)' }}>
                      {row.stock}
                    </td>
                    <td className="py-1.5 px-1 text-slate-400 tabular-nums">
                      {row.cost} {t('ج.م', 'EGP')}
                    </td>
                    <td className="py-1.5 px-1 text-slate-300 tabular-nums">
                      {row.sell} {t('ج.م', 'EGP')}
                    </td>
                    <td className="py-1.5 px-1">
                      <span className="text-cyan-400/90">{t('متوفر', 'In stock')}</span>
                    </td>
                    <td className="py-1.5 px-1">
                      <span className="inline-flex items-center gap-0.5 text-cyan-400 font-medium">
                        <span className="opacity-80">✎</span>
                        {t('تعديل', 'Edit')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
