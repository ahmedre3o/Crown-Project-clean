'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  Tag,
  RotateCcw,
  Wallet,
  Receipt,
  Banknote,
  Timer,
  Fingerprint,
  LogIn,
  ContactRound,
  Calendar,
  HardDrive,
} from 'lucide-react';
import { NeonCrownIcon } from './NeonCrownIcon';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth, apiRequest } from '../contexts/AuthContext';
import { useBranch, getBranchDisplayName } from '../contexts/BranchContext';
import { NotificationsBell } from './NotificationsBell';
import { ShopSwitcher } from './ShopSwitcher';
import { SubscriptionCountdownBanner } from './SubscriptionCountdownBanner';
import { useRouter } from 'next/navigation';
import { getNavGroups, getPlanFeatures, type Role } from '../permissions';

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
  Tag,
  RotateCcw,
  Wallet,
  Receipt,
  Clock,
  Banknote,
  Timer,
  Fingerprint,
  LogIn,
  ContactRound,
  Calendar,
  HardDrive,
};

export function Sidebar() {
  const pathname = usePathname();
  const { t, direction, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { logout, user, effectiveRole } = useAuth();
  const branchContext = useBranch();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [currentBranchName, setCurrentBranchName] = useState<string | null>(null);
  const bodyOverflowRef = useRef<string>('');
  const isRtl = direction === 'rtl';
  const branches = branchContext?.branches ?? [];
  const activeBranch = branchContext?.activeBranch ?? null;
  const setActiveBranchId = branchContext?.setActiveBranchId;

  const planFeatures = useMemo(() => getPlanFeatures(user?.package), [user?.package]);
  const role = (effectiveRole ?? user?.role) as Role | undefined;
  /** Bell + unread count: super_admin always; otherwise plan must include notifications + storefront roles */
  const canSeeNotificationsBell =
    user?.role === 'super_admin' ||
    (planFeatures.notifications &&
      ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'].includes(role ?? ''));
  const canSeeSystemAdmin = role === 'super_admin';

  const navGroups = useMemo(
    () => getNavGroups(role, planFeatures, t, language),
    [role, planFeatures, t, language]
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({}));
  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };
  const isGroupOpen = (groupId: string) => {
    if (openGroups[groupId] !== undefined) return openGroups[groupId];
    const group = navGroups.find((g) => g.groupId === groupId);
    const hasActive = group?.items.some((item) => pathname === item.href || (item.href === '/dashboard?ai=1' && pathname === '/dashboard'));
    return hasActive ?? true;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('sidebar-collapsed') === 'true';
    setCollapsed(saved);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Always show branch name (from context or /api/current-branch for client shops).
  useEffect(() => {
    if (activeBranch) {
      setCurrentBranchName(getBranchDisplayName(activeBranch, language));
      return;
    }
    if (pathname?.startsWith('/storefront') || pathname?.startsWith('/track')) {
      setCurrentBranchName(null);
      return;
    }
    if (!user) {
      setCurrentBranchName(null);
      return;
    }
    apiRequest('/current-branch')
      .then((data: any) => {
        const name = data?.branch_name ? String(data.branch_name).trim() : null;
        setCurrentBranchName(name || (language === 'ar' ? 'الفرع الرئيسي' : 'Main Branch'));
      })
      .catch(() => setCurrentBranchName(null));
  }, [activeBranch, user, pathname, language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) {
      document.body.style.overflow = bodyOverflowRef.current || '';
      return;
    }
    if (open) {
      bodyOverflowRef.current = document.body.style.overflow || '';
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = bodyOverflowRef.current || '';
    }
  }, [open]);

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
        className={`fixed top-0 z-50 bg-[#0a0f18] border-cyan-500/40 flex flex-col transition-transform duration-300 md:static md:translate-x-0 ${
          collapsed ? 'md:w-20' : 'md:w-64'
        } w-[92vw] max-w-[22rem] md:max-w-none md:w-64 ${
          open ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'
        } h-screen md:h-auto overflow-y-auto md:overflow-visible overscroll-contain`}
        style={{
          insetInlineStart: 0,
          borderInlineEndWidth: '1px',
          borderInlineEndStyle: 'solid',
          height: '100dvh',
          maxHeight: '100dvh',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0">
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
                        <div className="flex flex-col gap-1.5">
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
                            {canSeeNotificationsBell && <NotificationsBell />}
                          </div>
                          {(currentBranchName || (branches.length > 0 && activeBranch)) && (
                            <div className="text-[11px] text-cyan-300/90 truncate max-w-[180px]" title={currentBranchName || getBranchDisplayName(activeBranch, language)}>
                              {currentBranchName || getBranchDisplayName(activeBranch, language)}
                            </div>
                          )}
                        </div>

                        {/* Shop switcher (super_admin only - use real role, not override) */}
                        {user?.role === 'super_admin' && <ShopSwitcher />}
                        {/* Subscription countdown (D-5 to D-0) */}
                        {!collapsed && <SubscriptionCountdownBanner />}
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
                            className={`w-full px-3 py-2 text-xs ${activeBranch?.id === b.id ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-300 hover:bg-cyan-500/10'}`}
                            style={{ textAlign: isRtl ? 'right' : 'left' }}
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
                        {/* Theme Switcher */}
                        <div className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-black/25 p-1 shadow-[0_0_14px_rgba(0,243,255,0.10)]">
                          <button
                            type="button"
                            onClick={() => setTheme('dark')}
                            className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition ${
                              theme === 'dark' ? 'bg-cyan-400 text-black' : 'text-cyan-100 hover:bg-white/5'
                            }`}
                          >
                            {language === 'ar' ? 'داكن' : 'Dark'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setTheme('light')}
                            className={`px-3 py-1 rounded-full text-[11px] font-extrabold transition ${
                              theme === 'light' ? 'bg-cyan-400 text-black' : 'text-cyan-100 hover:bg-white/5'
                            }`}
                          >
                            {language === 'ar' ? 'فاتح' : 'Light'}
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
          </div>

          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4"
            style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            <nav className="space-y-2">
              {navGroups.map((group) => {
                const GroupIcon = ICON_MAP[group.icon] ?? Package;
                const singleItem = group.items.length === 1;
                const open = isGroupOpen(group.groupId);
                if (singleItem) {
                  const item = group.items[0];
                  const ItemIcon = ICON_MAP[item.icon] ?? Package;
                  const active = pathname === item.href || (item.href === '/dashboard?ai=1' && pathname === '/dashboard');
                  const onClick = item.id === 'ai' ? handleAiClick : undefined;
                  return (
                    <Link
                      key={group.groupId}
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
                      <ItemIcon className={`h-5 w-5 shrink-0 ${item.glow ? 'text-fuchsia-300' : 'text-cyan-300'}`} />
                      {!collapsed && <span className="text-sm font-semibold">{item.label}</span>}
                    </Link>
                  );
                }
                return (
                  <div key={group.groupId} className="rounded-xl border border-cyan-500/20 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => !collapsed && toggleGroup(group.groupId)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                        open ? 'bg-cyan-500/10 text-cyan-200' : 'text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300'
                      }`}
                    >
                      <GroupIcon className="h-5 w-5 shrink-0 text-cyan-300" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-sm font-semibold">{group.label}</span>
                          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                        </>
                      )}
                    </button>
                    {!collapsed && open && (
                      <div className="border-t border-cyan-500/20 bg-black/20 space-y-0.5 py-1">
                        {group.items.map((item) => {
                          const ItemIcon = ICON_MAP[item.icon] ?? Package;
                          const active = pathname === item.href;
                          return (
                            <Link
                              key={item.href + item.id}
                              href={item.href}
                              onClick={() => setOpen(false)}
                              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                                active ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-200'
                              }`}
                              style={{ paddingInlineStart: '2rem' }}
                            >
                              <ItemIcon className="h-4 w-4 shrink-0 opacity-80" />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          <div
            className="shrink-0 px-4 pb-6 space-y-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
          >
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
        </div>
      </aside>
    </>
  );
}

