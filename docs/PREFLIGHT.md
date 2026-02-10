# Crown Services ERP — Pre-flight / Sanity Checks

Run these before release or after major changes to avoid repeated failures.

## 1. Build

```bash
npm run build
```

- Fix any **Module not found** or TypeScript errors.
- Ensure no top-level imports of heavy libs (scanner/pdf/excel should be dynamic where possible).

## 2. Dev stack

```bash
npm run dev:all
```

- Starts Next.js dev server and backend API.
- Confirm both start without errors.

## 3. Route smoke test (manual or script)

Open in browser or use `curl`:

| Route | Purpose |
|-------|--------|
| `/dashboard` | Dashboard (auth required) |
| `/store-admin/pos` or `/pos` | POS page |
| `/store-admin/reports` | Reports |
| `/storefront?preview=...` | Storefront preview (if applicable) |

- No runtime "Module not found" in console.
- Camera scan: only loads barcode lib when user clicks "Scan with camera" (lazy path).

## 4. Camera / barcode

- **HTTPS**: `getUserMedia` requires HTTPS (or `localhost`). On non-secure origins the app shows a clear message (AR/EN) instead of failing.
- **Lazy load**: `@zxing/browser` is imported only when the user opens the camera scanner (dynamic `import('@zxing/browser')`), so the main bundle is not bloated.

## 5. Env notes

- Backend: `DB_*`, `JWT_SECRET`, optional `GEMINI_API_KEY` for AI.
- Frontend: `NEXT_PUBLIC_API_URL` or equivalent for API base URL.
- For camera on mobile: serve over HTTPS.

## Quick script (optional)

```bash
npm run build && echo "Build OK"
```

Then manually run `npm run dev:all` and hit the routes above.
