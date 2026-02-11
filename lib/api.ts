/**
 * Single source for API base URL. Used at build time for Next.js.
 * In production set NEXT_PUBLIC_API_URL (e.g. https://crown-api-av27y5zkga-uc.a.run.app/api).
 * Fallback only for local dev; no localhost in production.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api";

/** Same as API_BASE; all frontend requests should use this. */
export const API_BASE_URL = API_BASE;
