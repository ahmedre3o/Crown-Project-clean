/**
 * Single source for API base URL. Inlined at build time (NEXT_PUBLIC_*).
 * Production: NEXT_PUBLIC_API_URL must be set in Cloud Build / Docker build args — no localhost fallback.
 * Dev only: fallback to localhost when env unset.
 */
const isProduction = process.env.NODE_ENV === "production";
if (isProduction && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required for production build (e.g. https://api.crowncs.org/api)"
  );
}
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5001/api";

/** Same as API_BASE; all frontend requests use this. */
export const API_BASE_URL = API_BASE;
