/**
 * Human-readable permission buckets per shop role (documentation + diagnostics).
 * Code uses `shop_owner` (مالك المتجر); treat as "owner" in product docs.
 * `multi_branch_manager` = branches_manager (مدير فروع).
 * Enforcement: backend/rbacCapabilities.ts + requireShopCapability() on routes.
 * UI: app/permissions.ts (must stay aligned).
 */
export const ROLES_PERMISSIONS: Record<string, string[]> = {
  shop_owner: ['*'],
  branch_manager: [
    'dashboard',
    'sales',
    'inventory',
    'expenses',
    'reports',
    'accounting',
    'taxes',
    'crm',
    'notifications',
  ],
  multi_branch_manager: [
    'dashboard',
    'sales',
    'inventory',
    'expenses',
    'reports',
    'accounting',
    'taxes',
    'crm',
    'notifications',
  ],
  hr_manager: ['hr', 'payroll', 'attendance', 'purchases', 'accounting', 'taxes', 'reports', 'notifications'],
  cashier: ['pos', 'view_inventory', 'expenses_basic', 'notifications', 'crm_pos_pick'],
  warehouse: ['inventory_only', 'notifications'],
  employee: ['hr_only'],
  hr_employee: ['hr_only'],
  accountant: ['accounting', 'reports', 'taxes', 'crm_balance'],
  sales: ['crm', 'customers', 'pos', 'view_inventory'],
};
