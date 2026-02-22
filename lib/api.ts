/**
 * Single source for API base URL. Inlined at build time (NEXT_PUBLIC_*).
 * Production: Cloud Run (crown-web) should set NEXT_PUBLIC_API_URL.
 * All fetch/apiRequest calls use `${API_BASE}/api/...` (API_BASE_URL already includes /api when absolute).
 */
const isProduction = process.env.NODE_ENV === "production";

/** Fallback when NEXT_PUBLIC_API_URL is not set (e.g. build without env). Production Crown API on Cloud Run. */
export const FALLBACK_API_URL = "https://crown-api-av27y5zkga-uc.a.run.app";

if (isProduction && !process.env.NEXT_PUBLIC_API_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    "NEXT_PUBLIC_API_URL not set; using fallback API for build:",
    FALLBACK_API_URL
  );
}

const _base = (process.env.NEXT_PUBLIC_API_URL ?? FALLBACK_API_URL).replace(/\/+$/, "");
/** Origin only (no path). Relative path (e.g. /erp-api) used as-is; absolute URL gets /api appended if missing. */
export const API_BASE = _base.startsWith("/")
  ? _base
  : _base.endsWith("/api")
    ? _base
    : _base + "/api";

/** Same as API_BASE. All frontend requests use `${API_BASE_URL}/api/...` paths (e.g. /auth/login, /notifications/unread-count). */
export const API_BASE_URL = API_BASE;
