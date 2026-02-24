#!/bin/bash
# P0 Production Verification Script
# Run this after deploying backend + frontend to verify all fixes.

set -e
API_BASE="${API_BASE:-https://api.crowncs.org}"

echo "=== Crown Production Verification ==="
echo "API Base: $API_BASE"
echo ""

echo "1) Storefront health (must return 200):"
curl -sS -i "$API_BASE/api/storefront/health" | head -5
echo ""

echo "2) POST /api/storefront/orders (expect 400/201, NOT 404):"
curl -sS -i -X POST "$API_BASE/api/storefront/orders" \
  -H "Content-Type: application/json" \
  -d '{"shopId":1,"customerName":"Test","phone":"01012345678","governorate":"Cairo","city":"Nasr City","address":"Test St","items":[{"productId":1,"quantity":1}]}' | head -15
echo ""

echo "3) GET /api/storefront/orders (expect 405 Method Not Allowed, NOT 404):"
curl -sS -i -X GET "$API_BASE/api/storefront/orders" | head -5
echo ""

echo "4) Git revisions (run from project root):"
echo "Backend: $(cd backend 2>/dev/null && git rev-parse HEAD 2>/dev/null || echo 'N/A')"
echo "Frontend: $(git rev-parse HEAD 2>/dev/null || echo 'N/A')"
echo ""

echo "=== If health=200 but POST=404: backend routes not deployed or proxy strips /api ==="
echo "=== If POST=400: route exists (shop/product validation). Try with valid shop/product. ==="
echo "=== If POST=201: order created successfully. ==="
