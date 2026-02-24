'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Clock,
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileSpreadsheet,
  FileText,
  MessageCircle,
  Settings,
  Shield,
  FilePlus2,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  BarChart2,
  AlertTriangle,
  GitBranch,
  ChevronDown,
  Users,
  Key,
  CreditCard,
} from 'lucide-react';
import { NeonCrownIcon } from './NeonCrownIcon';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useBranch, getBranchDisplayName } from '../contexts/BranchContext';
import { NotificationsBell } from './NotificationsBell';
import { ShopSwitcher } from './ShopSwitcher';
import { useRouter } from 'next/navigation';
import { getAllowedNav, getPlanFeatures, canAccess, SECTION_LABELS, type Role } from '../permissions';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  MessageCircle,
  ShoppingCart,
  Package,
  AlertTriangle,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  BarChart2,
  ShoppingBag,
  CreditCard,
  Bell,
  GitBranch,
  Users,
  Shield,
  Settings,
  Key,
};

export function Sidebar() {
  const pathname = usePathname();
  const { t, direction, language, setLanguage } = useLanguage();
  const { logout, user, effectiveRole } = useAuth();
  const branchContext = useBranch();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const isRtl = direction === 'rtl';
  const branches = branchContext?.branches ?? [];
  const activeBranch = branchContext?.activeBranch ?? null;
  const setActiveBranchId = branchContext?.setActiveBranchId;

  const planFeatures = useMemo(() => getPlanFeatures(user?.package), [user?.package]);
  const role = (effectiveRole ?? user?.role) as Role | undefined;
  const canSeeOnlineOrders = canAccess(role, 'online_orders', planFeatures);
  const canSeeSystemAdmin = canAccess(role, 'admin', planFeatures);

  const navItems = useMemo(
    () => getAllowedNav(role, planFeatures, t, language),
    [role, planFeatures, t, language]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('sidebar-collapsed') === 'true';
    setCollapsed(saved);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', String(next));
    }
  };

  const handleAiClick = () => {
    try {
      localStorage.setItem('crown-open-ai', 'true');
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('crown:open-ai'));
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 z-50 h-10 w-10 rounded-xl bg-cyan-600 text-white shadow-[0_0_16px_rgba(0,243,255,0.4)] flex items-center justify-center"
        style={{ insetInlineStart: '1rem' }}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 z-50 h-full bg-[#0a0f18] border-cyan-500/40 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${
          collapsed ? 'md:w-20' : 'md:w-64'
        } w-64 ${
          open ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'
        }`}
        style={{
          insetInlineStart: 0,
          borderInlineEndWidth: '1px',
          borderInlineEndStyle: 'solid',
        }}
      >
        <div>
          {/* Brand Cluster */}
          <div className={`border-b border-cyan-500/20 ${collapsed ? 'px-4 py-6' : 'px-6 py-6'}`}>
            <div className={`flex ${collapsed ? 'justify-center' : 'items-start gap-3'}`}>
              <div className="h-10 w-10 rounded-xl border border-cyan-500/30 bg-black/30 flex items-center justify-center shadow-[0_0_18px_rgba(0,243,255,0.22)]">
                <NeonCrownIcon size={24} />
              </div>

              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="leading-none">
                    <div className="text-[12px] font-black tracking-[0.28em] uppercase text-fuchsia-200">
                      CROWN <span className="text-slate-100">SERVICES</span>
                    </div>
                    <div className="mt-3 flex flex-col items-start gap-2">
                      {/* Live Clock + Notifications Bell */}
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-black/25 px-3 py-1.5 shadow-[0_0_14px_rgba(0,243,255,0.12)]">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-50" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300 shadow-[0_0_10px_rgba(0,243,255,0.65)]" />
                        </span>
                        <Clock className="h-3.5 w-3.5 text-cyan-300" />
                        <span className="font-mono text-xs text-cyan-200">
                          {now.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        </div>
                        {canSeeOnlineOrders && <NotificationsBell />}
                      </div>

                      {/* Shop switcher (super_admin only - use real role, not override) */}
                      {user?.role === 'super_admin' && <ShopSwitcher />}
                      {/* Branch switcher */}
                      {branches.length > 0 && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setBranchDropdownOpen((v) => !v)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-black/25 px-3 py-1.5 text-[11px] text-cyan-200"
                          >
                            <GitBranch className="h-3.5 w-3.5" />
                            <span className="max-w-[100px] truncate">{getBranchDisplayName(activeBranch, language)}</span>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          {branchDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setBranchDropdownOpen(false)} />
                              <div
                                className="absolute top-full mt-1 z-20 min-w-[160px] rounded-lg border border-cyan-500/30 bg-[#0b1220] py-1 shadow-xl"
                                style={{ insetInlineStart: 0 }}
                              >
                                {branches.map((b) => (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => {
                                      setActiveBranchId?.(b.id);
                                      setBranchDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-xs ${activeBranch?.id === b.id ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-300 hover:bg-cyan-500/10'}`}
                                  >
                                    {getBranchDisplayName(b, language)}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {/* Language Switcher */}
                      <div className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-black/25 p-1 shadow-[0_0_14px_rgba(0,243,255,0.10)]">
                        <button
                          type="button"
                          onClick={() => setLanguage('ar')}
                          className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition ${
                            language === 'ar' ? 'bg-cyan-400 text-black' : 'text-cyan-100 hover:bg-white/5'
                          }`}
                        >
                          AR
                        </button>
                        <button
                          type="button"
                          onClick={() => setLanguage('en')}
                          className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition ${
                            language === 'en' ? 'bg-cyan-400 text-black' : 'text-cyan-100 hover:bg-white/5'
                          }`}
                        >
                          EN
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-4 py-3 hidden md:flex items-center justify-between">
            <button
              onClick={toggleCollapsed}
              className="h-9 w-9 rounded-lg border border-cyan-500/30 text-cyan-300 flex items-center justify-center"
              aria-label="Toggle sidebar size"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <nav className="px-4 py-4 space-y-4">
            {(['operations', 'inventory', 'reports', 'admin', 'system'] as const).map((section) => {
              const items = navItems.filter((x) => x.section === section);
              if (items.length === 0) return null;
              const sectionLabel = SECTION_LABELS[section][language as 'ar' | 'en'];
              return (
                <div key={section}>
                  {!collapsed && (
                    <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {sectionLabel}
                    </div>
                  )}
                  <div className="space-y-2">
                    {items.map((item) => {
                      const Icon = ICON_MAP[item.icon] ?? Package;
                      const active = pathname === item.href || (item.href === '/dashboard?ai=1' && pathname === '/dashboard');
                      const onClick = item.id === 'ai' ? handleAiClick : undefined;
                      return (
                        <Link
                          key={item.href + item.id}
                          href={item.href}
                          onClick={() => {
                            onClick?.();
                            setOpen(false);
                          }}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                            item.glow
                              ? 'bg-fuchsia-500/10 border border-fuchsia-500/40 text-fuchsia-200 shadow-[0_0_16px_rgba(236,72,153,0.35)] hover:bg-fuchsia-500/10'
                              : active
                              ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 shadow-[0_0_14px_rgba(0,243,255,0.35)]'
                              : 'text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10'
                          }`}
                        >
                          <Icon className={`h-5 w-5 shrink-0 ${item.glow ? 'text-fuchsia-300' : 'text-cyan-300'}`} />
                          {!collapsed && <span className="text-sm font-semibold">{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="px-4 pb-6 space-y-3">
          <button
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 transition border border-cyan-500/20"
          >
            <LogOut className="h-5 w-5 text-cyan-300" />
            {!collapsed && <span className="text-sm font-semibold">{t('nav.logout')}</span>}
          </button>
          {!collapsed && (
            <div className="text-xs text-slate-500 text-center">
              Crown Services — By Ahmed 2025
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

