import type { Response, NextFunction } from 'express';
import { roleHasAnyCapability, type ShopCapability } from './rbacCapabilities';
import { getPlanFeaturesForBackend } from './shared/plans';

type PlanCaps = ReturnType<typeof getPlanFeaturesForBackend>;

function planAllowsCapability(cap: ShopCapability, plan: PlanCaps): boolean {
  switch (cap) {
    case 'crm':
    case 'crm_followup':
    case 'crm_pos_pick':
    case 'crm_balance':
      return plan.crm;
    case 'hr':
      return plan.hr;
    case 'accounting':
    case 'taxes':
      return plan.accounting;
    case 'reports':
      return plan.reports;
    case 'purchases':
      return plan.purchases;
    case 'notifications':
      return plan.notifications;
    case 'branches_admin':
      return plan.branches;
    default:
      return true;
  }
}

/** Backend RBAC: owner + super_admin bypass; otherwise need ≥1 capability */
export function requireShopCapability(...caps: ShopCapability[]) {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (caps.length === 0) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const plan = getPlanFeaturesForBackend(req.user.package || req.user.plan || 'bronze');
    const planAllowsAny = caps.some((cap) => planAllowsCapability(cap, plan));
    if (!planAllowsAny) {
      return res.status(403).json({ error: 'Feature not available in current plan' });
    }
    if (req.user.role === 'super_admin' || req.user.role === 'shop_owner') {
      return next();
    }
    if (roleHasAnyCapability(req.user.role, caps)) {
      return next();
    }
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}
