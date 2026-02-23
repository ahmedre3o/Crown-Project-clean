'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiRequest, useAuth } from '@/contexts/AuthContext';
import { useRouteGuard } from '@/guards/useRouteGuard';
import { Activity, Users, Store, Clock } from 'lucide-react';

interface SystemStats {
  ok: boolean;
  totalUsers: number;
  totalShops: number | null;
  onlineUsers: number;
  active15m?: number;
  active60m?: number;
}

const toNumber = (value: any, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeSystemStats = (raw: any): SystemStats | null => {
  if (!raw || typeof raw !== 'object') return null;
  const totalUsers = toNumber(raw.totalUsers ?? raw.total_users ?? raw.users ?? 0);
  const totalShopsRaw = raw.totalShops ?? raw.total_shops ?? raw.shops ?? null;
  const totalShops = Number.isFinite(Number(totalShopsRaw)) ? Number(totalShopsRaw) : null;
  const onlineUsers = toNumber(
    raw.onlineUsers ?? raw.online_users ?? raw.active15m ?? raw.active_15m ?? raw.online ?? 0
  );
  const active15m = toNumber(raw.active15m ?? raw.active_15m ?? raw.onlineUsers ?? raw.online_users ?? onlineUsers);
  const active60m = toNumber(raw.active60m ?? raw.active_60m ?? 0);
  return {
    ok: raw.ok !== false,
    totalUsers,
    totalShops,
    onlineUsers,
    active15m,
    active60m,
  };
};

export default function SystemDashboardPage() {
  const { language, direction } = useLanguage();
  const { user, loading: authLoading, effectiveRole } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { allowed } = useRouteGuard(user, authLoading, {
    feature: 'admin',
    effectiveRole,
    showDenied: true,
  });

  useEffect(() => {
    if (!authLoading && allowed) {
      setLoading(true);
      setError(null);
      apiRequest('/system/stats')
        .then((res: any) => {
          const normalized = normalizeSystemStats(res);
          if (!normalized) {
            setError(language === 'ar' ? 'فشل تحميل الإحصائيات' : 'Failed to load stats');
            setStats(null);
            return;
          }
          setStats(normalized);
        })
        .catch((err: any) => {
          setError(err?.message || (language === 'ar' ? 'فشل تحميل الإحصائيات' : 'Failed to load stats'));
        })
        .finally(() => setLoading(false));
    }
  }, [authLoading, allowed, language]);

  if (authLoading || !allowed) return null;

  const dir = direction;
  const isAr = language === 'ar';

  return (
    <div className={`min-h-screen flex ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
      <Sidebar />
      <main
        className="flex-1 p-6 md:p-8 overflow-y-auto bg-[#020617]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="max-w-5xl mx-auto">
          <header className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-cyan-300" />
              <h1 className="text-2xl font-bold text-cyan-200">
                {isAr ? 'لوحة تحكم النظام' : 'System Admin Dashboard'}
              </h1>
            </div>
          </header>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
              {error}
            </div>
          )}

          {loading || !stats ? (
            <div className="text-slate-400 text-sm py-12 text-center">
              {isAr ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="rounded-2xl border border-cyan-500/30 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {isAr ? 'إجمالي المستخدمين' : 'Total Users'}
                    </span>
                    <Users className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="text-2xl font-bold text-cyan-200">{stats.totalUsers}</div>
                </div>

                <div className="rounded-2xl border border-cyan-500/30 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {isAr ? 'عدد المتاجر' : 'Total Shops'}
                    </span>
                    <Store className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="text-2xl font-bold text-cyan-200">
                    {stats.totalShops == null ? (isAr ? 'غير متاح' : 'N/A') : stats.totalShops}
                  </div>
                </div>

                <div className="rounded-2xl border border-cyan-500/30 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {isAr ? 'المتصلون الآن (آخر 15 دقيقة)' : 'Online Now (15m)'}
                    </span>
                    <Clock className="h-4 w-4 text-emerald-300" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-300">{stats.onlineUsers}</div>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {isAr ? 'نشطون خلال 15 دقيقة' : 'Active last 15 minutes'}
                    </span>
                    <Activity className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="text-2xl font-bold text-cyan-200">{stats.active15m ?? stats.onlineUsers}</div>
                </div>

                <div className="rounded-2xl border border-cyan-500/20 bg-white/5 p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-slate-400">
                      {isAr ? 'نشطون خلال 60 دقيقة' : 'Active last 60 minutes'}
                    </span>
                    <Activity className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div className="text-2xl font-bold text-cyan-200">{stats.active60m ?? 0}</div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

