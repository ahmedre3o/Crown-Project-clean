# POS Workflow

## Flow

1. **Products** loaded by category; filter by category or "All"
2. **Add to cart**: click product (checks available_stock); cannot add if out of stock
3. **Scan barcode**: supported for quick add
4. **Availability in other branches**: button on each product (read-only modal)
5. **Customer** (optional): name, phone, address
6. **Payment**: Cash or Invoice
7. **Create sale**: POST /api/sales or POST /api/invoices
8. **Print receipt**: POST /api/sales/:id/print or /api/invoices/:id/print
9. **Stock decremented** on sale creation (branch_id from x-branch-id or user assignment)

## Branch Scoping

- **Cashier**: uses assigned branch (user_branch_assignments)
- **Branch Manager**: uses assigned branch
- **Multi-Branch Manager**: can switch branch (sidebar branch selector)
- **Owner**: can switch branch

## APIs

- GET /api/products – products with available_stock
- GET /api/categories – categories
- POST /api/sales – create POS sale
- POST /api/sales/:id/print – increment print count, log to invoice_print_log
- GET /api/admin/inventory/availability?productId= – cross-branch availability
