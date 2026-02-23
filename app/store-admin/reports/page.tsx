'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DayPicker } from 'react-day-picker';
import { exportReportToCSV, exportReportToExcel, exportReportToPDF } from '../../components/reportExport';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiRequest, useAuth } from '../../contexts/AuthContext';
import { useRouteGuard } from '../../guards/useRouteGuard';
import { canAccess, getPlanFeatures } from '../../permissions';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Sidebar } from '@/components/Sidebar';
import Link from 'next/link';
import { Calendar } from 'lucide-react';

interface ReportSummary {
  ok: boolean;
  range: { from: string; to: string };
  sales: {
    totalRevenue: number;
    ordersCount: number;
    avgOrderValue: number;
    posRevenue: number;
    onlineRevenueConfirmed: number;
    onlineOrdersConfirmedCount: number;
    statusBreakdown?: { pending: number; confirmed: number; completed: number; cancelled: number };
  };
  profit: { available: boolean; totalProfit?: number; profitNoteAr?: string; profitNoteEn?: string };
  charts: {
    dailyRevenue: Array<{ date: string; pos: number; onlineConfirmed: number; total: number }>;
    dailyProfit?: Array<{ date: string; profit: number }>;
  };
  topProducts: Array<{ productId: number; name: string; sku: string; qty: number; revenue: number; source: string }>;
}

function formatDateStr(dateString: string, lang: string) {
  const d = new Date(dateString);
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }).format(d);
}

function normalizeDailyRevenue(
  points: Array<{ date: string; pos: number; onlineConfirmed: number; total: number }>
) {
  if (!points || points.length === 0) return points;
  if (points.length === 1) {
    const [only] = points;
    // Duplicate the single point so the chart always renders as a small wave, not a lone dot
    return [only, { ...only }];
  }
  return points;
}

function normalizeDailyProfit(points: Array<{ date: string; profit: number }>) {
  if (!points || points.length === 0) return [];
  if (points.length === 1) {
    const [only] = points;
    return [only, { ...only }];
  }
  return points;
}

function ensureArray<T>(value: any): T[] {
  return Array.isArray(value) ? value : [];
}

function toNumber(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeReportSummary(raw: any, range: { from: string; to: string }): ReportSummary {
  const payload = raw?.data ?? raw ?? {};
  const fallbackRange = payload?.range?.from && payload?.range?.to ? payload.range : range;
  const profitNoteAr = payload?.profit?.profitNoteAr ?? 'لا توجد بيانات متاحة';
  const profitNoteEn = payload?.profit?.profitNoteEn ?? 'No data available';

  if (payload?.sales) {
    const sales = payload.sales ?? {};
    return {
      ok: payload?.ok !== false,
      range: fallbackRange,
      sales: {
        totalRevenue: toNumber(sales.totalRevenue),
        ordersCount: toNumber(sales.ordersCount),
        avgOrderValue: toNumber(sales.avgOrderValue),
        posRevenue: toNumber(sales.posRevenue),
        onlineRevenueConfirmed: toNumber(sales.onlineRevenueConfirmed),
        onlineOrdersConfirmedCount: toNumber(sales.onlineOrdersConfirmedCount),
        statusBreakdown: sales.statusBreakdown,
      },
      profit: {
        available: Boolean(payload?.profit?.available),
        totalProfit: toNumber(payload?.profit?.totalProfit),
        profitNoteAr,
        profitNoteEn,
      },
      charts: {
        dailyRevenue: ensureArray(payload?.charts?.dailyRevenue ?? payload?.charts?.dailySales),
        dailyProfit: ensureArray(payload?.charts?.dailyProfit),
      },
      topProducts: ensureArray(payload?.topProducts ?? payload?.top_products),
    };
  }

  const posTotal = toNumber(payload?.pos?.total);
  const posCount = toNumber(payload?.pos?.count);
  const onlineTotal = toNumber(payload?.online?.total);
  const onlineCount = toNumber(payload?.online?.count);
  const totalRevenue = posTotal + onlineTotal;
  const ordersCount = posCount + onlineCount;
  const avgOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0;

  return {
    ok: payload?.ok !== false,
    range: fallbackRange,
    sales: {
      totalRevenue,
      ordersCount,
      avgOrderValue,
      posRevenue: posTotal,
      onlineRevenueConfirmed: onlineTotal,
      onlineOrdersConfirmedCount: onlineCount,
    },
    profit: {
      available: false,
      profitNoteAr,
      profitNoteEn,
    },
    charts: {
      dailyRevenue: [],
      dailyProfit: [],
    },
    topProducts: [],
  };
}

export default function ReportsCenterPage() {
  const { t, language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'reports', effectiveRole, showDenied: true });
  const { currency, symbol } = useCurrency();
  const planFeatures = getPlanFeatures(user?.package);
  const canSeeProfit = canAccess(effectiveRole as any, 'reports_profit', planFeatures);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [source, setSource] = useState<'all' | 'pos' | 'online'>('all');
  const [data, setData] = useState<ReportSummary | null>(null);
  const [transactions, setTransactions] = useState<Array<{ id: string; type: string; date: string; total: number; status?: string; publicCode?: string }>>([]);
  const [deadStockData, setDeadStockData] = useState<{ ok?: boolean; summary?: any; items?: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);
  const [group, setGroup] = useState<'day' | 'week' | 'month'>('day');
  const [visibleSeries, setVisibleSeries] = useState({ total: true, online: true, pos: true });
  const [salesView, setSalesView] = useState<'all' | 'total' | 'online' | 'pos'>('all');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayDetails, setDayDetails] = useState<{
    date: string;
    totals?: { total: number; online: number; pos: number };
    invoices?: Array<{ id: number; invoice_number?: string; source?: string; customer_name?: string; total: number; created_at?: string }>;
  } | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);

  // Step 1: confirm we are on the live reports page
  console.log('REPORTS PAGE LOADED v999');

  const validateDates = useCallback(() => {
    if (from && to && from > to) {
      setDateValidationError(language === 'ar' ? 'يجب أن يكون تاريخ البداية قبل أو يساوي تاريخ النهاية' : 'Start date must be before or equal to end date');
      return false;
    }
    setDateValidationError(null);
    return true;
  }, [from, to, language]);

  const loadData = useCallback(async () => {
    if (!validateDates()) return;
    try {
      setLoading(true);
      setError(null);
      setDateValidationError(null);
      const [summaryRes, transRes, deadRes] = await Promise.all([
        apiRequest(`/admin/reports/summary?from=${from}&to=${to}&source=${source}&bucket=${group}`),
        apiRequest(`/admin/reports/transactions?from=${from}&to=${to}&source=${source}&limit=500`).catch(() => ({ ok: true, items: [] })),
        apiRequest(`/admin/reports/dead-stock?days=120&threshold=2`).catch(() => ({ ok: false })),
      ]);
      const summary = normalizeReportSummary(summaryRes, { from, to });
      // Step 2: log raw API data + time-series fields
      console.log('REPORTS API RAW:', summary);
      console.log('dailySales:', (summary as any)?.charts?.dailySales);
      console.log('dailyProfit:', summary?.charts?.dailyProfit);

      setData(summary);
      setTransactions((transRes as { items?: any[] })?.items ?? []);
      setDeadStockData(deadRes as any);
    } catch (e: unknown) {
      setError(String((e as Error)?.message || 'Failed to load'));
    } finally {
      setLoading(false);
    }
  }, [from, to, source, group, validateDates]);

  const fetchDayDetails = useCallback(
    async (date: string) => {
      setSelectedDay(date);
      setDayDetails(null);
      setDayError(null);
      setDayLoading(true);
      try {
        const res = await apiRequest(`/admin/reports/day-details?date=${date}&source=${source}`);
        setDayDetails(res as any);
      } catch (e: any) {
        setDayError(String(e?.message || 'Failed to load day details'));
        setDayDetails(null);
      } finally {
        setDayLoading(false);
      }
    },
    [source]
  );

  React.useEffect(() => {
    if (salesView === 'all') {
      setVisibleSeries({ total: true, online: true, pos: true });
    } else {
      setVisibleSeries({
        total: salesView === 'total',
        online: salesView === 'online',
        pos: salesView === 'pos',
      });
    }
  }, [salesView]);

  const handleLegendClick = useCallback((o: any) => {
    const key = o.dataKey as 'total' | 'online' | 'pos' | 'onlineConfirmed';
    const seriesKey = key === 'onlineConfirmed' ? 'online' : key;
    if (seriesKey !== 'total' && seriesKey !== 'online' && seriesKey !== 'pos') return;
    setVisibleSeries((prev) => ({ ...prev, [seriesKey]: !prev[seriesKey] }));
  }, []);

  const setRange = (preset: 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth') => {
    const end = new Date();
    const start = new Date();
    if (preset === 'today') start.setTime(end.getTime());
    else if (preset === 'yesterday') { start.setDate(end.getDate() - 1); end.setDate(end.getDate() - 1); }
    else if (preset === 'last7') start.setDate(end.getDate() - 6);
    else if (preset === 'last30') start.setDate(end.getDate() - 29);
    else if (preset === 'thisMonth') start.setDate(1);
    else { start.setTime(new Date(end.getFullYear(), end.getMonth() - 1, 1).getTime()); end.setTime(new Date(end.getFullYear(), end.getMonth(), 0).getTime()); }
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
    setDateValidationError(null);
  };

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from) {
      setFrom(range.from.toISOString().slice(0, 10));
      setTo((range.to ?? range.from).toISOString().slice(0, 10));
    }
    setDateValidationError(null);
  };

  const handlePrint = () => {
    window.print();
  };

  if (authLoading || !allowed) return null;

  const handleExportCSV = async () => {
    if (!data) return;
    const BOM = '\uFEFF';
    const rows: string[][] = [
      [language === 'ar' ? 'تقرير المبيعات' : 'Sales Report', from, to],
      [],
      [
        language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue',
        formatCurrency(data.sales.totalRevenue, language === 'ar' ? 'ar' : 'en', currency, symbol),
      ],
      [language === 'ar' ? 'عدد الطلبات' : 'Orders Count', formatNumber(data.sales.ordersCount, language === 'ar' ? 'ar' : 'en')],
      [
        language === 'ar' ? 'متوسط قيمة الطلب' : 'Avg Order Value',
        formatCurrency(data.sales.avgOrderValue, language === 'ar' ? 'ar' : 'en', currency, symbol),
      ],
      [],
      [language === 'ar' ? 'العمليات' : 'Transactions'],
      [language === 'ar' ? 'النوع' : 'Type', language === 'ar' ? 'التاريخ' : 'Date', language === 'ar' ? 'المبلغ' : 'Amount'],
      ...transactions.slice(0, 200).map((tr) => [
        tr.type,
        tr.date,
        formatCurrency(tr.total, language === 'ar' ? 'ar' : 'en', currency, symbol),
      ]),
      [],
      [language === 'ar' ? 'المنتج' : 'Product', language === 'ar' ? 'الكمية' : 'Qty', language === 'ar' ? 'الإيراد' : 'Revenue'],
      ...data.topProducts.map((p) => [
        p.name || p.sku,
        formatNumber(p.qty, language === 'ar' ? 'ar' : 'en'),
        formatCurrency(p.revenue, language === 'ar' ? 'ar' : 'en', currency, symbol),
      ]),
    ];
    const csvText = BOM + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    await exportReportToCSV(csvText, `report_${from}_${to}.csv`);
  };

  const handleExportExcel = async () => {
    if (!data) return;
    const sheets: { name: string; rows: any[][] }[] = [
      {
        name: language === 'ar' ? 'ملخص' : 'Summary',
        rows: [
          [language === 'ar' ? 'تقرير المبيعات' : 'Sales Report', from, to],
          [],
          [language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue', String(data.sales.totalRevenue)],
          [language === 'ar' ? 'عدد الطلبات' : 'Orders Count', String(data.sales.ordersCount)],
          [language === 'ar' ? 'متوسط قيمة الطلب' : 'Avg Order Value', String(data.sales.avgOrderValue)],
          [language === 'ar' ? 'مبيعات نقطة البيع' : 'POS Revenue', String(data.sales.posRevenue)],
          [language === 'ar' ? 'مبيعات الأونلاين المؤكدة' : 'Online Revenue (Confirmed)', String(data.sales.onlineRevenueConfirmed)],
        ],
      },
      {
        name: language === 'ar' ? 'العمليات' : 'Transactions',
        rows: [
          [language === 'ar' ? 'النوع' : 'Type', language === 'ar' ? 'التاريخ' : 'Date', language === 'ar' ? 'المبلغ' : 'Amount', language === 'ar' ? 'الحالة' : 'Status', language === 'ar' ? 'الكود' : 'Code'],
          ...transactions.map((tr) => [tr.type, tr.date, String(tr.total), tr.status || '-', tr.publicCode || '-']),
        ],
      },
      {
        name: language === 'ar' ? 'أفضل المنتجات' : 'TopProducts',
        rows: [
          [language === 'ar' ? 'المنتج' : 'Product', language === 'ar' ? 'SKU' : 'SKU', language === 'ar' ? 'الكمية' : 'Qty', language === 'ar' ? 'الإيراد' : 'Revenue'],
          ...data.topProducts.map((p) => [p.name || p.sku, p.sku, String(p.qty), String(p.revenue)]),
        ],
      },
    ];
    if (data.sales.statusBreakdown) {
      sheets.push({
        name: language === 'ar' ? 'حالة الطلبات' : 'OrdersStatus',
        rows: [
          [language === 'ar' ? 'الحالة' : 'Status', language === 'ar' ? 'العدد' : 'Count'],
          ...Object.entries(data.sales.statusBreakdown).map(([k, v]) => [k, String(v)]),
        ],
      });
    }
    if (data.charts.dailyRevenue?.length) {
      sheets.push({
        name: language === 'ar' ? 'إيرادات يومية' : 'DailyRevenue',
        rows: [
          [language === 'ar' ? 'التاريخ' : 'Date', 'POS', language === 'ar' ? 'أونلاين' : 'Online', language === 'ar' ? 'الإجمالي' : 'Total'],
          ...data.charts.dailyRevenue.map((r) => [r.date, String(r.pos), String(r.onlineConfirmed), String(r.total)]),
        ],
      });
    }
    await exportReportToExcel(sheets, `report_${from}_${to}.xlsx`);
  };

  const handleExportPDF = async () => {
    if (!printAreaRef.current) return;
    try {
      await exportReportToPDF(printAreaRef.current, `report_${from}_${to}.pdf`);
    } catch (_e) {
      window.print();
      setError(language === 'ar' ? 'PDF تعذر، استخدم Print ثم Save as PDF' : 'PDF export failed; use Print then Save as PDF');
      setTimeout(() => setError(null), 5000);
    }
  };

  const dateRange: { from: Date; to?: Date } = {
    from: new Date(from),
    to: to ? new Date(to) : undefined,
  };
  const hasReportContent = Boolean(
    data &&
      (data.sales.totalRevenue !== 0 ||
        data.sales.ordersCount !== 0 ||
        data.sales.avgOrderValue !== 0 ||
        data.topProducts.length > 0 ||
        data.charts.dailyRevenue.length > 0 ||
        (data.profit.available && (data.profit.totalProfit ?? 0) !== 0))
  );

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6">{t('reports.title')}</h1>

        <div className="flex flex-wrap items-center gap-4 mb-6 print:hidden">
          <label className="text-sm text-gray-400">{t('reports.dateRange')}:</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalendarOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-black/50 px-3 py-2 text-cyan-200 hover:bg-cyan-500/10"
            >
              <Calendar className="w-4 h-4" />
              <span>{from} – {to}</span>
            </button>
            {calendarOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} aria-hidden="true" />
                <div className="absolute top-full left-0 mt-2 z-50 rounded-xl border border-cyan-500/40 bg-gray-900 p-4 shadow-xl">
                  <DayPicker
                    mode="range"
                    selected={dateRange}
                    onSelect={handleCalendarSelect}
                    numberOfMonths={1}
                    className="text-cyan-200 [&_.rdp-day_selected]:bg-cyan-500 [&_.rdp-day_range_middle]:bg-cyan-500/30 [&_.rdp-day:hover]:bg-cyan-500/20"
                  />
                </div>
              </>
            )}
          </div>
          <span className="text-gray-500">–</span>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setDateValidationError(null); }}
            className="rounded-lg border border-cyan-500/40 bg-black/50 px-3 py-2 text-cyan-200 w-40"
            title={language === 'ar' ? 'تاريخ البداية (يدوي)' : 'Start date (manual)'}
          />
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setDateValidationError(null); }}
            className="rounded-lg border border-cyan-500/40 bg-black/50 px-3 py-2 text-cyan-200 w-40"
            title={language === 'ar' ? 'تاريخ النهاية (يدوي)' : 'End date (manual)'}
          />
          <div className="flex gap-2 flex-wrap">
            {(['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth'] as const).map((p) => {
              const label = p === 'last7' ? t('reports.last7days') : p === 'last30' ? t('reports.last30days') : t(`reports.${p}`);
              return (
                <button key={p} onClick={() => setRange(p)} className="px-3 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 text-sm">
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setSource('all')}
              className={`px-3 py-1.5 rounded-lg ${source === 'all' ? 'bg-cyan-500/30 border-cyan-500' : 'border border-cyan-500/40'} text-cyan-300`}
            >
              All
            </button>
            <button
              onClick={() => setSource('pos')}
              className={`px-3 py-1.5 rounded-lg ${source === 'pos' ? 'bg-cyan-500/30 border-cyan-500' : 'border border-cyan-500/40'} text-cyan-300`}
            >
              POS
            </button>
            <button
              onClick={() => setSource('online')}
              className={`px-3 py-1.5 rounded-lg ${source === 'online' ? 'bg-cyan-500/30 border-cyan-500' : 'border border-cyan-500/40'} text-cyan-300`}
            >
              Online
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-gray-400">{language === 'ar' ? 'تجميعة' : 'Group'}:</span>
            {(['day', 'week', 'month'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`px-3 py-1.5 rounded-lg text-sm ${group === g ? 'bg-cyan-500/30 border-cyan-500' : 'border border-cyan-500/40'} text-cyan-300`}
              >
                {g === 'day' ? (language === 'ar' ? 'يومي' : 'Daily') : g === 'week' ? (language === 'ar' ? 'أسبوعي' : 'Weekly') : (language === 'ar' ? 'شهري' : 'Monthly')}
              </button>
            ))}
          </div>
          <button onClick={loadData} disabled={loading} className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50">
            {t('reports.generateReport')}
          </button>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10">
              Print
            </button>
            <button onClick={handleExportCSV} disabled={!data} className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50">
              Export CSV
            </button>
            <button onClick={handleExportExcel} disabled={!data} className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50">
              Export Excel
            </button>
            <button onClick={handleExportPDF} disabled={!data} className="px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50">
              Export PDF
            </button>
          </div>
        </div>

        {(dateValidationError || error) && (
          <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-200">
            {dateValidationError || error}
          </div>
        )}

        <div ref={printAreaRef} className="print-area space-y-6 print:space-y-4">
          <div className="hidden print:block border-b border-cyan-500/30 pb-4 mb-4">
            <h2 className="text-xl font-bold text-cyan-200">Crown Services — {t('reports.title')}</h2>
            <p className="text-sm text-gray-400">{from} — {to} | {user?.username || ''} | {new Date().toLocaleString()}</p>
          </div>

          {!data && !loading && (
            <div className="p-8 neon-card rounded-xl text-center text-gray-400 print:hidden">
              <p>{language === 'ar' ? 'اختر الفترة واضغط إنشاء تقرير لعرض البيانات' : 'Select date range and click Generate Report to load data'}</p>
            </div>
          )}

          {data?.ok && !hasReportContent && (
            <div className="p-8 neon-card rounded-xl text-center text-gray-400 print:hidden">
              {language === 'ar' ? 'لا توجد بيانات متاحة' : 'No data available'}
            </div>
          )}

          {data?.ok && hasReportContent && (
            <>
              <div className="p-6 neon-card rounded-xl break-inside-avoid">
                <h3 className="text-xl font-bold mb-4 text-cyan-200">{t('reports.salesSummary')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">{t('dashboard.totalSales')}</p>
                    <p className="text-lg font-bold text-cyan-400">
                      {formatCurrency(
                        data.sales.totalRevenue,
                        language === 'ar' ? 'ar' : 'en',
                        currency,
                        symbol
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      {language === 'ar' ? 'عدد الطلبات' : 'Orders'}
                    </p>
                    <p className="text-lg font-bold">
                      {formatNumber(data.sales.ordersCount, language === 'ar' ? 'ar' : 'en')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      {language === 'ar' ? 'متوسط الطلب' : 'Avg Order'}
                    </p>
                    <p className="text-lg font-bold">
                      {formatCurrency(
                        data.sales.avgOrderValue,
                        language === 'ar' ? 'ar' : 'en',
                        currency,
                        symbol
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('reports.totalOnline')}</p>
                    <p className="text-lg font-bold text-fuchsia-400">
                      {formatCurrency(
                        data.sales.onlineRevenueConfirmed,
                        language === 'ar' ? 'ar' : 'en',
                        currency,
                        symbol
                      )}
                    </p>
                  </div>
                </div>
                {data.charts.dailyRevenue.length > 0 && (
                  <div className="print:hidden">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-sm text-gray-400">{language === 'ar' ? 'عرض' : 'View'}:</span>
                      {(['all', 'total', 'online', 'pos'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setSalesView(v)}
                          className={`px-3 py-1.5 rounded-lg text-sm border ${
                            salesView === v ? 'bg-cyan-500/30 border-cyan-500 text-cyan-200' : 'border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10'
                          }`}
                        >
                          {v === 'all' ? (language === 'ar' ? 'الكل' : 'All') : v === 'total' ? (language === 'ar' ? 'الإجمالي' : 'Total') : v === 'online' ? (language === 'ar' ? 'أونلاين' : 'Online') : 'POS'}
                        </button>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                      <AreaChart data={normalizeDailyRevenue(data.charts.dailyRevenue)}>
                        <defs>
                          <linearGradient id="reportsTotalArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.9} />
                            <stop offset="95%" stopColor="#0b1120" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          tickFormatter={(d) => formatDateStr(d, language)}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          tickFormatter={(v) => formatNumber(v as number, language === 'ar' ? 'ar' : 'en')}
                        />
                        <Tooltip
                          cursor={{ stroke: '#1f2937', strokeWidth: 1 }}
                          contentStyle={{ backgroundColor: '#0b1220', border: '1px solid #00f3ff', borderRadius: '8px' }}
                          labelFormatter={(d) => formatDateStr(d, language)}
                          formatter={(val: any, name: string, props: any) => {
                            const key = props?.dataKey === 'onlineConfirmed' ? 'online' : props?.dataKey;
                            if (key === 'total' && !visibleSeries.total) return null;
                            if (key === 'pos' && !visibleSeries.pos) return null;
                            if (key === 'online' && !visibleSeries.online) return null;
                            const n = Number(val || 0);
                            const label = name === 'onlineConfirmed' ? 'Online' : name;
                            return [formatCurrency(n, language === 'ar' ? 'ar' : 'en', currency, symbol), label];
                          }}
                        />
                        <Legend onClick={handleLegendClick} />
                        <Area
                          type="monotone"
                          dataKey="total"
                          name="Total"
                          stroke="#fbbf24"
                          strokeWidth={3}
                          fill="url(#reportsTotalArea)"
                          dot={false}
                          connectNulls
                          hide={!visibleSeries.total}
                          activeDot={{
                            r: 4,
                            onClick: (_e: any, a: any) => {
                              const p = a?.payload ?? a;
                              if (p?.date) fetchDayDetails(p.date);
                            },
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="pos"
                          stroke="#00f3ff"
                          name="POS"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                          hide={!visibleSeries.pos}
                          activeDot={{
                            r: 4,
                            onClick: (_e: any, a: any) => {
                              const p = a?.payload ?? a;
                              if (p?.date) fetchDayDetails(p.date);
                            },
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="onlineConfirmed"
                          stroke="#ec4899"
                          name="Online"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                          hide={!visibleSeries.online}
                          activeDot={{
                            r: 4,
                            onClick: (_e: any, a: any) => {
                              const p = a?.payload ?? a;
                              if (p?.date) fetchDayDetails(p.date);
                            },
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {canSeeProfit && (
                <div className="p-6 neon-card rounded-xl break-inside-avoid">
                  <h3 className="text-xl font-bold mb-4 text-cyan-200">{t('reports.profitSummary')}</h3>
                  {data.profit.available ? (
                    <>
                      <p className="text-lg font-bold text-fuchsia-400 mb-4">{formatCurrency(data.profit.totalProfit ?? 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}</p>
                      {data.charts.dailyProfit && normalizeDailyProfit(data.charts.dailyProfit).length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={normalizeDailyProfit(data.charts.dailyProfit!)}>
                            <defs>
                              <linearGradient id="reportsProfitArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ec4899" stopOpacity={0.9} />
                                <stop offset="95%" stopColor="#0b1120" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                            <XAxis
                              dataKey="date"
                              stroke="#94a3b8"
                              tickFormatter={(d) => formatDateStr(d, language)}
                            />
                            <YAxis
                              stroke="#94a3b8"
                              tickFormatter={(v) => formatNumber(v as number, language === 'ar' ? 'ar' : 'en')}
                            />
                            <Tooltip
                              cursor={{ stroke: '#1f2937', strokeWidth: 1 }}
                              contentStyle={{ backgroundColor: '#0b1220', border: '1px solid #ec4899', borderRadius: '8px' }}
                              formatter={(val: any) => [
                                formatCurrency(Number(val || 0), language === 'ar' ? 'ar' : 'en', currency, symbol),
                              ]}
                            />
                            <Legend />
                            <Area
                              type="monotone"
                              dataKey="profit"
                              name={t('dashboard.profit')}
                              stroke="#ec4899"
                              strokeWidth={3}
                              fill="url(#reportsProfitArea)"
                              dot={false}
                              connectNulls
                              activeDot={{ r: 4 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-sm text-gray-500 py-4">
                          {language === 'ar'
                            ? 'لا توجد بيانات كافية للرسم'
                            : 'Not enough data to chart'}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">{language === 'ar' ? data.profit.profitNoteAr : data.profit.profitNoteEn}</p>
                  )}
                </div>
              )}

              {data.sales.statusBreakdown && (
                <div className="p-6 neon-card rounded-xl break-inside-avoid">
                  <h3 className="text-xl font-bold mb-4 text-cyan-200">{t('reports.ordersStatusBreakdown')}</h3>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(data.sales.statusBreakdown).map(([k, v]) => (
                      <span key={`status-${k}`} className="px-3 py-2 rounded-lg bg-gray-800/50 border border-cyan-500/20">
                        {k}: <strong>{v}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.topProducts.length > 0 && (
                <div className="p-6 neon-card rounded-xl break-inside-avoid">
                  <h3 className="text-xl font-bold mb-4 text-cyan-200">{t('reports.topProducts')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-700 text-cyan-500">
                          <th className="pb-2 pr-4">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                          <th className="pb-2 pr-4">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                          <th className="pb-2">{language === 'ar' ? 'الإيراد' : 'Revenue'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topProducts.slice(0, 15).map((p, idx) => (
                          <tr key={`top-${idx}-${p.productId}-${p.sku || ''}`} className="border-b border-gray-800">
                            <td className="py-2 pr-4">{p.name || p.sku}</td>
                            <td className="py-2 pr-4">
                              {formatNumber(p.qty, language === 'ar' ? 'ar' : 'en')}
                            </td>
                            <td className="py-2">
                              {formatCurrency(p.revenue, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {deadStockData?.ok && deadStockData.summary && (deadStockData.summary.deadCount > 0 || deadStockData.summary.slowCount > 0) && (
            <div className="p-6 neon-card rounded-xl break-inside-avoid">
              <h3 className="text-xl font-bold mb-4 text-cyan-200">{t('nav.slowMoving')}</h3>
              <p className="text-sm text-gray-400 mb-4">
                {language === 'ar' ? 'الراكد' : 'Dead'}:{' '}
                {formatNumber(deadStockData.summary.deadCount, language === 'ar' ? 'ar' : 'en')}{' '}
                | {language === 'ar' ? 'البطيء' : 'Slow'}:{' '}
                {formatNumber(deadStockData.summary.slowCount, language === 'ar' ? 'ar' : 'en')}{' '}
                | {language === 'ar' ? 'القيمة المربوطة' : 'Tied Value'}:{' '}
                {formatCurrency(
                  (deadStockData.summary.deadValue ?? 0) + (deadStockData.summary.slowValue ?? 0),
                  language === 'ar' ? 'ar' : 'en',
                  currency,
                  symbol
                )}
              </p>
              <Link href="/store-admin/inventory/slow-moving" className="text-cyan-400 hover:underline text-sm print:hidden">
                {language === 'ar' ? 'عرض التفاصيل' : 'View details'}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Day drilldown panel */}
      {selectedDay && (
        <div className="fixed inset-0 z-40 flex items-center justify-end bg-black/40">
          <div className="w-full max-w-md h-full bg-[#020617] border-l border-cyan-500/40 shadow-[0_0_22px_rgba(34,211,238,0.4)] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-cyan-200">
                {language === 'ar' ? 'تفاصيل اليوم' : 'Day details'} — {selectedDay}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedDay(null);
                  setDayDetails(null);
                  setDayError(null);
                }}
                className="text-cyan-300 hover:text-white text-sm"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
            {dayLoading && (
              <p className="text-sm text-gray-400">
                {language === 'ar' ? 'جاري تحميل تفاصيل اليوم...' : 'Loading day details...'}
              </p>
            )}
            {dayError && !dayLoading && (
              <p className="text-sm text-red-400 mb-3">
                {dayError}
              </p>
            )}
            {dayDetails && (
              <>
                {dayDetails.totals && (
                  <div className="mb-4 space-y-1 text-sm">
                    <p>
                      <span className="text-gray-400">{language === 'ar' ? 'الإجمالي' : 'Total'}: </span>
                      <span className="text-cyan-300 font-semibold">
                        {formatCurrency(dayDetails.totals.total, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-400">{language === 'ar' ? 'أونلاين' : 'Online'}: </span>
                      <span className="text-fuchsia-300 font-semibold">
                        {formatCurrency(dayDetails.totals.online, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-400">POS: </span>
                      <span className="text-cyan-200 font-semibold">
                        {formatCurrency(dayDetails.totals.pos, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                      </span>
                    </p>
                  </div>
                )}
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-cyan-200 mb-2">
                    {language === 'ar' ? 'أعلى 10 فواتير' : 'Top 10 invoices'}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-cyan-500/30 text-cyan-300">
                          <th className="py-1 pr-2 text-left">#</th>
                          <th className="py-1 pr-2 text-left">{language === 'ar' ? 'العميل' : 'Customer'}</th>
                          <th className="py-1 pr-2 text-left">{language === 'ar' ? 'المصدر' : 'Source'}</th>
                          <th className="py-1 pr-2 text-left">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(dayDetails.invoices || []).map((inv) => (
                          <tr key={inv.id} className="border-b border-gray-800">
                            <td className="py-1 pr-2">
                              {inv.invoice_number || inv.id}
                            </td>
                            <td className="py-1 pr-2">
                              {inv.customer_name || (language === 'ar' ? 'عميل' : 'Customer')}
                            </td>
                            <td className="py-1 pr-2">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  inv.source === 'online'
                                    ? 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/40'
                                    : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                                }`}
                              >
                                {inv.source === 'online'
                                  ? language === 'ar'
                                    ? 'أونلاين'
                                    : 'ONLINE'
                                  : language === 'ar'
                                  ? 'نقطة بيع'
                                  : 'POS'}
                              </span>
                            </td>
                            <td className="py-1 pr-2">
                              {formatCurrency(inv.total, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                            </td>
                          </tr>
                        ))}
                        {(dayDetails.invoices || []).length === 0 && !dayLoading && (
                          <tr>
                            <td colSpan={4} className="py-2 text-center text-gray-500">
                              {language === 'ar' ? 'لا توجد فواتير' : 'No invoices found'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
