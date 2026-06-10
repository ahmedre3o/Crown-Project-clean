'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatCurrency } from '@/lib/formatters';
import { useBranch, getBranchDisplayName } from '@/contexts/BranchContext';
import { logPrintAudit } from '@/lib/printAudit';

export default function TaxReportsPage() {
  const { language, direction } = useLanguage();
  const branchCtx = useBranch();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'reports', effectiveRole });
  const { currency, symbol } = useCurrency();
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [monthlyMonth, setMonthlyMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dailyData, setDailyData] = useState<{ date: string; items: any[] }>({ date: '', items: [] });
  const [monthlyData, setMonthlyData] = useState<{ month: string; items: any[] }>({ month: '', items: [] });
  const [byProduct, setByProduct] = useState<any[]>([]);
  const [byInvoice, setByInvoice] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  useEffect(() => {
    if (!allowed) return;
    (async () => {
      setLoading(true);
      try {
        const [d, m, p, i] = await Promise.all([
          apiRequest(`/tax-reports/daily-vat?date=${dailyDate}`),
          apiRequest(`/tax-reports/monthly-summary?month=${monthlyMonth}`),
          apiRequest(rangeFrom && rangeTo ? `/tax-reports/by-product?from=${rangeFrom}&to=${rangeTo}` : '/tax-reports/by-product'),
          apiRequest(rangeFrom && rangeTo ? `/tax-reports/by-invoice?from=${rangeFrom}&to=${rangeTo}` : '/tax-reports/by-invoice'),
        ]);
        setDailyData({ date: (d as any)?.date || dailyDate, items: (d as any)?.items || [] });
        setMonthlyData({ month: (m as any)?.month || monthlyMonth, items: (m as any)?.items || [] });
        setByProduct((p as any)?.items ?? p ?? []);
        setByInvoice((i as any)?.items ?? i ?? []);
      } catch {
        setDailyData({ date: dailyDate, items: [] });
        setMonthlyData({ month: monthlyMonth, items: [] });
        setByProduct([]);
        setByInvoice([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [allowed, dailyDate, monthlyMonth, rangeFrom, rangeTo]);

  if (authLoading || !allowed) return null;

  const isAr = language === 'ar';

  const printPage = async () => {
    await logPrintAudit('tax_reports', 0, branchCtx.activeBranchId ?? undefined);
    window.print();
  };
  const money = (n: number) => (
    <span dir="ltr" className="tabular-nums">
      {formatCurrency(Number(n || 0), 'en', currency, symbol)}
    </span>
  );

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto accounting-print">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-cyan-200">
            {isAr ? 'تقرير الضرائب' : 'Tax Reports'}
          </h1>
          <button
            type="button"
            onClick={() => printPage()}
            className="print:hidden rounded-lg border border-cyan-500/40 px-4 py-2 text-cyan-300 hover:bg-cyan-500/10"
          >
            {isAr ? 'طباعة' : 'Print'}
          </button>
        </div>
        <div className="hidden print:block print-branch text-black border-b border-gray-300 pb-3 mb-4">
          <div className="font-bold">Crown ERP</div>
          <div>{isAr ? 'تقرير الضرائب' : 'Tax Reports'}</div>
          <div>
            {isAr ? 'الفرع: ' : 'Branch: '}
            {getBranchDisplayName(branchCtx.activeBranch, language)}
          </div>
        </div>

        <div className="space-y-8">
          <section className="neon-card rounded-xl p-6 accounting-print">
            <h2 className="text-lg font-semibold text-cyan-300 mb-4">
              {isAr ? 'ضريبة القيمة المضافة اليومية' : 'Daily VAT Report'}
            </h2>
            <div className="flex gap-4 items-center mb-4 print:hidden">
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
              />
            </div>
            {loading ? (
              <p className="text-slate-400">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
            ) : dailyData.items.length > 0 ? (
              <div className={`table-scroll table-rtl-wrap ${direction === 'rtl' ? 'text-right' : 'text-left'}`} dir={direction}>
                <table className="data-table text-sm text-slate-200 min-w-[1000px]">
                  <thead>
                    <tr>
                      <th className="table-col-date">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="table-col-currency">{isAr ? 'صافي المبيعات' : 'Net sales'}</th>
                      <th className="table-col-currency">{isAr ? 'إجمالي الضريبة' : 'Total tax'}</th>
                      <th className="table-col-compact">{isAr ? 'عدد الفواتير' : 'Invoices'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyData.items.map((row: any, i) => (
                      <tr key={i}>
                        <td className="table-col-date">
                          <span dir="ltr" className="tabular-nums">{String(row.sale_date ?? '')}</span>
                        </td>
                        <td className="data-table-num table-col-currency">{money(row.total_net)}</td>
                        <td className="data-table-num table-col-currency">{money(row.total_tax)}</td>
                        <td className="data-table-num table-col-compact">{row.invoice_count ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400">{isAr ? 'لا توجد بيانات لهذا اليوم' : 'No data for this date'}</p>
            )}
          </section>

          <section className="neon-card rounded-xl p-6 accounting-print">
            <h2 className="text-lg font-semibold text-cyan-300 mb-4">
              {isAr ? 'ملخص الضريبة الشهري' : 'Monthly Tax Summary'}
            </h2>
            <div className="flex gap-4 items-center mb-4 print:hidden">
              <input
                type="month"
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(e.target.value)}
                className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
              />
            </div>
            {loading ? (
              <p className="text-slate-400">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
            ) : monthlyData.items.length > 0 ? (
              <div className={`table-scroll table-rtl-wrap ${direction === 'rtl' ? 'text-right' : 'text-left'}`} dir={direction}>
                <table className="data-table text-sm text-slate-200 min-w-[1000px]">
                  <thead>
                    <tr>
                      <th className="table-col-date">{isAr ? 'الشهر' : 'Month'}</th>
                      <th className="table-col-currency">{isAr ? 'صافي المبيعات' : 'Net sales'}</th>
                      <th className="table-col-currency">{isAr ? 'إجمالي الضريبة' : 'Total tax'}</th>
                      <th className="table-col-compact">{isAr ? 'عدد الفواتير' : 'Invoices'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.items.map((row: any, i) => (
                      <tr key={i}>
                        <td className="table-col-date">
                          <span dir="ltr" className="tabular-nums">{String(row.month ?? '')}</span>
                        </td>
                        <td className="data-table-num table-col-currency">{money(row.total_net)}</td>
                        <td className="data-table-num table-col-currency">{money(row.total_tax)}</td>
                        <td className="data-table-num table-col-compact">{row.invoice_count ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400">{isAr ? 'لا توجد بيانات لهذا الشهر' : 'No data for this month'}</p>
            )}
          </section>

          <section className="neon-card rounded-xl p-6 accounting-print">
            <h2 className="text-lg font-semibold text-cyan-300 mb-4">
              {isAr ? 'الضريبة حسب الصنف' : 'Tax per Product'}
            </h2>
            <div className="flex gap-4 items-center mb-4 print:hidden">
              <input
                type="date"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
                placeholder={isAr ? 'من' : 'From'}
              />
              <input
                type="date"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                className="bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2"
                placeholder={isAr ? 'إلى' : 'To'}
              />
            </div>
            {loading ? (
              <p className="text-slate-400">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
            ) : byProduct.length > 0 ? (
              <div className={`table-scroll table-rtl-wrap max-h-80 overflow-y-auto print:max-h-none print:overflow-visible ${direction === 'rtl' ? 'text-right' : 'text-left'}`} dir={direction}>
                <table className="data-table text-sm text-slate-200 min-w-[1000px]">
                  <thead>
                    <tr>
                      <th className="table-col-long">{isAr ? 'المنتج' : 'Product'}</th>
                      <th className="table-col-currency">{isAr ? 'مبيعات بعد الضريبة' : 'Sales (after tax)'}</th>
                      <th className="table-col-currency">{isAr ? 'الضريبة' : 'Tax'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byProduct.map((row: any, i) => (
                      <tr key={i}>
                        <td className="table-col-long">{isAr ? row.name_ar || row.name_en : row.name_en || row.name_ar}</td>
                        <td className="data-table-num table-col-currency">{money(row.total_sales)}</td>
                        <td className="data-table-num table-col-currency">{money(row.total_tax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400">{isAr ? 'لا توجد بيانات' : 'No data'}</p>
            )}
          </section>

          <section className="neon-card rounded-xl p-6 accounting-print">
            <h2 className="text-lg font-semibold text-cyan-300 mb-4">
              {isAr ? 'الضريبة حسب الفاتورة' : 'Tax per Invoice'}
            </h2>
            {loading ? (
              <p className="text-slate-400">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
            ) : byInvoice.length > 0 ? (
              <div className={`table-scroll table-rtl-wrap max-h-80 overflow-y-auto print:max-h-none print:overflow-visible ${direction === 'rtl' ? 'text-right' : 'text-left'}`} dir={direction}>
                <table className="data-table text-sm text-slate-200 min-w-[1200px]">
                  <thead>
                    <tr>
                      <th className="table-col-compact">#</th>
                      <th className="table-col-long">{isAr ? 'رقم الفاتورة' : 'Invoice'}</th>
                      <th className="table-col-date">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="table-col-currency">{isAr ? 'المجموع الفرعي' : 'Subtotal'}</th>
                      <th className="table-col-currency">{isAr ? 'الضريبة' : 'Tax'}</th>
                      <th className="table-col-currency">{isAr ? 'الإجمالي' : 'Grand total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byInvoice.map((row: any, i) => (
                      <tr key={i}>
                        <td className="data-table-num table-col-compact">{row.id}</td>
                        <td className="table-col-long">{row.invoice_number ?? '-'}</td>
                        <td className="data-table-num table-col-date">
                          <span dir="ltr" className="tabular-nums">
                            {row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : '-'}
                          </span>
                        </td>
                        <td className="data-table-num table-col-currency">{money(row.subtotal)}</td>
                        <td className="data-table-num table-col-currency">{money(row.total_tax)}</td>
                        <td className="data-table-num table-col-currency">{money(row.grand_total ?? row.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-400">{isAr ? 'لا توجد فواتير' : 'No invoices'}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
