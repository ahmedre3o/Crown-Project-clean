'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, ChevronDown, ChevronUp, CheckCheck, Globe, ShoppingCart, FileText } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest, useAuth } from '../contexts/AuthContext';
import { useRouteGuard } from '../guards/useRouteGuard';
import { getStoredShopId } from '@/lib/shop';
import { formatNotificationDate, getNotificationBody, getNotificationTitle } from '../lib/notifications';

interface Notification {
  id: number;
  source: string;
  type: string;
  title?: string | null;
  title_ar?: string | null;
  title_en?: string | null;
  body?: string | null;
  body_ar?: string | null;
  body_en?: string | null;
  is_read: number;
  meta?: unknown;
  created_at: string | null;
}

export default function NotificationsPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const { allowed } = useRouteGuard(user, authLoading, { feature: 'notifications', effectiveRole, showDenied: true });
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [needsShop, setNeedsShop] = useState(false);
  const needsShopSelection = user?.role === 'super_admin' && !getStoredShopId();

  const load = useCallback(
    async (offset = 0, append = false) => {
      try {
        if (offset === 0) setLoading(true);
        else setLoadingMore(true);
        setError(null);
        setNeedsShop(false);
        const params = new URLSearchParams({ limit: '20', offset: String(offset) });
        if (sourceFilter && ['online', 'pos', 'system'].includes(sourceFilter)) params.set('source', sourceFilter);
        if (search.trim()) params.set('q', search.trim());
        const res = await apiRequest(`/notifications?${params}`);
        if (res?.ok === false) {
          setError(res?.error || (language === 'ar' ? 'فشل التحميل' : 'Failed to load'));
          setItems([]);
          return;
        }
        const list = Array.isArray(res?.items) ? res.items : [];
        setItems((prev) => (append ? [...prev, ...list] : list));
        setNextOffset(res?.nextOffset ?? null);
        setUnreadCount(Number(res?.unreadCount ?? 0));
      } catch (err: any) {
        if (err?.message === 'SHOP_ID_REQUIRED') {
          setNeedsShop(true);
          setItems([]);
          setUnreadCount(0);
          setNextOffset(null);
          return;
        }
        setError(err?.message || (language === 'ar' ? 'فشل التحميل' : 'Failed to load'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sourceFilter, search, language]
  );

  useEffect(() => {
    if (!authLoading && allowed) {
      const t = setTimeout(() => void load(0, false), search.trim() ? 350 : 0);
      return () => clearTimeout(t);
    }
  }, [authLoading, allowed, sourceFilter, search, load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      if (!authLoading && allowed) void load(0, false);
    };
    window.addEventListener('crown-shop-changed', handler);
    return () => window.removeEventListener('crown-shop-changed', handler);
  }, [authLoading, allowed, load]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const focusId = Number(url.searchParams.get('focus') ?? NaN);
    if (!Number.isFinite(focusId) || focusId <= 0) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`notif-${focusId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setExpandedId(focusId);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  const markRead = async (id: number) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await apiRequest('/notifications/mark-all-read', { method: 'PATCH' });
      setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const title = (n: Notification) => getNotificationTitle(n, language);
  const body = (n: Notification) => getNotificationBody(n, language);

  const meta = (n: Notification): { orderId?: number; invoiceId?: number; saleId?: number } => {
    const m = n.meta;
    if (typeof m === 'object' && m) {
      const o = m as Record<string, unknown>;
      return {
        orderId: o.orderId != null ? Number(o.orderId) : undefined,
        invoiceId: o.invoiceId != null ? Number(o.invoiceId) : (o.saleId != null ? Number(o.saleId) : undefined),
      };
    }
    if (typeof m === 'string')
      try {
        const p = JSON.parse(m);
        return { orderId: p?.orderId, invoiceId: p?.invoiceId ?? p?.saleId };
      } catch {
        return {};
      }
    return {};
  };

  const getNavLink = (n: Notification): string | null => {
    const { orderId, invoiceId } = meta(n);
    if (orderId) return `/store-admin/orders?focus=${orderId}`;
    if (invoiceId) return `/invoices?focus=${invoiceId}&source=${n.source === 'online' ? 'online' : 'pos'}`;
    return null;
  };

  const sourceIcon = (source: string) => {
    if (source === 'online') return <Globe className="h-4 w-4 text-cyan-300" />;
    if (source === 'pos') return <ShoppingCart className="h-4 w-4 text-green-300" />;
    return <FileText className="h-4 w-4 text-slate-400" />;
  };

  if (authLoading || !allowed) return null;

  return (
    <div
      className={`min-h-screen bg-[#020617] ${direction === 'rtl' ? 'font-[system-ui]' : ''} ${
        language === 'ar' ? 'text-right' : 'text-left'
      }`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <main className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-cyan-300" />
            <h1 className="text-xl md:text-2xl font-bold text-cyan-200">
              {language === 'ar' ? 'النشاط والإشعارات' : 'Activity & Notifications'}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-500/30 text-cyan-200 text-xs md:text-sm font-semibold hover:bg-cyan-500/10"
            >
              <CheckCheck className="h-4 w-4" />
              {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
            </button>
          )}
        </header>
        {needsShop || needsShopSelection ? (
          <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-100">
            {language === 'ar' ? 'لا توجد بيانات — لم يتم اختيار متجر.' : 'No data / shop not selected.'}
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute top-1/2 -translate-y-1/2 left-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                language === 'ar' ? 'بحث في العنوان أو المحتوى...' : 'Search title or body...'
              }
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-cyan-500/25 bg-black/30 text-slate-100 placeholder:text-slate-500 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['', 'online', 'pos', 'system'].map((s) => (
              <button
                key={s || 'all'}
                onClick={() => setSourceFilter(s)}
                className={`px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition ${
                  sourceFilter === s
                    ? 'bg-cyan-600 text-white'
                    : 'border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10'
                }`}
              >
                {s === ''
                  ? language === 'ar'
                    ? 'الكل'
                    : 'All'
                  : s === 'online'
                  ? language === 'ar'
                    ? 'أونلاين'
                    : 'Online'
                  : s === 'pos'
                  ? 'POS'
                  : language === 'ar'
                  ? 'النظام'
                  : 'System'}
              </button>
            ))}
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="inline-flex sm:hidden items-center gap-2 px-3 py-2 rounded-xl border border-cyan-500/30 text-cyan-200 text-xs font-semibold hover:bg-cyan-500/10"
              >
                <CheckCheck className="h-4 w-4" />
                {language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-slate-400 text-sm py-12 text-center">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-10 text-slate-400 text-center text-sm">
            {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((n) => {
              const dateLabel = formatNotificationDate(n.created_at, language);
              return (
              <div
                key={n.id}
                id={`notif-${n.id}`}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
                className={`rounded-2xl border border-cyan-500/20 bg-white/5 overflow-hidden ${
                  n.is_read ? 'opacity-80' : 'bg-cyan-500/5'
                }`}
              >
                <div
                  className="flex items-start gap-4 px-4 md:px-5 py-3 md:py-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
                >
                  <div className="mt-1">{sourceIcon(n.source)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-100 font-semibold text-sm md:text-base break-words">
                      {title(n)}
                    </div>
                    {body(n) && (
                      <div className="text-xs text-slate-400 mt-1 whitespace-pre-wrap break-words">
                        {body(n)}
                      </div>
                    )}
                    <div className="text-[11px] md:text-xs text-slate-500 mt-1">
                      {dateLabel || '-'}
                    </div>
                  </div>
                  {expandedId === n.id ? (
                    <ChevronUp className="h-5 w-5 text-cyan-300 shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-cyan-300 shrink-0" />
                  )}
                </div>
                {expandedId === n.id && (
                  <div className="border-t border-cyan-500/15 px-4 md:px-5 py-3 md:py-4 bg-black/30">
                    {typeof n.meta === 'object' && n.meta && (
                      <pre className="text-[11px] md:text-xs text-slate-400 overflow-x-auto mb-3">
                        {JSON.stringify(n.meta, null, 2)}
                      </pre>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => markRead(n.id)}
                        className="px-3 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-200 text-xs hover:bg-cyan-500/10"
                      >
                        {language === 'ar' ? 'تحديد كمقروء' : 'Mark read'}
                      </button>
                      {getNavLink(n) && (
                        <Link
                          href={getNavLink(n)!}
                          onClick={(e) => {
                            e.preventDefault();
                            router.push(getNavLink(n)!);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs hover:bg-cyan-500"
                        >
                          {meta(n).orderId
                            ? language === 'ar'
                              ? 'عرض الطلب'
                              : 'View order'
                            : language === 'ar'
                            ? 'عرض الفاتورة'
                            : 'View invoice'}
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}

        {nextOffset != null && items.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => void load(nextOffset, true)}
              disabled={loadingMore}
              className="px-6 py-2 rounded-xl border border-cyan-500/30 text-cyan-200 text-sm font-semibold hover:bg-cyan-500/10 disabled:opacity-60"
            >
              {loadingMore
                ? language === 'ar'
                  ? 'جاري التحميل...'
                  : 'Loading...'
                : language === 'ar'
                ? 'تحميل المزيد'
                : 'Load more'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

