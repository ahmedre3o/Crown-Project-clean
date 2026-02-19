/**
 * Single source for API base URL. Inlined at build time (NEXT_PUBLIC_*).
 * Production: Cloud Run should set NEXT_PUBLIC_API_URL.
 * Build/Prerender: do NOT crash if env is missing; use a safe fallback.
 */
const isProduction = process.env.NODE_ENV === "production";

/** Fallback when NEXT_PUBLIC_API_URL is not set. Use /erp-api to avoid Cloud Shell intercepting /api. */
export const FALLBACK_API_URL = "/erp-api";

if (isProduction && !process.env.NEXT_PUBLIC_API_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    "NEXT_PUBLIC_API_URL not set; using fallback API for build:",
    FALLBACK_API_URL
  );
}

const _base = (process.env.NEXT_PUBLIC_API_URL ?? FALLBACK_API_URL).replace(/\/+$/, "");
/** Relative path (e.g. /erp-api) used as-is; absolute URL gets /api appended if missing. */
export const API_BASE = _base.startsWith("/")
  ? _base
  : _base.endsWith("/api")
    ? _base
    : _base + "/api";

/** Same as API_BASE; all frontend requests use this. */
export const API_BASE_URL = API_BASE;
