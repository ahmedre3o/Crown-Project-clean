'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiRequest } from '../contexts/AuthContext';

interface Notification {
  id: number;
  type: string;
  source?: string;
  title_ar?: string | null;
  title_en?: string | null;
  body_ar?: string | null;
  body_en?: string | null;
  is_read: number;
  meta?: { orderId?: number; invoiceId?: number; saleId?: number; publicCode?: string };
  created_at: string;
}

export function NotificationsBell() {
  const { language } = useLanguage();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [toast, setToast] = useState<{ msg: string; orderId?: number } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      if (!alive) return;
      try {
        const res = await apiRequest('/notifications/unread-count');
        const n = Number(res?.count ?? 0) || 0;
        if (n > prevCountRef.current && prevCountRef.current > 0) {
          setToast({ msg: language === 'ar' ? 'نشاط جديد!' : 'New activity!' });
          setTimeout(() => setToast(null), 4000);
        }
        prevCountRef.current = n;
        setUnreadCount(n);
      } catch {
        // ignore
      }
    };
    void poll();
    const t = setInterval(poll, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [language]);

  useEffect(() => {
    if (open) {
      setLoadError(false);
      apiRequest('/notifications?limit=10')
        .then((res: any) => {
          const items = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : []);
          setNotifications(items);
          if (res?.ok === false) setLoadError(true);
        })
        .catch(() => {
          setNotifications([]);
          setLoadError(true);
        });
    }
  }, [open]);

  const markRead = async (id: number, navTo?: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      prevCountRef.current = Math.max(0, prevCountRef.current - 1);
      if (navTo) {
        router.push(navTo);
        setOpen(false);
      }
    } catch {
      // ignore
    }
  };

  const title = (n: Notification) => (language === 'ar' ? n.title_ar || n.title_en : n.title_en || n.title_ar) || '';
  const body = (n: Notification) => (language === 'ar' ? n.body_ar || n.body_en : n.body_en || n.body_ar) || '';
  const meta = (n: Notification): { orderId?: number; invoiceId?: number; saleId?: number } => {
    const m = n.meta;
    if (typeof m === 'object' && m) {
      return {
        orderId: m.orderId != null ? Number(m.orderId) : undefined,
        invoiceId: m.invoiceId != null ? Number(m.invoiceId) : (m.saleId != null ? Number(m.saleId) : undefined),
      };
    }
    if (typeof m === 'string') try { const p = JSON.parse(m); return { orderId: p?.orderId, invoiceId: p?.invoiceId ?? p?.saleId }; } catch { return {}; }
    return {};
  };

  const getNavLink = (n: Notification): string | null => {
    const { orderId, invoiceId } = meta(n);
    if (orderId) return `/store-admin/orders?focus=${orderId}`;
    if (invoiceId) return `/invoices?focus=${invoiceId}&source=${n.source === 'online' ? 'online' : 'pos'}`;
    return null;
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="relative p-2 rounded-xl border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 transition"
          aria-label={language === 'ar' ? 'الإشعارات' : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            {isMobile ? (
              <div
                className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-cyan-500/30 bg-[#050812] shadow-[0_0_32px_rgba(34,211,238,0.35)] w-full max-h-[80vh] overflow-y-auto ${
                  language === 'ar' ? 'text-right' : 'text-left'
                }`}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              >
                <div className="px-4 py-3 border-b border-cyan-500/20 flex items-center justify-between">
                  <span className="text-sm font-bold text-cyan-100">
                    {language === 'ar' ? 'الإشعارات' : 'Notifications'}
                  </span>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-xs text-slate-400 hover:text-cyan-200"
                  >
                    {language === 'ar' ? 'إغلاق' : 'Close'}
                  </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto">
                  {loadError ? (
                    <div className="px-4 py-6 text-amber-300 text-sm text-center">
                      {language === 'ar' ? 'فشل تحميل الإشعارات' : 'Failed to load notifications'}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-slate-400 text-sm text-center">
                      {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                        className={`w-full px-4 py-3 border-b border-cyan-500/10 hover:bg-cyan-500/5 transition ${
                          n.is_read ? 'text-slate-400' : 'text-slate-100 bg-cyan-500/5'
                        }`}
                      >
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex items-start justify-between gap-2 w-full">
                            <div className="min-w-0 flex-1 text-sm font-semibold break-words whitespace-normal">
                              {title(n)}
                            </div>
                            <div className="text-[11px] text-slate-500 shrink-0">
                              {new Date(n.created_at).toLocaleString(
                                language === 'ar' ? 'ar-EG' : 'en-US'
                              )}
                            </div>
                          </div>
                          {body(n) ? (
                            <div className="text-xs text-slate-400 mt-1 whitespace-normal break-words line-clamp-2">
                              {body(n)}
                            </div>
                          ) : null}
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => {
                                void markRead(n.id);
                                router.push(`/notifications?focus=${n.id}`);
                                setOpen(false);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                            >
                              {language === 'ar' ? 'عرض' : 'View'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button
                  className="w-full px-4 py-3 text-xs font-semibold text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10 border-t border-cyan-500/20"
                  onClick={() => {
                    router.push('/notifications');
                    setOpen(false);
                  }}
                >
                  {language === 'ar' ? 'عرض كل الإشعارات' : 'View all notifications'}
                </button>
              </div>
            ) : (
              <div
                className={`absolute top-full mt-2 z-50 w-[min(92vw,420px)] max-h-[70vh] overflow-y-auto rounded-xl border border-cyan-500/25 bg-[#0a0f18] shadow-[0_0_24px_rgba(34,211,238,0.2)] ${
                  language === 'ar' ? 'right-0 origin-top-right text-right' : 'left-0 origin-top-left text-left'
                }`}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              >
                <div className="px-4 py-3 border-b border-cyan-500/15 text-sm font-bold text-cyan-100">
                  {language === 'ar' ? 'الإشعارات' : 'Notifications'}
                </div>
                <div>
                  {loadError ? (
                    <div className="px-4 py-6 text-amber-300 text-sm text-center">
                      {language === 'ar' ? 'فشل تحميل الإشعارات' : 'Failed to load notifications'}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-slate-400 text-sm text-center">
                      {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                        className={`w-full px-4 py-3 border-b border-cyan-500/10 hover:bg-cyan-500/5 transition ${
                          n.is_read ? 'text-slate-400' : 'text-slate-100 bg-cyan-500/5'
                        }`}
                      >
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex items-start justify-between gap-2 w-full">
                            <div className="min-w-0 flex-1 text-sm font-semibold break-words whitespace-normal">
                              {title(n)}
                            </div>
                            <div className="text-[11px] text-slate-500 shrink-0">
                              {new Date(n.created_at).toLocaleString(
                                language === 'ar' ? 'ar-EG' : 'en-US'
                              )}
                            </div>
                          </div>
                          {body(n) ? (
                            <div className="text-xs text-slate-400 mt-1 whitespace-normal break-words line-clamp-2">
                              {body(n)}
                            </div>
                          ) : null}
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => {
                                void markRead(n.id);
                                router.push(`/notifications?focus=${n.id}`);
                                setOpen(false);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                            >
                              {language === 'ar' ? 'عرض' : 'View'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <button
                    className="w-full px-4 py-3 text-xs font-semibold text-cyan-300 hover:text-cyan-100 hover:bg-cyan-500/10 border-t border-cyan-500/20"
                    onClick={() => {
                      router.push('/notifications');
                      setOpen(false);
                    }}
                  >
                    {language === 'ar' ? 'عرض كل الإشعارات' : 'View all notifications'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 px-4 py-3 rounded-xl border border-cyan-500/25 bg-black/90 backdrop-blur text-cyan-100 text-sm shadow-[0_0_24px_rgba(34,211,238,0.25)]">
          <span>{toast.msg}</span>
          <button
            onClick={() => {
              router.push('/notifications');
              setToast(null);
            }}
            className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs"
          >
            {language === 'ar' ? 'فتح' : 'Open'}
          </button>
        </div>
      )}
    </>
  );
}
