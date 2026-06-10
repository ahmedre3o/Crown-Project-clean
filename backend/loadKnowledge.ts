/**
 * Load AI knowledge from markdown files in ai/knowledge/
 * Injected into the Gemini system prompt so the assistant uses real features only.
 */

import * as fs from 'fs';
import * as path from 'path';

const KNOWLEDGE_DIR = path.join(__dirname, '../ai/knowledge');

export function loadSystemKnowledge(): string {
  try {
    if (!fs.existsSync(KNOWLEDGE_DIR)) {
      return getFallbackKnowledge();
    }
    const files = fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith('.md')).sort();
    const parts: string[] = [];
    for (const file of files) {
      const fp = path.join(KNOWLEDGE_DIR, file);
      const content = fs.readFileSync(fp, 'utf-8');
      parts.push(content.trim());
    }
    return parts.length > 0 ? parts.join('\n\n') : getFallbackKnowledge();
  } catch {
    return getFallbackKnowledge();
  }
}

function getFallbackKnowledge(): string {
  return `## Crown Services ERP – System Knowledge (use only this; do not hallucinate)

CRITICAL: The system HAS an online shop/storefront and online orders. Storefront: /storefront. Online orders confirmed from Store Admin > Online Orders.

### Roles
super_admin, shop_owner, branch_manager, multi_branch_manager, cashier, warehouse.

### Key modules
Dashboard (/dashboard), POS (/pos), Inventory (/inventory), Slow Stock (/store-admin/inventory/slow-moving), Invoices (/invoices), Online Orders (/store-admin/orders), Payments (/store-admin/payments), Users (/store-admin/users), Notifications (bell).

### Permissions
- Warehouse: only Inventory, Manual Entry, Excel Import, Slow Stock
- Cashier: POS, Invoices, Online Orders, Notifications
- Branch Manager: branch-scoped Payments, no profits/domain
- Multi-Branch Manager: all branches, no profits/domain
- Owner: full access including Domain`;
}
