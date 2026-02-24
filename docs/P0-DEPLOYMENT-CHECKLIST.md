# P0 Production Deployment Checklist

## Pre-deploy verification

1. **Backend routes** – Confirm these exist in `backend/api.ts`:
   - `POST /api/storefront/orders`
   - `GET /api/storefront/health`
   - `GET /api/storefront/shop`
   - `GET /api/storefront/branches`

2. **Proxy / load balancer** – Ensure the full path `/api/storefront/*` is forwarded to the backend. Do **not** strip the `/api` prefix.

3. **Environment** – `NEXT_PUBLIC_API_URL` must be set for the frontend build (e.g. `https://api.crowncs.org`).

---

## Post-deploy verification (run on production)

```bash
# From project root
chmod +x scripts/verify-production.sh
API_BASE=https://api.crowncs.org ./scripts/verify-production.sh
```

### Expected results

| Endpoint | Method | Expected | If 404 |
|----------|--------|----------|--------|
| `/api/storefront/health` | GET | 200 OK | Backend not deployed or wrong base URL |
| `/api/storefront/orders` | POST | 201 or 400 | Route not registered; redeploy backend |
| `/api/storefront/orders` | GET | 405 | Route exists (405 = method not allowed) |

### Git revisions

```bash
# Backend (deployed service)
cd backend && git rev-parse HEAD

# Frontend (deployed app)
git rev-parse HEAD
```

Confirm these match the commits you deployed.

---

## Fixes applied (this patch)

1. **POST /api/storefront/orders 404** – Routes are defined; 404 means deployment or routing issue. Redeploy backend and verify proxy forwards `/api/*`.

2. **GET /api/admin/branches 403 on storefront** – `BranchContext` now uses `window.location.pathname` when `usePathname()` is undefined, so storefront no longer triggers admin branch fetches.

3. **Activity label "قطع غيار"** – Storefront uses `storeContext.activityType` and `data.shop.activity_type` from the DB. Ensure the shop’s `activity_type` in settings is correct (e.g. "Makeup and perfume").

4. **AI greeting "Ahmed"** – Removed username/email prefix fallback. AI now uses only `user.name` (from auth) or `owner_name` (from shop). No more "ahmed" from `ahmed@example.com`.

---

## Proof checklist (after deploy)

- [ ] Network: `POST /api/storefront/orders` → 201/200 (not 404)
- [ ] Dashboard: new order appears
- [ ] Notifications: `online_order_created` present
- [ ] Storefront: correct activity label (e.g. "Makeup & Perfume")
- [ ] AI: dashboard greets with correct user name (no "Ahmed")
- [ ] Storefront: no `/api/admin/*` calls in Network tab
