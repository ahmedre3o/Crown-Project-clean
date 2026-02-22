# Production API & Frontend Validation Plan

After deploying with **NEXT_PUBLIC_API_URL=https://api.crowncs.org/api**:

## 1. Backend health

```bash
curl -i https://api.crowncs.org/api/health
```

Expected: `HTTP/2 200` and body `{"status":"ok"}` (or similar).

## 2. Frontend uses backend direct (no /erp-api)

1. Open https://crowncs.org in the browser.
2. DevTools → Network.
3. Log in or navigate (e.g. dashboard, products).
4. Confirm API requests go to **https://api.crowncs.org/api/** (e.g. `/api/auth/login`, `/api/products`, `/api/shops/profile`).
5. There must be **no** requests to `https://crowncs.org/erp-api/*`.

## 3. Key endpoints (with auth if required)

- **Health (no auth):**  
  `curl -s https://api.crowncs.org/api/health`

- **Shops (needs Bearer token):**  
  `curl -s -H "Authorization: Bearer YOUR_JWT" https://api.crowncs.org/api/admin/shops`

- **Products (needs Bearer token):**  
  `curl -s -H "Authorization: Bearer YOUR_JWT" https://api.crowncs.org/api/products`

Get a JWT via:

```bash
curl -s -X POST https://api.crowncs.org/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@crown.com","password":"YOUR_PASSWORD"}' \
  | jq -r '.token'
```

Then use that token in the `Authorization: Bearer` header for `/api/admin/shops` and `/api/products`.
