'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { apiRequest } from '@/contexts/AuthContext';
import { BarChart2, Printer } from 'lucide-react';
import { useBranch, getBranchDisplayName } from '@/contexts/BranchContext';
import { logPrintAudit } from '@/lib/printAudit';

interface BalanceSheetItem {
  type: string;
  code: string;
  name: string;
  balance: number;
}

interface ProfitLossData {
  revenue: number;
  expenses: number;
  profit: number;
  from: string;
  to: string;
}

export default function FinancialReportsPage() {
  const { language, direction } = useLanguage();
  const branchCtx = useBranch();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'financial_reports', effectiveRole, showDenied: true });
  const [balanceSheet, setBalanceSheet] = useState<{ asOf: string; items: BalanceSheetItem[] } | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [plFrom, setPlFrom] = useState(new Date().getFullYear() + '-01-01');
  const [plTo, setPlTo] = useState(new Date().toISOString().slice(0, 10));

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const asOfParam = asOf || new Date().toISOString().slice(0, 10);
      const fromParam = plFrom || '1970-01-01';
      const toParam = plTo || '9999-12-31';
      const [bs, pl] = await Promise.all([
        apiRequest(`/admin/reports/balance-sheet?as_of=${encodeURIComponent(asOfParam)}`),
        apiRequest(`/admin/reports/profit-loss?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}`),
      ]);
      setBalanceSheet(bs && typeof bs === 'object' && 'asOf' in bs ? bs as { asOf: string; items: BalanceSheetItem[] } : { asOf: asOfParam, items: [] });
      setProfitLoss(pl && typeof pl === 'object' ? pl as ProfitLossData : null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (language === 'ar' ? 'فشل تحميل التقارير' : 'Failed to load reports');
      setError(msg);
      setBalanceSheet(null);
      setProfitLoss(null);
    } finally {
      setLoading(false);
    }
  }, [language, asOf, plFrom, plTo]);

  useEffect(() => {
    if (allowed) loadReports();
  }, [allowed, loadReports]);

  const handlePrint = async () => {
    await logPrintAudit('financial_reports', 0, branchCtx.activeBranchId ?? undefined);
    window.print();
  };

  if (authLoading || !allowed) return null;

  const title = language === 'ar' ? 'التقارير المالية' : 'Financial Reports';
  const typeLabels: Record<string, string> = {
    asset: language === 'ar' ? 'أصول' : 'Assets',
    liability: language === 'ar' ? 'التزامات' : 'Liabilities',
    equity: language === 'ar' ? 'حقوق ملكية' : 'Equity',
    revenue: language === 'ar' ? 'إيرادات' : 'Revenue',
    expense: language === 'ar' ? 'مصروفات' : 'Expenses',
  };

  /** Western digits + consistent separators — avoids RTL/bidi corruption (e.g. "10.,..") */
  const formatNum = (n: number) => {
    const x = Number(n);
    if (Number.isNaN(x)) return '0.00';
    return x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-cyan-200">{title}</h1>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <label className="text-sm text-slate-400">
              {language === 'ar' ? 'الميزانية حتى:' : 'Balance sheet as of:'}
              <input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="ml-2 px-2 py-1 rounded bg-slate-800 border border-cyan-500/30 text-white text-sm"
              />
            </label>
            <label className="text-sm text-slate-400">
              {language === 'ar' ? 'أرباح/خسائر من:' : 'P&amp;L from:'}
              <input
                type="date"
                value={plFrom}
                onChange={(e) => setPlFrom(e.target.value)}
                className="mx-1 px-2 py-1 rounded bg-slate-800 border border-cyan-500/30 text-white text-sm"
              />
            </label>
            <label className="text-sm text-slate-400">
              {language === 'ar' ? 'إلى:' : 'to:'}
              <input
                type="date"
                value={plTo}
                onChange={(e) => setPlTo(e.target.value)}
                className="ml-1 px-2 py-1 rounded bg-slate-800 border border-cyan-500/30 text-white text-sm"
              />
            </label>
            <button type="button" onClick={loadReports} className="px-3 py-1 rounded border border-cyan-500/50 text-cyan-300 text-sm">
              {language === 'ar' ? 'تحديث' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
            >
              <Printer className="h-4 w-4" />
              {language === 'ar' ? 'طباعة' : 'Print'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-300 text-sm print:hidden">{error}</div>
        )}

        {loading ? (
          <p className="p-8 text-center text-gray-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : (
          <div className="space-y-8 accounting-print">
            <div className="hidden print:block print-branch text-black border-b border-gray-300 pb-3 mb-4">
              <div className="font-bold">Crown ERP</div>
              <div>{language === 'ar' ? 'التقارير المالية' : 'Financial Reports'}</div>
              <div>
                {language === 'ar' ? 'الفرع: ' : 'Branch: '}
                {getBranchDisplayName(branchCtx.activeBranch, language)}
              </div>
            </div>
            {/* Balance Sheet */}
            <section>
              <h2 className="text-xl font-semibold text-cyan-200 mb-4">
                {language === 'ar' ? 'الميزانية العمومية' : 'Balance Sheet'}
                {balanceSheet?.asOf && (
                  <span className="text-sm font-normal text-slate-400 ml-2">({language === 'ar' ? 'حتى' : 'as of'} {balanceSheet.asOf})</span>
                )}
              </h2>
              <div className="rounded-xl border border-cyan-500/30 overflow-hidden">
                {balanceSheet?.items?.length ? (
                  <div className={`table-scroll table-rtl-wrap ${direction === 'rtl' ? 'text-right' : 'text-left'}`} dir={direction}>
                  <table className="data-table text-sm text-slate-200 min-w-[1100px]">
                    <thead>
                      <tr>
                        <th className="table-col-date">{language === 'ar' ? 'النوع' : 'Type'}</th>
                        <th className="table-col-compact">{language === 'ar' ? 'الكود' : 'Code'}</th>
                        <th className="table-col-long">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                        <th className="table-col-currency">{language === 'ar' ? 'الرصيد' : 'Balance'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceSheet.items.map((row, i) => (
                        <tr key={i}>
                          <td className="table-col-date">{typeLabels[row.type] || row.type}</td>
                          <td className="font-mono data-table-num table-col-compact">{row.code}</td>
                          <td className="table-col-long">{row.name}</td>
                          <td className="data-table-num table-col-currency font-semibold">
                            <span dir="ltr" className="inline-block tabular-nums">{formatNum(Number(row.balance))}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                ) : (
                  <p className="p-6 text-center text-gray-400">{language === 'ar' ? 'لا توجد بيانات للميزانية' : 'No balance sheet data'}</p>
                )}
              </div>
            </section>

            {/* Profit & Loss */}
            <section>
              <h2 className="text-xl font-semibold text-cyan-200 mb-4">
                {language === 'ar' ? 'قائمة الدخل (أرباح وخسائر)' : 'Profit &amp; Loss'}
                {profitLoss && (
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    {profitLoss.from} – {profitLoss.to}
                  </span>
                )}
              </h2>
              <div className="rounded-xl border border-cyan-500/30 overflow-hidden">
                {profitLoss ? (
                  <div className="p-6 space-y-4 accounting-print">
                    <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 items-center max-w-xl" dir={direction}>
                      <span className="text-slate-400">{language === 'ar' ? 'الإيرادات' : 'Revenue'}</span>
                      <span dir="ltr" className="tabular-nums text-end text-green-400 font-semibold min-w-[9rem]">
                        {formatNum(Number(profitLoss.revenue))}
                      </span>
                      <span className="text-slate-400">{language === 'ar' ? 'المصروفات' : 'Expenses'}</span>
                      <span dir="ltr" className="tabular-nums text-end text-red-400 font-semibold min-w-[9rem]">
                        {formatNum(Number(profitLoss.expenses))}
                      </span>
                      <span className="font-semibold pt-2 border-t border-cyan-500/20 col-span-1">{language === 'ar' ? 'صافي الربح/الخسارة' : 'Net Profit/Loss'}</span>
                      <span dir="ltr" className={`tabular-nums text-end font-bold min-w-[9rem] pt-2 border-t border-cyan-500/20 ${Number(profitLoss.profit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatNum(Number(profitLoss.profit))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="p-6 text-center text-gray-400">{language === 'ar' ? 'لا توجد بيانات للأرباح والخسائر' : 'No P&amp;L data'}</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
