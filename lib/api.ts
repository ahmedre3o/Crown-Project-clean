/**
 * Single source for API base URL. Inlined at build time (NEXT_PUBLIC_*).
 * Production: Cloud Run should set NEXT_PUBLIC_API_URL.
 * Build/Prerender: do NOT crash if env is missing; use a safe fallback.
 */
const isProduction = process.env.NODE_ENV === "production";

export const FALLBACK_API_URL =
  "https://crown-api-756273570281.us-central1.run.app/api";

if (isProduction && !process.env.NEXT_PUBLIC_API_URL) {
  // Don't crash the build/prerender. We'll use fallback.
  // eslint-disable-next-line no-console
  console.warn(
    "NEXT_PUBLIC_API_URL not set; using fallback API for build:",
    FALLBACK_API_URL
  );
}

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || FALLBACK_API_URL
).replace(/\/+$/, "");

/** Same as API_BASE; all frontend requests use this. */
export const API_BASE_URL = API_BASE;
