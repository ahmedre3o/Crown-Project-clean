/**
 * Single source for API base URL. Inlined at build time (NEXT_PUBLIC_*).
 * Production: Cloud Run (crown-web) should set NEXT_PUBLIC_API_URL.
 * All fetch/apiRequest calls use `${API_BASE}/api/...` (API_BASE_URL already includes /api when absolute).
 */
const isProduction = process.env.NODE_ENV === "production";

/** Fallback when NEXT_PUBLIC_API_URL is not set (e.g. build without env). */
export const FALLBACK_API_URL = "https://api.crowncs.org";

if (isProduction && !(process.env.NEXT_PUBLIC_API_URL || "").trim()) {
  // eslint-disable-next-line no-console
  console.warn(
    "NEXT_PUBLIC_API_URL not set; using fallback API for build:",
    FALLBACK_API_URL
  );
}

/** Use fallback when env is unset or empty (e.g. Docker build without --build-arg). */
const _base = (process.env.NEXT_PUBLIC_API_URL || FALLBACK_API_URL).replace(/\/+$/, "");
/** Origin only (no path). Relative path (e.g. /erp-api) used as-is; absolute URL gets /api appended if missing. */
export const API_BASE = _base.startsWith("/")
  ? _base
  : _base.endsWith("/api")
    ? _base
    : _base + "/api";

/**
 * Same as API_BASE. Pass paths **without** a second `/api` prefix — e.g. `/admin/branches`, not `/api/admin/branches`.
 */
export const API_BASE_URL = API_BASE;
