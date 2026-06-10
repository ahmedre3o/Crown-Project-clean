'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Calendar, Package, ShoppingCart, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest, getNoShopMessage, isShopMissingError, useAuth } from '../contexts/AuthContext';
import { useRouteGuard } from '../guards/useRouteGuard';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCurrency, formatNumber } from '@/lib/formatters';
import { Sidebar } from '@/components/Sidebar';
import { AIAssistant } from '../components/AIAssistant';
import { DashboardTopSellingProducts } from '@/components/DashboardTopSellingProducts';
import { DashboardGradientHBarChart } from '@/components/dashboard/DashboardGradientHBarChart';

interface DashboardStats {
  monthlyRevenue: number;
  totalProducts: number;
  lowStockCount: number;
}

interface AnalyticsSummary {
  ok: boolean;
  pos: { total: number; count: number };
  online: { total: number; count: number };
  combined: { total: number; count: number };
}

interface OnlineChartPoint {
  date: string;
  amount: number;
  count: number;
}

interface OperationsChartPoint {
  date: string;
  posCount: number;
  onlineCount: number;
  totalCount: number;
}

interface ChartData {
  date: string;
  revenue: number;
  transactions?: number;
}

type DayDeltaMeta = {
  pct: number | null;
  dir: 'up' | 'down' | 'flat';
};

interface LowStockProduct {
  id: number;
  name_en: string;
  name_ar: string;
  stock_quantity: number;
  min_stock_level: number;
  /** Baseline qty when stocked — for «remaining X of Y» */
  stock_reference_qty?: number | null;
  category_name_en?: string;
  category_name_ar?: string;
}

interface NearExpiryRow {
  id: number;
  name_en: string;
  name_ar: string;
  sku?: string | null;
  stock_quantity: number;
  expiry_date: string;
  days_to_expiry?: number;
}

interface RecentProduct {
  id: number;
  name_en: string;
  name_ar: string;
  stock_quantity: number;
  sell_price: number;
}

/**
 * Summary date range in local calendar (date-only YYYY-MM-DD).
 * Avoids UTC/ISO confusion so "Today" matches server and DB.
 * التوقيت المحلي: من/إلى بتنسيق تاريخ فقط لتفادي خلط UTC.
 */
function getSummaryRange(period: 'today' | 'week' | 'month' | 'year' | 'all'): { from: string; to: string } {
  const now = new Date();
  const toDateOnly = (d: Date) =>
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  let fromDate: Date;
  let toDate: Date;
  if (period === 'today') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 7);
    fromDate.setHours(0, 0, 0, 0);
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'year') {
    fromDate = new Date(now.getFullYear(), 0, 1);
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else {
    fromDate = new Date(1970, 0, 1);
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return { from: toDateOnly(fromDate), to: toDateOnly(toDate) };
}

/** Client timezone offset in minutes (e.g. Egypt UTC+2 => 120). For server "today" alignment. */
function getTimezoneOffsetMinutes(): number {
  if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) return -new Date().getTimezoneOffset();
  return -new Date().getTimezoneOffset();
}

/**
 * Normalize API date for charts: day bucket → YYYY-MM-DD; hour bucket → keep YYYY-MM-DD HH:00:00
 * (Do not collapse hourly rows to date-only or all 24 points share one x tick.)
 */
function normalizeTimeseriesDateForChart(value: unknown): string {
  if (value == null || value === '') return '';
  if (value instanceof Date && !isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    const h = String(value.getHours()).padStart(2, '0');
    const mm = String(value.getMinutes()).padStart(2, '0');
    const ss = String(value.getSeconds()).padStart(2, '0');
    if (h === '00' && mm === '00' && ss === '00' && value.getMilliseconds() === 0) {
      return `${y}-${m}-${d}`;
    }
    return `${y}-${m}-${d} ${h}:00:00`;
  }
  const s = String(value).trim();
  if (s.includes(' ') && / \d{1,2}:\d{2}/.test(s)) {
    return s.includes('T') ? s.replace('T', ' ').slice(0, 19) : s.slice(0, 19);
  }
  if (s.includes('T') && !s.includes(' ')) return s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s.slice(0, 10))) return s.slice(0, 10);
  const t = new Date(s);
  if (!isNaN(t.getTime())) {
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return s.slice(0, 10);
}

/** Backend returns a raw JSON array; tolerate wrapped shapes from proxies. */
function coerceChartRows(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as any[];
    if (Array.isArray(o.rows)) return o.rows as any[];
  }
  return [];
}

function listCalendarDaysInclusive(fromYmd: string, toYmd: string): string[] {
  const a = fromYmd.slice(0, 10);
  const b = toYmd.slice(0, 10);
  const lo = a <= b ? a : b;
  const hi = a <= b ? b : a;
  const out: string[] = [];
  const cur = new Date(lo + 'T12:00:00.000Z');
  const end = new Date(hi + 'T12:00:00.000Z');
  if (isNaN(cur.getTime()) || isNaN(end.getTime())) return [hi];
  for (; cur.getTime() <= end.getTime(); cur.setUTCDate(cur.getUTCDate() + 1)) {
    out.push(
      `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}-${String(cur.getUTCDate()).padStart(2, '0')}`
    );
  }
  return out;
}

/** Split a positive integer across buckets by weight (largest remainder). */
function distributeIntegerByWeights(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  if (total < 1) return Array(n).fill(0);
  const safe = weights.map((w) => Math.max(Number(w) || 0, 0));
  const sumW = safe.reduce((a, b) => a + b, 0);
  const w = sumW < 1e-12 ? Array(n).fill(1) : safe;
  const sumW2 = w.reduce((a, b) => a + b, 0);
  const raw = w.map((wi) => (wi / sumW2) * total);
  const floors = raw.map((x) => Math.floor(x));
  let rem = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((x, i) => i)
    .sort((a, b) => raw[b] - Math.floor(raw[b]) - (raw[a] - Math.floor(raw[a])));
  const extra = new Set(order.slice(0, Math.max(0, rem)));
  return floors.map((f, i) => f + (extra.has(i) ? 1 : 0));
}

function distributeSalesLikeDays(days: string[], salesTotal: number, orders: number): ChartData[] {
  const n = days.length;
  if (n === 0) return [];
  let remRev = salesTotal;
  const revenues: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === n - 1) revenues.push(Number(remRev.toFixed(2)));
    else {
      const r = Number((salesTotal / n).toFixed(2));
      revenues.push(r);
      remRev -= r;
    }
  }
  const tx = distributeIntegerByWeights(orders, revenues.map((r) => Math.max(r, 0.0001)));
  return days.map((date, i) => ({ date, revenue: revenues[i], transactions: tx[i] ?? 0 }));
}

function fillMissingDailyChartRows(rows: ChartData[], rangeFrom: string, rangeTo: string): ChartData[] {
  const days = listCalendarDaysInclusive(rangeFrom, rangeTo);
  if (!days.length) return rows;
  const byDate = new Map(rows.map((r) => [String(r.date).slice(0, 10), r]));
  return days.map((d) => {
    const existing = byDate.get(d);
    if (existing) {
      return {
        date: d,
        revenue: Number(existing.revenue ?? 0) || 0,
        transactions: Number(existing.transactions ?? 0) || 0,
      };
    }
    return { date: d, revenue: 0, transactions: 0 };
  });
}

/** When chart API returns [] or all zeros but KPI summary has totals, align charts with the same period. */
function enrichSalesChartData(
  rows: ChartData[],
  _rangeFrom: string,
  _rangeTo: string,
  _dash: { sales_total?: number; orders_count?: number } | null
): ChartData[] {
  return rows;
}

function emptyHourlyOperations(dayYmd: string): OperationsChartPoint[] {
  const d = dayYmd.slice(0, 10);
  const out: OperationsChartPoint[] = [];
  for (let i = 0; i < 24; i++) {
    const hh = String(i).padStart(2, '0');
    out.push({ date: `${d} ${hh}:00:00`, posCount: 0, onlineCount: 0, totalCount: 0 });
  }
  return out;
}

function emptyHourlyOnline(dayYmd: string): OnlineChartPoint[] {
  const d = dayYmd.slice(0, 10);
  const out: OnlineChartPoint[] = [];
  for (let i = 0; i < 24; i++) {
    const hh = String(i).padStart(2, '0');
    out.push({ date: `${d} ${hh}:00:00`, amount: 0, count: 0 });
  }
  return out;
}

function enrichOperationsChartData(
  points: OperationsChartPoint[],
  rangeFrom: string,
  rangeTo: string,
  posCnt: number,
  onCnt: number
): OperationsChartPoint[] {
  const sumP = points.reduce((s, p) => s + (p.posCount || 0), 0);
  const sumO = points.reduce((s, p) => s + (p.onlineCount || 0), 0);
  const hasApi = sumP > 0 || sumO > 0;
  const needFallback = !hasApi && (posCnt >= 1 || onCnt >= 1);
  const toD = rangeTo.slice(0, 10);
  const fromD = rangeFrom.slice(0, 10);
  const singleDay = fromD === toD;

  if (!needFallback) {
    const base = points.length ? points : singleDay ? emptyHourlyOperations(toD) : [];
    return ensureOperationsCounts(base, posCnt, onCnt);
  }

  if (singleDay) {
    const base =
      points.length >= 20 && String(points[0]?.date ?? '').includes(':')
        ? points.map((p) => ({ ...p }))
        : emptyHourlyOperations(toD);
    const h = new Date().getHours();
    const filled = base.map((_, i) =>
      i === h
        ? { ...base[i], posCount: posCnt, onlineCount: onCnt, totalCount: posCnt + onCnt }
        : { ...base[i], posCount: 0, onlineCount: 0, totalCount: 0 }
    );
    return ensureOperationsCounts(filled, posCnt, onCnt);
  }
  const days = listCalendarDaysInclusive(rangeFrom, rangeTo);
  const wPos = posCnt >= 1 ? days.map(() => 1) : [];
  const wOn = onCnt >= 1 ? days.map(() => 1) : [];
  const pDist = posCnt >= 1 ? distributeIntegerByWeights(posCnt, wPos) : days.map(() => 0);
  const oDist = onCnt >= 1 ? distributeIntegerByWeights(onCnt, wOn) : days.map(() => 0);
  const daily = days.map((d, i) => ({
    date: d,
    posCount: pDist[i] ?? 0,
    onlineCount: oDist[i] ?? 0,
    totalCount: (pDist[i] ?? 0) + (oDist[i] ?? 0),
  }));
  return ensureOperationsCounts(daily, posCnt, onCnt);
}

function ensureOperationsCounts(
  points: OperationsChartPoint[],
  targetPos: number,
  targetOn: number
): OperationsChartPoint[] {
  if (!points.length) return points;
  const sumP = points.reduce((s, p) => s + (p.posCount || 0), 0);
  const sumO = points.reduce((s, p) => s + (p.onlineCount || 0), 0);
  if (sumP === targetPos && sumO === targetOn) return points;
  if (targetPos < 1 && targetOn < 1) return points;
  const wP = sumP > 0 ? points.map((p) => Math.max(p.posCount, 0.0001)) : points.map(() => 1);
  const wO = sumO > 0 ? points.map((p) => Math.max(p.onlineCount, 0.0001)) : points.map(() => 1);
  const newP = targetPos >= 1 && sumP < targetPos ? distributeIntegerByWeights(targetPos, wP) : points.map((p) => p.posCount);
  const newO = targetOn >= 1 && sumO < targetOn ? distributeIntegerByWeights(targetOn, wO) : points.map((p) => p.onlineCount);
  return points.map((p, i) => ({
    date: p.date,
    posCount: newP[i] ?? 0,
    onlineCount: newO[i] ?? 0,
    totalCount: (newP[i] ?? 0) + (newO[i] ?? 0),
  }));
}

function enrichOnlineChartData(
  points: OnlineChartPoint[],
  _rangeFrom: string,
  _rangeTo: string,
  _onlineAmount: number,
  _onlineCount: number
): OnlineChartPoint[] {
  return points;
}

function calcDayOverDayDelta(values: number[]): DayDeltaMeta[] {
  return values.map((v, i) => {
    if (i === 0) return { pct: null, dir: 'flat' };
    const prev = Number(values[i - 1] ?? 0);
    const cur = Number(v ?? 0);
    if (Math.abs(prev) < 1e-9 && Math.abs(cur) < 1e-9) return { pct: 0, dir: 'flat' };
    if (Math.abs(prev) < 1e-9 && Math.abs(cur) > 1e-9) return { pct: 100, dir: 'up' };
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    if (Math.abs(pct) < 0.0001) return { pct: 0, dir: 'flat' };
    return { pct: Math.abs(pct), dir: pct > 0 ? 'up' : 'down' };
  });
}

function openDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  if (typeof (input as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
    try {
      (input as HTMLInputElement & { showPicker: () => void }).showPicker();
      return;
    } catch {
      // Safari / strict contexts may throw
    }
  }
  input.focus();
  input.click();
}

export default function DashboardPage() {
  const { t, language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'dashboard', effectiveRole, showDenied: true });
  const { currency, symbol } = useCurrency();
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    monthlyRevenue: 0,
    totalProducts: 0,
    lowStockCount: 0,
  });
  const [salesChartData, setSalesChartData] = useState<ChartData[]>([]);
  const [onlineStats, setOnlineStats] = useState<{ total: number; count: number }>({ total: 0, count: 0 });
  const [operationsCount, setOperationsCount] = useState(0);
  const [onlineChartData, setOnlineChartData] = useState<OnlineChartPoint[]>([]);
  const [operationsChartData, setOperationsChartData] = useState<OperationsChartPoint[]>([]);
  const [deadSlowStats, setDeadSlowStats] = useState<{
    deadCount: number;
    slowCount: number;
    deadValue: number;
    slowValue: number;
    nearExpiryCount?: number;
  } | null>(null);
  const [usageData, setUsageData] = useState<{
    usage: {
      aiUsed: number;
      aiLimit: number;
      ocrUsed: number;
      ocrLimit: number;
      aiPercent: number;
      ocrPercent: number;
      aiNearLimit: boolean;
      ocrNearLimit: boolean;
      aiAtLimit: boolean;
      ocrAtLimit: boolean;
      goldTrialActive?: boolean;
    };
    nearExpiryCount: number;
  } | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [nearExpiryProducts, setNearExpiryProducts] = useState<NearExpiryRow[]>([]);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [staffCount, setStaffCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trialToast, setTrialToast] = useState<string | null>(null);
  /** When both null → default is «today» only (daily KPIs + charts). When set → global range for the whole page. */
  const [rangeFrom, setRangeFrom] = useState<string | null>(null);
  const [rangeTo, setRangeTo] = useState<string | null>(null);
  const fromDateInputRef = useRef<HTMLInputElement>(null);
  const toDateInputRef = useRef<HTMLInputElement>(null);
  const [summaryData, setSummaryData] = useState<{
    sales_total: number;
    returns_total: number;
    collections_total?: number;
    expenses_total?: number;
    net_sales: number;
    net_drawer?: number;
    orders_count: number;
    pos_orders_count?: number;
    pos_total: number;
    online_total: number;
    period_cogs_total?: number;
    top_selling_products?: Array<{
      productId: number;
      nameEn?: string | null;
      nameAr?: string | null;
      qtySold: number;
    }>;
  } | null>(null);

  const displayName = user?.username?.split('@')[0] || (user as any)?.ownerName || user?.username || '';

  const getQueryDateRange = useCallback((): { from: string; to: string; label: 'today' | 'custom' } => {
    if (rangeFrom && rangeTo) {
      let a = rangeFrom.slice(0, 10);
      let b = rangeTo.slice(0, 10);
      if (a > b) [a, b] = [b, a];
      return { from: a, to: b, label: 'custom' };
    }
    const t = getSummaryRange('today');
    return { from: t.from, to: t.to, label: 'today' };
  }, [rangeFrom, rangeTo]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[DASHBOARD] loadDashboardData fetch started');
      }
      const { from: summaryFrom, to: summaryTo, label: rangeLabel } = getQueryDateRange();
      const enc = (s: string) => encodeURIComponent(s);
      const startDateIso = `${summaryFrom.slice(0, 10)}T00:00:00.000Z`;
      const endDateIso = `${summaryTo.slice(0, 10)}T23:59:59.999Z`;
      const tzOffset = getTimezoneOffsetMinutes();
      // Direct fetch, no cache: use ? for first query param, & for rest (wrong & without ? caused 404)
      const ts = Date.now();
      const [
        statsData,
        salesData,
        lowStockData,
        nearExpiryData,
        recentData,
        summaryRes,
        dashboardSummaryRes,
        onlineTimeseriesRes,
        combinedTimeseriesRes,
        slowMovingRes,
        usageRes,
      ] = await Promise.all([
        apiRequest(`/dashboard/stats?_=${ts}`),
        apiRequest(
          `/dashboard/sales-chart?from=${enc(summaryFrom)}&to=${enc(summaryTo)}&startDate=${enc(startDateIso)}&endDate=${enc(endDateIso)}&tzOffsetMinutes=${tzOffset}&_=${ts}`
        ),
        apiRequest('/products/low-stock'),
        apiRequest('/products/near-expiry?limit=12').catch(() => []),
        apiRequest('/products'),
        apiRequest(
          `/admin/analytics/summary?from=${enc(summaryFrom)}&to=${enc(summaryTo)}&tzOffsetMinutes=${tzOffset}`
        ).catch(() => ({ ok: false, online: { total: 0, count: 0 } })),
        apiRequest(`/dashboard/summary?period=${enc(rangeLabel)}&from=${enc(summaryFrom)}&to=${enc(summaryTo)}&tzOffsetMinutes=${tzOffset}&_=${ts}`).catch((err) => {
          if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            console.warn('[DASHBOARD] summary request failed', err);
          }
          return null;
        }),
        apiRequest(
          `/admin/analytics/timeseries?from=${enc(summaryFrom)}&to=${enc(summaryTo)}&source=online&tzOffsetMinutes=${tzOffset}`
        ).catch(() => ({ ok: true, points: [] })),
        apiRequest(
          `/admin/analytics/timeseries?from=${enc(summaryFrom)}&to=${enc(summaryTo)}&source=pos&tzOffsetMinutes=${tzOffset}`
        ).catch(() => ({ ok: true, points: [] })),
        apiRequest('/admin/inventory/slow-moving/summary?days=120&threshold=2').catch(() => ({
          ok: false,
          deadCount: 0,
          slowCount: 0,
          deadValue: 0,
          slowValue: 0,
          nearExpiryCount: 0,
        })),
        apiRequest('/shop/usage').catch(() => null),
      ]);
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[dashboard] /sales-chart request', {
          from: summaryFrom,
          to: summaryTo,
          startDateIso,
          endDateIso,
          tzOffset,
        });
        console.log('[dashboard] /sales-chart raw response', salesData);
      }
      const dashSummary = dashboardSummaryRes as {
        sales_total?: number;
        returns_total?: number;
        collections_total?: number;
        expenses_total?: number;
        net_sales?: number;
        net_drawer?: number;
        orders_count?: number;
        pos_orders_count?: number;
        pos_total?: number;
        online_total?: number;
        period_cogs_total?: number;
        top_selling_products?: Array<{ productId: number; nameEn?: string | null; nameAr?: string | null; qtySold: number }>;
      } | null;
      setSummaryData(
        dashSummary
          ? {
              sales_total: Number(dashSummary.sales_total ?? 0),
              returns_total: Number(dashSummary.returns_total ?? 0),
              collections_total: Number(dashSummary.collections_total ?? 0),
              expenses_total: Number(dashSummary.expenses_total ?? 0),
              net_sales: Number(dashSummary.net_sales ?? 0),
              net_drawer: Number(dashSummary.net_drawer ?? 0),
              orders_count: Number(dashSummary.orders_count ?? 0),
              pos_orders_count: Number(dashSummary.pos_orders_count ?? 0),
              pos_total: Number(dashSummary.pos_total ?? 0),
              online_total: Number(dashSummary.online_total ?? 0),
              period_cogs_total: Number(dashSummary.period_cogs_total ?? 0),
              top_selling_products: Array.isArray(dashSummary.top_selling_products) ? dashSummary.top_selling_products : [],
            }
          : null
      );

      setError(null);
      setStats(statsData);
      const summary = summaryRes as AnalyticsSummary;
      const onlineOrderCount = summary?.ok ? Number(summary.online?.count ?? 0) : 0;
      const posOrderCount = summary?.ok
        ? Number(summary.pos?.count ?? 0)
        : Math.max(0, Number(dashSummary?.orders_count ?? 0) - onlineOrderCount);
      const onlineAmountKpi = Number(dashSummary?.online_total ?? (summary?.ok ? Number(summary.online?.total ?? 0) : 0));

      const salesRows = coerceChartRows(salesData);
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[dashboard] /sales-chart rows normalized', {
          count: salesRows.length,
          preview: salesRows.slice(0, 5),
        });
      }
      let salesMapped = enrichSalesChartData(
        salesRows.map((r: any) => ({
          date: String(r?.date ?? '').replace(/T.*$/, '').slice(0, 10),
          revenue: Number(r?.net_sales ?? r?.sales ?? r?.revenue ?? 0) || 0,
          transactions: Number(r?.order_count ?? r?.orders ?? r?.transactions ?? 0) || 0,
        })),
        summaryFrom,
        summaryTo,
        dashSummary
      );
      salesMapped = fillMissingDailyChartRows(salesMapped, summaryFrom, summaryTo);
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('[dashboard] /sales-chart final mapped', {
          count: salesMapped.length,
          nonZeroDays: salesMapped.filter((d) => (Number(d.revenue) || 0) > 0 || (Number(d.transactions) || 0) > 0).length,
          preview: salesMapped.slice(0, 5),
        });
      }
      setSalesChartData(salesMapped);
      setLowStockProducts(Array.isArray(lowStockData) ? lowStockData : []);
      setNearExpiryProducts(Array.isArray(nearExpiryData) ? (nearExpiryData as NearExpiryRow[]) : []);
      const recentList = Array.isArray(recentData) ? recentData : [];
      setRecentProducts(recentList.slice(0, 6));
      setOnlineStats(summary?.ok ? summary.online : { total: 0, count: 0 });
      setOperationsCount(summary?.ok ? Number(summary.pos?.count ?? 0) : 0);
      let onlinePoints = ((onlineTimeseriesRes as { ok?: boolean; points?: any[] })?.points ?? []).map((p: any) => ({
        date: normalizeTimeseriesDateForChart(p.date),
        amount: Number(p.onlineAmount ?? p.totalAmount ?? p.total ?? p.amount ?? 0),
        count: Number(p.onlineCount ?? p.totalCount ?? p.count ?? 0),
      }));
      let operationsPoints = ((combinedTimeseriesRes as { ok?: boolean; points?: any[] })?.points ?? []).map((p: any) => ({
        date: normalizeTimeseriesDateForChart(p.date),
        posCount: Number(p.posCount ?? 0),
        onlineCount: 0,
        totalCount: Number(p.posCount ?? p.totalCount ?? 0),
      }));
      onlinePoints = enrichOnlineChartData(onlinePoints, summaryFrom, summaryTo, onlineAmountKpi, onlineOrderCount);
      operationsPoints = enrichOperationsChartData(operationsPoints, summaryFrom, summaryTo, posOrderCount, 0);
      setOnlineChartData(onlinePoints);
      setOperationsChartData(operationsPoints);
      const sm = slowMovingRes as {
        ok?: boolean;
        deadCount?: number;
        slowCount?: number;
        deadValue?: number;
        slowValue?: number;
        nearExpiryCount?: number;
      };
      setDeadSlowStats(
        sm?.ok
          ? {
              deadCount: sm.deadCount ?? 0,
              slowCount: sm.slowCount ?? 0,
              deadValue: sm.deadValue ?? 0,
              slowValue: sm.slowValue ?? 0,
              nearExpiryCount: Number(sm.nearExpiryCount ?? 0),
            }
          : null
      );
      const ur = usageRes as { ok?: boolean; usage?: any; nearExpiryCount?: number; bypass?: boolean } | null;
      if (ur && ur.ok && !ur.bypass && ur.usage) {
        setUsageData({
          usage: ur.usage,
          nearExpiryCount: Number(ur.nearExpiryCount ?? 0),
        });
      } else {
        setUsageData(null);
      }
      try {
        const staffData = await apiRequest('/users/online-count');
        setStaffCount(Number((staffData as any)?.count ?? 0));
      } catch (err) {
        setStaffCount(null);
      }
    } catch (error: any) {
      if (isShopMissingError(error)) {
        setError(getNoShopMessage(language));
        setLowStockProducts([]);
        setNearExpiryProducts([]);
        setRecentProducts([]);
        setSalesChartData([]);
        setOnlineChartData([]);
        setOperationsChartData([]);
      } else if (error?.status === 404) {
        const msg404Ar = 'لوحة التحكم: نقطة الـ API غير موجودة (404). تأكد من نشر خدمة crown-api وأن المسارات /api/dashboard/* متاحة.';
        const msg404En = 'Dashboard API not found (404). Ensure crown-api is deployed and /api/dashboard/* routes are available.';
        setError(language === 'ar' ? msg404Ar : msg404En);
        console.error('[DASHBOARD] 404 — endpoint not found. Check backend deployment and route alignment.', error?.url || error?.endpoint);
      } else {
        console.error('Failed to load dashboard data:', error);
        const msg = error?.message && String(error.message).trim() ? String(error.message) : (language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [language, getQueryDateRange]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => loadDashboardData();
    window.addEventListener('crown-dashboard-refresh', handler);
    return () => window.removeEventListener('crown-dashboard-refresh', handler);
  }, [loadDashboardData]);

  useEffect(() => {
    if (!allowed || authLoading) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') loadDashboardData();
    }, 600000);
    return () => clearInterval(interval);
  }, [allowed, authLoading, loadDashboardData]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('crown-trial-toast') === '1') {
        sessionStorage.removeItem('crown-trial-toast');
        setTrialToast(
          language === 'ar'
            ? 'أنت على تجربة GOLD لمدة 7 أيام. بعد انتهاء التجربة، فعّل كود الاشتراك للاستمرار.'
            : 'You are on a 7-day GOLD trial. After the trial, activate a subscription code to continue.'
        );
        const t = setTimeout(() => setTrialToast(null), 8000);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, [language]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('crown:last-excel-import');
      if (!raw) return;
      localStorage.removeItem('crown:last-excel-import');
      const payload = JSON.parse(raw);
      if (!payload?.ok) return;

      const imported = Number(payload.importedCount || 0);
      const skipped = Number(payload.skippedCount || 0);
      const fileName = String(payload.fileName || '').trim();

      const msg =
        language === 'ar'
          ? `اكتمل الاستيراد: تمت إضافة ${imported} منتج${skipped ? ` (تم تخطي ${skipped})` : ''}${fileName ? ` — ${fileName}` : ''}`
          : `Import complete: added ${imported} products${skipped ? ` (skipped ${skipped})` : ''}${fileName ? ` — ${fileName}` : ''}`;

      setImportNotice(msg);
      window.setTimeout(() => setImportNotice(null), 6000);
    } catch {
      // ignore
    }
  }, [language]);

  const formatDate = (dateString: string) => {
    let raw = dateString;
    if (raw.includes(' ') && !raw.includes('T') && /^\d{4}-\d{2}-\d{2} \d/.test(raw)) {
      raw = raw.replace(' ', 'T');
    }
    const date = new Date(raw);
    if (isNaN(date.getTime())) return dateString;
    const hasTime = /\d{1,2}:\d{2}/.test(dateString) || (dateString.includes('T') && dateString.length > 12);
    if (hasTime) {
      return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ar-SA', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }
    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ar-SA', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const chartSalesData = salesChartData;
  const chartOnlineData = onlineChartData;
  const chartOperationsData = operationsChartData;
  /** أرقام واضحة في الرسوم (فاصلة عشرية واحدة، بدون لبس مع فاصل الآلاف). */
  const chartNumLang = 'en' as const;

  const salesHBarRows = useMemo(() => {
    const data = chartSalesData;
    if (!data.length) return [];
    const maxR = Math.max(1e-9, ...data.map((d) => Math.abs(Number(d.revenue) || 0)));
    const maxT = Math.max(1e-9, ...data.map((d) => Math.abs(Number(d.transactions) || 0)));
    const deltas = calcDayOverDayDelta(data.map((d) => Number(d.revenue) || 0));
    return data.map((d, i) => ({
      key: `sales-${d.date}-${i}`,
      label: formatDate(d.date),
      trend: deltas[i],
      segments: [
        {
          value: Number(d.revenue) || 0,
          max: maxR,
          caption: language === 'ar' ? 'المبيعات' : 'Sales',
          display: formatCurrency(Number(d.revenue) || 0, chartNumLang, currency, symbol),
        },
        {
          value: Number(d.transactions) || 0,
          max: maxT,
          caption: language === 'ar' ? 'العمليات' : 'Operations',
          display: formatNumber(Number(d.transactions) || 0, chartNumLang),
        },
      ],
    }));
  }, [chartSalesData, language, currency, symbol]);

  const operationsHBarRows = useMemo(() => {
    const data = chartOperationsData;
    if (!data.length) return [];
    const maxP = Math.max(1e-9, ...data.map((d) => Math.abs(Number(d.posCount) || 0)));
    return data.map((d, i) => ({
      key: `ops-${d.date}-${i}`,
      label: formatDate(d.date),
      segments: [
        {
          value: Number(d.posCount) || 0,
          max: maxP,
          caption: language === 'ar' ? 'عمليات POS' : 'POS count',
          display: formatNumber(Number(d.posCount) || 0, chartNumLang),
        },
      ],
    }));
  }, [chartOperationsData, language, currency, symbol]);

  const onlineHBarRows = useMemo(() => {
    const data = chartOnlineData;
    if (!data.length) return [];
    const maxA = Math.max(1e-9, ...data.map((d) => Math.abs(Number(d.amount) || 0)));
    const maxC = Math.max(1e-9, ...data.map((d) => Math.abs(Number(d.count) || 0)));
    const deltas = calcDayOverDayDelta(data.map((d) => Number(d.amount) || 0));
    return data.map((d, i) => ({
      key: `online-${d.date}-${i}`,
      label: formatDate(d.date),
      trend: deltas[i],
      segments: [
        {
          value: Number(d.amount) || 0,
          max: maxA,
          caption: language === 'ar' ? 'المبيعات' : 'Sales',
          display: formatCurrency(Number(d.amount) || 0, chartNumLang, currency, symbol),
        },
        {
          value: Number(d.count) || 0,
          max: maxC,
          caption: language === 'ar' ? 'الطلبات' : 'Orders',
          display: formatNumber(Number(d.count) || 0, chartNumLang),
        },
      ],
    }));
  }, [chartOnlineData, language, currency, symbol]);

  if (authLoading || !allowed) return null;

  return (
    <div className="min-h-screen bg-black text-white flex" dir={direction}>
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 p-8 pt-20 md:pt-8 overflow-y-auto overflow-x-hidden">
        {trialToast && (
          <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200 flex items-start justify-between gap-4">
            <div>{trialToast}</div>
            <button type="button" onClick={() => setTrialToast(null)} className="text-cyan-200/80 hover:text-cyan-100 text-xs">
              {language === 'ar' ? 'إخفاء' : 'Dismiss'}
            </button>
          </div>
        )}
        {importNotice && (
          <div className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200 shadow-[0_0_18px_rgba(34,197,94,0.16)] flex items-start justify-between gap-4">
            <div className="font-semibold">{importNotice}</div>
            <button
              type="button"
              onClick={() => setImportNotice(null)}
              className="text-green-200/80 hover:text-green-100 text-xs"
            >
              {language === 'ar' ? 'إخفاء' : 'Dismiss'}
            </button>
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-cyan-200">
            {language === 'ar' ? `مرحباً ${displayName || ''}` : `Welcome, ${displayName || 'User'}`}
          </h1>
          <div className="text-xs text-gray-500">
            {t('common.package')}:&nbsp;
            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] uppercase text-yellow-300 border border-yellow-500/50 bg-yellow-500/10 shadow-[0_0_12px_rgba(255,215,0,0.35)]">
              {user?.package || 'bronze'}
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-8 rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/[0.07] to-transparent p-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Calendar className="w-5 h-5 text-cyan-400 shrink-0" aria-hidden />
            <span className="text-sm font-semibold text-cyan-100">
              {language === 'ar' ? 'فترة التقرير' : 'Report period'}
            </span>
            <div className="flex items-stretch rounded-lg border-2 border-cyan-500/55 bg-zinc-900/95 shadow-[0_0_12px_rgba(34,211,238,0.12)] max-w-[13.5rem] overflow-hidden [color-scheme:dark]">
              <button
                type="button"
                className="shrink-0 flex items-center justify-center px-2.5 bg-cyan-500/20 border-e border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30"
                aria-label={language === 'ar' ? 'فتح التقويم — من' : 'Open calendar — from'}
                onClick={() => openDatePicker(fromDateInputRef.current)}
              >
                <Calendar className="w-5 h-5" aria-hidden />
              </button>
              <input
                ref={fromDateInputRef}
                type="date"
                value={rangeFrom ?? ''}
                onChange={(e) => setRangeFrom(e.target.value ? e.target.value.slice(0, 10) : null)}
                className="crown-dashboard-date-input flex-1 min-w-0 border-0 bg-transparent py-2 px-2 text-sm outline-none focus:ring-0"
                aria-label={language === 'ar' ? 'من تاريخ' : 'From date'}
              />
            </div>
            <span className="text-gray-500 text-sm">—</span>
            <div className="flex items-stretch rounded-lg border-2 border-cyan-500/55 bg-zinc-900/95 shadow-[0_0_12px_rgba(34,211,238,0.12)] max-w-[13.5rem] overflow-hidden [color-scheme:dark]">
              <button
                type="button"
                className="shrink-0 flex items-center justify-center px-2.5 bg-cyan-500/20 border-e border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/30"
                aria-label={language === 'ar' ? 'فتح التقويم — إلى' : 'Open calendar — to'}
                onClick={() => openDatePicker(toDateInputRef.current)}
              >
                <Calendar className="w-5 h-5" aria-hidden />
              </button>
              <input
                ref={toDateInputRef}
                type="date"
                value={rangeTo ?? ''}
                onChange={(e) => setRangeTo(e.target.value ? e.target.value.slice(0, 10) : null)}
                className="crown-dashboard-date-input flex-1 min-w-0 border-0 bg-transparent py-2 px-2 text-sm outline-none focus:ring-0"
                aria-label={language === 'ar' ? 'إلى تاريخ' : 'To date'}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setRangeFrom(null);
                setRangeTo(null);
              }}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800/80"
            >
              {language === 'ar' ? 'إعادة لليوم (افتراضي)' : 'Reset to today'}
            </button>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed max-w-xl">
            {language === 'ar'
              ? 'بدون تاريخين محددين تُعرض بيانات اليوم فقط. حدّد «من» و«إلى» لتشمل كل البطاقات والرسوم نفس الفترة. التحديث التلقائي كل ١٠ دقائق ما لم تُحدّث الصفحة يدويًا.'
              : 'With no date range, only today is shown. Set From and To to align all KPIs and charts. Auto-refresh every 10 minutes unless you reload.'}
          </p>
        </div>

        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="p-6 neon-card rounded-xl neon-glow-cyan">
            <div className="mb-2">
              <p className="text-gray-400 text-sm">{t('dashboard.totalSales')}</p>
            </div>
            <h3 className="text-3xl font-bold text-cyan-400">
              {loading
                ? '...'
                : formatCurrency(summaryData?.sales_total ?? stats.monthlyRevenue, language === 'ar' ? 'ar' : 'en', currency, symbol)}
            </h3>
          </div>
          <div className="p-6 neon-card rounded-xl border border-fuchsia-500/40 shadow-[0_0_18px_rgba(236,72,153,0.2)]">
            <div className="mb-2">
              <p className="text-gray-400 text-sm">{t('dashboard.onlineSales')}</p>
            </div>
            <h3 className="text-3xl font-bold text-fuchsia-400">
              {loading
                ? '...'
                : formatCurrency(summaryData?.online_total ?? onlineStats.total, language === 'ar' ? 'ar' : 'en', currency, symbol)}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {onlineStats.count} {language === 'ar' ? 'طلب مؤكد' : 'confirmed orders'}
            </p>
          </div>
          <div className="p-6 neon-card rounded-xl border border-amber-500/40">
            <div className="mb-2">
              <p className="text-gray-400 text-sm">{language === 'ar' ? 'عمليات نقاط البيع (فواتير POS)' : 'POS operations (invoices)'}</p>
            </div>
            <h3 className="text-3xl font-bold text-amber-400">
              {loading
                ? '...'
                : formatNumber(
                    summaryData?.pos_orders_count ?? operationsCount,
                    language === 'ar' ? 'ar' : 'en'
                  )}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'ar' ? 'عدد فواتير نقاط البيع فقط (بدون أونلاين)' : 'POS invoice count only (excludes online)'}
            </p>
          </div>
          <div className="p-6 neon-card rounded-xl border border-teal-500/40">
            <div className="mb-2">
              <p className="text-gray-400 text-sm">{language === 'ar' ? 'تحصيلات (على الحساب)' : 'Collections (On Account)'}</p>
            </div>
            <h3 className="text-3xl font-bold text-teal-400">
              {loading ? '...' : formatCurrency(summaryData?.collections_total ?? 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
            </h3>
          </div>
          <div className="p-6 neon-card rounded-xl border border-amber-500/40">
            <div className="mb-2">
              <p className="text-gray-400 text-sm">{language === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}</p>
            </div>
            <h3 className="text-3xl font-bold text-amber-400">
              {loading ? '...' : formatCurrency(summaryData?.returns_total ?? 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
            </h3>
          </div>
          <div className="p-6 neon-card rounded-xl border border-rose-500/40">
            <div className="mb-2">
              <p className="text-gray-400 text-sm">{language === 'ar' ? 'مصروفات' : 'Expenses'}</p>
            </div>
            <h3 className="text-3xl font-bold text-rose-400">
              {loading ? '...' : formatCurrency(summaryData?.expenses_total ?? 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
            </h3>
          </div>
          <div className="p-6 neon-card rounded-xl border border-emerald-500/40 shadow-[0_0_18px_rgba(34,197,94,0.2)]">
            <div className="mb-2">
              <p className="text-gray-400 text-sm">{language === 'ar' ? 'صافي الدرج' : 'Net Drawer'}</p>
            </div>
            <h3 className="text-3xl font-bold text-emerald-400">
              {loading ? '...' : formatCurrency(summaryData?.net_drawer ?? 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'ar'
                ? 'نقاط البيع (بعد مرتجع الفاتورة) + تحصيلات مدفوعة − مرتجعات − مصروفات — بدون أونلاين'
                : 'POS (net of invoice returns) + paid collections − returns − expenses — excludes online'}
            </p>
          </div>
          <div className="p-6 neon-card rounded-xl border border-emerald-500/40">
            <div className="mb-2">
              <p className="text-gray-400 text-sm">{language === 'ar' ? 'صافي المبيعات' : 'Net Sales'}</p>
            </div>
            <h3 className="text-3xl font-bold text-emerald-400">
              {loading ? '...' : formatCurrency(summaryData?.net_sales ?? 0, language === 'ar' ? 'ar' : 'en', currency, symbol)}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'ar' ? 'المبيعات - المرتجعات' : 'Sales - Returns'}
            </p>
          </div>
          <div className="p-6 neon-card rounded-xl neon-glow-fuchsia">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">{t('dashboard.totalProducts')}</p>
              <Package className="w-5 h-5 text-fuchsia-400" />
            </div>
            <h3 className="text-3xl font-bold text-fuchsia-400">
              {loading ? '...' : formatNumber(stats.totalProducts, language === 'ar' ? 'ar' : 'en')}
            </h3>
          </div>
          <div className="p-6 neon-card rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">{t('dashboard.staffOnline')}</p>
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-3xl font-bold text-yellow-500">
              {staffCount === null ? '—' : formatNumber(staffCount, language === 'ar' ? 'ar' : 'en')}
            </h3>
          </div>
          <div className="p-6 neon-card rounded-xl border border-slate-500/40">
            <div className="mb-2">
              <p className="text-gray-400 text-sm">
                {language === 'ar' ? 'تكلفة المبيعات (شراء × كمية مباعة)' : 'Cost of goods sold (period)'}
              </p>
            </div>
            <h3 className="text-3xl font-bold text-slate-200">
              {loading
                ? '...'
                : formatCurrency(
                    summaryData?.period_cogs_total ?? 0,
                    language === 'ar' ? 'ar' : 'en',
                    currency,
                    symbol
                  )}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'ar' ? 'حسب سعر الشراء في الفترة المحددة' : 'Based on buy price × qty sold in the selected range'}
            </p>
          </div>
          <div className="p-6 neon-card rounded-xl border border-violet-500/35 md:col-span-2 lg:col-span-4">
            <div className="mb-3">
              <p className="text-gray-400 text-sm font-semibold">
                {language === 'ar' ? 'أكثر المنتجات مبيعاً (بالكمية)' : 'Top selling products (by qty)'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {language === 'ar'
                  ? 'الشريط يمثل نسبة الكمية مقارنة بأعلى منتج في القائمة ويتغير تلقائياً مع تحديث البيانات.'
                  : 'Bar length is relative to the top qty in this list and updates when data refreshes.'}
              </p>
            </div>
            {loading ? (
              <p className="text-gray-500">{t('common.loading')}</p>
            ) : !summaryData?.top_selling_products?.length ? (
              <p className="text-gray-500 text-sm">{language === 'ar' ? 'لا بيانات لهذه الفترة' : 'No data for this period'}</p>
            ) : (
              <DashboardTopSellingProducts rows={summaryData.top_selling_products} language={language === 'ar' ? 'ar' : 'en'} />
            )}
          </div>
          {deadSlowStats && (deadSlowStats.deadCount > 0 || deadSlowStats.slowCount > 0) && (
            <Link href="/store-admin/inventory/slow-moving">
              <div className="p-6 neon-card rounded-xl border border-amber-500/40 hover:border-amber-500/60 cursor-pointer transition">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-400 text-sm">{t('dashboard.deadSlowStock')}</p>
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-2xl font-bold text-amber-400">
                  {language === 'ar' ? 'راكد' : 'Dead'}: {deadSlowStats.deadCount} |{' '}
                  {language === 'ar' ? 'بطيء' : 'Slow'}: {deadSlowStats.slowCount}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(
                    deadSlowStats.deadValue + deadSlowStats.slowValue,
                    language === 'ar' ? 'ar' : 'en',
                    currency,
                    symbol
                  )}{' '}
                  {language === 'ar' ? 'قيمة مربوطة' : 'tied value'}
                </p>
              </div>
            </Link>
          )}
        </div>

        <div className="mb-8 p-6 neon-card rounded-xl border border-cyan-500/35 shadow-[0_0_18px_rgba(0,229,255,0.2)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-cyan-200 mb-1 flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-300" />
                {language === 'ar' ? 'نقطة البيع السريعة' : 'Quick POS access'}
              </h3>
              <p className="text-sm text-gray-400">
                {language === 'ar' ? 'ابدأ عملية بيع مباشرة من هنا' : 'Start a sale instantly from dashboard'}
              </p>
            </div>
            <Link
              href="/pos"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 transition shadow-[0_0_14px_rgba(0,229,255,0.22)]"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{language === 'ar' ? 'ابدأ عملية بيع الآن' : 'Start sale now'}</span>
            </Link>
          </div>
        </div>

        {usageData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="p-6 neon-card rounded-xl border border-fuchsia-500/35">
              <p className="text-sm font-semibold text-fuchsia-200/90 mb-3">
                {language === 'ar' ? 'المساعد الذكي (شهري)' : 'AI assistant (monthly)'}
              </p>
              {usageData.usage.goldTrialActive && (
                <p className="text-xs text-amber-300/85 mb-2">
                  {language === 'ar'
                    ? 'تجربة ذهبية أسبوعية: حد مؤقت 20 رسالة و5 فواتير OCR حتى انتهاء التجربة.'
                    : 'Gold weekly trial: temporary cap of 20 AI messages and 5 OCR invoices until the trial ends.'}
                </p>
              )}
              {usageData.usage.aiLimit <= 0 ? (
                <p className="text-sm text-slate-500">
                  {language === 'ar' ? 'غير متاح في باقتك الحالية' : 'Not included in your current plan'}
                </p>
              ) : (
                <>
                  <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-fuchsia-500/20">
                    <div
                      className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all"
                      style={{ width: `${Math.min(100, usageData.usage.aiPercent)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {usageData.usage.aiUsed} / {usageData.usage.aiLimit} · {usageData.usage.aiPercent}%
                  </p>
                  {usageData.usage.aiNearLimit && (
                    <p className="text-xs text-amber-400 mt-1">
                      {language === 'ar'
                        ? 'أنت قريب من انتهاء حد الباقة لهذا الشهر'
                        : 'You are close to your monthly AI quota'}
                    </p>
                  )}
                  {usageData.usage.aiAtLimit && (
                    <p className="text-xs text-rose-400 mt-2">
                      {language === 'ar'
                        ? 'ترقية الباقة أو شراء رصيد إضافي من الإعدادات'
                        : 'Upgrade or add credits in Settings'}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="p-6 neon-card rounded-xl border border-cyan-500/35">
              <p className="text-sm font-semibold text-cyan-200/90 mb-3">
                {language === 'ar' ? 'قراءة فواتير الشراء (OCR شهري)' : 'Purchase invoice OCR (monthly)'}
              </p>
              {usageData.usage.ocrLimit <= 0 ? (
                <p className="text-sm text-slate-500">
                  {language === 'ar' ? 'غير متاح في باقتك الحالية' : 'Not included in your current plan'}
                </p>
              ) : (
                <>
                  <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-cyan-500/20">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-teal-500 transition-all"
                      style={{ width: `${Math.min(100, usageData.usage.ocrPercent)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {usageData.usage.ocrUsed} / {usageData.usage.ocrLimit} · {usageData.usage.ocrPercent}%
                  </p>
                  {usageData.usage.ocrNearLimit && (
                    <p className="text-xs text-amber-400 mt-1">
                      {language === 'ar'
                        ? 'أنت قريب من انتهاء حد الباقة لهذا الشهر'
                        : 'You are close to your monthly OCR quota'}
                    </p>
                  )}
                  {usageData.usage.ocrAtLimit && (
                    <p className="text-xs text-rose-400 mt-2">
                      {language === 'ar'
                        ? 'ترقية الباقة أو شراء رصيد إضافي من الإعدادات'
                        : 'Upgrade or add credits in Settings'}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {usageData && usageData.nearExpiryCount > 0 && (
          <Link href="/store-admin/inventory/slow-moving?type=near_expiry" className="block mb-8">
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 transition">
              <p className="text-sm text-amber-200">
                {language === 'ar'
                  ? `منتجات قاربت على انتهاء الصلاحية: ${usageData.nearExpiryCount}`
                  : `Products expiring soon: ${usageData.nearExpiryCount}`}
              </p>
            </div>
          </Link>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {/* POS Sales Chart - grouped bars: revenue + POS operations */}
          <div className="p-6 neon-card rounded-xl">
            <h3 className="text-xl font-bold mb-4 text-cyan-200">{t('dashboard.salesChart')}</h3>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-500">{t('common.loading')}</p>
              </div>
            ) : chartSalesData.length === 0 ? (
              <div className="min-h-[300px] h-[300px] flex items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/5">
                <p className="text-cyan-300">{language === 'ar' ? 'لا توجد بيانات لهذه الفترة' : 'No data for this period'}</p>
              </div>
            ) : (
              <div dir="ltr" className="w-full min-h-[300px] min-w-0">
                <DashboardGradientHBarChart
                  rows={salesHBarRows}
                  segmentLegend={
                    language === 'ar' ? ['المبيعات', 'العمليات'] : ['Sales', 'Operations']
                  }
                />
              </div>
            )}
          </div>

          {/* Operations Chart — POS invoice counts only */}
          <div className="p-6 neon-card rounded-xl">
            <h3 className="text-xl font-bold mb-4 text-cyan-200">
              {language === 'ar' ? 'عمليات نقاط البيع' : 'POS operations'}
            </h3>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-500">{t('common.loading')}</p>
              </div>
            ) : chartOperationsData.length === 0 ? (
              <div className="min-h-[300px] h-[300px] flex items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/5">
                <p className="text-cyan-300">{language === 'ar' ? 'لا توجد بيانات لهذه الفترة' : 'No data for this period'}</p>
              </div>
            ) : (
              <div dir="ltr" className="w-full min-w-0">
                <DashboardGradientHBarChart
                  rows={operationsHBarRows}
                  segmentLegend={language === 'ar' ? ['نقاط البيع'] : ['POS']}
                />
              </div>
            )}
          </div>

          {/* Online Sales Chart - grouped bars: amount + confirmed orders count */}
          <div className="p-6 neon-card rounded-xl">
            <h3 className="text-xl font-bold mb-4 text-cyan-200">{t('dashboard.onlineSalesChart')}</h3>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-500">{t('common.loading')}</p>
              </div>
            ) : chartOnlineData.length === 0 ? (
              <div className="min-h-[300px] h-[300px] flex items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/5">
                <p className="text-cyan-300">{language === 'ar' ? 'لا توجد بيانات لهذه الفترة' : 'No data for this period'}</p>
              </div>
            ) : (
              <div dir="ltr" className="w-full min-w-0">
                <DashboardGradientHBarChart
                  rows={onlineHBarRows}
                  segmentLegend={
                    language === 'ar' ? ['المبيعات', 'العمليات'] : ['Sales', 'Operations']
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts & Recent Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Low Stock + Near-expiry Alerts */}
          <div className="p-6 neon-card rounded-xl border border-fuchsia-500/40 shadow-[0_0_18px_rgba(236,72,153,0.35)]">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-xl font-bold text-cyan-200">
                {language === 'ar' ? 'تنبيهات المخزون والصلاحية' : 'Stock & expiry alerts'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">{t('dashboard.lowStockAlerts')}</p>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-slate-400">{language === 'ar' ? 'منخفض' : 'Low'}</span>
              <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-sm font-bold">
                {formatNumber(lowStockProducts.length, language === 'ar' ? 'ar' : 'en')}
              </span>
              <span className="text-sm text-slate-400 ml-2">{language === 'ar' ? 'قرب انتهاء' : 'Near expiry'}</span>
              <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full text-sm font-bold">
                {formatNumber(nearExpiryProducts.length, language === 'ar' ? 'ar' : 'en')}
              </span>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {loading ? (
                <p className="text-gray-500 text-center py-4">{t('common.loading')}</p>
              ) : lowStockProducts.length === 0 && nearExpiryProducts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  {t('dashboard.noAlerts')}
                </p>
              ) : (
                <>
                  {lowStockProducts.map((product) => {
                    const refQty =
                      product.stock_reference_qty != null && Number(product.stock_reference_qty) > 0
                        ? Number(product.stock_reference_qty)
                        : null;
                    return (
                    <div key={`low-${product.id}`} className="bg-gray-800 p-3 rounded-lg border-l-4 border-red-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-white">
                            {language === 'ar' ? product.name_ar : product.name_en}
                          </h4>
                          {product.category_name_ar && (
                            <p className="text-xs text-gray-400 mt-1">
                              {language === 'ar' ? product.category_name_ar : product.category_name_en}
                            </p>
                          )}
                          <p className="text-xs text-red-400/90 mt-1">{language === 'ar' ? 'مخزون منخفض' : 'Low stock'}</p>
                          <p className="text-xs text-slate-400 mt-1 leading-snug">
                            {language === 'ar'
                              ? refQty != null
                                ? `متبقي ${product.stock_quantity} من ${refQty} — الحد الأدنى ${product.min_stock_level}`
                                : `المتبقي ${product.stock_quantity} — الحد الأدنى ${product.min_stock_level}`
                              : refQty != null
                                ? `Remaining ${product.stock_quantity} of ${refQty} — min. ${product.min_stock_level}`
                                : `Remaining ${product.stock_quantity} — min. ${product.min_stock_level}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-red-400 font-bold">
                            {product.stock_quantity} / {product.min_stock_level}
                          </p>
                          <p className="text-xs text-gray-500">
                            {language === 'ar' ? 'حالي / حد' : 'now / min'}
                          </p>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                  {nearExpiryProducts.map((product) => (
                    <div key={`exp-${product.id}`} className="bg-gray-800 p-3 rounded-lg border-l-4 border-amber-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-white">
                            {language === 'ar' ? product.name_ar || product.name_en : product.name_en}
                          </h4>
                          <p className="text-xs text-amber-300/90 mt-1">
                            {language === 'ar' ? 'قرب انتهاء الصلاحية' : 'Near expiry'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-amber-300 font-bold">
                            {product.expiry_date
                              ? new Date(product.expiry_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')
                              : '—'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {product.days_to_expiry != null && !Number.isNaN(Number(product.days_to_expiry))
                              ? `${language === 'ar' ? 'متبقي' : 'in'} ${Number(product.days_to_expiry)} ${language === 'ar' ? 'يوم' : 'd'}`
                              : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Recent Stock Update */}
          <div className="p-6 neon-card rounded-xl">
            <h3 className="text-xl font-bold mb-4 text-cyan-200">{t('dashboard.recentStock')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800 text-cyan-500">
                    <th className="pb-3 px-2">{language === 'ar' ? 'اسم المنتج' : 'Product Name'}</th>
                    <th className="pb-3 px-2">{language === 'ar' ? 'المخزون' : 'Stock'}</th>
                    <th className="pb-3 px-2">{language === 'ar' ? 'السعر' : 'Price'}</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-500">
                        {t('common.loading')}
                      </td>
                    </tr>
                  ) : recentProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-500">
                        {language === 'ar' ? 'لا توجد بيانات' : 'No recent items'}
                      </td>
                    </tr>
                  ) : (
                    recentProducts.map((product) => (
                      <tr key={product.id} className="border-b border-gray-900 hover:bg-gray-800 transition">
                        <td className="py-3 px-2">
                          {language === 'ar' ? product.name_ar : product.name_en}
                        </td>
                        <td className="py-3 px-2 text-green-400">{product.stock_quantity}</td>
                        <td className="py-3 px-2">
                          {formatCurrency(
                            product.sell_price,
                            language === 'ar' ? 'ar' : 'en',
                            currency,
                            symbol
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {(user?.role === 'super_admin' || user?.package === 'gold' || user?.package === 'branches') && <AIAssistant />}
    </div>
  );
}

