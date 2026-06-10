/**
 * Purchase invoice / PO image → structured line items (Gemini vision when API key is set).
 * Extended: expiry date + tax per line / invoice-level (safe fallbacks).
 */
import { GoogleGenAI, createPartFromBase64, createPartFromText, createPartFromUri, createUserContent } from '@google/genai';
import { DEFAULT_GEMINI_MODEL, throttleGeminiRequest, buildGoogleGenAIOptions, useVertexAiGemini } from '../geminiConfig';
import { getInvoiceOcrBucketName, uploadInvoiceImageToGcs } from './invoiceGcs';
import crypto from 'crypto';

export interface InvoiceLineItem {
  itemName: string;
  qty: number;
  buyPrice?: number;
  sellPrice?: number;
  barcode?: string;
  /** Normalized YYYY-MM-DD when OCR found a value */
  expiryDate?: string | null;
  /** 0–100 when known */
  taxPercent?: number | null;
  /** Line tax amount in document currency */
  taxAmount?: number | null;
}

export interface ParsedInvoiceMeta {
  documentType?: string;
  supplierName?: string | null;
  supplierPhone?: string | null;
  supplierAddress?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  branchName?: string | null;
  notes?: string | null;
  /** Invoice-level: sum of line bases before tax (if visible) */
  invoiceSubtotalBeforeTax?: number | null;
  /** Invoice-level total VAT/tax amount */
  invoiceTotalTax?: number | null;
  /** ISO 4217 when visible on document (e.g. SAR, USD, EGP) */
  currencyCode?: string | null;
  currencySymbol?: string | null;
}

function getGeminiKey(): string {
  return (
    String(process.env.GEMINI_API_KEY || '').trim() ||
    String(process.env.GOOGLE_API_KEY || '').trim() ||
    String(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim()
  );
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
const OCR_QUEUE_CONCURRENCY = Math.min(
  Math.max(Number(String(process.env.OCR_QUEUE_CONCURRENCY || '3').trim()) || 3, 2),
  5
);
const OCR_TIMEOUT_MS = Math.max(Number(String(process.env.OCR_TIMEOUT_MS || '45000').trim()) || 45000, 10000);
const OCR_MAX_RETRIES = Math.min(Math.max(Number(String(process.env.OCR_MAX_RETRIES || '5').trim()) || 5, 0), 5);
const OCR_SLOW_MS = Math.max(Number(String(process.env.OCR_SLOW_MS || '2000').trim()) || 2000, 500);
const OCR_CACHE_MAX = Math.max(Number(String(process.env.OCR_CACHE_MAX || '500').trim()) || 500, 50);
const OCR_CACHE_TTL_MS = Math.max(Number(String(process.env.OCR_CACHE_TTL_MS || '259200000').trim()) || 259200000, 60000);
const OCR_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    documentType: { type: ['string', 'null'] },
    supplierName: { type: ['string', 'null'] },
    supplierPhone: { type: ['string', 'null'] },
    supplierAddress: { type: ['string', 'null'] },
    invoiceNumber: { type: ['string', 'null'] },
    invoiceDate: { type: ['string', 'null'] },
    branchName: { type: ['string', 'null'] },
    invoiceSubtotalBeforeTax: { type: ['number', 'null'] },
    invoiceTotalTax: { type: ['number', 'null'] },
    currencyCode: { type: ['string', 'null'] },
    currencySymbol: { type: ['string', 'null'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          itemName: { type: ['string', 'null'] },
          quantity: { type: ['number', 'null'] },
          unitPrice: { type: ['number', 'null'] },
          sellPrice: { type: ['number', 'null'] },
          lineTotal: { type: ['number', 'null'] },
          barcode: { type: ['string', 'null'] },
          /** أمر شراء: رمز الصنف — يُنسخ أيضاً إلى barcode عند غياب الباركود */
          sku: { type: ['string', 'null'] },
          expiryDate: { type: ['string', 'null'] },
          lineTaxAmount: { type: ['number', 'null'] },
          lineTaxPercent: { type: ['number', 'null'] },
        },
      },
    },
    notes: { type: ['string', 'null'] },
  },
} as const;

const OCR_GEN_CONFIG = {
  temperature: 0.2,
  topP: 0.9,
  maxOutputTokens: 8192,
  responseMimeType: 'application/json',
  responseSchema: OCR_RESPONSE_SCHEMA,
} as const;

/** Some models return JSON only in inlineData, or structured mode truncates; plain JSON is more reliable as fallback. */
const OCR_GEN_CONFIG_FALLBACK = {
  temperature: 0.2,
  topP: 0.9,
  maxOutputTokens: 8192,
} as const;

export type ParseInvoiceImageOptions = {
  /** Shop id for GCS path prefix `invoice-ocr/{shopId}/…` */
  shopId?: number | null;
};

type InvoiceParseResult = {
  items: InvoiceLineItem[];
  meta?: ParsedInvoiceMeta;
  structured?: {
    supplier: string;
    date: string;
    invoice_number: string;
    items: Array<{ name: string; quantity: number; price: number; total: number }>;
    total_amount: number;
  };
  warnings?: string[];
  message?: string;
  geminiInvoked?: boolean;
};

type CacheEntry = { result: InvoiceParseResult; at: number };
const ocrResultCache = new Map<string, CacheEntry>();

let genAiClient: GoogleGenAI | null | undefined;
function getGeminiClient(apiKey: string): GoogleGenAI {
  if (genAiClient) return genAiClient;
  if (genAiClient === null) throw new Error('Gemini client initialization already failed');
  try {
    genAiClient = new GoogleGenAI(buildGoogleGenAIOptions(apiKey));
    return genAiClient;
  } catch (err) {
    genAiClient = null;
    throw err;
  }
}

function cloneResult(result: InvoiceParseResult): InvoiceParseResult {
  return {
    items: result.items.map((x) => ({ ...x })),
    meta: result.meta ? { ...result.meta } : undefined,
    structured: result.structured
      ? {
          ...result.structured,
          items: result.structured.items.map((x) => ({ ...x })),
        }
      : undefined,
    warnings: result.warnings ? [...result.warnings] : undefined,
    message: result.message,
    geminiInvoked: result.geminiInvoked,
  };
}

function pruneCacheIfNeeded(): void {
  if (ocrResultCache.size <= OCR_CACHE_MAX) return;
  const entries = [...ocrResultCache.entries()].sort((a, b) => a[1].at - b[1].at);
  const toDelete = Math.max(entries.length - OCR_CACHE_MAX, 1);
  for (let i = 0; i < toDelete; i++) ocrResultCache.delete(entries[i][0]);
}

function readFromCache(hash: string): InvoiceParseResult | null {
  const c = ocrResultCache.get(hash);
  if (!c) return null;
  if (Date.now() - c.at > OCR_CACHE_TTL_MS) {
    ocrResultCache.delete(hash);
    return null;
  }
  return cloneResult(c.result);
}

function writeToCache(hash: string, result: InvoiceParseResult): void {
  ocrResultCache.set(hash, { at: Date.now(), result: cloneResult(result) });
  pruneCacheIfNeeded();
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

function isTransientAiError(err: any): boolean {
  const status = Number(err?.status || err?.code || 0);
  const msg = String(err?.message || '').toLowerCase();
  if (status === 429 || status === 408 || status === 500 || status === 502 || status === 503 || status === 504) return true;
  return (
    msg.includes('resource_exhausted') ||
    msg.includes('"code":429') ||
    msg.includes('timeout') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('deadline exceeded') ||
    msg.includes('connection reset')
  );
}

function computeBackoffMs(retryIndex: number): number {
  return Math.min(1000 * Math.pow(2, retryIndex), 8000);
}

function toIsoDateFromUnknown(v: unknown): string {
  return normalizeExpiryDateToIso(v) || '';
}

function deriveStructuredInvoice(
  parsed: Record<string, unknown>,
  items: InvoiceLineItem[],
  meta: ParsedInvoiceMeta
): NonNullable<InvoiceParseResult['structured']> {
  const normalizedItems = items.map((it) => {
    const quantity = Math.max(0, Math.floor(Number(it.qty) || 0));
    const price = Math.max(0, Number(it.buyPrice || 0));
    return {
      name: String(it.itemName || '').trim(),
      quantity,
      price,
      total: Number((quantity * price).toFixed(4)),
    };
  });
  const lineTotal = normalizedItems.reduce((sum, x) => sum + Number(x.total || 0), 0);
  const hintedTotal = toNum(
    parsed.total ??
      parsed.total_amount ??
      parsed.invoiceTotal ??
      parsed.invoice_total ??
      meta.invoiceSubtotalBeforeTax
  );
  return {
    supplier: String(parsed.supplierName ?? parsed.supplier ?? meta.supplierName ?? '').trim(),
    date: toIsoDateFromUnknown(parsed.date ?? parsed.invoiceDate ?? parsed.invoice_date),
    invoice_number: String(parsed.invoiceNumber ?? parsed.invoice_number ?? parsed.invoiceNo ?? '').trim(),
    items: normalizedItems,
    total_amount: Number((hintedTotal > 0 ? hintedTotal : lineTotal).toFixed(4)),
  };
}

type QueueJob<T> = { run: () => Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void };
const ocrQueue: QueueJob<any>[] = [];
let activeOcrJobs = 0;

function pumpOcrQueue(): void {
  while (activeOcrJobs < OCR_QUEUE_CONCURRENCY && ocrQueue.length > 0) {
    const job = ocrQueue.shift()!;
    activeOcrJobs += 1;
    job
      .run()
      .then(job.resolve, job.reject)
      .finally(() => {
        activeOcrJobs -= 1;
        pumpOcrQueue();
      });
  }
}

function enqueueOcr<T>(run: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    ocrQueue.push({ run, resolve, reject });
    pumpOcrQueue();
  });
}

async function optimizePayloadForAi(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string; optimized: boolean }> {
  const type = String(mimeType || '').toLowerCase();
  if (!type.startsWith('image/')) return { buffer, mimeType, optimized: false };
  try {
    const sharpMod = await import('sharp');
    const sharp = (sharpMod as any).default || sharpMod;
    const img = sharp(buffer, { failOn: 'none', animated: false }).rotate();
    const meta = await img.metadata();
    const maxSide = 1600;
    const width = Number(meta.width || 0);
    const height = Number(meta.height || 0);
    if (width > maxSide || height > maxSide) {
      img.resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true });
    }
    if (type.includes('png') || type.includes('webp')) {
      const out = await img.jpeg({ quality: 78, mozjpeg: true }).toBuffer();
      return { buffer: out, mimeType: 'image/jpeg', optimized: true };
    }
    const out = await img.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    return { buffer: out, mimeType: 'image/jpeg', optimized: true };
  } catch {
    return { buffer, mimeType, optimized: false };
  }
}

function cleanModelJsonText(text: string): string {
  const t = String(text || '').trim();
  if (!t) return '';
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fence ? fence[1] : t;
  const direct = payload.trim();
  if (direct.startsWith('{') && direct.endsWith('}')) return direct;
  const start = payload.indexOf('{');
  if (start < 0) return direct;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < payload.length; i++) {
    const ch = payload[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return payload.slice(start, i + 1).trim();
    }
  }
  return direct;
}

function extractModelText(result: any): string {
  const tryStr = (v: unknown) => String(v ?? '').trim();
  const direct = tryStr(result?.text);
  if (direct) return direct;

  const parts = Array.isArray(result?.candidates?.[0]?.content?.parts)
    ? result.candidates[0].content.parts
    : [];
  const chunks: string[] = [];
  for (const p of parts) {
    if (p && typeof p === 'object' && (p as any).thought === true) continue;
    const t = tryStr((p as any)?.text);
    if (t) chunks.push(t);
    const id = (p as any)?.inlineData;
    if (id?.data && typeof id.data === 'string') {
      const mime = String(id.mimeType || '').toLowerCase();
      if (mime.includes('json') || mime === 'application/json' || mime.endsWith('+json')) {
        try {
          chunks.push(Buffer.from(id.data, 'base64').toString('utf8'));
        } catch {
          try {
            if (typeof globalThis !== 'undefined' && typeof (globalThis as any).atob === 'function') {
              chunks.push(String((globalThis as any).atob(id.data)));
            }
          } catch {
            /* ignore */
          }
        }
      }
    }
  }
  const joined = chunks.join('\n').trim();
  if (joined) return joined;
  return tryStr(result?.candidates?.[0]?.output);
}

function tryLooseParseObject(payload: string): Record<string, unknown> | null {
  const s = String(payload || '').trim();
  if (!s) return null;
  const relaxed = s
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(relaxed) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const payload = westernizeDigitCharsInJsonPayload(cleanModelJsonText(text));
  try {
    return JSON.parse(payload.trim()) as Record<string, unknown>;
  } catch {
    return tryLooseParseObject(payload);
  }
}

/** Replace Arabic-Indic / Eastern Arabic digits so JSON numeric literals parse (Gemini sometimes ignores the Western-only rule). */
function westernizeDigitCharsInJsonPayload(s: string): string {
  return normalizeDigits(String(s || ''));
}

function normalizeDigits(s: string): string {
  return s
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
}

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = normalizeDigits(String(v)).replace(/[^\d.-]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function isValidYmd(y: number, mo: number, d: number): boolean {
  if (!Number.isFinite(y) || y < 1970 || y > 2100) return false;
  if (!Number.isFinite(mo) || mo < 1 || mo > 12) return false;
  if (!Number.isFinite(d) || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Normalize expiry / best-before strings to YYYY-MM-DD or null (never throws). Rejects invalid months/days (e.g. month 13). */
export function normalizeExpiryDateToIso(input: unknown): string | null {
  if (input == null) return null;
  const raw = normalizeDigits(String(input).trim());
  if (!raw) return null;

  let m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!isValidYmd(y, mo, d)) return null;
    return new Date(Date.UTC(y, mo - 1, d)).toISOString().slice(0, 10);
  }

  m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = Number(m[3]);
    if (!isValidYmd(y, mo, d)) return null;
    return new Date(Date.UTC(y, mo - 1, d)).toISOString().slice(0, 10);
  }

  m = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!isValidYmd(y, mo, d)) return null;
    return new Date(Date.UTC(y, mo - 1, d)).toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Retail PO lines: unit cost is usually lower than retail. When OCR swaps the two price columns, buy > sell.
 * Swap back so buyPrice = cost, sellPrice = retail when both are present and buy > sell.
 */
export function normalizeBuySellForPoLine(buyRaw: unknown, sellRaw: unknown): { buy: number; sell: number } {
  let buy = toNum(buyRaw);
  let sell = toNum(sellRaw);
  if (buy > 0 && sell > 0 && buy > sell) {
    const t = buy;
    buy = sell;
    sell = t;
  }
  return { buy, sell };
}

function clampTaxPercent(n: number): number | null {
  if (!Number.isFinite(n) || n < 0) return null;
  if (n > 100 && n <= 10000) return Math.min(100, n / 100);
  return Math.min(100, Math.max(0, n));
}

/**
 * If lines lack tax but invoice totals exist, spread tax proportionally by line subtotal (qty * unitPrice).
 */
function distributeInvoiceLevelTax(items: InvoiceLineItem[], meta: ParsedInvoiceMeta): void {
  const totalTax = meta.invoiceTotalTax != null ? toNum(meta.invoiceTotalTax) : NaN;
  if (!Number.isFinite(totalTax) || totalTax < 0) return;

  const hasLineTax = items.some((it) => (it.taxAmount != null && it.taxAmount > 0) || (it.taxPercent != null && it.taxPercent > 0));
  if (hasLineTax) return;

  let sumLine = 0;
  for (const it of items) {
    const q = Math.max(0, Math.floor(Number(it.qty) || 0));
    const p = toNum(it.buyPrice);
    sumLine += q * p;
  }
  if (sumLine <= 0) return;

  const ratio = totalTax / sumLine;
  const invSub = meta.invoiceSubtotalBeforeTax != null ? toNum(meta.invoiceSubtotalBeforeTax) : sumLine;
  const impliedPct = invSub > 0 ? (totalTax / invSub) * 100 : null;

  for (const it of items) {
    const q = Math.max(0, Math.floor(Number(it.qty) || 0));
    const p = toNum(it.buyPrice);
    const lineSub = q * p;
    if (lineSub <= 0) continue;
    it.taxAmount = Number((lineSub * ratio).toFixed(4));
    if (impliedPct != null && Number.isFinite(impliedPct)) {
      it.taxPercent = Number(impliedPct.toFixed(4));
    }
  }
}

/** When OCR returns tax amount but not %, derive % from line base (qty × buy). Safe, no overwrite if % already set. */
function enrichTaxPercentFromLineAmounts(items: InvoiceLineItem[]): void {
  for (const it of items) {
    const q = Math.max(0, Math.floor(Number(it.qty) || 0));
    const buy = toNum(it.buyPrice);
    const base = q * buy;
    const ta = it.taxAmount != null ? toNum(it.taxAmount) : 0;
    if (base <= 0 || ta <= 0) continue;
    if (it.taxPercent != null && it.taxPercent > 0) continue;
    const p = (ta / base) * 100;
    if (p > 0 && p <= 100 && Number.isFinite(p)) {
      it.taxPercent = Number(p.toFixed(3));
    }
  }
}

/** If model returned 14% hint but no line amounts, approximate line tax from base × 14%. */
function enrichTaxAmountFromPercentWhenMissing(items: InvoiceLineItem[]): void {
  for (const it of items) {
    const q = Math.max(0, Math.floor(Number(it.qty) || 0));
    const buy = toNum(it.buyPrice);
    const base = q * buy;
    const pct = it.taxPercent != null ? toNum(it.taxPercent) : 0;
    if (base <= 0 || pct <= 0 || pct > 100) continue;
    if (it.taxAmount != null && it.taxAmount > 0) continue;
    it.taxAmount = Number(((base * pct) / 100).toFixed(4));
  }
}

/**
 * Parse invoice/PO image buffer. Uses Gemini when GEMINI_API_KEY (or GOOGLE_API_KEY) is set.
 * With Vertex AI (`GEMINI_USE_VERTEXAI` default true), uploads optimized image to GCS and sends `gs://…`
 * to reduce payload size and improve OCR stability vs huge inline base64.
 */
export async function parseInvoiceImage(
  buffer: Buffer,
  mimeType: string,
  options?: ParseInvoiceImageOptions | null
): Promise<InvoiceParseResult> {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    return {
      items: [],
      message:
        'لم يُضبط مفتاح الذكاء الاصطناعي. أضف GEMINI_API_KEY على خادم الـ API (Cloud Run) لاستخراج الفاتورة تلقائياً، أو أدخل الأسطر يدوياً في المعاينة.',
      geminiInvoked: false,
    };
  }

  const allowed =
    mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType === 'application/octet-stream';
  if (!allowed) {
    return { items: [], message: 'Unsupported file type. Use an image (JPG/PNG) or PDF.', geminiInvoked: false };
  }

  let genAI: GoogleGenAI;
  try {
    genAI = getGeminiClient(apiKey);
  } catch (e: any) {
    return { items: [], message: `Gemini init failed: ${e?.message || e}`, geminiInvoked: false };
  }

  const optimized = await optimizePayloadForAi(buffer, mimeType);
  const contentBuffer = optimized.buffer;
  const contentMimeType = optimized.mimeType;
  const imageHash = crypto.createHash('sha256').update(contentBuffer).digest('hex');
  const cached = readFromCache(imageHash);
  if (cached) {
    return {
      ...cached,
      warnings: [...(cached.warnings || []), 'cache_hit: reused previous OCR result'],
      geminiInvoked: false,
    };
  }

  const safeMime = contentMimeType === 'application/octet-stream' ? 'image/jpeg' : contentMimeType;
  let gcsUri: string | null = null;
  const sid = options?.shopId != null && Number.isFinite(Number(options.shopId)) && Number(options.shopId) > 0 ? Number(options.shopId) : null;
  if (sid != null && useVertexAiGemini() && getInvoiceOcrBucketName()) {
    try {
      const up = await uploadInvoiceImageToGcs(sid, contentBuffer, safeMime);
      gcsUri = up.gsUri;
    } catch (e: any) {
      console.warn('[invoiceParser] GCS upload failed, falling back to inline image:', e?.message || e);
    }
  }
  const useGcsUri = Boolean(gcsUri && gcsUri.startsWith('gs://'));
  const b64 = contentBuffer.toString('base64');
  const prompt = `You extract data from a purchase invoice (فاتورة شراء) or purchase order (أمر شراء) image. Text may be Arabic RTL or English.

## Table layout (Arabic documents, read columns carefully)
- **أمر شراء (PO)** غالباً فيه أعمدة: SKU أو رمز الصنف، الوصف/الصنف، الكمية، سعر الوحدة، الإجمالي. ضع رمز SKU في الحقل **sku** وإن لم يوجد باركود منفصل فضع نفس قيمة SKU في **barcode** أيضاً.
- Many tables are RIGHT-TO-LEFT. Typical column order (from right edge to left edge): رقم، باركود، اسم الصنف، الكمية، سعر الشراء (unit purchase price)، تاريخ الصلاحية، الضريبة (14% أو مبلغ)، وأحياناً عمود إضافي أقصى اليسار لسعر البيع/التجزئة بدون عنوان واضح.
- **unitPrice** = سعر الشراء فقط من عمود "سعر الشراء" (أصغر سعر عادةً). لا تضع فيه قيم عمود الضريبة ولا سعر البيع ولا إجمالي السطر.
- **sellPrice** = سعر البيع/التجزئة من أقصى اليسار إن وُجد. إن كان سعر الشراء أكبر من سعر البيع لنفس الصف فغالباً أخطأت في الأعمدة — ضع الأرقام كما في المستند وسنعالجها لاحقاً.
- **expiryDate** = من عمود "تاريخ الصلاحية" أو "الصلاحية" أو Expiry — أعد التاريخ بصيغة YYYY-MM-DD (أرقام غربية 0-9).
- **lineTaxAmount** = المبلغ من عمود الضريبة لنفس السطر (مثل 1940.00). أزل الفواصل عن الآلاف.
- **lineTaxPercent** = إذا كان مذكوراً صراحة (مثل 14 أو 14%) وإلا null.

## Footer totals (if visible)
- "إجمالي القيمة الفنية" / subtotal before tax → invoiceSubtotalBeforeTax
- "إجمالي الضريبة" / total VAT → invoiceTotalTax

## Document currency (required when symbols appear)
- Detect **currencyCode** as ISO 4217 (three letters): **SAR** if you see ر.س or ريال سعودي or SAR; **EGP** if ج.م or جنيه or EGP; **USD** if $ or USD; **EUR** if € or EUR; **AED** if د.إ or AED; **KWD**, **QAR**, **OMR**, **BHD** similarly.
- Put the same code in **currencySymbol** as short text if helpful (e.g. "ر.س") or null.
- All numeric prices in **items** and totals must stay in that document currency (do not convert).

Return ONLY a raw JSON object (no preamble, no explanation, no markdown), exact shape:
{
  "documentType": "purchase_invoice" | "purchase_order" | "unknown",
  "supplierName": string | null,
  "supplierPhone": string | null,
  "supplierAddress": string | null,
  "invoiceNumber": string | null,
  "invoiceDate": string | null,
  "branchName": string | null,
  "invoiceSubtotalBeforeTax": number | null,
  "invoiceTotalTax": number | null,
  "currencyCode": "SAR" | "USD" | "EGP" | "EUR" | "AED" | "KWD" | "QAR" | "OMR" | "BHD" | "GBP" | "JPY" | "TRY" | "CNY" | "INR" | null,
  "currencySymbol": string | null,
  "items": [
    {
      "itemName": "exact product name from the document",
      "quantity": number,
      "unitPrice": number,
      "sellPrice": number | null,
      "lineTotal": number | null,
      "barcode": string | null,
      "sku": string | null,
      "expiryDate": string | null,
      "lineTaxAmount": number | null,
      "lineTaxPercent": number | null
    }
  ],
  "notes": string | null
}

Rules:
- Western digits 0-9 in JSON numbers only. Strip thousand separators; keep amounts in document currency (currencyCode).
- quantity = الكمية (integer). unitPrice = سعر الشراء للوحدة الواحدة.
- Include every product data row. Skip header/footer-only rows.
- If you are unsure about any field, return null and keep JSON structure intact.
- Never invent product names; copy from the document only.`;

  const startedAt = Date.now();
  const runOcrTask = async (): Promise<InvoiceParseResult> => {
    let lastError: any = null;
    for (let retry = 0; retry <= OCR_MAX_RETRIES; retry++) {
      const attemptNo = retry + 1;
      const attemptStarted = Date.now();
      try {
        await throttleGeminiRequest();
        const mediaPart = useGcsUri
          ? createPartFromUri(gcsUri as string, safeMime)
          : createPartFromBase64(b64, safeMime);
        const runGemini = (config: typeof OCR_GEN_CONFIG | typeof OCR_GEN_CONFIG_FALLBACK) =>
          withTimeout(
            genAI.models.generateContent({
              model: GEMINI_MODEL,
              config: config as any,
              contents: createUserContent([createPartFromText(prompt), mediaPart]),
            }),
            OCR_TIMEOUT_MS,
            'Gemini OCR request'
          );

        let result = await runGemini(OCR_GEN_CONFIG);
        const elapsedAttempt = Date.now() - attemptStarted;
        if (elapsedAttempt > OCR_SLOW_MS) {
          console.warn(`[invoiceParser] slow_ai_response_ms=${elapsedAttempt} model=${GEMINI_MODEL} hash=${imageHash.slice(0, 12)}`);
        }
        let text = extractModelText(result);
        let parsed = text ? extractJsonObject(text) : null;
        if (!parsed || typeof parsed !== 'object') {
          console.warn(`[invoiceParser] json_parse_retry fallback_plain hash=${imageHash.slice(0, 12)}`);
          result = await runGemini(OCR_GEN_CONFIG_FALLBACK);
          text = extractModelText(result);
          parsed = text ? extractJsonObject(text) : null;
        }
        if (!text) {
          return {
            items: [],
            warnings: ['Empty model response'],
            message: 'لم يُرجع النموذج نصاً. حاول صورة أوضح.',
            geminiInvoked: true,
          };
        }

        if (!parsed || typeof parsed !== 'object') {
          console.warn(
            `[invoiceParser] json_parse_failed len=${text.length} head=${text.slice(0, 180).replace(/\s+/g, ' ')}`
          );
          return {
            items: [],
            warnings: ['Could not parse JSON from model'],
            message: 'تعذر تحليل الرد. جرّب إعادة رفع الصورة.',
            geminiInvoked: true,
          };
        }

        const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
        const items: InvoiceLineItem[] = [];
        for (const row of rawItems) {
          if (!row || typeof row !== 'object') continue;
          const o = row as Record<string, unknown>;
          const itemName = String(o.itemName ?? o.name ?? o.productName ?? '').trim();
          const qty = Math.max(0, Math.floor(toNum(o.quantity ?? o.qty ?? o.Qty)));
          const unitPrice = toNum(
            o.unitPrice ?? o.unit_price ?? o.purchasePrice ?? o.purchase_unit_price ?? o.buyPrice ?? o.cost
          );
          if (!itemName || qty <= 0) continue;
          const skuRaw =
            o.sku != null
              ? String(o.sku).replace(/\s/g, '').trim()
              : o.itemSku != null
                ? String(o.itemSku).replace(/\s/g, '').trim()
                : o.productSku != null
                  ? String(o.productSku).replace(/\s/g, '').trim()
                  : '';
          const barcodeFromOcr = o.barcode != null ? String(o.barcode).replace(/\s/g, '').trim() : '';
          const barcodeRaw = barcodeFromOcr || skuRaw;
          const expRaw =
            o.expiryDate ??
            o.expiry_date ??
            o.bestBefore ??
            o.best_before ??
            o.validUntil ??
            o.valid_until ??
            o['expiry'];
          const expiryDate = normalizeExpiryDateToIso(expRaw);
          let taxAmount: number | null = null;
          const lta =
            o.lineTaxAmount ??
            o.taxAmount ??
            o.line_tax_amount ??
            o.vatAmount ??
            o.vat_amount ??
            o.line_tax ??
            o.tax_line ??
            o['lineTax'];
          if (lta != null && String(lta).trim() !== '') {
            const t = toNum(lta);
            if (t > 0) taxAmount = Number(t.toFixed(4));
          }
          let taxPercent: number | null = null;
          const ltp = o.lineTaxPercent ?? o.taxPercent ?? o.vatPercent ?? o.vat_percent ?? o.tax_percent;
          if (ltp != null && String(ltp).trim() !== '') {
            const p = clampTaxPercent(toNum(ltp));
            if (p != null) taxPercent = p;
          }

          const sellRaw = o.sellPrice ?? o.sell_price ?? o.retailPrice ?? o.retail_price ?? o.unitSellPrice ?? o.listPrice ?? o.consumerPrice;
          const pair = normalizeBuySellForPoLine(unitPrice, toNum(sellRaw));
          const buyFinal = pair.buy > 0 ? Number(pair.buy.toFixed(4)) : undefined;
          const sellFinal = pair.sell > 0 ? Number(pair.sell.toFixed(4)) : undefined;

          items.push({
            itemName,
            qty,
            buyPrice: buyFinal,
            sellPrice: sellFinal,
            barcode: barcodeRaw || undefined,
            expiryDate: expiryDate || null,
            taxAmount,
            taxPercent,
          });
        }

        const pAny = parsed as Record<string, unknown>;
        const curRaw =
          (parsed as Record<string, unknown>).currencyCode ??
          (parsed as Record<string, unknown>).documentCurrency ??
          (parsed as Record<string, unknown>).currency;
        const curStr = curRaw != null ? String(curRaw).trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) : '';
        const validCur = /^[A-Z]{3}$/.test(curStr) ? curStr : null;
        const symRaw = (parsed as Record<string, unknown>).currencySymbol;
        const meta: ParsedInvoiceMeta = {
          documentType: parsed.documentType != null ? String(parsed.documentType) : undefined,
          supplierName: parsed.supplierName != null ? String(parsed.supplierName) : null,
          supplierPhone: parsed.supplierPhone != null ? String(parsed.supplierPhone) : null,
          supplierAddress: parsed.supplierAddress != null ? String(parsed.supplierAddress) : null,
          invoiceNumber: parsed.invoiceNumber != null ? String(parsed.invoiceNumber) : null,
          invoiceDate: parsed.invoiceDate != null ? String(parsed.invoiceDate) : null,
          branchName: parsed.branchName != null ? String(parsed.branchName) : null,
          notes: parsed.notes != null ? String(parsed.notes) : null,
          currencyCode: validCur,
          currencySymbol: symRaw != null ? String(symRaw).trim().slice(0, 12) || null : null,
          invoiceSubtotalBeforeTax:
            parsed.invoiceSubtotalBeforeTax != null
              ? toNum(parsed.invoiceSubtotalBeforeTax)
              : pAny.subtotalBeforeTax != null
                ? toNum(pAny.subtotalBeforeTax)
                : pAny.technicalTotal != null
                  ? toNum(pAny.technicalTotal)
                  : null,
          invoiceTotalTax:
            parsed.invoiceTotalTax != null
              ? toNum(parsed.invoiceTotalTax)
              : pAny.totalTax != null
                ? toNum(pAny.totalTax)
                : pAny.totalVat != null
                  ? toNum(pAny.totalVat)
                  : null,
        };

        enrichTaxPercentFromLineAmounts(items);
        enrichTaxAmountFromPercentWhenMissing(items);
        distributeInvoiceLevelTax(items, meta);
        enrichTaxPercentFromLineAmounts(items);

        const warnings: string[] = [];
        if (optimized.optimized) warnings.push('image_optimized_before_ai');
        if (useGcsUri) warnings.push('gemini_input:gcs_uri');
        if (items.length === 0) {
          warnings.push('لم يُستخرج أي صنف من الجدول. راجع الصورة أو أدخل البيانات يدوياً.');
        }

        const out: InvoiceParseResult = {
          items,
          meta,
          structured: deriveStructuredInvoice(parsed as Record<string, unknown>, items, meta),
          warnings: warnings.length ? warnings : undefined,
          message: undefined,
          geminiInvoked: true,
        };
        writeToCache(imageHash, out);
        return out;
      } catch (e: any) {
        lastError = e;
        const transient = isTransientAiError(e);
        const retryLeft = OCR_MAX_RETRIES - retry;
        const elapsedAttempt = Date.now() - attemptStarted;
        const msg = String(e?.message || e);
        if (msg.toLowerCase().includes('resource_exhausted') || msg.includes('"code":429') || Number(e?.status) === 429) {
          console.warn(`[invoiceParser] quota_error attempt=${attemptNo} elapsed_ms=${elapsedAttempt} error=${msg}`);
        }
        if (!transient || retryLeft <= 0) break;
        const backoff = computeBackoffMs(retry);
        console.warn(
          `[invoiceParser] transient_retry attempt=${attemptNo} next_in_ms=${backoff} remaining=${retryLeft} error=${msg}`
        );
        await waitMs(backoff);
      }
    }

    console.error('[invoiceParser] OCR failed after retries:', String(lastError?.message || lastError || 'unknown'));
    return {
      items: [],
      warnings: [String(lastError?.message || 'Vision request failed')],
      message: 'فشل تحليل الصورة بعد عدة محاولات. يمكنك إدخال البيانات يدوياً.',
      geminiInvoked: true,
    };
  };

  const out = await enqueueOcr(runOcrTask);
  const elapsed = Date.now() - startedAt;
  console.log(`[invoiceParser] request_duration_ms=${elapsed} queue_active=${activeOcrJobs} queue_waiting=${ocrQueue.length}`);
  if (elapsed > OCR_SLOW_MS) {
    console.warn(`[invoiceParser] slow_total_ocr_ms=${elapsed} hash=${imageHash.slice(0, 12)}`);
  }
  return out;
}
