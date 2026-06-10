# Payments, Users, Recent RBAC Updates

## Payments / Orders

- **Path**: /store-admin/payments
- **Access**: shop_owner (all branches), branch_manager (own branch), multi_branch_manager (all branches)
- **Forbidden**: cashier, warehouse
- **Tabs**: Orders, Payments
- **Filters**: status, payment status, branch, search, date range

## User Limits by Plan (Authoritative)

| Plan | Additional Users Limit | Total (incl. Owner) | Owner Counts? |
|------|------------------------|---------------------|---------------|
| Bronze (برونزي) | 1 | 2 | No - owner is excluded from limit |
| Silver (فضي) | 4 | 5 | No |
| Gold (ذهبي) | 9 | 10 | No |
| Branches (فروع) | 29 | 30 | No |

- **Owner (shop_owner) does NOT count** against the additional users limit.
- **Additional users** = all users except owner (cashier, warehouse, branch_manager, multi_branch_manager).
- When limit reached: backend returns `PLAN_USER_LIMIT_REACHED`, UI disables Add button and shows AR/EN message.

## Plan Pricing (EGP / USD)

| Plan | EGP Monthly | EGP Yearly | USD Monthly | USD Yearly |
|------|-------------|------------|-------------|------------|
| Bronze | 199 | 1900 | $7 | $70 |
| Silver | 349 | 3350 | $12 | $120 |
| Gold | 699 | 6700 | $25 | $240 |
| Branches | 1499 | 14400 | $49 | $480 |

- Currency: Egypt => EGP, else USD. Manual toggle available.

## User Management

- **Path**: /store-admin/users
- **Access**: super_admin, shop_owner, branch_manager, multi_branch_manager
- **Forbidden**: cashier, warehouse

### Create Users

| Creator | Can Create |
|---------|------------|
| super_admin | shop_owner, branch_manager, multi_branch_manager, cashier, warehouse (requires shopId) |
| shop_owner | branch_manager, multi_branch_manager, cashier, warehouse |
| branch_manager | cashier, warehouse only (auto-assign same branch) |
| multi_branch_manager | branch_manager, cashier, warehouse |

### Branch Assignment

- **branch_manager** created: must choose branchId (or auto if single-branch)
- **Creator is branch_manager**: auto-assign same branch (no selector)
- **Creator is shop_owner or multi_branch_manager**: show branch selector
- Stored in user_branch_assignments

### Delete Users

- **Only** shop_owner and super_admin can delete
- Owner (shop_owner) cannot be deleted (OWNER_CANNOT_BE_DELETED)
- Hide delete button for owner row
- No one can delete super_admin except super_admin

### Change Password

- super_admin: always
- shop_owner: for users in his shop
- branch_manager: only for users in his branch
- multi_branch_manager: for users in any branch of shop
- Cannot change super_admin password unless you are super_admin

## Recent RBAC Updates (Summary)

- Added **multi_branch_manager** role (مدير فروع)
- Warehouse: ONLY Inventory, Manual Entry, Excel Import, Slow Stock
- Cashier: POS, Inventory (read), Invoices, Online Orders, Notifications
- Branch Manager: branch-scoped Payments, no profits/domain
- Multi-Branch Manager: all branches, Dashboard without profits
- Invoice print log: invoice_print_log table, printed_by_user_id, print_count_after
- Cross-branch availability: GET /api/inventory/availability
- Role Test Bar: super_admin only, persistent when override active
