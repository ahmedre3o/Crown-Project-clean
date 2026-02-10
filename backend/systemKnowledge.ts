/**
 * Crown Services ERP – System knowledge for the AI assistant.
 * Injected into the system prompt so the assistant only uses real features and flows.
 *
 * To update when new features are added:
 * 1. Add a short section describing the feature, endpoints, and UI path.
 * 2. Keep steps actionable (numbered, with exact nav labels).
 * 3. Do not invent endpoints or UI that do not exist.
 */

export const SYSTEM_KNOWLEDGE = `
## Crown Services ERP – System Knowledge (use only this; do not hallucinate)

CRITICAL: The system HAS an online shop/storefront and online orders. NEVER say the system lacks online store or that there is no storefront. Storefront: /storefront. Online orders are confirmed from Store Admin > Online Orders; they use reservations and appear in notifications, dashboard, and reports.

### Roles and shop resolution
- Roles: super_admin (all shops), shop_owner (their shop), cashier/warehouse (shop-scoped).
- resolveShopIdSafe(req): returns shop_id for the current user; null if not applicable.
- All shop-scoped APIs use s.shop_id (POS/sales) or o.shop_id (online_orders). Never use unqualified shop_id in SQL (ambiguous).

### Notifications (Activity & Notifications)
- Sidebar: التقارير / Reports → or النشاط والإشعارات / Activity & Notifications.
- Endpoints: GET /api/notifications (list), PATCH mark read, mark-all-read. Response: { items: [], unreadCount }.
- Sources: online, pos, system. Types: order_created, order_confirmed, dead_stock_alert, etc.
- Unread count shown in bell; mark read per item or all.

### Online orders lifecycle
- States: created (pending) → confirmed → completed; or cancelled.
- Flow: customer places order (created) → owner/staff confirms (confirmed) → order fulfilled (completed). Cancel releases reservation.

### Stock reservation (online orders)
- On order create: reserve quantity (reserved_stock or equivalent); available_stock = stock_quantity - reserved.
- On confirm: finalize reservation (deduct from stock_quantity, clear reserved).
- On cancel/expire: release reservation (add back to available).
- POS sales check available_stock (or stock_quantity) before adding to cart; cannot sell reserved-only stock as POS.

### Dashboard
- KPIs: Total Sales (monthly revenue), Online Sales (confirmed only), Operations (POS count + confirmed online orders count), Total Products, Staff Online, Dead/Slow Stock.
- Analytics: GET /api/admin/analytics/summary?from=&to= → pos: { amount, count }, online: { amount, count }, combined.
- GET /api/admin/analytics/timeseries?from=&to=&source=pos|online|all&bucket=day|week|month → points with date, posAmount, posCount, onlineAmount, onlineCount, totalAmount, totalCount.
- Charts: Sales Analytics (revenue + operations bars), Online Sales (amount + count bars), Profit (revenue + profit bars). All BarChart with dual Y-axis where needed.

### Reports (store-admin)
- Path: Sidebar → التقارير / Reports → /store-admin/reports.
- Date range picker + manual from/to inputs; presets: Today, Yesterday, Last 7, Last 30, This Month, Last Month.
- Source filter: All / POS / Online. Bucket: Daily / Weekly / Monthly (sends bucket=day|week|month to API).
- Generate Report loads: summary, transactions, top products, orders status, daily revenue, dead-stock summary.
- Exports: Print (window.print, hides sidebar), Export CSV (Blob download), Export Excel (xlsx, multiple sheets), Export PDF (html2canvas + jsPDF; on failure suggest Print then Save as PDF).
- Transactions breakdown: type, date, amount, status, code. Top products: name, qty, revenue.

### Slow-moving / Dead stock
- Path: Sidebar → الراكد/البطيء / Dead/Slow Stock → /store-admin/inventory/slow-moving.
- Params: days (default 120), threshold (default 2). Tabs: All / Dead / Slow.
- Dead = no sales in the window; Slow = sold ≤ threshold times. Recommendations + export/print available.
- Backend: /api/admin/reports/dead-stock?days=&threshold=.
`;
