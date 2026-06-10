/**
 * Central capability map for shop RBAC (backend enforcement).
 * super_admin + shop_owner bypass checks in middleware.
 * Keep aligned with backend/rolesPermissions.ts + app/permissions.ts
 */

export type ShopCapability =
  | 'dashboard'
  | 'pos'
  | 'view_inventory'
  | 'inventory_full'
  | 'inventory_branch'
  | 'expenses'
  | 'expenses_basic'
  | 'reports'
  | 'accounting'
  | 'taxes'
  | 'hr'
  | 'purchases'
  | 'notifications'
  | 'crm'
  | 'crm_followup'
  | 'crm_pos_pick'
  | 'crm_balance'
  | 'users_manage'
  | 'branches_admin';

const ALL_SHOP_ROLES = [
  'branch_manager',
  'multi_branch_manager',
  'cashier',
  'warehouse',
  'hr_manager',
  'employee',
  'hr_employee',
  'accountant',
  'sales',
] as const;

/** role -> capabilities (shop roles only; owner/super_admin handled in middleware) */
const ROLE_CAPABILITIES: Record<string, Set<ShopCapability>> = {
  branch_manager: new Set([
    'dashboard',
    'pos',
    'view_inventory',
    'inventory_branch',
    'expenses',
    'reports',
    'accounting',
    'taxes',
    'notifications',
    'crm',
    'crm_followup',
    'users_manage',
    'branches_admin',
  ]),
  multi_branch_manager: new Set([
    'dashboard',
    'pos',
    'view_inventory',
    'inventory_branch',
    'expenses',
    'reports',
    'accounting',
    'taxes',
    'notifications',
    'crm',
    'crm_followup',
    'users_manage',
    'branches_admin',
  ]),
  hr_manager: new Set([
    'hr',
    'purchases',
    'accounting',
    'taxes',
    'reports',
    'notifications',
    'view_inventory',
    'inventory_branch',
  ]),
  cashier: new Set(['pos', 'view_inventory', 'expenses_basic', 'notifications', 'crm_pos_pick']),
  warehouse: new Set([
    'view_inventory',
    'inventory_full',
    'inventory_branch',
    'notifications',
  ]),
  employee: new Set(['hr']),
  hr_employee: new Set(['hr']),
  accountant: new Set(['accounting', 'taxes', 'reports', 'crm_balance']),
  sales: new Set(['pos', 'view_inventory', 'crm', 'crm_followup', 'notifications']),
};

export function roleHasCapability(role: string | undefined | null, cap: ShopCapability): boolean {
  if (!role) return false;
  if (role === 'super_admin' || role === 'shop_owner') return true;
  const set = ROLE_CAPABILITIES[role];
  return set ? set.has(cap) : false;
}

/** True if role has at least one of the capabilities */
export function roleHasAnyCapability(role: string | undefined | null, caps: ShopCapability[]): boolean {
  if (!role) return false;
  if (role === 'super_admin' || role === 'shop_owner') return true;
  if (caps.length === 0) return false;
  return caps.some((c) => roleHasCapability(role, c));
}

/** For diagnostics / admin UI; owner and super_admin are full access outside this list */
export function getCapabilitiesForRole(role: string): ShopCapability[] {
  if (role === 'super_admin' || role === 'shop_owner') return [];
  const s = ROLE_CAPABILITIES[role];
  return s ? Array.from(s) : [];
}

export const SHOP_ROLES_WITH_CAPABILITIES = ALL_SHOP_ROLES;
