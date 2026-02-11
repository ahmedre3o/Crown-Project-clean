/**
 * Single source of truth for role-based permissions and navigation.
 * Use canAccess() and getAllowedNav() everywhere - never duplicate role logic.
 */

export type Role = 'super_admin' | 'shop_owner' | 'branch_manager' | 'multi_branch_manager' | 'cashier' | 'warehouse';

export type PlanFeatures = {
  ai: boolean;
  onlineStore: boolean;
  excelImport: boolean;
  manualEntry: boolean;
  branches: boolean;
};

export type NavItemId =
  | 'dashboard'
  | 'ai'
  | 'pos'
  | 'inventory'
  | 'inventory_edit'
  | 'inventory_slow'
  | 'excel_import'
  | 'manual_entry'
  | 'reports'
  | 'invoices'
  | 'online_orders'
  | 'payments_admin'
  | 'notifications'
  | 'branches'
  | 'users'
  | 'domains'
  | 'settings'
  | 'store_management'
  | 'admin'
  | 'admin_codes';

export type Feature =
  | NavItemId
  | 'inventory_read'
  | 'inventory_edit'
  | 'reports_profit'
  | 'online_orders_read'
  | 'branch_availability'
  | 'settings'
  | 'store_preview'
  | 'domains_full';

import { getPlanFeaturesForFrontend } from '../shared/plans';

/** Derive plan features from package string (uses shared/plans single source of truth) */
export function getPlanFeatures(pkg: string = 'bronze'): PlanFeatures {
  return getPlanFeaturesForFrontend(pkg || 'bronze');
}

/** Route-to-feature mapping for route guards */
export const ROUTE_FEATURE_MAP: Record<string, Feature | NavItemId> = {
  '/dashboard': 'dashboard',
  '/pos': 'pos',
  '/inventory': 'inventory',
  '/manual-entry': 'manual_entry',
  '/excel-import': 'excel_import',
  '/invoices': 'invoices',
  '/settings': 'settings',
  '/admin': 'admin',
  '/admin/codes': 'admin_codes',
  '/store-admin/reports': 'reports',
  '/store-admin/orders': 'online_orders',
  '/store-admin/payments': 'payments_admin',
  '/store-admin/notifications': 'notifications',
  '/store-admin/branches': 'branches',
  '/store-admin/users': 'users',
  '/store-admin/domains': 'domains',
  '/store-admin/store': 'store_management',
  '/store-admin/inventory/slow-moving': 'inventory_slow',
};

/** Default redirect for role when access denied */
export function getDefaultRedirect(role: Role | null): string {
  if (!role) return '/login';
  if (role === 'cashier') return '/pos';
  if (role === 'warehouse') return '/inventory';
  if (role === 'branch_manager' || role === 'multi_branch_manager') return '/pos';
  return '/dashboard';
}

/**
 * Check if a role can access a feature, given plan features and optional context.
 * RBAC per spec:
 * - Warehouse: ONLY inventory, manual_entry, excel_import, inventory_slow
 * - Cashier: POS, Inventory (read), Invoices, Online Orders, Notifications
 * - Branch Manager: POS, Inventory (read), Invoices, Reports (branch), Online Orders, Payments (branch), Notifications, store_preview
 * - Multi-Branch Manager: Dashboard (no profit), POS, Inventory (read), Slow stock, Invoices, Reports (no profit), Online Orders, Payments, Notifications
 * - Owner: full access including domain
 */
export function canAccess(
  role: Role | null | undefined,
  feature: Feature | NavItemId,
  planFeatures: PlanFeatures,
  _context?: { isBranchManager?: boolean }
): boolean {
  if (!role) return false;

  // Super admin sees everything
  if (role === 'super_admin') return true;

  const { ai, onlineStore, excelImport, manualEntry, branches } = planFeatures;

  switch (feature) {
    case 'dashboard':
      return ['shop_owner', 'multi_branch_manager'].includes(role);

    case 'ai':
      return ai && role === 'shop_owner'; // only owner; branch_manager, cashier NOT included

    case 'pos':
      return ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'].includes(role);

    case 'inventory':
    case 'inventory_read':
      return ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier', 'warehouse'].includes(role);

    case 'inventory_edit':
      return ['shop_owner', 'warehouse'].includes(role);

    case 'inventory_slow':
      return ['shop_owner', 'warehouse', 'branch_manager', 'multi_branch_manager'].includes(role);

    case 'excel_import':
      return excelImport && ['shop_owner', 'warehouse'].includes(role);

    case 'manual_entry':
      return manualEntry && ['shop_owner', 'warehouse'].includes(role);

    case 'reports':
      return ['shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role);

    case 'reports_profit':
      return role === 'shop_owner';

    case 'invoices':
      return ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'].includes(role);

    case 'online_orders':
      return onlineStore && ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'].includes(role);

    case 'online_orders_read':
      return onlineStore && ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'].includes(role);

    case 'payments_admin':
      return ['shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role); // cashier, warehouse NO access

    case 'notifications':
      return (onlineStore && ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'].includes(role)) || role === 'shop_owner';

    case 'branches':
      return role === 'shop_owner' || (branches && ['branch_manager', 'multi_branch_manager'].includes(role));

    case 'users':
      return ['shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role); // cashier, warehouse NO access

    case 'settings':
      return role === 'shop_owner';

    case 'domains':
    case 'domains_full':
      return role === 'shop_owner' && onlineStore;

    case 'store_management':
    case 'store_preview':
      return onlineStore && ['shop_owner', 'branch_manager', 'cashier', 'multi_branch_manager'].includes(role); // warehouse NO access

    case 'admin':
    case 'admin_codes':
      // super_admin is already granted full access at the top of this function
      return false;

    case 'branch_availability':
      return branches && ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier', 'warehouse'].includes(role);

    default:
      return false;
  }
}

/** Only owner + super_admin can see/edit Domain section in Store Management */
export function canSeeDomainSection(role: Role | null | undefined): boolean {
  return role === 'super_admin' || role === 'shop_owner';
}

export type NavSection = 'operations' | 'inventory' | 'reports' | 'admin' | 'system';

export interface NavItem {
  id: NavItemId;
  href: string;
  label: string;
  labelKey: string;
  icon: string; // icon name for Sidebar to map
  section: NavSection;
  glow?: boolean;
  onClick?: () => void;
}

/** Get allowed nav items for a role, grouped by section */
export function getAllowedNav(
  role: Role | null | undefined,
  planFeatures: PlanFeatures,
  t: (key: string) => string,
  language: string
): NavItem[] {
  if (!role) return [];

  const items: NavItem[] = [];
  const push = (item: Omit<NavItem, 'label'>) => {
    if (canAccess(role!, item.id, planFeatures)) {
      items.push({ ...item, label: t(item.labelKey) || item.labelKey });
    }
  };

  // Operations
  if (canAccess(role, 'dashboard', planFeatures)) {
    push({ id: 'dashboard', href: '/dashboard', labelKey: 'nav.dashboard', icon: 'LayoutDashboard', section: 'operations' });
  }
  if (canAccess(role, 'ai', planFeatures)) {
    items.push({
      id: 'ai',
      href: '/dashboard?ai=1',
      labelKey: 'ai.title',
      icon: 'MessageCircle',
      section: 'operations',
      glow: true,
      label: t('ai.title') || 'AI',
    });
  }
  if (canAccess(role, 'pos', planFeatures)) {
    push({ id: 'pos', href: '/pos', labelKey: 'nav.pos', icon: 'ShoppingCart', section: 'operations' });
  }

  // Inventory
  if (canAccess(role, 'inventory', planFeatures)) {
    push({ id: 'inventory', href: '/inventory', labelKey: 'nav.inventory', icon: 'Package', section: 'inventory' });
  }
  if (canAccess(role, 'inventory_slow', planFeatures)) {
    push({ id: 'inventory_slow', href: '/store-admin/inventory/slow-moving', labelKey: 'nav.slowMoving', icon: 'AlertTriangle', section: 'inventory' });
  }
  if (canAccess(role, 'manual_entry', planFeatures)) {
    push({ id: 'manual_entry', href: '/manual-entry', labelKey: 'nav.manualEntry', icon: 'FilePlus2', section: 'inventory' });
  }
  if (canAccess(role, 'excel_import', planFeatures)) {
    push({ id: 'excel_import', href: '/excel-import', labelKey: 'nav.excelImport', icon: 'FileSpreadsheet', section: 'inventory' });
  }

  // Reports
  if (canAccess(role, 'invoices', planFeatures)) {
    push({ id: 'invoices', href: '/invoices', labelKey: 'nav.invoices', icon: 'FileText', section: 'reports' });
  }
  if (canAccess(role, 'reports', planFeatures)) {
    push({ id: 'reports', href: '/store-admin/reports', labelKey: 'nav.reports', icon: 'BarChart2', section: 'reports' });
  }
  if (canAccess(role, 'online_orders', planFeatures)) {
    push({ id: 'online_orders', href: '/store-admin/orders', labelKey: 'nav.onlineOrders', icon: 'ShoppingBag', section: 'reports' });
  }
  if (canAccess(role, 'payments_admin', planFeatures)) {
    push({
      id: 'payments_admin',
      href: '/store-admin/payments',
      labelKey: 'nav.payments',
      icon: 'CreditCard',
      section: 'reports',
    });
  }
  if (canAccess(role, 'notifications', planFeatures)) {
    push({ id: 'notifications', href: '/store-admin/notifications', labelKey: 'nav.notifications', icon: 'Bell', section: 'reports' });
  }

  // Admin (store-admin: branches, users, domains)
  if (canAccess(role, 'branches', planFeatures)) {
    push({ id: 'branches', href: '/store-admin/branches', labelKey: 'nav.branches', icon: 'GitBranch', section: 'admin' });
  }
  if (canAccess(role, 'users', planFeatures)) {
    push({ id: 'users', href: '/store-admin/users', labelKey: 'nav.users', icon: 'Users', section: 'admin' });
  }
  if (canAccess(role, 'store_management', planFeatures)) {
    push({ id: 'store_management', href: '/store-admin/store', labelKey: 'nav.storeAdmin', icon: 'Shield', section: 'admin' });
  }
  if (canAccess(role, 'settings', planFeatures)) {
    push({ id: 'settings', href: '/settings', labelKey: 'nav.settings', icon: 'Settings', section: 'admin' });
  }

  // System (super_admin only)
  if (canAccess(role, 'admin', planFeatures)) {
    push({ id: 'admin', href: '/admin', labelKey: 'nav.admin', icon: 'Shield', section: 'system' });
  }
  if (canAccess(role, 'admin_codes', planFeatures)) {
    push({ id: 'admin_codes', href: '/admin/codes', labelKey: 'nav.codes', icon: 'Key', section: 'system' });
  }

  return items;
}

/** Section display labels */
export const SECTION_LABELS: Record<NavSection, { en: string; ar: string }> = {
  operations: { en: 'Operations', ar: 'العمليات' },
  inventory: { en: 'Inventory', ar: 'المخزون' },
  reports: { en: 'Reports & Orders', ar: 'التقارير والطلبات' },
  admin: { en: 'Store Admin', ar: 'إدارة المتجر' },
  system: { en: 'System Admin', ar: 'إدارة النظام' },
};
