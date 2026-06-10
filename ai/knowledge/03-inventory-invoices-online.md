# Inventory, Invoices, Online Orders

## Inventory Workflow

- **Products**: CRUD (owner/warehouse only); read for branch_manager/cashier/multi_branch_manager
- **Low stock**: products where stock_quantity <= min_stock_level
- **Slow stock**: /store-admin/inventory/slow-moving – dead (0 sales in window) or slow (≤ threshold sales)
- **Excel Import**: /excel-import (owner/warehouse)
- **Manual Entry**: /manual-entry (owner/warehouse)
- **Branch availability**: button "Available in other branches" in POS and Inventory

## Invoices Workflow

- **POS invoices**: from sales; source=pos
- **Online invoices**: from confirmed online orders; source=online
- **Print**: POST /api/invoices/:id/print or /api/sales/:id/print
- **Invoice print log**: every print logs invoice_id, printed_by_user_id, printed_at, print_count_after
- **UI**: "Printed X times (this is print #Y)" in AR/EN
- **Reprint**: warning toast if already printed

## Online Orders Workflow

- **Storefront**: /storefront, /storefront/[shopId]
- **Place order**: POST /api/storefront/orders
- **Admin orders**: /store-admin/orders
- **States**: pending → confirmed → completed; or cancelled
- **Staff (branch_manager, multi_branch_manager, cashier)** with an **online-store** plan: same orders page, confirm/cancel flows, plus **Online discount codes** at /store-admin/coupons
- **Cashier flow**: Prepare → Complete → Cancel
- **On Complete**: create/finalize invoice, decrement inventory ONCE (idempotent)
- **Notifications**: header bell (when plan includes notifications) + sidebar under **Online orders** group → Activity & Notifications /store-admin/notifications; unread count; toast on new order
