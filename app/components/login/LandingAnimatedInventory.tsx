'use client';

import React from 'react';
import { CrownServicesLogoMark } from '@/components/login/CrownServicesLogoMark';
import { formatInt, formatMoney, useLiveInt, useLiveMoney } from '@/components/login/landingLiveNumber';

type Lang = 'ar' | 'en';

type Row = {
  nameAr: string;
  nameEn: string;
  sku: string;
  barcode: string;
  stockBase: number;
  buyBase: number;
  sellBase: number;
};

const ROWS: Row[] = [
  {
    nameAr: 'Laser Spark Plugs بوجيهات ليزر',
    nameEn: 'Laser Spark Plugs',
    sku: 'SP-LZ-01',
    barcode: '6221002003001',
    stockBase: 97,
    buyBase: 65,
    sellBase: 80.84,
  },
  {
    nameAr: 'Toyota Oil Filters فلاتر زيت تويوتا',
    nameEn: 'Toyota Oil Filters',
    sku: 'FL-TY-02',
    barcode: '6221002003003',
    stockBase: 197,
    buyBase: 120,
    sellBase: 185,
  },
  {
    nameAr: 'Front Brake Pads فحمات فرامل أمامية',
    nameEn: 'Front Brake Pads',
    sku: 'BP-FR-03',
    barcode: '8801234567891',
    stockBase: 96,
    buyBase: 140,
    sellBase: 180,
  },
  {
    nameAr: 'Rear Shock Absorbers مساعدات خلفية',
    nameEn: 'Rear Shock Absorbers',
    sku: 'SH-RR-04',
    barcode: '5000109020302',
    stockBase: 17,
    buyBase: 850,
    sellBase: 1020,
  },
  {
    nameAr: 'فلتر زيت تويوتا',
    nameEn: 'Toyota oil filter',
    sku: 'FL-TY-05',
    barcode: '6221002003004',
    stockBase: 497,
    buyBase: 1200,
    sellBase: 1800,
  },
];

function LiveStock({ base }: { base: number }) {
  const v = useLiveInt(base, 2200);
  return <span className="tabular-nums">{formatInt(v)}</span>;
}

function LiveMoneyCell({ base }: { base: number }) {
  const v = useLiveMoney(base, 3100);
  return <span className="tabular-nums">{formatMoney(v)}</span>;
}

export function LandingAnimatedInventory({ language }: { language: Lang }) {
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const isAr = language === 'ar';

  return (
    <div
      className="rounded-2xl border border-cyan-500/30 bg-[#070b14]/95 shadow-[0_0_36px_rgba(0,242,255,0.12)] overflow-hidden"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-cyan-500/20 bg-[#05080c]">
        <div className="flex items-center gap-2 min-w-0">
          <CrownServicesLogoMark size="sm" className="opacity-90 shrink-0" />
          <span className="text-base sm:text-lg font-bold text-cyan-100 truncate">{t('المخزون', 'Inventory')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden sm:inline-flex rounded-lg bg-blue-600/90 px-3 py-1.5 text-xs font-semibold text-white">
            + {t('إضافة منتج', 'Add product')}
          </span>
          <span className="hidden sm:inline-flex rounded-lg border border-orange-500/50 bg-orange-500/10 px-3 py-1.5 text-[11px] font-medium text-orange-200">
            {t('التراجع عن آخر استيراد', 'Undo last import')}
          </span>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-cyan-500/10 flex flex-wrap gap-2 items-center bg-[#060a10]/80">
        <div className="flex-1 min-w-[160px] rounded-lg border border-slate-600/50 bg-[#0a0e14] px-3 py-2 text-[11px] text-slate-500">
          {t('البحث بالاسم أو SKU...', 'Search by name or SKU...')}
        </div>
        <span className="rounded-lg border border-slate-600/40 px-2 py-1.5 text-[10px] text-slate-400">
          {t('كل الفروع', 'All branches')}
        </span>
        <span className="text-[10px] text-slate-500">{t('مسح', 'Clear')}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-slate-700/80 bg-[#05080c] text-[11px] text-slate-500">
              <th className="py-2.5 px-3 font-medium w-10">
                <span className="inline-block h-3 w-3 rounded border border-slate-600" />
              </th>
              <th className="py-2.5 px-2 font-medium">{t('اسم المنتج', 'Product')}</th>
              <th className="py-2.5 px-2 font-medium">SKU</th>
              <th className="py-2.5 px-2 font-medium">{t('الباركود', 'Barcode')}</th>
              <th className="py-2.5 px-2 font-medium">{t('المخزون', 'Stock')}</th>
              <th className="py-2.5 px-2 font-medium">{t('سعر البيع', 'Sell')}</th>
              <th className="py-2.5 px-2 font-medium">{t('سعر الشراء', 'Buy')}</th>
              <th className="py-2.5 px-2 font-medium">{t('التوفر', 'Avail.')}</th>
              <th className="py-2.5 px-2 font-medium">{t('تعديل', 'Edit')}</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, ri) => (
              <tr key={row.sku} className={ri % 2 === 0 ? 'bg-[#070b12]' : 'bg-[#0a1018]'}>
                <td className="py-2.5 px-3">
                  <span className="inline-block h-3 w-3 rounded border border-slate-600" />
                </td>
                <td className="py-2.5 px-2 text-sm text-slate-100 max-w-[200px]">
                  {isAr ? row.nameAr : row.nameEn}
                </td>
                <td className="py-2.5 px-2 text-xs font-mono text-slate-500">{row.sku}</td>
                <td className="py-2.5 px-2 text-xs font-mono text-slate-500 tabular-nums">{row.barcode}</td>
                <td className="py-2.5 px-2 text-base font-bold text-emerald-400 tabular-nums" style={{ textShadow: '0 0 10px rgba(74,222,128,0.45)' }}>
                  <LiveStock base={row.stockBase} />
                </td>
                <td className="py-2.5 px-2 text-sm text-slate-200 tabular-nums">
                  <LiveMoneyCell base={row.sellBase} /> {t('ج.م', 'EGP')}
                </td>
                <td className="py-2.5 px-2 text-sm text-slate-400 tabular-nums">
                  <LiveMoneyCell base={row.buyBase} /> {t('ج.م', 'EGP')}
                </td>
                <td className="py-2.5 px-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-2 py-0.5 text-[11px] font-medium text-cyan-300">
                    🛡 {t('متوفر', 'In stock')}
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  <span className="text-cyan-400 text-xs font-medium">✎ {t('تعديل', 'Edit')}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
