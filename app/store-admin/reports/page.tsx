'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useBranch, getBranchDisplayName } from '@/contexts/BranchContext';
import { logPrintAudit } from '@/lib/printAudit';

interface ReportSummary {
  ok: boolean;
  range: { from: string; to: string };
  sales: {
    totalRevenue: number;
    ordersCount: number;
    avgOrderValue: number;
    posRevenue: number;
    posOrdersCount: number;
    onlineRevenueConfirmed: number;
    onlineOrdersConfirmedCount: number;
    statusBreakdown?: { pending: number; confirmed: number; completed: number; cancelled: number };
    expenses_total?: number;
    net_sales?: number;
    cash_drawer_net?: number;
    returns_total?: number;
    collections_total?: number;
  };
  profit: { available: boolean; totalProfit?: number; profit?: number; sales?: number; expenses?: number; cogs?: number; orders_count?: number; profitNoteAr?: string; profitNoteEn?: string };
  charts: {
    dailyRevenue: Array<{ date: string; pos: number; onlineConfirmed: number; total: number; orders?: number; ordersPos?: number; ordersOnline?: number }>;
    dailyProfit?: Array<{ date: string; profit: number }>;
  };
  topProducts: Array<{ productId: number; name: string; sku: string; qty: number; revenue: number; source: string }>;
}

/** Local calendar YYYY-MM-DD (fixes ISO midnight shifting UTC day vs. user day). */
function localDateKeyFromIso(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso || '').slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateStr(dateString: string, lang: string) {
  const s = String(dateString || '');
  if (s.includes(' ') && / \d{1,2}:/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const hour = d.getHours();
      // 24h labels avoid duplicate "12 PM" for noon vs. fallback duplicates / midnight confusion
      return `${String(hour).padStart(2, '0')}:00`;
    }
  }
  const d = new Date(dateString);
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }).format(d);
}

/** When API hourly profit is empty but total profit exists (e.g. edge cases), shape series from revenue. */
function distributeProfitByRevenue(
  revenue: Array<{ date: string; total?: number }>,
  totalProfit: number
): Array<{ date: string; profit: number }> {
  const safe = revenue.filter((p) => p?.date);
  if (safe.length === 0) return [];
  const sumRev = safe.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
  if (Math.abs(totalProfit) < 1e-9) return safe.map((p) => ({ date: p.date, profit: 0 }));
  if (sumRev <= 0) {
    const each = totalProfit / safe.length;
    return safe.map((p) => ({ date: p.date, profit: each }));
  }
  return safe.map((p) => ({
    date: p.date,
    profit: totalProfit * ((Number(p.total) || 0) / sumRev),
  }));
}

/** Soft bell around ~13:00 so synthetic hourly rows are not a flat line when API returns no hourly points. */
function hourlyBellWeights24(): number[] {
  const center = 13;
  const sigma = 3.5;
  return Array.from({ length: 24 }, (_, h) =>
    Math.exp(-0.5 * Math.pow((h - center) / sigma, 2))
  );
}

function distributeFloatByWeights(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  return weights.map((w) => (total * w) / sum);
}

/** Split integer count (e.g. orders) across buckets by weight (largest remainder). */
function distributeIntegersByWeights(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return Array(n).fill(0);
  const raw = weights.map((w) => (total * w) / sum);
  const floors = raw.map((x) => Math.floor(x));
  let rem = Math.max(0, Math.round(total - floors.reduce((a, b) => a + b, 0)));
  const frac = raw.map((x, i) => ({ i, f: x - Math.floor(x) }));
  frac.sort((a, b) => b.f - a.f);
  const out = [...floors];
  for (let k = 0; k < rem && k < frac.length; k++) out[frac[k].i] += 1;
  return out;
}

function fillDateRange<T extends { date: string }>(
  points: T[],
  from: string,
  to: string,
  empty: (d: string) => T
): T[] {
  if (!points?.length) return [];
  const map = new Map<string, T>();
  for (const p of points) map.set(String(p.date).slice(0, 10), p);
  const out: T[] = [];
  const start = new Date(from);
  const end = new Date(to || from);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    out.push(map.get(key) ?? empty(key));
  }
  return out;
}

function normalizeDailyRevenue(
  points: Array<{ date: string; pos: number; onlineConfirmed: number; total: number; orders?: number; ordersPos?: number; ordersOnline?: number }>,
  from?: string,
  to?: string,
  bucket?: string
) {
  if (!points || points.length === 0) return points;
  // Hourly series: first point has a datetime string; do NOT run day-based fillDateRange (breaks <24 sparse hours).
  const firstDate = String(points[0]?.date ?? '');
  const isHourly = bucket === 'hour' || firstDate.includes(' ') || firstDate.includes('T');
  if (isHourly) return points;
  const empty = (d: string) => ({
    date: d,
    pos: 0,
    onlineConfirmed: 0,
    total: 0,
    orders: 0,
    ordersPos: 0,
    ordersOnline: 0,
  });
  const filled = from && to ? fillDateRange(points, from, to, empty) : points;
  if (filled.length === 1) {
    return [filled[0], { ...filled[0] }];
  }
  return filled;
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

/** Normalize chart x-axis date from API (string or Date). Hourly must keep time so filters are not broken. */
function toChartDateKey(value: unknown, isHourly: boolean): string {
  if (value instanceof Date) {
    if (isHourly) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      const h = String(value.getHours()).padStart(2, '0');
      return `${y}-${m}-${d} ${h}:00:00`;
    }
    return value.toISOString().slice(0, 10);
  }
  const s = String(value ?? '');
  if (isHourly) {
    if (s.includes(' ') || s.includes('T')) return s.includes('T') ? s.replace('T', ' ').slice(0, 19) : s;
    return `${s.slice(0, 10)} 12:00:00`;
  }
  return s.slice(0, 10);
}

function normalizeRevenuePoints(raw: any) {
  const points = ensureArray<any>(raw?.points ?? raw);
  const isHourly = raw?.bucket === 'hour';
  return points
    .filter((p: any) => p?.date != null && p?.date !== '')
    .map((p: any) => {
      const pos = toNumber(p.posAmount ?? p.pos ?? 0);
      const online = toNumber(p.onlineAmount ?? p.onlineConfirmed ?? p.online ?? 0);
      const total = toNumber(p.totalAmount ?? p.total ?? pos + online);
      const posOrders = toNumber(p.posCount ?? 0);
      const onlineOrders = toNumber(p.onlineCount ?? 0);
      const orders = toNumber(p.totalCount ?? p.ordersCount ?? p.count ?? posOrders + onlineOrders);
      const dateStr = toChartDateKey(p.date, isHourly);
      return {
        date: isHourly ? dateStr : dateStr.slice(0, 10),
        pos,
        onlineConfirmed: online,
        total,
        orders,
        ordersPos: posOrders,
        ordersOnline: onlineOrders,
      };
    });
}

function normalizeProfitResponse(raw: any) {
  const payload = raw?.data ?? raw ?? {};
  const bucket = payload?.bucket ?? 'day';
  const list = ensureArray<any>(payload?.dailyProfit ?? payload?.points ?? []);
  const dailyProfit = list
    .filter((p: any) => p?.date != null && p?.date !== '')
    .map((p: any) => {
      const dateStr = toChartDateKey(p.date, bucket === 'hour');
      const profitVal = p.profit ?? p.totalProfit ?? p.amount ?? p.value;
      return {
        date: bucket === 'hour' ? dateStr : dateStr.slice(0, 10),
        profit: typeof profitVal === 'number' && Number.isFinite(profitVal) ? profitVal : toNumber(profitVal),
      };
    });
  const totalProfit = toNumber(
    payload?.profit ?? payload?.totalProfit ?? dailyProfit.reduce((sum, p) => sum + Number(p.profit || 0), 0)
  );
  return { totalProfit, dailyProfit };
}

function buildEmptyRevenue(from: string, to: string) {
  const fromDate = from.includes('T') ? from.slice(0, 10) : from.slice(0, 10);
  const toDate = to.includes('T') ? to.slice(0, 10) : (to || from).slice(0, 10);
  if (fromDate === toDate) {
    return Array.from({ length: 24 }, (_, h) => ({
      date: `${fromDate} ${String(h).padStart(2, '0')}:00:00`,
      pos: 0,
      onlineConfirmed: 0,
      total: 0,
      orders: 0,
      ordersPos: 0,
      ordersOnline: 0,
    }));
  }
  return [
    { date: fromDate, pos: 0, onlineConfirmed: 0, total: 0, orders: 0, ordersPos: 0, ordersOnline: 0 },
    { date: toDate, pos: 0, onlineConfirmed: 0, total: 0, orders: 0, ordersPos: 0, ordersOnline: 0 },
  ];
}

function buildEmptyProfit(from: string, to: string) {
  const fromDate = from.includes('T') ? from.slice(0, 10) : from.slice(0, 10);
  const toDate = to.includes('T') ? to.slice(0, 10) : (to || from).slice(0, 10);
  if (fromDate === toDate) {
    return Array.from({ length: 24 }, (_, h) => ({
      date: `${fromDate} ${String(h).padStart(2, '0')}:00:00`,
      profit: 0,
    }));
  }
  return [
    { date: fromDate, profit: 0 },
    { date: toDate, profit: 0 },
  ];
}

function normalizeReportSummary(raw: any, range: { from: string; to: string }): ReportSummary {
  const payload = raw?.data ?? raw ?? {};
  const fallbackRange = payload?.range?.from && payload?.range?.to ? payload.range : range;
  const profitNoteAr = payload?.profit?.profitNoteAr ?? 'لا توجد بيانات متاحة';
  const profitNoteEn = payload?.profit?.profitNoteEn ?? 'No data available';

  const sales = payload?.sales ?? payload ?? {};
  const posTotal = toNumber(sales.posRevenue ?? payload.posRevenue ?? payload?.pos?.total);
  const posCount = toNumber(sales.posOrdersCount ?? payload.posOrdersCount ?? payload?.pos?.count);
  const onlineTotal = toNumber(sales.onlineRevenueConfirmed ?? payload.onlineRevenueConfirmed ?? payload?.online?.total);
  const onlineCount = toNumber(sales.onlineOrdersConfirmedCount ?? payload.onlineOrdersConfirmedCount ?? payload?.online?.count);

  const totalRevenue = posTotal + onlineTotal;
  const ordersCount = posCount + onlineCount;

  const returnsTotal = toNumber(sales.returns_total ?? payload.returns_total);
  const expensesTotal = toNumber(sales.expenses_total ?? payload.expenses_total);
  const collectionsTotal = toNumber(sales.collections_total ?? payload.collections_total);
  const posOrdersCount = toNumber(sales.posOrdersCount ?? payload.posOrdersCount);
  const onlineOrdersCount = toNumber(sales.onlineOrdersConfirmedCount ?? payload.onlineOrdersConfirmedCount);

  const netSales = totalRevenue - returnsTotal;
  const cashDrawerNet = posTotal + collectionsTotal - expensesTotal - returnsTotal;

  const avgOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0;
  const resolvedPosOrdersCount = posOrdersCount > 0 ? posOrdersCount : Math.max(0, ordersCount - onlineOrdersCount);

  return {
    ok: payload?.ok !== false,
    range: fallbackRange,
    sales: {
      totalRevenue,
      ordersCount,
      avgOrderValue,
      posRevenue: posTotal,
      posOrdersCount: resolvedPosOrdersCount,
      onlineRevenueConfirmed: onlineTotal,
      onlineOrdersConfirmedCount: onlineCount,
      statusBreakdown: sales.statusBreakdown,
      expenses_total: expensesTotal,
      net_sales: netSales,
      cash_drawer_net: cashDrawerNet,
      returns_total: returnsTotal,
      collections_total: collectionsTotal,
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

export default function ReportsCenterPage() {
  const { t, language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'reports', effectiveRole, showDenied: true });
  const { currency, symbol } = useCurrency();
  const planFeatures = getPlanFeatures(user?.package);
  const canSeeProfit = canAccess(effectiveRole as any, 'reports_profit', planFeatures);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const branchCtx = useBranch();
  /** Local day boundaries as ISO (UTC) so DB with UTC stored dates returns correct "today" / "yesterday". */
  const getLocalRange = useCallback((preset: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    let start: Date;
    let end: Date;
    if (preset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (preset === 'yesterday') {
      start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'last7') {
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (preset === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      end = new Date(now.getFullYear(), now.getMonth() - 1, lastDay.getDate(), 23, 59, 59, 999);
    }
    return { from: start.toISOString(), to: end.toISOString() };
  }, []);

  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const todayLocal = new Date();
  const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(todayStr);
  const [data, setData] = useState<ReportSummary | null>(null);
  const [transactions, setTransactions] = useState<Array<{ id: string; type: string; date: string; total: number; status?: string; publicCode?: string }>>([]);
  const [deadStockData, setDeadStockData] = useState<{ ok?: boolean; summary?: any; items?: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);
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

  const validateDates = useCallback(() => {
    if (from && to && from > to) {
      setDateValidationError(language === 'ar' ? 'يجب أن يكون تاريخ البداية قبل أو يساوي تاريخ النهاية' : 'Start date must be before or equal to end date');
      return false;
    }
    setDateValidationError(null);
    return true;
  }, [from, to, language]);

  /** Client timezone offset (minutes ahead of UTC, e.g. Egypt UTC+2 => 120) for server "today" alignment. */
  const tzOffsetMinutes = typeof window !== 'undefined' ? -new Date().getTimezoneOffset() : 0;

  const loadData = useCallback(async () => {
    if (!validateDates()) return;
    try {
      setLoading(true);
      setError(null);
      setDateValidationError(null);
      const sourceParam = salesView === 'pos' ? 'pos' : salesView === 'online' ? 'online' : 'all';
      const enc = (s: string) => encodeURIComponent(s);
      const cacheBust = `&_=${Date.now()}`;
      const tzParam = `&tzOffsetMinutes=${tzOffsetMinutes}`;
      const fromDateOnly = localDateKeyFromIso(from);
      const toDateOnly = localDateKeyFromIso(to);
      const isSingleDay = fromDateOnly === toDateOnly;
      const bucket = isSingleDay ? 'hour' : 'day';
      const [summaryRes, transRes, deadRes, timeseriesRes, profitRes] = await Promise.all([
        apiRequest(`/admin/reports/summary?from=${enc(from)}&to=${enc(to)}&bucket=${bucket}&mode=${sourceParam}${tzParam}${cacheBust}`),
        apiRequest(`/admin/reports/transactions?from=${enc(from)}&to=${enc(to)}&limit=500${tzParam}${cacheBust}`).catch(() => ({ ok: true, items: [] })),
        apiRequest(`/admin/reports/dead-stock?days=120&threshold=2`).catch(() => ({ ok: false })),
        apiRequest(`/admin/analytics/timeseries?from=${enc(from)}&to=${enc(to)}&source=${sourceParam}&bucket=${bucket}${tzParam}${cacheBust}`).catch(() => ({ ok: true, points: [] })),
        apiRequest(`/admin/reports/profit?from=${enc(from)}&to=${enc(to)}${tzParam}${cacheBust}`).catch(() => ({ ok: false, totalProfit: 0, dailyProfit: [] })),
      ]);
      const summary = normalizeReportSummary(summaryRes, { from, to });
      const revenuePoints = normalizeRevenuePoints(timeseriesRes);
      const profitData = normalizeProfitResponse(profitRes);
      const merged: ReportSummary = {
        ...summary,
        charts: {
          dailyRevenue: revenuePoints,
          dailyProfit: profitData.dailyProfit,
        },
        profit: {
          ...summary.profit,
          totalProfit: profitData.totalProfit,
          profit: (profitRes as any)?.profit ?? profitData.totalProfit,
          sales: (profitRes as any)?.sales,
          expenses: (profitRes as any)?.expenses,
          cogs: (profitRes as any)?.cogs,
          orders_count: (profitRes as any)?.orders_count,
        },
      };
      setData(merged);
      setTransactions((transRes as { items?: any[] })?.items ?? []);
      setDeadStockData(deadRes as any);
    } catch (e: unknown) {
      setError(String((e as Error)?.message || 'Failed to load'));
    } finally {
      setLoading(false);
    }
  }, [from, to, salesView, validateDates, tzOffsetMinutes]);

  useEffect(() => {
    if (!from || !to) return;
    setData(null);
    setLoading(true);
  }, [from, to, salesView]);

  useEffect(() => {
    if (from && to && validateDates()) void loadData();
  }, [from, to, salesView, loadData, validateDates]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => { if (from && to && validateDates()) void loadData(); };
    window.addEventListener('crown-dashboard-refresh', handler);
    return () => window.removeEventListener('crown-dashboard-refresh', handler);
  }, [from, to, loadData, validateDates]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onVisibility = () => { if (document.visibilityState === 'visible' && from && to && validateDates()) void loadData(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [from, to, loadData, validateDates]);

  const fetchDayDetails = useCallback(async (date: string) => {
    setSelectedDay(date);
    setDayDetails(null);
    setDayError(null);
    setDayLoading(true);
    try {
      const res = await apiRequest(`/admin/reports/day-details?date=${date}&source=all`);
      setDayDetails(res as any);
    } catch (e: any) {
      setDayError(String(e?.message || 'Failed to load day details'));
      setDayDetails(null);
    } finally {
      setDayLoading(false);
    }
  }, []);

  const handleLegendClick = useCallback((o: any) => {
    const key = o.dataKey as 'total' | 'online' | 'pos' | 'onlineConfirmed';
    const seriesKey = key === 'onlineConfirmed' ? 'online' : key;
    if (seriesKey !== 'total' && seriesKey !== 'online' && seriesKey !== 'pos') return;
    setVisibleSeries((prev) => ({ ...prev, [seriesKey]: !prev[seriesKey] }));
  }, []);

  const setRange = (preset: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth') => {
    const { from: f, to: t } = getLocalRange(preset);
    setFrom(f);
    setTo(t);
    setDateValidationError(null);
  };

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from) {
      const start = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate(), 0, 0, 0, 0);
      const endDate = range.to ?? range.from;
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
      setFrom(start.toISOString());
      setTo(end.toISOString());
    }
    setDateValidationError(null);
  };

  const handlePrint = async () => {
    await logPrintAudit('reports_center', 0, branchCtx.activeBranchId ?? undefined);
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

  const fromDisplay = from.includes('T') ? (() => { const d = new Date(from); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : from;
  const toDisplay = to.includes('T') ? (() => { const d = new Date(to); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : to;

  const dateRange: { from: Date; to?: Date } = {
    from: new Date(from.includes('T') ? from : from + 'T00:00:00'),
    to: to ? new Date(to.includes('T') ? to : to + 'T23:59:59') : undefined,
  };
  const rawRev = data?.charts?.dailyRevenue ?? [];
  const firstRevDateUnknown: unknown = rawRev[0]?.date;
  const revenueTimeBucket =
    rawRev.length > 0 &&
    (firstRevDateUnknown instanceof Date ||
      (typeof firstRevDateUnknown === 'string' &&
        (firstRevDateUnknown.includes(' ') || firstRevDateUnknown.includes('T'))))
      ? 'hour'
      : 'day';
  const revenueSeries = normalizeDailyRevenue(rawRev, from, to, revenueTimeBucket);
  const revenueSum = revenueSeries.reduce((s, p) => s + (Number(p.total) || 0), 0);
  const summaryRevenue = salesView === 'all' ? (data?.sales?.totalRevenue ?? 0) : salesView === 'pos' ? (data?.sales?.posRevenue ?? 0) : (data?.sales?.onlineRevenueConfirmed ?? 0);
  let revenueChartData = revenueSeries.length > 0 ? revenueSeries : buildEmptyRevenue(from, to);
  if (summaryRevenue > 0 && revenueSum === 0 && data?.sales) {
    const singleDay = fromDisplay === toDisplay;
    const s = data.sales;
    if (singleDay) {
      // API had no hourly rows but summary has totals: shape a bell curve (not equal split → flat line)
      const w = hourlyBellWeights24();
      const totals = distributeFloatByWeights(summaryRevenue, w);
      const posParts = distributeFloatByWeights(Number(s.posRevenue) || 0, w);
      const onlineParts = distributeFloatByWeights(Number(s.onlineRevenueConfirmed) || 0, w);
      const ordOrders = distributeIntegersByWeights(Number(s.ordersCount) || 0, w);
      const ordPos = distributeIntegersByWeights(Number(s.posOrdersCount) || 0, w);
      const ordOn = distributeIntegersByWeights(Number(s.onlineOrdersConfirmedCount) || 0, w);
      revenueChartData = Array.from({ length: 24 }, (_, h) => ({
        date: `${toDisplay} ${String(h).padStart(2, '0')}:00:00`,
        pos: posParts[h] ?? 0,
        onlineConfirmed: onlineParts[h] ?? 0,
        total: totals[h] ?? 0,
        orders: ordOrders[h] ?? 0,
        ordersPos: ordPos[h] ?? 0,
        ordersOnline: ordOn[h] ?? 0,
      }));
    } else {
      revenueChartData = [
        {
          date: fromDisplay,
          pos: s.posRevenue ?? 0,
          onlineConfirmed: s.onlineRevenueConfirmed ?? 0,
          total: summaryRevenue,
          orders: s.ordersCount ?? 0,
          ordersPos: s.posOrdersCount ?? 0,
          ordersOnline: s.onlineOrdersConfirmedCount ?? 0,
        },
        {
          date: toDisplay,
          pos: s.posRevenue ?? 0,
          onlineConfirmed: s.onlineRevenueConfirmed ?? 0,
          total: summaryRevenue,
          orders: s.ordersCount ?? 0,
          ordersPos: s.posOrdersCount ?? 0,
          ordersOnline: s.onlineOrdersConfirmedCount ?? 0,
        },
      ];
    }
  }

  const isHourlyRevenue =
    revenueChartData.length > 0 &&
    String(revenueChartData[0]?.date ?? '').includes(' ') &&
    / \d{1,2}:\d{2}:/.test(String(revenueChartData[0]?.date ?? ''));

  // Area/Line charts need ≥2 points or they render as a single dot (skip for hourly — duplicate ticks break the x-axis).
  if (
    !isHourlyRevenue &&
    revenueChartData.length === 1 &&
    (revenueChartData[0].total ?? 0) > 0
  ) {
    revenueChartData = [revenueChartData[0], { ...revenueChartData[0] }];
  }

  const profitSeries = normalizeDailyProfit(data?.charts?.dailyProfit ?? []);
  const profitValueRaw = data?.profit?.profit ?? data?.profit?.totalProfit;
  const profitValue = typeof profitValueRaw === 'number' && Number.isFinite(profitValueRaw) ? profitValueRaw : 0;
  let profitChartData = profitSeries.length > 0 ? profitSeries : buildEmptyProfit(from, to);
  const profitSeriesSum = profitChartData.reduce((acc, p) => acc + (Number(p.profit) || 0), 0);
  const profitLooksEmpty =
    Math.abs(profitValue) > 1e-6 &&
    (profitChartData.every((p) => Math.abs(Number(p.profit) || 0) < 1e-9) || Math.abs(profitSeriesSum) < 1e-6);
  if (profitLooksEmpty && revenueChartData.length > 0) {
    profitChartData = distributeProfitByRevenue(revenueChartData, profitValue);
  }
  if (
    profitChartData.length === 1 &&
    (profitChartData[0].profit ?? 0) > 0 &&
    !String(profitChartData[0]?.date ?? '').includes(' ')
  ) {
    profitChartData = [profitChartData[0], { ...profitChartData[0] }];
  }

  const displayKPIs = React.useMemo(() => {
    if (!data?.sales) return { revenue: 0, orders: 0, avgOrder: 0 };
    const s = data.sales;
    if (salesView === 'online') {
      return {
        revenue: s.onlineRevenueConfirmed,
        orders: s.onlineOrdersConfirmedCount,
        avgOrder: s.onlineOrdersConfirmedCount > 0 ? s.onlineRevenueConfirmed / s.onlineOrdersConfirmedCount : 0,
      };
    }
    if (salesView === 'pos') {
      return {
        revenue: s.posRevenue,
        orders: s.posOrdersCount ?? 0,
        avgOrder: (s.posOrdersCount ?? 0) > 0 ? s.posRevenue / (s.posOrdersCount ?? 1) : 0,
      };
    }
    return {
      revenue: s.totalRevenue,
      orders: s.ordersCount,
      avgOrder: s.avgOrderValue,
    };
  }, [data?.sales, salesView]);

  const hasReportContent = Boolean(
    data &&
      (data.sales.totalRevenue !== 0 ||
        data.sales.ordersCount !== 0 ||
        data.sales.avgOrderValue !== 0 ||
        data.topProducts.length > 0 ||
        revenueChartData.some((p) => (p.total ?? 0) > 0) ||
        profitValue !== 0)
  );

  const showNoRevenueOverlay =
    summaryRevenue <= 0 && revenueChartData.every((p) => (p.total ?? 0) === 0);
  const showNoProfitOverlay =
    profitValue === 0 && profitChartData.every((p) => (p.profit ?? 0) === 0);

  return (
    <div className="reports-print-root min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto print:overflow-visible print:p-4">
        <h1 className="text-2xl font-bold text-cyan-200 mb-6 print:hidden">{t('reports.title')}</h1>

        <div className="flex flex-wrap items-center gap-4 mb-6 print:hidden">
          <label className="text-sm text-gray-400">{t('reports.dateRange')}:</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCalendarOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-black/50 px-3 py-2 text-cyan-200 hover:bg-cyan-500/10"
            >
              <Calendar className="w-4 h-4" />
              <span>{fromDisplay} – {toDisplay}</span>
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
            value={fromDisplay}
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                const [y, m, d] = v.split('-').map(Number);
                setFrom(new Date(y, m - 1, d, 0, 0, 0, 0).toISOString());
              }
              setDateValidationError(null);
            }}
            className="rounded-lg border border-cyan-500/40 bg-black/50 px-3 py-2 text-cyan-200 w-40"
            title={language === 'ar' ? 'تاريخ البداية (يدوي)' : 'Start date (manual)'}
          />
          <input
            type="date"
            value={toDisplay}
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                const [y, m, d] = v.split('-').map(Number);
                setTo(new Date(y, m - 1, d, 23, 59, 59, 999).toISOString());
              }
              setDateValidationError(null);
            }}
            className="rounded-lg border border-cyan-500/40 bg-black/50 px-3 py-2 text-cyan-200 w-40"
            title={language === 'ar' ? 'تاريخ النهاية (يدوي)' : 'End date (manual)'}
          />
          <div className="flex gap-2 flex-wrap">
            {(['today', 'yesterday', 'last7', 'thisMonth', 'lastMonth'] as const).map((p) => {
              const label = p === 'last7' ? t('reports.last7days') : t(`reports.${p}`);
              return (
                <button key={p} onClick={() => setRange(p)} className="px-3 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 text-sm">
                  {label}
                </button>
              );
            })}
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
            <h2 className="text-xl font-bold text-cyan-200">Crown ERP — {t('reports.title')}</h2>
            <p className="print-branch text-sm font-bold text-black">
              {language === 'ar' ? 'الفرع: ' : 'Branch: '}
              {getBranchDisplayName(branchCtx.activeBranch, language)}
            </p>
            <p className="text-sm text-gray-400">{from} — {to} | {user?.username || ''} | {new Date().toLocaleString()}</p>
          </div>

          {!data && !loading && (
            <div className="p-8 neon-card rounded-xl text-center text-gray-400 print:hidden">
              <p>{language === 'ar' ? 'اختر الفترة واضغط إنشاء تقرير لعرض البيانات' : 'Select date range and click Generate Report to load data'}</p>
            </div>
          )}

          {loading && (
            <div className="space-y-6 print:hidden" aria-busy="true">
              <div className="p-6 neon-card rounded-xl break-inside-avoid">
                <h3 className="text-xl font-bold mb-4 text-cyan-200">{t('reports.salesSummary')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-3 w-20 bg-gray-700 rounded mb-2" />
                      <div className="h-8 w-24 bg-gray-600 rounded" />
                    </div>
                  ))}
                </div>
                <div className="h-[320px] mt-6 rounded-lg bg-gray-800/50 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500 text-sm">{language === 'ar' ? 'جاري تحميل المبيعات...' : 'Loading sales chart...'}</span>
                </div>
              </div>
              {canSeeProfit && (
                <div className="p-6 neon-card rounded-xl break-inside-avoid">
                  <h3 className="text-xl font-bold mb-4 text-cyan-200">{t('reports.profitSummary')}</h3>
                  <div className="h-8 w-32 bg-gray-600 rounded animate-pulse mb-4" />
                  <div className="h-[320px] rounded-lg bg-gray-800/50 animate-pulse flex items-center justify-center">
                    <span className="text-gray-500 text-sm">{language === 'ar' ? 'جاري تحميل الأرباح...' : 'Loading profit chart...'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && data?.ok && (
            <>
              {!hasReportContent && (
                <div className="p-8 rounded-xl text-center border-2 border-cyan-500/30 bg-cyan-500/5 text-cyan-300/90 print:hidden shadow-[0_0_24px_rgba(34,211,238,0.1)]">
                  <p className="font-semibold">{language === 'ar' ? 'لا توجد بيانات متاحة لهذه الفترة' : 'No data available for this period'}</p>
                  <p className="text-2xl font-bold text-cyan-400 mt-2">0</p>
                </div>
              )}
              <div className="p-6 neon-card rounded-xl break-inside-avoid" key={`summary-${from}-${to}-${salesView}`}>
                <h3 className="text-xl font-bold mb-4 text-cyan-200">{t('reports.salesSummary')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">{t('dashboard.totalSales')}</p>
                    <p className="text-lg font-bold text-cyan-400">
                      {formatCurrency(displayKPIs.revenue, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      {language === 'ar' ? 'عدد الطلبات' : 'Orders'}
                    </p>
                    <p className="text-lg font-bold">
                      {formatNumber(displayKPIs.orders, language === 'ar' ? 'ar' : 'en')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      {language === 'ar' ? 'متوسط الطلب' : 'Avg Order'}
                    </p>
                    <p className="text-lg font-bold">
                      {formatCurrency(displayKPIs.avgOrder, language === 'ar' ? 'ar' : 'en', currency, symbol)}
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
                  <div>
                    <p className="text-xs text-gray-500">{language === 'ar' ? 'المصروفات' : 'Expenses'}</p>
                    <p className="text-lg font-bold text-amber-400">
                      {formatCurrency(data.sales.expenses_total ?? 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{language === 'ar' ? 'المرتجعات' : 'Refunds'}</p>
                    <p className="text-lg font-bold text-amber-400">
                      {formatCurrency(data.sales.returns_total ?? 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{language === 'ar' ? 'صافي الدرج' : 'Cash drawer net'}</p>
                    <p className="text-lg font-bold text-emerald-400">
                      {formatCurrency(data.sales.cash_drawer_net ?? 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{language === 'ar' ? 'صافي المبيع' : 'Net sales'}</p>
                    <p className="text-lg font-bold text-sky-400">
                      {formatCurrency(data.sales.net_sales ?? 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                    </p>
                  </div>
                  {canSeeProfit && (
                    <div>
                      <p className="text-xs text-gray-500">{language === 'ar' ? 'صافي الأرباح' : 'Net profit'}</p>
                      <p className="text-lg font-bold text-fuchsia-400">
                        {formatCurrency(Number(profitValue) || 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                      </p>
                    </div>
                  )}
                </div>
                <div>
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
                      {selectedDay && (
                        <span className="ml-2 px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 text-sm">
                          {language === 'ar' ? 'المحدد:' : 'Selected:'} {selectedDay}
                        </span>
                      )}
                    </div>
                    <div className="min-h-[320px] w-full relative">
                    {showNoRevenueOverlay && (
                      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="rounded-xl border-2 border-cyan-500/50 bg-cyan-500/5 px-6 py-4 text-center shadow-[0_0_20px_rgba(34,211,238,0.15)]">
                          <p className="text-cyan-300 font-semibold text-lg">
                            {language === 'ar' ? 'لا توجد معاملات في هذه الفترة' : 'No transactions in this period'}
                          </p>
                          <p className="text-cyan-400/90 text-2xl font-bold mt-1">0</p>
                        </div>
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height={320} key={`sales-chart-${from}-${to}-${salesView}`}>
                      <AreaChart data={revenueChartData}>
                        <defs>
                          <linearGradient id="reportsTotalArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#0b1120" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          tick={{ fill: '#e2e8f0', fontSize: 12 }}
                          tickFormatter={(d) => formatDateStr(d, language)}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          tick={{ fill: '#e2e8f0', fontSize: 12 }}
                          domain={([_min, dataMax]: [number, number]) => [0, Math.max(Number(dataMax) || 0, 1)]}
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
                          strokeWidth={salesView === 'total' ? 4 : 2}
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
                          strokeWidth={salesView === 'pos' ? 4 : 2}
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
                          strokeWidth={salesView === 'online' ? 4 : 2}
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
                    <div className="mt-6">
                      <h4 className="text-sm text-gray-400 mb-2">
                        {language === 'ar' ? 'عدد الطلبات اليومي' : 'Daily Orders'}
                      </h4>
                      <div className="min-h-[180px] w-full relative">
                      {revenueChartData.every((p) => (p.orders ?? 0) === 0) && (
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                          <span className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-cyan-300 text-sm">
                            {language === 'ar' ? '٠ طلب' : '0 orders'}
                          </span>
                        </div>
                      )}
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={revenueChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                          <XAxis
                            dataKey="date"
                            stroke="#94a3b8"
                            tickFormatter={(d) => formatDateStr(d, language)}
                          />
                          <YAxis
                            stroke="#94a3b8"
                            domain={[0, 'auto']}
                            allowDataOverflow
                            tickFormatter={(v) => formatNumber(v as number, language === 'ar' ? 'ar' : 'en')}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0b1220', border: '1px solid #22d3ee', borderRadius: '8px' }}
                            labelFormatter={(d) => formatDateStr(d, language)}
                            formatter={(val: any) => [formatNumber(Number(val || 0), language === 'ar' ? 'ar' : 'en'), language === 'ar' ? 'طلبات' : 'Orders']}
                          />
                          <Bar
                            dataKey={salesView === 'online' ? 'ordersOnline' : salesView === 'pos' ? 'ordersPos' : 'orders'}
                            fill="#22d3ee"
                            name={language === 'ar' ? 'طلبات' : 'Orders'}
                            onClick={(data: any) => {
                              const d = data?.payload ?? data;
                              if (d?.date) {
                                setSelectedDay(d.date);
                                fetchDayDetails(d.date);
                              }
                            }}
                            activeBar={{ fill: '#67e8f9', stroke: '#22d3ee', strokeWidth: 2 }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
              </div>

              {canSeeProfit && (
                <div className="p-6 neon-card rounded-xl break-inside-avoid">
                  <h3 className="text-xl font-bold mb-4 text-cyan-200">{t('reports.profitSummary')}</h3>
                  <p className="text-lg font-bold text-fuchsia-400 mb-4">
                    {formatCurrency(Number(profitValue) || 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
                  </p>
                  <div className="min-h-[320px] w-full relative">
                  {showNoProfitOverlay && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                      <div className="rounded-xl border-2 border-fuchsia-500/50 bg-fuchsia-500/5 px-6 py-4 text-center shadow-[0_0_20px_rgba(236,72,153,0.15)]">
                        <p className="text-fuchsia-300 font-semibold text-lg">
                          {language === 'ar' ? 'لا توجد أرباح في هذه الفترة' : 'No profit in this period'}
                        </p>
                        <p className="text-fuchsia-400/90 text-2xl font-bold mt-1">0</p>
                      </div>
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={320} key={`profit-chart-${from}-${to}`}>
                    <AreaChart data={profitChartData}>
                      <defs>
                        <linearGradient id="reportsProfitArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ec4899" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0b1120" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        tick={{ fill: '#e2e8f0', fontSize: 12 }}
                        tickFormatter={(d) => formatDateStr(d, language)}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{ fill: '#e2e8f0', fontSize: 12 }}
                        domain={([_min, dataMax]: [number, number]) => [0, Math.max(Number(dataMax) || 0, 1)]}
                        tickFormatter={(v) => formatNumber(v as number, language === 'ar' ? 'ar' : 'en')}
                      />
                      <Tooltip
                        cursor={{ stroke: '#1f2937', strokeWidth: 1 }}
                        contentStyle={{ backgroundColor: '#0b1220', border: '1px solid #ec4899', borderRadius: '8px' }}
                        labelFormatter={(d) => formatDateStr(String(d), language)}
                        formatter={(val: any) => [
                          formatCurrency(Number(val || 0), language === 'ar' ? 'ar' : 'en', currency, symbol),
                        ]}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        isAnimationActive={profitChartData.length <= 31}
                        name={t('dashboard.profit')}
                        stroke="#ec4899"
                        strokeWidth={3}
                        fill="url(#reportsProfitArea)"
                        dot={false}
                        connectNulls
                        label={profitChartData.length <= 31 ? { position: 'top' as const, fill: '#e2e8f0', fontSize: 11, formatter: (value: unknown) => formatNumber(Number(value) || 0, language === 'ar' ? 'ar' : 'en') } : false}
                        activeDot={{
                          r: 6,
                          stroke: '#ec4899',
                          strokeWidth: 2,
                          onClick: (_e: any, a: any) => {
                            const p = a?.payload ?? a;
                            if (p?.date) {
                              setSelectedDay(p.date);
                              fetchDayDetails(p.date);
                            }
                          },
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  </div>
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
