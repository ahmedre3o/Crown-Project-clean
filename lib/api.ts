/**
 * Single source for API base URL. Inlined at build time (NEXT_PUBLIC_*).
 * Production: Cloud Run should set NEXT_PUBLIC_API_URL.
 * Build/Prerender: do NOT crash if env is missing; use a safe fallback.
 */
const isProduction = process.env.NODE_ENV === "production";

/** Host base when NEXT_PUBLIC_API_URL is not set (no /api suffix; we append it below). */
export const FALLBACK_API_URL = "https://api.crowncs.org";

if (isProduction && !process.env.NEXT_PUBLIC_API_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    "NEXT_PUBLIC_API_URL not set; using fallback API for build:",
    FALLBACK_API_URL + "/api"
  );
}

const _base = (process.env.NEXT_PUBLIC_API_URL ?? FALLBACK_API_URL).replace(/\/+$/, "");
/** Always ends with /api exactly once. All app paths are like /dashboard/stats (no leading /api). */
export const API_BASE = _base.endsWith("/api") ? _base : _base + "/api";

/** Same as API_BASE; all frontend requests use this. */
export const API_BASE_URL = API_BASE;
