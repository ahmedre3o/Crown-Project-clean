'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Role } from '../permissions';
import { canAccess, getPlanFeatures, getDefaultRedirect, ROUTE_FEATURE_MAP } from '../permissions';

const ACCESS_DENIED_MESSAGE_AR = 'ليس لديك صلاحية للوصول إلى هذه الصفحة.';
const ACCESS_DENIED_MESSAGE_EN = "You don't have permission to access this page.";

export function getAccessDeniedMessage(lang: 'ar' | 'en' = 'en'): string {
  return lang === 'ar' ? ACCESS_DENIED_MESSAGE_AR : ACCESS_DENIED_MESSAGE_EN;
}

export interface RouteGuardOptions {
  /** Required feature for this route */
  feature?: string;
  /** If true, show Access Denied page instead of redirecting */
  showDenied?: boolean;
  /** Effective role (e.g. from role override when super_admin tests) - used for access check */
  effectiveRole?: string | null;
}

/**
 * Resolve the feature for a pathname (handles partial matches for nested routes)
 */
function resolveFeature(pathname: string): string | undefined {
  // Exact match first
  if (ROUTE_FEATURE_MAP[pathname]) return ROUTE_FEATURE_MAP[pathname] as string;

  // Nested routes: /store-admin/orders/123 -> online_orders, /inventory/import-fixes/1 -> excel_import
  if (pathname.startsWith('/store-admin/orders')) return 'online_orders';
  if (pathname.startsWith('/store-admin/payments')) return 'payments_admin';
  if (pathname.startsWith('/store-admin/reports')) return 'reports';
  if (pathname.startsWith('/store-admin/coupons')) return 'coupons';
  if (pathname.startsWith('/store-admin/returns')) return 'returns';
  if (pathname.startsWith('/store-admin/on-account')) return 'on_account';
  if (pathname.startsWith('/store-admin/expenses')) return 'expenses';
  if (pathname.startsWith('/store-admin/notifications')) return 'notifications';
  if (pathname.startsWith('/store-admin/branches')) return 'branches';
  if (pathname.startsWith('/store-admin/users')) return 'users';
  if (pathname.startsWith('/store-admin/crm/balances')) return 'crm_customer_balances';
  if (pathname.startsWith('/store-admin/crm')) return 'crm_customers';
  if (pathname.startsWith('/store-admin/domains')) return 'domains';
  if (pathname.startsWith('/store-admin/store')) return 'store_management';
  if (pathname.startsWith('/store-admin/inventory/stock-transfer')) return 'stock_transfer';
  if (pathname.startsWith('/store-admin/inventory/stock-movements')) return 'stock_movements';
  if (pathname.startsWith('/store-admin/inventory')) return 'inventory_slow';
  if (pathname.startsWith('/store-admin/purchases/suppliers')) return 'suppliers';
  if (pathname.startsWith('/store-admin/purchases/orders')) return 'purchase_orders';
  if (pathname.startsWith('/store-admin/purchases/invoices')) return 'purchase_invoices';
  if (pathname.startsWith('/store-admin/purchases/returns')) return 'purchase_returns';
  if (pathname.startsWith('/store-admin/accounting/coa')) return 'accounting_coa';
  if (pathname.startsWith('/store-admin/accounting/journal')) return 'journal_entries';
  if (pathname.startsWith('/store-admin/accounting/reports')) return 'financial_reports';
  if (pathname.startsWith('/store-admin/accounting/taxes')) return 'accounting_taxes';
  if (pathname.startsWith('/store-admin/taxes')) return 'taxes';
  if (pathname.startsWith('/inventory/import-fixes')) return 'excel_import';
  if (pathname.startsWith('/admin/codes')) return 'admin_codes';
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/hr/reports')) return 'hr_reports';
  if (pathname.startsWith('/hr/sessions')) return 'hr_sessions';
  if (pathname.startsWith('/hr/devices')) return 'hr_devices';
  if (pathname.startsWith('/hr/overtime')) return 'hr_overtime';
  if (pathname.startsWith('/hr/payroll')) return 'hr_payroll';
  if (pathname.startsWith('/hr/attendance')) return 'hr_attendance';
  if (pathname.startsWith('/hr/employees')) return 'hr_employees';
  if (pathname.startsWith('/hr/leave-entries')) return 'hr_leave_entries';
  if (pathname.startsWith('/hr')) return 'hr_dashboard';

  return ROUTE_FEATURE_MAP[pathname] as string | undefined;
}

/**
 * Hook to guard a route by role and plan features.
 * - If not logged in: redirect to /login
 * - If access denied: redirect to default page OR show Access Denied (when showDenied=true)
 * @returns { allowed: boolean, redirect: string | null } - allowed means user can see the page
 */
export function useRouteGuard(
  user: { role: string; package?: string } | null,
  loading: boolean,
  options: RouteGuardOptions = {}
): { allowed: boolean; redirect: string | null; showDenied: boolean } {
  const pathname = usePathname();
  const router = useRouter();
  const { feature: explicitFeature, showDenied = false, effectiveRole: effectiveRoleOpt } = options;

  const feature = explicitFeature ?? resolveFeature(pathname);
  const planFeatures = getPlanFeatures(user?.package);
  const role = (effectiveRoleOpt !== undefined ? effectiveRoleOpt : user?.role) as Role | undefined;

  const allowed = !!(role && feature && canAccess(role, feature as any, planFeatures));
  const redirect = getDefaultRedirect(role ?? null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!allowed) {
      if (showDenied) {
        router.replace(`/access-denied?from=${encodeURIComponent(pathname)}`);
      } else {
        router.replace(redirect);
      }
    }
  }, [loading, user, allowed, redirect, showDenied, pathname, router]);

  return { allowed, redirect, showDenied };
}
