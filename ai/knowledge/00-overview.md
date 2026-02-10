# Crown Services ERP – System Overview

Crown Services ERP is a comprehensive SaaS system for auto parts, pharmacy, grocery, and retail management with:

- **Multi-shop, multi-branch** architecture
- **RBAC** (Role-Based Access Control) with 6 roles
- **Multi-language** (Arabic RTL / English LTR)
- **Subscription plans**: Bronze, Silver, Gold, Branches
- **POS** (Point of Sale), **Inventory**, **Invoices**, **Online Store**
- **AI Assistant** (Gemini), **Notifications**, **Reports**
- **Store Management** (Domain vs Preview)

## Key Modules

| Module | Path | Description |
|--------|------|-------------|
| Dashboard | /dashboard | KPIs, charts, low stock, dead/slow stock (owner only; multi_branch_manager sees no profits) |
| POS | /pos | Point of sale, cart, invoices, branch selector |
| Inventory | /inventory | Products, low stock, edit (warehouse/owner only) |
| Slow Stock | /store-admin/inventory/slow-moving | Dead/slow-moving items, recommendations |
| Invoices | /invoices | POS + Online invoices, print log |
| Online Orders | /store-admin/orders | Prepare → Complete → Cancel |
| Payments/Orders | /store-admin/payments | Orders + Payments admin (owner/branch_manager/multi_branch_manager) |
| Store Management | /store-admin/store | Domain (owner only) or Preview (others) |
| Users | /store-admin/users | Create, change password, delete (owner/super_admin) |
| Notifications | Bell icon + /store-admin/notifications | Activity feed |
