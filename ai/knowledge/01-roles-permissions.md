# Roles and Permissions

## Roles

| Role | AR | Description |
|------|-----|-------------|
| super_admin | مدير النظام | Full system access, shop selector, role override testing |
| shop_owner | مالك متجر | Full shop access, domain, users, delete, profits |
| branch_manager | مدير فرع | Own branch only, no profits/domain, can create cashier/warehouse |
| multi_branch_manager | مدير فروع | All branches, no profits/domain, can create branch_manager/cashier/warehouse |
| cashier | كاشير | POS, Invoices (view/print), Online Orders, Notifications, no settings/users |
| warehouse | مخزن | Inventory, Manual Entry, Excel Import, Slow Stock only |

## Permission Matrix (Sidebar)

| Feature | super_admin | shop_owner | branch_manager | multi_branch_manager | cashier | warehouse |
|---------|:-----------:|:----------:|:--------------:|:--------------------:|:-------:|:---------:|
| Dashboard | ✓ | ✓ | ✗ | ✓ (no profit) | ✗ | ✗ |
| AI | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| POS | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Inventory | ✓ | ✓ | ✓ (read) | ✓ (read) | ✓ (read) | ✓ |
| Slow Stock | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Manual Entry | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Excel Import | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ |
| Invoices | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Reports | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Online Orders | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Payments/Orders | ✓ | ✓ | ✓ (branch) | ✓ (all) | ✗ | ✗ |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Branches | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Users | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Store Management | ✓ | ✓ | ✓ (preview) | ✓ (preview) | ✓ (preview) | ✗ |
| Domain (edit) | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Settings | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Delete users | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |

## Store Management

- **Owner + super_admin**: Full Store Management with editable Domain
- **Branch Manager + Cashier + Multi-Branch Manager**: Online Store Preview only (read-only), Domain section hidden
- **Warehouse**: No access to Store Management
