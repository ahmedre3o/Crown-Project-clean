# Excel Import + Invoice Scan Upgrade – Delivery Summary

## Changed Files

| File | Changes |
|------|---------|
| `backend/api.ts` | Extended fieldMatchers, upsert logic, template endpoint, invoice-image endpoint |
| `backend/services/invoiceParser.ts` | **New** – Pluggable OCR stub for invoice image parsing |
| `app/excel-import/page.tsx` | Added galleryUrls to CANONICAL_OPTIONS, fixed invoice preview/importing state |

## Run Steps (Completed)

1. **Build**
   - Frontend: `npm run build` ✓
   - Backend: `cd backend && npm run build` ✓

2. **Commit**
   ```
   feat(import): upgrade Excel import, template download, invoice image scan
   ```

3. **Push**
   - Branch: `master`
   - Remote: `origin/master`

4. **Deploy**
   - **crown-api**: `gcloud run deploy crown-api --source ./backend --allow-unauthenticated --region us-central1 --project gen-lang-client-0711622878`
   - **crown-web**: `gcloud builds submit --config=cloudbuild.yaml`

5. **Verification**
   - Cloud Build: Latest builds SUCCESS
   - crown-api: Revision `crown-api-00245-rc5` (active)
   - crown-web: Revision `crown-web-00275-ptw` (active)

## ENV Vars (Optional)

| Variable | Purpose |
|----------|---------|
| `ENABLE_INVOICE_OCR` | Set to `true` when integrating Google Cloud Vision OCR (future). Stub returns clear message when disabled. |

## Features Delivered

### 1) Excel Import – Add Product Form Parity

- **Columns supported**: name, nameAr, brand, sku, barcode, qrCode, buyPrice, sellPrice, stockQuantity, minStockLevel, cartonPacksCount (X), packUnitsCount (Y), pieceBuyPrice, pieceSellPrice, packBuyPrice, packSellPrice, cartonBuyPrice, cartonSellPrice, imageUrl, galleryUrls, descriptionShort, descriptionLong, warrantyText, returnPolicyText, specs
- **Partial import**: Missing columns do not fail the import; missing fields use null/default
- **Response**: `imported_count`, `updated_count`, `skipped_rows`, `row_errors`, `warnings`
- **Upsert**: Unique key = SKU or Barcode; updates existing product if found, otherwise inserts

### 2) Download Excel Template

- **Endpoint**: `GET /api/products/import/template`
- **Products sheet**: Columns match Add Product form
- **README sheet**: Required/optional columns, X/Y examples, specs format, image URL format

### 3) Invoice Image Scan

- **Endpoint**: `POST /api/import/invoice-image`
- **File upload (multipart)**: Stub parser returns `{ ok, items: [], message }` (OCR not enabled)
- **JSON confirm**: `{ items: [{ itemName, qty, buyPrice, sellPrice, barcode }] }` → create/upsert products
- **UI**: Scan button, preview table, edit/add/remove rows, Confirm import

### 4) Safety

- Inventory, manual entry, and POS flows unchanged
- UI theme consistent
- Auth and shop scoping on all new endpoints
