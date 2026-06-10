# Acceptance Checklist — Crown Services Features (Tasks A, B, C)

Manual test steps for the three implemented features.

---

## Task A: Payments / Orders Admin Page

### Database
- `payments` table: id, shop_id, order_id, branch_id, method, amount, reference, status, proof_url, reject_reason, created_at, updated_at
- `online_orders`: payment_status (pending/confirmed/rejected/refunded), order_status (NEW/PROCESSING/SHIPPED/DELIVERED/CANCELLED)

### APIs
- `GET /api/admin/payments-orders/orders` — status, paymentStatus, branchId, from/to (dateFrom/dateTo), search
- `GET /api/admin/payments-orders/payments` — status, method, branchId, from/to, search
- `PATCH /api/admin/orders/:id/status` — update order status and order_status
- `POST /api/admin/payments/:id/confirm` — Owner/Admin only
- `POST /api/admin/payments/:id/reject` — Owner/Admin only (accepts `reason` or `rejectReason`)

### Permissions
- Owner/Admin: view and update all
- Branch Manager: view/update only assigned branches
- Cashier: **cannot access** (no sidebar link, API returns 403)

### Test Steps

1. **Sidebar link**
   - [ ] Log in as shop_owner or branch_manager
   - [ ] Sidebar shows "المدفوعات/الطلبات" (AR) or "Payments / Orders" (EN)
   - [ ] Log in as cashier → link is NOT visible

2. **Orders tab**
   - [ ] Open `/store-admin/payments`
   - [ ] Orders tab loads with filters: status, payment status, branch, search, date range
   - [ ] Table shows: orderId, date, customer, phone, branch, total, paymentStatus, orderStatus
   - [ ] Click "View" or expand row → drawer/modal with items, address, notes
   - [ ] Confirm / Cancel buttons work
   - [ ] order_status shows: NEW, PROCESSING, DELIVERED, CANCELLED

3. **Payments tab**
   - [ ] Switch to Payments tab
   - [ ] Filters: status, method, branch, search, date range
   - [ ] Table shows: paymentId, date, method, amount, reference, status, orderId
   - [ ] Confirm / Reject buttons for pending payments
   - [ ] Reject with reason (rejectReason) stored

---

## Task B: Online Store Product Details

### Database
- Products: description_short, description_long, specs_json, warranty_text, return_policy_text, gallery_urls_json

### APIs
- Product PUT accepts and stores these fields
- `GET /api/public/storefront/:shopId/product/:productId` — single product with full details

### Test Steps

1. **Inventory product edit**
   - [ ] Open `/inventory`
   - [ ] Edit any product
   - [ ] "Storefront details" section: short/long description, specs (key/value), warranty, return policy, gallery URLs
   - [ ] Add specs, save
   - [ ] Add gallery URLs, save

2. **Storefront product page**
   - [ ] Open `/storefront/[shopId]`
   - [ ] Click product name
   - [ ] Navigate to `/storefront/[shopId]/product/[productId]`
   - [ ] Page shows: gallery, price, stock, quantity selector, Add to cart, Buy now
   - [ ] Collapsible sections: Description, Specs, Return Policy, Warranty
   - [ ] AR/EN toggle works

---

## Task C: Cross-Branch Stock Lookup (POS)

### API
- `GET /api/admin/inventory/availability?productId=...`  
  Returns: `{ productId, branches: [{ branchId, branchNameAr, branchNameEn, qty }] }`
- Permissions: Owner, Admin, Cashier, Branch Manager, Warehouse (read-only)

### Test Steps

1. **POS availability button**
   - [ ] Open `/pos`
   - [ ] Each product card has "توفر في فروع أخرى" (AR) or "Available in other branches" (EN)
   - [ ] Button does NOT add product to cart

2. **Availability modal**
   - [ ] Click "Available in other branches"
   - [ ] Modal shows branch names (AR/EN) and qty
   - [ ] Owner/Admin: all branches
   - [ ] Branch Manager: assigned branches (or all per implementation)
   - [ ] Cashier: all branches (read-only)
   - [ ] Close modal by X or backdrop

---

## Regression Checks

- [ ] Excel import unchanged
- [ ] POS sales flow unchanged
- [ ] Storefront grid loads products
- [ ] Online order placement works
- [ ] API responses remain JSON
