# Admin API – curl test plan

Use a valid JWT and `X-Shop-Id: 1` (or your shop id) for all authenticated requests.

## 1. Get token

```bash
# Replace BASE with your API base, e.g. https://api.crowncs.org or https://crown-api-756273570281.us-central1.run.app
BASE="https://api.crowncs.org"
# Login (use your admin credentials)
RESP=$(curl -sS -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@crown.com","password":"YOUR_PASSWORD"}')
TOKEN=$(echo "$RESP" | node -e "let d=require('fs').readFileSync(0,'utf8'); try { console.log(JSON.parse(d).token||'') } catch(e) { console.log('') }")
echo "TOKEN length: ${#TOKEN}"
```

## 2. Test admin endpoints (each should return 200 JSON)

```bash
# All with: Authorization: Bearer $TOKEN and X-Shop-Id: 1

# Branches (must return 200 and JSON array)
curl -sS -i -X GET "$BASE/api/admin/branches" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Shop-Id: 1" | head -30

# Admin stats
curl -sS -o /dev/null -w "%{http_code}" -X GET "$BASE/api/admin/stats" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Shop-Id: 1"
# Expect: 200

# Admin products
curl -sS -o /dev/null -w "%{http_code}" -X GET "$BASE/api/admin/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Shop-Id: 1"
# Expect: 200

# Low stock
curl -sS -o /dev/null -w "%{http_code}" -X GET "$BASE/api/admin/inventory/low-stock" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Shop-Id: 1"
# Expect: 200

# Slow-moving summary
curl -sS -o /dev/null -w "%{http_code}" -X GET "$BASE/api/admin/inventory/slow-moving/summary?days=120&threshold=2" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Shop-Id: 1"
# Expect: 200

# Inventory availability (optional productId)
curl -sS -o /dev/null -w "%{http_code}" -X GET "$BASE/api/admin/inventory/availability?productId=1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Shop-Id: 1"
# Expect: 200 (or 400 if productId missing)

# Analytics summary
curl -sS -o /dev/null -w "%{http_code}" -X GET "$BASE/api/admin/analytics/summary?from=2025-01-01&to=2025-12-31" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Shop-Id: 1"
# Expect: 200

# Analytics timeseries
curl -sS -o /dev/null -w "%{http_code}" -X GET "$BASE/api/admin/analytics/timeseries?from=2025-01-01&to=2025-12-31&source=online" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Shop-Id: 1"
# Expect: 200
```

## 3. Missing X-Shop-Id (expect 400 JSON)

```bash
curl -sS -X GET "$BASE/api/admin/branches" \
  -H "Authorization: Bearer $TOKEN"
# Expect: 400 and body like {"error":"shopId is required"}
```

## 4. Unmatched route (expect 404 JSON, not HTML)

```bash
curl -sS -X GET "$BASE/api/admin/nonexistent-route" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Shop-Id: 1"
# Expect: 404 and body like {"error":"Not found","path":"/api/admin/nonexistent-route"}
```

## 5. Quick one-liner checklist

With `BASE` and `TOKEN` set:

```bash
for path in "/api/health" "/api/admin/branches" "/api/admin/stats" "/api/admin/products" "/api/admin/inventory/slow-moving/summary?days=120&threshold=2"; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" -X GET "$BASE$path" -H "Authorization: Bearer $TOKEN" -H "X-Shop-Id: 1")
  echo "$code $path"
done
```

Expected: `200` for each (health without headers is 200; admin routes need token + X-Shop-Id).

## 6. Optional: seed data for shopId=1

If the DB is empty for `shop_id = 1`, create a shop and default branch (e.g. via `/api/setup-admin` or manually):

- Ensure `shops` has a row with `id = 1` and `owner_id` pointing to a user.
- Ensure `branches` has at least one row with `shop_id = 1` (e.g. "Main Branch" / الفرع الرئيسي with `code = 'main'`).
- Dashboard and branches pages will then return data for `X-Shop-Id: 1`.
