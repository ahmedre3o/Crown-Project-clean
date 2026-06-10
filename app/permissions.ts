/**
 * Single source of truth for role-based permissions and navigation.
 * Use canAccess() and getAllowedNav() everywhere - never duplicate role logic.
 */

export type Role =
  | 'super_admin'
  | 'shop_owner'
  | 'branch_manager'
  | 'multi_branch_manager'
  | 'cashier'
  | 'warehouse'
  | 'hr_manager'
  | 'employee'
  | 'hr_employee'
  | 'accountant'
  | 'sales';

export type PlanFeatures = {
  ai: boolean;
  onlineStore: boolean;
  excelImport: boolean;
  manualEntry: boolean;
  branches: boolean;
  notifications: boolean;
  reports: boolean;
  crm: boolean;
  hr: boolean;
  accounting: boolean;
  purchases: boolean;
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
  | 'backup'
  | 'store_management'
  | 'admin'
  | 'admin_codes'
  | 'coupons'
  | 'returns'
  | 'on_account'
  | 'expenses'
  | 'tax_reports'
  | 'accounting_taxes'
  | 'system_dashboard'
  | 'system_users'
  | 'suppliers'
  | 'purchase_orders'
  | 'purchase_invoices'
  | 'purchase_returns'
  | 'stock_transfer'
  | 'stock_movements'
  | 'accounting_coa'
  | 'journal_entries'
  | 'financial_reports'
  | 'taxes'
  | 'hr_dashboard'
  | 'hr_employees'
  | 'hr_attendance'
  | 'hr_leave_entries'
  | 'hr_payroll'
  | 'hr_overtime'
  | 'hr_devices'
  | 'hr_sessions'
  | 'hr_reports'
  | 'crm_customers'
  | 'crm_customer_balances';

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
  '/store-admin/backup': 'backup',
  '/admin': 'admin',
  '/admin/codes': 'admin_codes',
  '/store-admin/reports': 'reports',
  '/store-admin/coupons': 'coupons',
  '/store-admin/returns': 'returns',
  '/store-admin/on-account': 'on_account',
  '/store-admin/expenses': 'expenses',
  '/store-admin/orders': 'online_orders',
  '/store-admin/payments': 'payments_admin',
  '/store-admin/notifications': 'notifications',
  '/store-admin/branches': 'branches',
  '/store-admin/users': 'users',
  '/store-admin/crm': 'crm_customers',
  '/store-admin/crm/balances': 'crm_customer_balances',
  '/store-admin/domains': 'domains',
  '/store-admin/store': 'store_management',
  '/store-admin/inventory/slow-moving': 'inventory_slow',
  '/store-admin/tax-reports': 'tax_reports',
  '/store-admin/accounting/taxes': 'accounting_taxes',
  '/store-admin/purchases/suppliers': 'suppliers',
  '/store-admin/purchases/orders': 'purchase_orders',
  '/store-admin/purchases/invoices': 'purchase_invoices',
  '/store-admin/purchases/returns': 'purchase_returns',
  '/store-admin/inventory/stock-transfer': 'stock_transfer',
  '/store-admin/inventory/stock-movements': 'stock_movements',
  '/store-admin/accounting/coa': 'accounting_coa',
  '/store-admin/accounting/journal': 'journal_entries',
  '/store-admin/accounting/reports': 'financial_reports',
  '/store-admin/taxes': 'taxes',
  '/hr': 'hr_dashboard',
  '/hr/employees': 'hr_employees',
  '/hr/attendance': 'hr_attendance',
  '/hr/leave-entries': 'hr_attendance',
  '/hr/payroll': 'hr_payroll',
  '/hr/overtime': 'hr_overtime',
  '/hr/devices': 'hr_devices',
  '/hr/sessions': 'hr_sessions',
  '/hr/reports': 'hr_reports',
  '/system': 'admin',
  '/system/users': 'admin',
};

/** Default redirect for role when access denied */
export function getDefaultRedirect(role: Role | null): string {
  if (!role) return '/login';
  if (role === 'cashier') return '/pos';
  if (role === 'warehouse') return '/inventory';
  if (role === 'employee' || role === 'hr_employee') return '/hr';
  if (role === 'hr_manager') return '/hr';
  if (role === 'accountant') return '/store-admin/accounting/coa';
  if (role === 'sales') return '/pos';
  if (role === 'branch_manager' || role === 'multi_branch_manager') return '/pos';
  return '/dashboard';
}

/** مدير موارد بشرية: HR كامل + المشتريات + المحاسبة + الضرائب + التقارير + التحويلات (إن وُجدت الفروع) */
function canAccessHrManager(feature: Feature | NavItemId, plan: PlanFeatures): boolean {
  const { reports, notifications: notifPlan, branches, hr, accounting, purchases } = plan;
  if (!hr) return false;
  const core = new Set<string>([
    'hr_dashboard',
    'hr_employees',
    'hr_attendance',
    'hr_leave_entries',
    'hr_payroll',
    'hr_overtime',
    'hr_devices',
    'hr_sessions',
    'hr_reports',
    'suppliers',
    'purchase_orders',
    'purchase_invoices',
    'purchase_returns',
    'accounting_coa',
    'journal_entries',
    'financial_reports',
    'taxes',
    'accounting_taxes',
    'notifications',
  ]);
  if (core.has(String(feature))) {
    if (feature === 'notifications') return notifPlan;
    if (
      feature === 'accounting_coa' ||
      feature === 'journal_entries' ||
      feature === 'financial_reports' ||
      feature === 'taxes' ||
      feature === 'accounting_taxes'
    ) {
      return accounting;
    }
    if (
      feature === 'suppliers' ||
      feature === 'purchase_orders' ||
      feature === 'purchase_invoices' ||
      feature === 'purchase_returns'
    ) {
      return purchases;
    }
    return true;
  }
  if (feature === 'stock_transfer' || feature === 'stock_movements') return branches;
  if (feature === 'reports' || feature === 'tax_reports') return reports;
  return false;
}

/** موظف (حساب): قائمة HR فقط */
function canAccessHrEmployeeOnly(feature: Feature | NavItemId, plan: PlanFeatures): boolean {
  if (!plan.hr) return false;
  return new Set<string>([
    'hr_dashboard',
    'hr_employees',
    'hr_attendance',
    'hr_leave_entries',
    'hr_payroll',
    'hr_overtime',
    'hr_devices',
    'hr_sessions',
    'hr_reports',
  ]).has(String(feature));
}

/** محاسب: محاسبة + تقارير + ضرائب + أرصدة العملاء (من API) */
function canAccessAccountant(feature: Feature | NavItemId, plan: PlanFeatures): boolean {
  const { reports, notifications: notifPlan, accounting, crm } = plan;
  if (!accounting) return false;
  switch (feature) {
    case 'crm_customer_balances':
      return crm;
    case 'accounting_coa':
    case 'journal_entries':
    case 'financial_reports':
    case 'accounting_taxes':
    case 'taxes':
      return true;
    case 'reports':
    case 'tax_reports':
      return reports;
    case 'on_account':
      return true;
    case 'notifications':
      return notifPlan;
    default:
      return false;
  }
}

/** مبيعات / CRM: نقطة البيع + عرض المخزون + فواتير + CRM */
function canAccessSales(feature: Feature | NavItemId, plan: PlanFeatures): boolean {
  const { onlineStore, notifications: notifPlan, crm } = plan;
  switch (feature) {
    case 'crm_customers':
      return crm;
    case 'pos':
    case 'inventory':
    case 'inventory_read':
    case 'invoices':
      return true;
    case 'online_orders':
    case 'online_orders_read':
      return onlineStore;
    case 'notifications':
      return notifPlan;
    default:
      return false;
  }
}

/** مخزن: المخزون + المشتريات (موردون، أوامر، فواتير، مرتجعات) حسب الباقة */
function canAccessWarehouse(feature: Feature | NavItemId, plan: PlanFeatures): boolean {
  const { excelImport, manualEntry, branches, purchases } = plan;
  switch (feature) {
    case 'inventory':
    case 'inventory_read':
    case 'inventory_edit':
    case 'inventory_slow':
      return true;
    case 'manual_entry':
      return manualEntry;
    case 'excel_import':
      return excelImport;
    case 'stock_transfer':
    case 'stock_movements':
    case 'branch_availability':
      return branches;
    case 'suppliers':
    case 'purchase_orders':
    case 'purchase_invoices':
    case 'purchase_returns':
      return purchases;
    default:
      return false;
  }
}

/** كاشير: نقطة البيع + عرض المخزون + الفواتير + المصاريف + التنبيهات (حسب الباقة) */
function canAccessCashier(feature: Feature | NavItemId, plan: PlanFeatures): boolean {
  const { notifications: notifPlan } = plan;
  switch (feature) {
    case 'pos':
    case 'inventory':
    case 'inventory_read': // عرض المخزون
    case 'invoices':
    case 'expenses':
      return true;
    case 'notifications':
      return notifPlan;
    default:
      return false;
  }
}

/**
 * Check if a role can access a feature, given plan features and optional context.
 * RBAC (متجر):
 * - المالك: كامل
 * - مدير فرع / مدير فروع: كل شيء ما عدا HR
 * - مدير موارد بشرية: HR + مشتريات + محاسبة + ضرائب + تقارير + تحويلات
 * - كاشير: POS + مخزون (عرض) + فواتير + مصاريف + إشعارات
 * - مخزن: المخزون + المشتريات (حسب باقة المشتريات)
 * - موظف (حساب): HR فقط
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

  if (role === 'accountant') return canAccessAccountant(feature, planFeatures);
  if (role === 'sales') return canAccessSales(feature, planFeatures);

  if (role === 'hr_manager') return canAccessHrManager(feature, planFeatures);
  if (role === 'employee' || role === 'hr_employee') return canAccessHrEmployeeOnly(feature, planFeatures);
  if (role === 'warehouse') return canAccessWarehouse(feature, planFeatures);
  if (role === 'cashier') return canAccessCashier(feature, planFeatures);

  // مدير فرع / مدير فروع: بدون أي مسار HR
  if ((role === 'branch_manager' || role === 'multi_branch_manager') && String(feature).startsWith('hr_')) {
    return false;
  }

  const { ai, onlineStore, excelImport, manualEntry, branches, notifications, reports, crm, hr, accounting, purchases } =
    planFeatures;

  switch (feature) {
    case 'dashboard':
      return ['shop_owner', 'multi_branch_manager', 'branch_manager'].includes(role);

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
      return planFeatures.reports && ['shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role);

    case 'coupons':
      return onlineStore && ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'].includes(role);

    case 'returns':
    case 'on_account':
    case 'expenses':
      return ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'].includes(role);

    case 'tax_reports':
      return planFeatures.reports && ['shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role);

    case 'accounting_taxes':
      return accounting && ['shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role);

    case 'reports_profit':
      return planFeatures.reports && role === 'shop_owner';

    case 'invoices':
      return ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'].includes(role);

    case 'online_orders':
      return onlineStore && ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'].includes(role);

    case 'online_orders_read':
      return onlineStore && ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'].includes(role);

    case 'payments_admin':
      return ['shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role); // cashier, warehouse NO access

    case 'notifications':
      return (
        notifications &&
        ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'].includes(role)
      );

    case 'branches':
      // Branch management is visible to ALL normal plan accounts (subscription-enforced on backend).
      return role === 'shop_owner' || ['branch_manager', 'multi_branch_manager'].includes(role);

    case 'users':
      return ['shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role); // cashier, warehouse NO access

    case 'settings':
      return role === 'shop_owner';
    case 'backup':
      return ['shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role);

    case 'domains':
    case 'domains_full':
      return role === 'shop_owner' && onlineStore;

    case 'store_management':
    case 'store_preview':
      return onlineStore && ['shop_owner', 'branch_manager', 'cashier', 'multi_branch_manager'].includes(role); // warehouse NO access

    case 'suppliers':
    case 'purchase_orders':
    case 'purchase_invoices':
    case 'purchase_returns':
      return purchases && ['shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role);

    case 'stock_transfer':
    case 'stock_movements':
      return branches && ['shop_owner', 'branch_manager', 'multi_branch_manager', 'warehouse'].includes(role);

    case 'accounting_coa':
    case 'journal_entries':
    case 'financial_reports':
    case 'taxes':
      return accounting && ['shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role);

    /** HR: المالك + مدير موارد بشرية + موظف (حساب) — يُعالج أعلاه */
    case 'hr_dashboard':
    case 'hr_employees':
    case 'hr_payroll':
    case 'hr_devices':
    case 'hr_attendance':
    case 'hr_leave_entries':
    case 'hr_overtime':
    case 'hr_sessions':
    case 'hr_reports':
      return hr && ['shop_owner', 'hr_manager', 'employee', 'hr_employee'].includes(role);

    case 'admin':
    case 'admin_codes':
      // super_admin is already granted full access at the top of this function
      return false;

    case 'branch_availability':
      return branches && ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier', 'warehouse'].includes(role);

    case 'crm_customers':
      return crm && ['shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role);

    case 'crm_customer_balances':
      return crm && ['shop_owner', 'branch_manager', 'multi_branch_manager'].includes(role);

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
  if (canAccess(role, 'invoices', planFeatures)) {
    push({ id: 'invoices', href: '/invoices', labelKey: 'nav.invoices', icon: 'FileText', section: 'operations' });
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
  if (canAccess(role, 'reports', planFeatures)) {
    push({ id: 'reports', href: '/store-admin/reports', labelKey: 'nav.reports', icon: 'BarChart2', section: 'reports' });
  }
  if (canAccess(role, 'coupons', planFeatures)) {
    push({ id: 'coupons', href: '/store-admin/coupons', labelKey: 'nav.couponCodes', icon: 'Tag', section: 'reports' });
  }
  if (canAccess(role, 'returns', planFeatures)) {
    push({ id: 'returns', href: '/store-admin/returns', labelKey: 'nav.returns', icon: 'RotateCcw', section: 'reports' });
  }
  if (canAccess(role, 'on_account', planFeatures)) {
    push({ id: 'on_account', href: '/store-admin/on-account', labelKey: 'nav.onAccount', icon: 'Wallet', section: 'reports' });
  }
  if (canAccess(role, 'expenses', planFeatures)) {
    push({ id: 'expenses', href: '/store-admin/expenses', labelKey: 'nav.expenses', icon: 'Receipt', section: 'reports' });
  }
  if (canAccess(role, 'tax_reports', planFeatures)) {
    items.push({
      id: 'tax_reports',
      href: '/store-admin/tax-reports',
      labelKey: 'nav.taxReports',
      icon: 'BarChart2',
      section: 'reports',
      label: (t('nav.taxReports') as string) || (language === 'ar' ? 'تقرير الضرائب' : 'Tax Report'),
    });
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
  if (canAccess(role, 'admin', planFeatures)) {
    push({
      id: 'system_dashboard',
      href: '/system',
      labelKey: 'nav.systemDashboard',
      icon: 'LayoutDashboard',
      section: 'system',
    });
    push({
      id: 'system_users',
      href: '/system/users',
      labelKey: 'nav.systemUsers',
      icon: 'Users',
      section: 'system',
    });
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

export type NavGroupId =
  | 'dashboard'
  | 'ai'
  | 'sales'
  | 'crm'
  | 'purchases'
  | 'inventory'
  | 'accounting'
  | 'taxes'
  | 'reports'
  | 'online_orders'
  | 'expenses'
  | 'branches'
  | 'users_management'
  | 'hr'
  | 'store_management'
  | 'settings'
  | 'backup'
  | 'system';

export interface NavGroupItem {
  id: NavItemId;
  href: string;
  labelKey: string;
  icon: string;
  label: string;
  glow?: boolean;
}

export interface NavGroup {
  groupId: NavGroupId;
  label: string;
  icon: string;
  items: NavGroupItem[];
}

const NAV_GROUP_CONFIG: { groupId: NavGroupId; labelKey: string; icon: string; items: { id: NavItemId; href: string; labelKey: string; icon: string; glow?: boolean }[] }[] = [
  { groupId: 'dashboard', labelKey: 'nav.dashboard', icon: 'LayoutDashboard', items: [{ id: 'dashboard', href: '/dashboard', labelKey: 'nav.dashboard', icon: 'LayoutDashboard' }] },
  { groupId: 'ai', labelKey: 'ai.title', icon: 'MessageCircle', items: [{ id: 'ai', href: '/dashboard?ai=1', labelKey: 'ai.title', icon: 'MessageCircle', glow: true }] },
  {
    groupId: 'sales',
    labelKey: 'nav.sales',
    icon: 'ShoppingCart',
    items: [
      { id: 'pos', href: '/pos', labelKey: 'nav.pos', icon: 'ShoppingCart' },
      { id: 'invoices', href: '/invoices', labelKey: 'nav.invoices', icon: 'FileText' },
      { id: 'returns', href: '/store-admin/returns', labelKey: 'nav.returns', icon: 'RotateCcw' },
      { id: 'on_account', href: '/store-admin/on-account', labelKey: 'nav.onAccount', icon: 'Wallet' },
      { id: 'payments_admin', href: '/store-admin/payments', labelKey: 'nav.payments', icon: 'CreditCard' },
    ],
  },
  {
    groupId: 'crm',
    labelKey: 'nav.crm',
    icon: 'ContactRound',
    items: [
      { id: 'crm_customers', href: '/store-admin/crm', labelKey: 'nav.crmCustomers', icon: 'Users' },
      { id: 'crm_customer_balances', href: '/store-admin/crm/balances', labelKey: 'nav.crmBalances', icon: 'Wallet' },
    ],
  },
  {
    groupId: 'purchases',
    labelKey: 'nav.purchases',
    icon: 'Package',
    items: [
      { id: 'suppliers', href: '/store-admin/purchases/suppliers', labelKey: 'nav.suppliers', icon: 'Users' },
      { id: 'purchase_orders', href: '/store-admin/purchases/orders', labelKey: 'nav.purchaseOrders', icon: 'FileText' },
      { id: 'purchase_invoices', href: '/store-admin/purchases/invoices', labelKey: 'nav.purchaseInvoices', icon: 'Receipt' },
      { id: 'purchase_returns', href: '/store-admin/purchases/returns', labelKey: 'nav.purchaseReturns', icon: 'RotateCcw' },
    ],
  },
  {
    groupId: 'inventory',
    labelKey: 'nav.inventoryGroup',
    icon: 'Package',
    items: [
      { id: 'inventory', href: '/inventory', labelKey: 'nav.inventory', icon: 'Package' },
      { id: 'branches', href: '/store-admin/branches', labelKey: 'nav.branches', icon: 'GitBranch' },
      { id: 'inventory_slow', href: '/store-admin/inventory/slow-moving', labelKey: 'nav.slowMoving', icon: 'AlertTriangle' },
      { id: 'manual_entry', href: '/manual-entry', labelKey: 'nav.manualEntry', icon: 'FilePlus2' },
      { id: 'excel_import', href: '/excel-import', labelKey: 'nav.excelImport', icon: 'FileSpreadsheet' },
      { id: 'stock_transfer', href: '/store-admin/inventory/stock-transfer', labelKey: 'nav.stockTransfer', icon: 'Package' },
      { id: 'stock_movements', href: '/store-admin/inventory/stock-movements', labelKey: 'nav.stockMovements', icon: 'Activity' },
    ],
  },
  {
    groupId: 'accounting',
    labelKey: 'nav.accounting',
    icon: 'BarChart2',
    items: [
      { id: 'accounting_coa', href: '/store-admin/accounting/coa', labelKey: 'nav.chartOfAccounts', icon: 'FileText' },
      { id: 'journal_entries', href: '/store-admin/accounting/journal', labelKey: 'nav.journalEntries', icon: 'Receipt' },
      { id: 'financial_reports', href: '/store-admin/accounting/reports', labelKey: 'nav.financialReports', icon: 'BarChart2' },
    ],
  },
  {
    groupId: 'reports',
    labelKey: 'nav.reportsGroup',
    icon: 'BarChart2',
    items: [
      { id: 'reports', href: '/store-admin/reports', labelKey: 'nav.reports', icon: 'BarChart2' },
      { id: 'tax_reports', href: '/store-admin/tax-reports', labelKey: 'nav.taxReports', icon: 'BarChart2' },
    ],
  },
  {
    groupId: 'hr',
    labelKey: 'nav.hr',
    icon: 'Users',
    items: [
      { id: 'hr_dashboard', href: '/hr', labelKey: 'nav.hrDashboard', icon: 'LayoutDashboard' },
      { id: 'hr_employees', href: '/hr/employees', labelKey: 'nav.hrEmployees', icon: 'Users' },
      { id: 'hr_attendance', href: '/hr/attendance', labelKey: 'nav.hrAttendance', icon: 'Clock' },
      { id: 'hr_leave_entries', href: '/hr/leave-entries', labelKey: 'nav.hrLeaveEntries', icon: 'Calendar' },
      { id: 'hr_payroll', href: '/hr/payroll', labelKey: 'nav.hrPayroll', icon: 'Banknote' },
      { id: 'hr_overtime', href: '/hr/overtime', labelKey: 'nav.hrOvertime', icon: 'Timer' },
      { id: 'hr_devices', href: '/hr/devices', labelKey: 'nav.hrDevices', icon: 'Fingerprint' },
      { id: 'hr_sessions', href: '/hr/sessions', labelKey: 'nav.hrSessions', icon: 'LogIn' },
      { id: 'hr_reports', href: '/hr/reports', labelKey: 'nav.hrReports', icon: 'BarChart2' },
    ],
  },
  {
    groupId: 'online_orders',
    labelKey: 'nav.onlineOrders',
    icon: 'ShoppingBag',
    items: [
      { id: 'online_orders', href: '/store-admin/orders', labelKey: 'nav.onlineOrders', icon: 'ShoppingBag' },
      { id: 'coupons', href: '/store-admin/coupons', labelKey: 'nav.onlineDiscountCodes', icon: 'Tag' },
      { id: 'notifications', href: '/store-admin/notifications', labelKey: 'nav.notifications', icon: 'Bell' },
    ],
  },
  { groupId: 'taxes', labelKey: 'nav.taxes', icon: 'Receipt', items: [{ id: 'taxes', href: '/store-admin/taxes', labelKey: 'nav.taxes', icon: 'Receipt' }] },
  { groupId: 'expenses', labelKey: 'nav.expenses', icon: 'Receipt', items: [{ id: 'expenses', href: '/store-admin/expenses', labelKey: 'nav.expenses', icon: 'Receipt' }] },
  {
    groupId: 'users_management',
    labelKey: 'nav.usersManagement',
    icon: 'Users',
    items: [{ id: 'users', href: '/store-admin/users', labelKey: 'nav.users', icon: 'Users' }],
  },
  { groupId: 'store_management', labelKey: 'nav.storeAdmin', icon: 'Shield', items: [{ id: 'store_management', href: '/store-admin/store', labelKey: 'nav.storeAdmin', icon: 'Shield' }] },
  { groupId: 'settings', labelKey: 'nav.settings', icon: 'Settings', items: [{ id: 'settings', href: '/settings', labelKey: 'nav.settings', icon: 'Settings' }] },
  { groupId: 'backup', labelKey: 'nav.backup', icon: 'HardDrive', items: [{ id: 'backup', href: '/store-admin/backup', labelKey: 'nav.backup', icon: 'HardDrive' }] },
  {
    groupId: 'system',
    labelKey: 'nav.systemAdmin',
    icon: 'Shield',
    items: [
      { id: 'admin', href: '/admin', labelKey: 'nav.admin', icon: 'Shield' },
      { id: 'admin_codes', href: '/admin/codes', labelKey: 'nav.codes', icon: 'Key' },
      { id: 'system_dashboard', href: '/system', labelKey: 'nav.systemDashboard', icon: 'LayoutDashboard' },
      { id: 'system_users', href: '/system/users', labelKey: 'nav.systemUsers', icon: 'Users' },
    ],
  },
];

/** Get navigation as collapsible groups (for sidebar). Only includes groups that have at least one allowed item. */
export function getNavGroups(
  role: Role | null | undefined,
  planFeatures: PlanFeatures,
  t: (key: string) => string,
  language: string
): NavGroup[] {
  if (!role) return [];
  const out: NavGroup[] = [];
  for (const config of NAV_GROUP_CONFIG) {
    const items: NavGroupItem[] = [];
    for (const item of config.items) {
      if (canAccess(role, item.id, planFeatures)) {
        items.push({
          ...item,
          label: t(item.labelKey) || item.labelKey,
        });
      }
    }
    if (items.length > 0) {
      out.push({
        groupId: config.groupId,
        label: t(config.labelKey) || config.labelKey,
        icon: config.icon,
        items,
      });
    }
  }
  return out;
}
