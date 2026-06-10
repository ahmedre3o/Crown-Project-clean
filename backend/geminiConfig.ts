/**
 * Shared Gemini / Vertex AI settings for `@google/genai` (single SDK for Gemini Developer API + Vertex AI).
 *
 * **Cloud Run:** mount `GEMINI_API_KEY` from Secret Manager (e.g. `vertex-gemini-api-key:latest`).
 * **Project ID:** `GOOGLE_CLOUD_PROJECT` is set automatically on Cloud Run; locally you can rely on
 * `DEFAULT_VERTEX_PROJECT_ID` or set `GCP_PROJECT`.
 */

import type { GoogleGenAIOptions } from '@google/genai';

/** Default model: Gemini 2.5 Flash (fast + strong quality/cost for ERP workloads). */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export const DEFAULT_VERTEX_LOCATION = 'us-central1';

/** Default GCP project when env is unset (matches Crown Cloud Run project). */
export const DEFAULT_VERTEX_PROJECT_ID = 'gen-lang-client-0711622878';

export function resolveVertexProjectId(): string {
  return (
    String(process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || '').trim() ||
    DEFAULT_VERTEX_PROJECT_ID
  );
}

export function resolveVertexLocation(): string {
  return String(process.env.VERTEX_LOCATION || DEFAULT_VERTEX_LOCATION).trim();
}

/**
 * When `true`, use Vertex AI (`vertexai: true` + project + location). When `false` (default), the SDK uses the
 * **Gemini Developer API** (`generativelanguage.googleapis.com`) — the path that works with standard API keys from AI Studio.
 * Set `GEMINI_USE_VERTEXAI=true` only if you intentionally route via Vertex AI.
 */
export function useVertexAiGemini(): boolean {
  return String(process.env.GEMINI_USE_VERTEXAI ?? 'true').toLowerCase() !== 'false';
}

/**
 * Builds SDK options: Vertex AI + regional endpoint + API key from env/Secret Manager, or Developer API fallback.
 */
export function buildGoogleGenAIOptions(apiKey: string): GoogleGenAIOptions {
  const ua =
    String(process.env.GEMINI_HTTP_USER_AGENT || '').trim() ||
    (useVertexAiGemini()
      ? 'CrownServices/crown-api (@google/genai; Vertex AI)'
      : 'CrownServices/crown-api (@google/genai; Gemini Developer API / generativelanguage)');
  const opts: GoogleGenAIOptions = {
    httpOptions: {
      headers: { 'User-Agent': ua },
    },
  };
  const ver = String(process.env.GEMINI_API_VERSION || '').trim();
  if (ver) opts.apiVersion = ver;

  const key = String(apiKey || '').trim();
  if (!key) return opts;

  if (useVertexAiGemini()) {
    opts.vertexai = true;
    opts.project = resolveVertexProjectId();
    opts.location = resolveVertexLocation();
    opts.apiKey = key;
  } else {
    opts.apiKey = key;
  }
  return opts;
}

/** Waits between retries after a 429 (seconds: 2, 4, 8). */
export const GEMINI_RETRY_BACKOFF_MS = [2000, 4000, 8000] as const;

export function getGeminiRequestDelayMs(): number {
  const raw = String(process.env.GEMINI_REQUEST_DELAY_MS ?? '500').trim();
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 500;
}

/** Small throttle before each Gemini HTTP call to reduce burst rate-limit hits. */
export async function throttleGeminiRequest(): Promise<void> {
  const ms = getGeminiRequestDelayMs();
  if (ms <= 0) return;
  await new Promise((r) => setTimeout(r, ms));
}
