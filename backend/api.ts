import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Readable } from 'stream';
import { pool, testConnection, initializeDatabase, ensureTaxRatesTable, ensureSuppliersTable, ensurePurchaseTables, ensureStockTransferTables, ensureBranchInventoryTable, ensureBranchInventoryColumns, normalizeBranchInventorySchema, ensureShopHasDefaultBranch, migrateStockToBranchInventory, migrateAllShopsStockToBranchInventory, populateBranchInventoryFromProducts, ensureInventoryMovementsTable, ensureStockMovementsTable, ensureAccountingTables, ensureJournalColumns, repairBranchInventoryFromProducts, ensurePrintLogsTable, enforceSingleBranchForNonMultiPlan, forceCreateBranchForEveryShop, forceEnsureBranchInventoryForProduct } from './db';
import { resolveNotificationText, isCorruptedText, getFallbackText, buildNotificationText, parseNotificationPayload } from './notifications';
import { requireShopCapability } from './rbacMiddleware';
import { mountCrmRoutes } from './crmRoutes';
import { ensureActivityLogTable, logShopActivity } from './activityLog';
import { looksMojibake } from './encodingGuard';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dns from 'node:dns/promises';
import nodemailer from 'nodemailer';
import Busboy from 'busboy';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import csvParser from 'csv-parser';
import { GoogleGenAI } from '@google/genai';
import {
  DEFAULT_GEMINI_MODEL,
  throttleGeminiRequest,
  buildGoogleGenAIOptions,
  useVertexAiGemini,
  resolveVertexLocation,
  resolveVertexProjectId,
} from './geminiConfig';
import { domainToASCII } from 'url';
import { Storage } from '@google-cloud/storage';
import {
  applyProductDiscount,
  computeProductUnitPrice,
  generateCouponCode,
  calculateCouponDiscount,
} from './discounts';
import { SYSTEM_KNOWLEDGE } from './systemKnowledge';
import { createAdminRouter } from './routes/admin';
import { createBranchInventoryRoutes } from './routes/admin/branchInventory';
import { mountHrRoutes } from './hr/mountHrRoutes';
import { runBackup, isBackupEnabled, generateShopBackupForDownload, runAutoBackup, createPreRestoreBackup, restoreBackup, restoreFromExcel } from './backupService';
import { createMemoryCache, buildCacheKey } from './cache';
import cron from 'node-cron';
import multer from 'multer';
import fs from 'fs';
import * as usageLimits from './services/usageLimitsService';
import { normalizeExpiryDateToIso, normalizeBuySellForPoLine } from './services/invoiceParser';
import {
  fetchCrossRate,
  multiplyInvoiceImportItems,
  normalizeFxCurrencyCode,
  scaleInvoiceMetaMoney,
} from './services/fxRates';
import { getFallbackAssistantAnswer } from './services/assistantFallbackKnowledge';
import { CROWN_TOOL_DECLARATIONS, executeTool, isWriteTool, type ToolContext } from './aiTools';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const localEnvPath = path.resolve(__dirname, '.env');
const rootEnvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: localEnvPath });
dotenv.config({ path: rootEnvPath });

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const cacheEnabled = String(process.env.CACHE_DISABLED || '').toLowerCase() !== 'true';
const dashboardCache = createMemoryCache({
  name: 'dashboard',
  defaultTtlMs: Number(process.env.CACHE_DASHBOARD_MS || 30000),
  maxEntries: Number(process.env.CACHE_DASHBOARD_MAX || 500),
});
const reportsCache = createMemoryCache({
  name: 'reports',
  defaultTtlMs: Number(process.env.CACHE_REPORTS_MS || 60000),
  maxEntries: Number(process.env.CACHE_REPORTS_MAX || 500),
});
const frequentCache = createMemoryCache({
  name: 'frequent',
  defaultTtlMs: Number(process.env.CACHE_FREQUENT_MS || 20000),
  maxEntries: Number(process.env.CACHE_FREQUENT_MAX || 500),
});

// Schema reflection (information_schema) is used widely to support mixed DB installs.
// Avoid caching "false" before startup migrations finish, otherwise early requests can poison caches.
let schemaReady = false;

const getCacheKey = (prefix: string, req: Request, shopId?: number | null, userId?: number | null) =>
  buildCacheKey([prefix, shopId ?? '', userId ?? '', req.originalUrl]);
const getCachedPayload = <T>(cache: ReturnType<typeof createMemoryCache>, key: string): T | null =>
  cacheEnabled ? cache.get<T>(key) : null;
const setCachedPayload = <T>(cache: ReturnType<typeof createMemoryCache>, key: string, payload: T) => {
  if (cacheEnabled) cache.set(key, payload);
};

let notificationsPayloadColumn: boolean | null = null;
const hasNotificationsPayloadColumn = async () => {
  if (notificationsPayloadColumn !== null) return notificationsPayloadColumn;
  try {
    const [rows] = await pool.execute("SHOW COLUMNS FROM notifications LIKE 'payload'");
    notificationsPayloadColumn = (rows as any[]).length > 0;
  } catch {
    notificationsPayloadColumn = false;
  }
  return notificationsPayloadColumn;
};

// CORS: allow only specific origins (required when using credentials: true — no wildcard).
// Defaults: crowncs.org, www, localhost:3000. Add crown-web Cloud Run URL via CORS_ORIGIN or CORS_FRONTEND_URL.
const defaultOrigins = [
  'https://crowncs.org',
  'https://www.crowncs.org',
  'http://localhost:3000',
];
const fromEnv = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o: string) => o.trim())
  .filter(Boolean);
const frontendUrl = (process.env.CORS_FRONTEND_URL || process.env.FRONTEND_URL || '').trim();
const allowedOrigins = [...new Set([...defaultOrigins, ...fromEnv, frontendUrl].filter(Boolean))];

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // Reflect Access-Control-Request-Headers to allow all custom X-* headers.
  optionsSuccessStatus: 204,
};

app.use((req: Request, res: Response, next: NextFunction) => {
  const requested = req.header('access-control-request-headers');
  if (requested) {
    res.header('Access-Control-Allow-Headers', requested);
  }
  next();
});

app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));

const slowRequestMs = Number(process.env.SLOW_REQUEST_MS || 1000);
const logAllRequests = String(process.env.REQUEST_LOG_ALL || '').toLowerCase() === 'true';
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  res.once('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    if (logAllRequests || durationMs >= slowRequestMs) {
      console.log('[perf]', req.method, req.originalUrl, res.statusCode, `${durationMs.toFixed(1)}ms`);
    }
  });
  next();
});

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 300);
const rateLimitDisabled = String(process.env.RATE_LIMIT_DISABLED || '').toLowerCase() === 'true';
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
let lastRateLimitPrune = 0;

const getRateLimitKey = (req: Request) => {
  const header = req.headers['x-forwarded-for'];
  const raw = Array.isArray(header) ? header[0] : header;
  const ip = String(raw || req.ip || '').split(',')[0].trim();
  return ip || 'unknown';
};

app.use((req: Request, res: Response, next: NextFunction) => {
  if (rateLimitDisabled || req.method === 'OPTIONS' || req.path === '/api/health') return next();
  const now = Date.now();
  if (now - lastRateLimitPrune > rateLimitWindowMs) {
    lastRateLimitPrune = now;
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) rateLimitStore.delete(key);
    }
  }
  const key = getRateLimitKey(req);
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    res.setHeader('X-RateLimit-Limit', rateLimitMax);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitMax - 1));
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + rateLimitWindowMs) / 1000));
    return next();
  }
  entry.count += 1;
  res.setHeader('X-RateLimit-Limit', rateLimitMax);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitMax - entry.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));
  if (entry.count > rateLimitMax) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// TEMPORARY: remove after setup
app.get('/api/setup-admin', async (_req: Request, res: Response) => {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existingUsers] = await connection.execute('SELECT id FROM users WHERE username = ?', ['admin@crown.com']);
      if ((existingUsers as any[]).length > 0) {
        await connection.rollback();
        return res.json({ message: 'Admin already exists' });
      }

      const [shopResult] = await connection.execute(
        'INSERT INTO shops (name, business_name, owner_name, activity_type, address, contact_email, contact_phone, owner_id, package) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['Crown Headquarters', 'Crown Headquarters', 'Crown Admin', 'Headquarters', null, 'admin@crown.com', null, 0, 'gold']
      );
      const shopInsert = shopResult as any;

      const hashedPassword = await bcrypt.hash('password123', 10);
      const [userResult] = await connection.execute(
        'INSERT INTO users (username, password, role, package, shop_id) VALUES (?, ?, ?, ?, ?)',
        ['admin@crown.com', hashedPassword, 'super_admin', 'gold', shopInsert.insertId]
      );
      const userInsert = userResult as any;

      await connection.execute('UPDATE shops SET owner_id = ? WHERE id = ?', [userInsert.insertId, shopInsert.insertId]);
      await connection.commit();

      return res.json({ message: 'Super admin created', shopId: shopInsert.insertId, userId: userInsert.insertId });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

function readSecretFile(pathLike?: string): string {
  const p = String(pathLike || '').trim();
  if (!p) return '';
  try {
    if (!fs.existsSync(p)) return '';
    return String(fs.readFileSync(p, 'utf8') || '').trim();
  } catch {
    return '';
  }
}

function resolveGeminiApiKey(): string {
  const direct =
    String(process.env.GEMINI_API_KEY || '').trim() ||
    String(process.env.GOOGLE_API_KEY || '').trim() ||
    String(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim() ||
    String(process.env.VERTEX_GEMINI_API_KEY || '').trim() ||
    String(process.env.API_KEY || '').trim();
  if (direct) return direct;
  return (
    readSecretFile(process.env.GEMINI_API_KEY_FILE) ||
    readSecretFile(process.env.GOOGLE_API_KEY_FILE) ||
    readSecretFile(process.env.GOOGLE_GENERATIVE_AI_API_KEY_FILE)
  );
}

const JWT_SECRET = process.env.JWT_SECRET || 'crown-services-secret-key-2026';
const port = Number(process.env.PORT || 8080);

const bootGeminiKey = resolveGeminiApiKey();
console.log(
  'AI API KEY:',
  bootGeminiKey
    ? 'LOADED (GEMINI_API_KEY|GOOGLE_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY|VERTEX_GEMINI_API_KEY|API_KEY)'
    : 'MISSING — /api/chat will return 400 until set on Cloud Run'
);
let geminiClient: GoogleGenAI | null = null;
let geminiClientKey = '';
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) return null;
  if (geminiClient && geminiClientKey === apiKey) return geminiClient;
  try {
    geminiClient = new GoogleGenAI(buildGoogleGenAIOptions(apiKey));
    geminiClientKey = apiKey;
    return geminiClient;
  } catch (error) {
    geminiClient = null;
    geminiClientKey = '';
    console.error('❌ Gemini SDK init error:', error);
    return null;
  }
}

/**
 * Default **`gemini-2.5-flash`** on Vertex AI (`us-central1` by default).
 * Override with **`GEMINI_MODEL`**. Full product context lives in **`systemKnowledge.ts`** (SYSTEM KNOWLEDGE).
 */
const GEMINI_MODEL = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

if (bootGeminiKey) {
  const mode = useVertexAiGemini()
    ? `Vertex AI @ ${resolveVertexLocation()} (project ${resolveVertexProjectId()})`
    : 'Gemini Developer API (generativelanguage)';
  console.log(`[Gemini] model=${GEMINI_MODEL} transport=${mode}`);
}

const CHAT_RETRY_BACKOFF_MS = [1000, 2000, 4000, 8000] as const;
const GEMINI_GEN_CONFIG = { temperature: 0.2, topP: 0.9, maxOutputTokens: 512 } as const;
const CHAT_QUEUE_CONCURRENCY = Math.min(
  Math.max(Number(String(process.env.AI_CHAT_QUEUE_CONCURRENCY || '3').trim()) || 3, 2),
  5
);
const CHAT_CACHE_TTL_MS = Math.min(
  Math.max(Number(String(process.env.AI_CHAT_CACHE_TTL_MS || '600000').trim()) || 600000, 300000),
  900000
);

type ChatCacheEntry = { at: number; value: { text: string; lang: 'ar' | 'en'; ttsLang: string } };
const aiChatCache = new Map<string, ChatCacheEntry>();
const aiChatQueue: Array<{ run: () => Promise<void> }> = [];
let aiChatActive = 0;

function pruneChatCache() {
  const now = Date.now();
  for (const [k, v] of aiChatCache.entries()) {
    if (now - v.at > CHAT_CACHE_TTL_MS) aiChatCache.delete(k);
  }
}

function chatCacheKey(shopId: number, userId: number | null, lang: 'ar' | 'en', message: string): string {
  const normalized = String(message || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return `${shopId}:${userId ?? 0}:${lang}:${normalized}`;
}

function pumpAiChatQueue() {
  while (aiChatActive < CHAT_QUEUE_CONCURRENCY && aiChatQueue.length > 0) {
    const task = aiChatQueue.shift()!;
    aiChatActive += 1;
    task.run().finally(() => {
      aiChatActive -= 1;
      pumpAiChatQueue();
    });
  }
}

function enqueueAiChat<T>(work: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    aiChatQueue.push({
      run: async () => {
        try {
          resolve(await work());
        } catch (e) {
          reject(e);
        }
      },
    });
    pumpAiChatQueue();
  });
}

function isTransientGeminiError(e: any): boolean {
  const st = Number(e?.status || e?.code || 0);
  const msg = String(e?.message || '').toLowerCase();
  if ([408, 429, 500, 502, 503, 504].includes(st)) return true;
  return (
    msg.includes('resource_exhausted') ||
    msg.includes('"code":429') ||
    msg.includes('timeout') ||
    msg.includes('deadline exceeded') ||
    msg.includes('temporarily unavailable')
  );
}

function dedupeAssistantReply(raw: string): string {
  const text = String(raw || '').replace(/\r/g, '').trim();
  if (!text) return '';
  const lines = text.split('\n').map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return text;
  const out: string[] = [];
  let prevNorm = '';
  for (const line of lines) {
    const norm = line.toLowerCase().replace(/\s+/g, ' ').trim();
    if (norm && norm === prevNorm) continue;
    out.push(line);
    prevNorm = norm;
  }
  return out.join('\n').trim();
}

function looksNumericOnlyReply(text: string): boolean {
  const t = String(text || '').trim();
  if (!t) return false;
  return /^[\d\s.,:%+\-/()]+$/.test(t);
}

function hasArabicLetters(text: string): boolean {
  return /[\u0600-\u06FF]/.test(String(text || ''));
}

function buildSlowMovingActionAnswerAr(): string {
  return [
    'علشان تتعامل مع الراكد/البطيء بشكل عملي:',
    '1) ادخل على شاشة التقارير -> الراكد/البطيء.',
    '2) راجع لكل صنف: آخر تاريخ بيع + عدد الأيام بدون حركة + الكمية الحالية.',
    '3) الأصناف اللي بقالها مدة طويلة بدون بيع: اعمل خصم أو عرض تجميعي (Bundle).',
    '4) قلل شراء الأصناف البطيئة مؤقتاً، وركز على الأصناف الأعلى حركة.',
    '5) استخدم التقرير أسبوعياً لمتابعة التحسن وتقليل البضاعة الراكدة.',
    'فايدة الشاشة: بتكشف البضاعة اللي مجمدة رأس المال علشان تزود السيولة وتقلل التكدس.'
  ].join('\n');
}

function enforceAssistantReplyQuality(userMessage: string, lang: 'ar' | 'en', rawReply: string): string {
  const reply = dedupeAssistantReply(rawReply);
  if (!reply) return reply;
  if (lang !== 'ar') return reply;

  const q = String(userMessage || '').toLowerCase();
  const asksSlowMoving =
    q.includes('راكد') || q.includes('بطيء') || q.includes('slow') || q.includes('dead stock') || q.includes('slow-moving');
  if (asksSlowMoving) {
    const hasOperationalHints =
      /التقارير|الراكد|البطيء|آخر تاريخ بيع|أيام بدون حركة|خصم|عرض|bundle|السيولة|المخزون/i.test(reply);
    if (!hasOperationalHints || reply.length < 90) {
      return buildSlowMovingActionAnswerAr();
    }
  }

  const tooShort = reply.replace(/\s+/g, ' ').trim().length < 12;
  if (looksNumericOnlyReply(reply) || tooShort || !hasArabicLetters(reply)) {
    return getFallbackAssistantAnswer(userMessage, 'ar').answer;
  }
  return reply;
}

/**
 * Retries on 429/transient with exponential backoff **1s → 2s → 4s → 8s**.
 * Max retries = 4 (5 attempts total including initial).
 */
async function geminiGenerateContent(params: { model: string; contents: unknown; config?: unknown }) {
  const client = getGeminiClient();
  if (!client) throw new Error('Gemini client not initialized');
  const maxRetries = Math.min(Math.max(Number(String(process.env.GEMINI_RETRY_MAX || '4').trim()) || 4, 0), 4);
  const maxAttempts = maxRetries + 1;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await throttleGeminiRequest();
      return await client.models.generateContent(params as any);
    } catch (e: any) {
      lastErr = e;
      if (!isTransientGeminiError(e) || attempt === maxAttempts - 1) throw e;
      const waitMs = CHAT_RETRY_BACKOFF_MS[Math.min(attempt, CHAT_RETRY_BACKOFF_MS.length - 1)];
      console.warn(`⚠️ Gemini transient error, retry in ${waitMs}ms (${attempt + 2}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}

async function geminiGenerateContentStream(
  params: { model: string; contents: unknown; config?: unknown },
  onDelta: (deltaText: string, fullText: string) => void
): Promise<string> {
  const client = getGeminiClient();
  if (!client) throw new Error('Gemini client not initialized');
  const maxRetries = Math.min(Math.max(Number(String(process.env.GEMINI_RETRY_MAX || '4').trim()) || 4, 0), 4);
  const maxAttempts = maxRetries + 1;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      await throttleGeminiRequest();
      const stream = await client.models.generateContentStream(params as any);
      let full = '';
      for await (const chunk of stream as any) {
        const delta = String((chunk as any)?.text || '');
        if (!delta) continue;
        full += delta;
        onDelta(delta, full);
      }
      const text = full.trim();
      if (!text) throw new Error('AI provider response empty');
      return text;
    } catch (e: any) {
      lastErr = e;
      if (!isTransientGeminiError(e) || attempt === maxAttempts - 1) throw e;
      const waitMs = CHAT_RETRY_BACKOFF_MS[Math.min(attempt, CHAT_RETRY_BACKOFF_MS.length - 1)];
      console.warn(`⚠️ Gemini stream transient error, retry in ${waitMs}ms (${attempt + 2}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
  throw lastErr;
}
const DEFAULT_ADMIN_HASH = '$2a$10$CB6YvQC5O/sk9D2ZpgZYBuNGPMOn/2vAGylpa5edvWivtld0h1wQW';

const ensureSuperAdmin = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [userRows] = await connection.execute('SELECT * FROM users WHERE username = ?', ['admin@crown.com']);
    let adminUser = (userRows as any[])[0];

    if (!adminUser) {
      const [userResult] = await connection.execute(
        'INSERT INTO users (username, password, role, package, shop_id) VALUES (?, ?, ?, ?, ?)',
        ['admin@crown.com', DEFAULT_ADMIN_HASH, 'super_admin', 'gold', null]
      );
      const userInsert = userResult as any;
      adminUser = { id: userInsert.insertId };
    }

    const [shopRows] = await connection.execute('SELECT * FROM shops WHERE id = 1');
    if ((shopRows as any[]).length === 0) {
      await connection.execute(
        `INSERT INTO shops (id, name, business_name, owner_name, activity_type, address, contact_email, contact_phone, owner_id, package)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [1, 'Crown Headquarters', 'Crown Headquarters', 'Crown Admin', 'Headquarters', null, 'admin@crown.com', null, adminUser.id, 'gold']
      );
    }

    await connection.execute('UPDATE users SET shop_id = ? WHERE username = ?', [1, 'admin@crown.com']);
    await connection.commit();
    console.log('✅ SUPER ADMIN READY');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Failed to ensure super admin:', (error as any).message);
  } finally {
    connection.release();
  }
};

/** Sync: ensure each product has at least one branch_inventory row (for stock transfer/listing). Do NOT overwrite quantity on existing rows. */
async function syncBranchOneFromProducts(): Promise<void> {
  try {
    if (!(await hasTable('branch_inventory')) || !(await hasTable('products'))) return;
    const [shops] = await pool.execute('SELECT id FROM shops').catch(() => [[]]);
    for (const s of (shops as any[])) {
      const shopId = Number(s.id);
      const [branchRow] = await pool.execute('SELECT id FROM branches WHERE shop_id = ? ORDER BY id ASC LIMIT 1').catch(() => [[]]);
      const branchId = (branchRow as any[])[0]?.id ?? 1;
      await pool.execute(
        `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity)
         SELECT shop_id, ?, id, COALESCE(stock_quantity, 0) FROM products WHERE shop_id = ?
         ON DUPLICATE KEY UPDATE quantity = quantity`,
        [branchId, shopId]
      ).catch(() => {});
    }
  } catch (e: any) {
    console.warn('[API] syncBranchOneFromProducts:', e?.message || e);
  }
}

async function verifyAndSeedBranchTables(): Promise<void> {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS branches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shop_id INT NOT NULL,
      name VARCHAR(255),
      name_ar VARCHAR(255),
      code VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS branch_inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      shop_id INT NOT NULL,
      branch_id INT NOT NULL,
      product_id INT NOT NULL,
      quantity DECIMAL(10,2) DEFAULT 0,
      UNIQUE KEY unique_branch_product (shop_id, branch_id, product_id)
    )
  `);
  console.log('✅ Tables verified');

  await pool.execute(`
    INSERT INTO branches (shop_id, name, name_ar, code)
    SELECT s.id, s.name, s.name, CONCAT('MAIN_', s.id)
    FROM shops s
    WHERE s.id NOT IN (SELECT b.shop_id FROM branches b)
  `);

  await pool.execute(`
    INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity)
    SELECT p.shop_id, b.id, p.id, IFNULL(p.stock_quantity, 0)
    FROM products p
    JOIN branches b ON b.shop_id = p.shop_id
    LEFT JOIN branch_inventory bi
      ON bi.product_id = p.id AND bi.branch_id = b.id AND bi.shop_id = p.shop_id
    WHERE bi.id IS NULL
  `);
  console.log('✅ Data inserted');
}

// Initialize database on startup (migrations wrapped so API starts even if one fails)
testConnection().then(async () => {
  try {
    await initializeDatabase();
    try {
      await pool.execute('ALTER TABLE shops MODIFY COLUMN logo_url LONGTEXT');
    } catch (migrationError) {
      console.error('❌ logo_url migration error:', (migrationError as any)?.message || migrationError);
    }
    await ensureSuppliersTable();
    await ensurePurchaseTables();
    await ensureStockTransferTables();
    try {
      await ensureBranchInventoryTable();
    } catch (err: any) {
      console.error('branch_inventory table migration failed:', err?.message || err);
    }
    try {
      await ensureBranchInventoryColumns();
    } catch (err: any) {
      console.error('branch_inventory migration failed:', err?.message || err);
    }
    try {
      await normalizeBranchInventorySchema();
    } catch (err: any) {
      console.error('normalizeBranchInventorySchema failed:', err?.message || err);
    }
    try {
      await populateBranchInventoryFromProducts();
    } catch (err: any) {
      console.error('populateBranchInventoryFromProducts failed:', err?.message || err);
    }
    try {
      await ensureInventoryMovementsTable();
    } catch (err: any) {
      console.error('ensureInventoryMovementsTable failed:', err?.message || err);
    }
    try {
      await ensureStockMovementsTable();
    } catch (err: any) {
      console.error('ensureStockMovementsTable failed:', err?.message || err);
    }
    try {
      await ensureAccountingTables();
      await ensureJournalColumns();
    } catch (err: any) {
      console.error('ensureAccountingTables/ensureJournalColumns failed:', err?.message || err);
    }
    try {
      await repairBranchInventoryFromProducts();
    } catch (err: any) {
      console.error('repairBranchInventoryFromProducts failed:', err?.message || err);
    }
    await ensureSuperAdmin();
    try {
      await ensureActivityLogTable(pool);
    } catch (e: any) {
      console.warn('[API] ensureActivityLogTable:', e?.message || e);
    }
    try {
      await verifyAndSeedBranchTables();
    } catch (err: any) {
      console.error('[API] verifyAndSeedBranchTables failed:', err?.message || err);
    }
    console.log('[API] Purchases tables verified');
  } catch (error: any) {
    console.error('[API] startup error:', error?.message || error);
  } finally {
    schemaReady = true;
    resetSchemaCaches();
  }
}).catch((err: any) => {
  console.error('[API] testConnection/startup failed:', err?.message || err);
});

// Middleware for authentication
const authenticateToken = async (req: any, res: Response, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const hasDeletedAt = await hasColumn('users', 'deleted_at');
    const deletedFilter = hasDeletedAt ? ' AND (deleted_at IS NULL)' : '';
    const [users] = await pool.execute(`SELECT * FROM users WHERE id = ?${deletedFilter}`, [decoded.userId]);
    const userArray = users as any[];

    if (userArray.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userArray[0];
    const tokenNonce = decoded?.sessionNonce != null ? String(decoded.sessionNonce) : '';
    const rowNonce = user?.session_nonce != null ? String(user.session_nonce) : '';
    // Enforce single session only after a nonce exists in DB (new logins); legacy tokens without nonce still work until next login.
    if (rowNonce) {
      if (!tokenNonce || tokenNonce !== rowNonce) {
        return res.status(401).json({
          error: 'SESSION_REPLACED',
          message: 'You were logged out because your account was opened on another device.',
          message_ar: 'تم تسجيل خروجك لأن الحساب تم فتحه على جهاز آخر.',
        });
      }
    }
    const disabled = await isUserDisabled(user.id);
    if (disabled && !decoded.impersonatedBy) {
      return res.status(403).json({ error: 'ACCOUNT_DISABLED' });
    }
    if (!user.shop_id && decoded.shopId) {
      user.shop_id = decoded.shopId;
    }

    if (user.shop_id) {
      const synced = await syncShopSubscription(user.shop_id);
      if (synced?.plan) {
        user.package = synced.plan;
      } else {
        const [shops] = await pool.execute('SELECT package FROM shops WHERE id = ?', [user.shop_id]);
        const shopArray = shops as any[];
        if (shopArray.length > 0) {
          user.package = shopArray[0].package;
        }
      }
    }

    req.user = user;
    // Ensure both snake and camel for consumers (JWT has shopId; DB has shop_id)
    if (req.user.shop_id != null) (req.user as any).shopId = req.user.shop_id;
    if (req.user.shopId != null && req.user.shop_id == null) req.user.shop_id = req.user.shopId;

    // Subscription enforcement: super_admin bypasses; whitelisted paths skip
    const path = (req.path || req.originalUrl || '').split('?')[0];
    const SUBSCRIPTION_WHITELIST = [
      '/api/auth',
      '/api/subscription',
      '/api/shops/profile',
      '/api/licenses/activate',
      '/api/activate',
      '/api/notifications',
      '/api/admin/branches', // ALL plans can fetch/create their branch(es); limit enforced in POST
    ];
    const isWhitelisted = SUBSCRIPTION_WHITELIST.some((p) => path === p || path.startsWith(p + '/'));
    if (req.user.role === 'super_admin' || isWhitelisted) {
      return next();
    }
    const shopId = req.user.shop_id ?? req.user.shopId;
    if (!shopId) return next();
    const computed = await computeSubscription(shopId);
    if (computed.blocked) {
      return res.status(403).json({
        ok: false,
        code: 'SUBSCRIPTION_REQUIRED',
        status: computed.status,
        redirect: computed.status === 'expired' ? '/settings?reason=expired' : '/settings',
      });
    }
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const resolveShopId = (req: any) => {
  const headerShop = req.headers['x-shop-id'];
  const headerShopId = Array.isArray(headerShop) ? headerShop[0] : headerShop;
  const headerParsed = headerShopId ? Number(headerShopId) : null;
  if (req.user?.role === 'super_admin') {
    return req.query.shopId || req.body?.shopId || headerParsed || req.user?.shop_id || req.user?.shopId || null;
  }
  return req.user?.shop_id || req.user?.shopId || headerParsed || null;
};

/** Resolve shopId from query/body/header or JWT. If query shopId is provided and user is not super_admin, it must match token's shopId. */
function getShopId(req: any): { shopId: number | null; forbidden?: boolean } {
  const fromQuery = req.query?.shopId != null && req.query.shopId !== '' ? Number(req.query.shopId) : 0;
  const fromBody = req.body?.shopId != null ? Number(req.body.shopId) : 0;
  const headerShop = req.headers['x-shop-id'];
  const fromHeader = headerShop ? Number(Array.isArray(headerShop) ? headerShop[0] : headerShop) : 0;
  const fromRequest = (Number.isFinite(fromQuery) && fromQuery > 0 ? fromQuery : 0) || (Number.isFinite(fromBody) && fromBody > 0 ? fromBody : 0) || (Number.isFinite(fromHeader) && fromHeader > 0 ? fromHeader : 0) || 0;
  const tokenShop = Number(req.user?.shop_id) || Number(req.user?.shopId) || 0;
  if (fromRequest > 0) {
    if (req.user?.role !== 'super_admin' && tokenShop > 0 && fromRequest !== tokenShop) {
      return { shopId: null, forbidden: true };
    }
    return { shopId: fromRequest };
  }
  return { shopId: tokenShop > 0 ? tokenShop : null };
}

/** Resolve shopId and send 403/400 if forbidden or missing. Returns resolved shopId or null if response was sent. */
function getShopIdOrFail(req: any, res: Response): number | null {
  const r = getShopId(req);
  if (r.forbidden) {
    res.status(403).json({ error: 'shopId must match your shop' });
    return null;
  }
  if (r.shopId == null) {
    res.status(400).json({ error: 'shopId is required' });
    return null;
  }
  return r.shopId;
}

mountCrmRoutes(app, { pool, authenticateToken, getShopIdOrFail });

async function branchBelongsToShop(shopId: number, branchId: number): Promise<boolean> {
  const [rows] = await pool.execute('SELECT 1 FROM branches WHERE id = ? AND shop_id = ? LIMIT 1', [branchId, shopId]);
  return Array.isArray(rows) && (rows as any[]).length > 0;
}

/** True if shop has at least one branch in DB. */
async function shopHasBranches(shopId: number): Promise<boolean> {
  try {
    const [rows] = await pool.execute('SELECT COUNT(*) AS c FROM branches WHERE shop_id = ?', [shopId]);
    return Number((rows as any[])[0]?.c ?? 0) > 0;
  } catch {
    return false;
  }
}

/** True only when shop package is "branches" (Bronze/Silver/Gold = false). Used so non-branch packages keep old inventory behavior. */
async function shopUsesBranchPackage(shopId: number): Promise<boolean> {
  try {
    const [rows] = await pool.execute('SELECT package FROM shops WHERE id = ?', [shopId]);
    const pkg = (rows as any[])[0]?.package;
    return (pkg && String(pkg).trim().toLowerCase() === 'branches') === true;
  } catch {
    return false;
  }
}

/** Branch_inventory is now source-of-truth for ALL shops.
 * We consider branch_inventory "usable" when the shop has at least one branch row. */
async function shopUsesBranchInventory(shopId: number): Promise<boolean> {
  return shopHasBranches(shopId);
}

/** Branch id when shop uses branch inventory; null for Bronze/Silver/Gold (global inventory on products). */
async function resolveOptionalBranchId(req: any, shopId: number): Promise<number | null> {
  if (!(await shopUsesBranchInventory(shopId))) return null;
  return resolveRequiredBranchId(req, shopId);
}

/**
 * Branch for writes: X-Branch-Id header → body branch_id → shop default_branch_id → user assignment → first branch.
 * Throws Error with code BRANCH_REQUIRED if shop has no branches.
 */
async function resolveRequiredBranchId(req: any, shopId: number): Promise<number> {
  const h = req.headers['x-branch-id'] ?? req.headers['X-Branch-Id'];
  const headerId = h != null && String(h).trim() !== '' ? Number(Array.isArray(h) ? h[0] : h) : NaN;
  if (Number.isFinite(headerId) && headerId > 0 && (await branchBelongsToShop(shopId, Math.floor(headerId)))) {
    return Math.floor(headerId);
  }
  const b = req.body?.branch_id ?? req.body?.branchId;
  const bodyId = b != null && String(b).trim() !== '' ? Number(b) : NaN;
  if (Number.isFinite(bodyId) && bodyId > 0 && (await branchBelongsToShop(shopId, Math.floor(bodyId)))) {
    return Math.floor(bodyId);
  }
  const [defRows] = await pool.execute('SELECT default_branch_id FROM shops WHERE id = ?', [shopId]);
  const defB = Number((defRows as any[])[0]?.default_branch_id);
  if (defB > 0 && (await branchBelongsToShop(shopId, defB))) return defB;
  if (req.user?.id) {
    const hasUba = await hasTable('user_branch_assignments');
    if (hasUba) {
      const [uba] = await pool.execute(
        `SELECT uba.branch_id FROM user_branch_assignments uba
         INNER JOIN branches br ON br.id = uba.branch_id AND br.shop_id = ?
         WHERE uba.user_id = ? ORDER BY uba.branch_id LIMIT 1`,
        [shopId, req.user.id]
      );
      const bid = Number((uba as any[])[0]?.branch_id);
      if (bid > 0) return bid;
    }
  }
  const [fb] = await pool.execute('SELECT id FROM branches WHERE shop_id = ? ORDER BY id ASC LIMIT 1', [shopId]);
  const fid = Number((fb as any[])[0]?.id);
  if (!fid) {
    const err: any = new Error('BRANCH_REQUIRED');
    err.code = 'BRANCH_REQUIRED';
    throw err;
  }
  return fid;
}

async function insertPrintLog(
  req: any,
  shopId: number,
  type: string,
  referenceId: number,
  documentBranchId?: number | null
): Promise<void> {
  try {
    await ensurePrintLogsTable();
    let bid =
      documentBranchId != null && Number(documentBranchId) > 0 ? Math.floor(Number(documentBranchId)) : 0;
    if (!bid || !(await branchBelongsToShop(shopId, bid))) {
      const opt = await resolveOptionalBranchId(req, shopId);
      bid = opt != null ? opt : 0;
    }
    if (!bid) return;
    await pool.execute(
      'INSERT INTO print_logs (shop_id, type, reference_id, branch_id, user_id) VALUES (?, ?, ?, ?, ?)',
      [shopId, String(type || 'unknown').slice(0, 64), Number(referenceId) || 0, bid, req.user?.id ?? null]
    );
  } catch (e: any) {
    if (e?.code === 'BRANCH_REQUIRED') return;
    console.warn('[print_logs]', e?.message || e);
  }
}

const logEmptyResult = (label: string, context: Record<string, unknown>) => {
  console.warn(`[EMPTY] ${label}`, context);
};

const columnCache = new Map<string, boolean>();
const tableCache = new Map<string, boolean>();
const columnTypeCache = new Map<string, string | null>();
function resetSchemaCaches() {
  columnCache.clear();
  tableCache.clear();
  columnTypeCache.clear();
}
const hasTable = async (table: string): Promise<boolean> => {
  if (tableCache.has(table)) return tableCache.get(table) === true;
  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      [table]
    );
    const exists = Number((rows as any[])[0]?.c ?? 0) > 0;
    if (exists || schemaReady) tableCache.set(table, exists);
    return exists;
  } catch {
    return false;
  }
};
const hasColumn = async (table: string, column: string): Promise<boolean> => {
  const key = `${table}.${column}`;
  if (columnCache.has(key)) return columnCache.get(key) === true;
  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [table, column]
    );
    const exists = Number((rows as any[])[0]?.c ?? 0) > 0;
    if (exists || schemaReady) columnCache.set(key, exists);
    return exists;
  } catch {
    return false;
  }
};

const getColumnType = async (table: string, column: string): Promise<string | null> => {
  const key = `${table}.${column}`;
  if (columnTypeCache.has(key)) return columnTypeCache.get(key) ?? null;
  try {
    const [rows] = await pool.execute(
      'SELECT COLUMN_TYPE as column_type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [table, column]
    );
    const type = String((rows as any[])[0]?.column_type || '');
    const value = type ? type : null;
    if (value || schemaReady) columnTypeCache.set(key, value);
    return value;
  } catch {
    return null;
  }
};

/** Tax rule from DB row */
type TaxRuleRow = { id: number; type: 'percentage' | 'fixed'; rate: number; inclusive: boolean; apply_before_discount: boolean };

/** First active shop tax — used only when products table has no tax_rate_id column (legacy DB). */
function getFirstShopTaxRule(taxMap: Map<number, TaxRuleRow>): TaxRuleRow | null {
  for (const rule of taxMap.values()) return rule;
  return null;
}

/**
 * Resolve tax rule for a product line.
 * When products.tax_rate_id exists: NULL / empty / non-positive means explicit "no tax" (exempt) — do not fall back to shop default.
 * When the column does not exist: keep legacy behavior (first active shop tax).
 */
function resolveTaxRule(
  taxMap: Map<number, TaxRuleRow>,
  productTaxRateId: number | null | undefined,
  hasTaxRateId: boolean
): TaxRuleRow | null {
  if (hasTaxRateId) {
    if (productTaxRateId == null || Number(productTaxRateId) <= 0) return null;
    return taxMap.get(Number(productTaxRateId)) ?? null;
  }
  return getFirstShopTaxRule(taxMap);
}

/** Compute line-level tax. Price = unit price (after product discount if apply_before_discount is false). Formula: Total = PriceBeforeTax + (PriceBeforeTax * TaxRate) for percentage non-inclusive. */
function computeLineTax(
  unitPrice: number,
  quantity: number,
  taxRule: TaxRuleRow | null,
  lineDiscountTotal: number,
  applyBeforeDiscount: boolean
): { lineTotalBeforeTax: number; taxAmount: number; lineTotalAfterTax: number; taxRatePct: number } {
  const lineTotalBeforeTax = Math.round((unitPrice * quantity - lineDiscountTotal) * 100) / 100;
  let taxAmount = 0;
  let taxRatePct = 0;
  if (taxRule && taxRule.rate != null) {
    if (taxRule.type === 'fixed') {
      taxAmount = Math.round(taxRule.rate * quantity * 100) / 100;
    } else {
      taxRatePct = Number(taxRule.rate) || 0;
      if (taxRule.inclusive) {
        const gross = unitPrice * quantity - lineDiscountTotal;
        const net = gross / (1 + taxRatePct / 100);
        taxAmount = Math.round((gross - net) * 100) / 100;
      } else {
        const base = lineTotalBeforeTax;
        taxAmount = Math.round(base * (taxRatePct / 100) * 100) / 100;
      }
    }
  }
  const lineTotalAfterTax = Math.round((lineTotalBeforeTax + taxAmount) * 100) / 100;
  return { lineTotalBeforeTax, taxAmount, lineTotalAfterTax, taxRatePct };
}

/**
 * Normalize from/to to MySQL datetime. Accepts ISO or date-only (YYYY-MM-DD).
 * When tzOffsetMinutes is provided and from/to are date-only, treats dates as user local and returns UTC bounds (DB typically stores UTC).
 * التوقيت: إذا وُرد offset العميل نستخدمه لـ "اليوم" المحلي.
 */
function parseDateRangeForDb(
  from: string,
  to: string,
  tzOffsetMinutes?: number
): { fromStart: string; toEnd: string; fromDateOnly: string; toDateOnly: string } {
  let fromStart = '1970-01-01';
  let toEnd = '9999-12-31';
  const fromTrim = (from || '').trim();
  const toTrim = (to || '').trim();
  const hasOffset = typeof tzOffsetMinutes === 'number' && !isNaN(tzOffsetMinutes);
  const formatUtc = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);

  if (fromTrim.includes('T')) {
    const d = new Date(fromTrim);
    if (!isNaN(d.getTime())) fromStart = d.toISOString().replace('T', ' ').slice(0, 19);
  } else if (fromTrim) {
    if (hasOffset) {
      const [y, m, d] = fromTrim.slice(0, 10).split('-').map(Number);
      const utcStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - tzOffsetMinutes * 60 * 1000);
      fromStart = formatUtc(utcStart);
    } else {
      fromStart = fromTrim.slice(0, 10) + ' 00:00:00';
    }
  }
  if (toTrim.includes('T')) {
    const d = new Date(toTrim);
    if (!isNaN(d.getTime())) toEnd = d.toISOString().replace('T', ' ').slice(0, 19);
  } else if (toTrim && toTrim !== '9999-12-31') {
    if (hasOffset) {
      const [y, m, d] = toTrim.slice(0, 10).split('-').map(Number);
      const utcEnd = new Date(Date.UTC(y, m - 1, d, 23, 59, 59) - tzOffsetMinutes * 60 * 1000);
      toEnd = formatUtc(utcEnd);
    } else {
      toEnd = toTrim.slice(0, 10) + ' 23:59:59';
    }
  }
  /** Calendar YYYY-MM-DD in the user's timezone (for DATE columns like expense_date). */
  let fromDateOnly = fromStart.slice(0, 10);
  let toDateOnly = toEnd.slice(0, 10);
  if (hasOffset) {
    const fromUtcMs = new Date(fromStart.replace(' ', 'T') + 'Z').getTime();
    const toUtcMs = new Date(toEnd.replace(' ', 'T') + 'Z').getTime();
    const lFrom = new Date(fromUtcMs + tzOffsetMinutes * 60 * 1000);
    const lTo = new Date(toUtcMs + tzOffsetMinutes * 60 * 1000);
    fromDateOnly =
      lFrom.getUTCFullYear() +
      '-' +
      String(lFrom.getUTCMonth() + 1).padStart(2, '0') +
      '-' +
      String(lFrom.getUTCDate()).padStart(2, '0');
    toDateOnly =
      lTo.getUTCFullYear() +
      '-' +
      String(lTo.getUTCMonth() + 1).padStart(2, '0') +
      '-' +
      String(lTo.getUTCDate()).padStart(2, '0');
  }
  return {
    fromStart,
    toEnd,
    fromDateOnly,
    toDateOnly,
  };
}

/** Schema-safe WHERE clause for "user is active" - never references non-existent columns. */
const getUserActiveWhereClause = async (alias = 'u'): Promise<string> => {
  const [hasActive, hasIsActive, hasDisabled, hasIsDisabled, hasStatus] = await Promise.all([
    hasColumn('users', 'active'),
    hasColumn('users', 'is_active'),
    hasColumn('users', 'disabled'),
    hasColumn('users', 'is_disabled'),
    hasColumn('users', 'status'),
  ]);
  const p = alias ? `${alias}.` : '';
  if (hasActive) return `(${p}active = 1 OR ${p}active IS NULL)`;
  if (hasIsActive) return `(${p}is_active = 1 OR ${p}is_active IS NULL)`;
  if (hasDisabled) return `(${p}disabled = 0 OR ${p}disabled IS NULL)`;
  if (hasIsDisabled) return `(${p}is_disabled = 0 OR ${p}is_disabled IS NULL)`;
  if (hasStatus) return `(${p}status = 'active' OR ${p}status IS NULL)`;
  return '1=1';
};

let ensuredUserAdminState = false;
const ensureUserAdminStateTable = async (): Promise<boolean> => {
  if (ensuredUserAdminState) return true;
  const ddl = (withFk: boolean) => {
    const fk = withFk
      ? ', CONSTRAINT fk_user_admin_state_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE'
      : '';
    return `
      CREATE TABLE IF NOT EXISTS user_admin_state (
        user_id INT PRIMARY KEY,
        disabled TINYINT(1) NOT NULL DEFAULT 0,
        disabled_at TIMESTAMP NULL,
        disabled_reason VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ${fk}
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `;
  };
  try {
    await pool.execute(ddl(true));
    ensuredUserAdminState = true;
    tableCache.set('user_admin_state', true);
    return true;
  } catch (e: any) {
    console.warn('[db] ensureUserAdminStateTable (with FK):', e?.message || e);
    try {
      await pool.execute(ddl(false));
      ensuredUserAdminState = true;
      tableCache.set('user_admin_state', true);
      return true;
    } catch (e2: any) {
      console.warn('[db] ensureUserAdminStateTable (no FK):', e2?.message || e2);
      return false;
    }
  }
};

/** Check if user is disabled (user_admin_state first, then legacy users.* flags). */
const isUserDisabled = async (userId: number): Promise<boolean> => {
  const hasUas = await ensureUserAdminStateTable();
  if (hasUas) {
    const [rows] = await pool
      .execute(
        'SELECT MAX(CASE WHEN disabled = 1 THEN 1 ELSE 0 END) AS disabled FROM user_admin_state WHERE user_id = ?',
        [userId]
      )
      .catch(() => [[]]);
    const d = Number((rows as any[])[0]?.disabled ?? 0);
    if (d === 1) return true;
  }

  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]).catch(() => [[]]);
  const r = (rows as any[])[0];
  if (!r) return false;
  if (Object.prototype.hasOwnProperty.call(r, 'is_active') && (r.is_active === 0 || r.is_active === false)) return true;
  if (Object.prototype.hasOwnProperty.call(r, 'active') && (r.active === 0 || r.active === false)) return true;
  if (Object.prototype.hasOwnProperty.call(r, 'disabled') && (r.disabled === 1 || r.disabled === true)) return true;
  if (Object.prototype.hasOwnProperty.call(r, 'is_disabled') && (r.is_disabled === 1 || r.is_disabled === true)) return true;
  if (Object.prototype.hasOwnProperty.call(r, 'status') && String(r.status || '').toLowerCase() === 'disabled') return true;
  return false;
};

let ensuredSessionNonceCol = false;
const ensureUserSessionNonceColumn = async (): Promise<void> => {
  if (ensuredSessionNonceCol) return;
  try {
    await pool.execute('ALTER TABLE users ADD COLUMN session_nonce VARCHAR(64) NULL');
  } catch (e: any) {
    if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  columnCache.set('users.session_nonce', true);
  ensuredSessionNonceCol = true;
};

const issueLoginSessionNonce = async (userId: number): Promise<string> => {
  await ensureUserSessionNonceColumn();
  const nonce = crypto.randomBytes(24).toString('hex');
  await pool.execute('UPDATE users SET session_nonce = ? WHERE id = ?', [nonce, userId]);
  return nonce;
};

let ensuredUsersIsDisabledCol = false;
/** Ensures users.is_disabled exists so disable/enable always has a column to persist to when user_admin_state is unavailable. */
const ensureUsersIsDisabledColumn = async (): Promise<void> => {
  if (ensuredUsersIsDisabledCol) return;
  try {
    await pool.execute('ALTER TABLE users ADD COLUMN is_disabled TINYINT(1) NOT NULL DEFAULT 0');
  } catch (e: any) {
    if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  columnCache.set('users.is_disabled', true);
  ensuredUsersIsDisabledCol = true;
};

/** Set user disabled state: user_admin_state is source of truth; sync all legacy users.* flags when present. */
const setUserDisabled = async (userId: number, disabled: boolean, reason?: string): Promise<void> => {
  const d = disabled ? 1 : 0;
  const reasonVal = reason ?? null;
  const hasUas = await ensureUserAdminStateTable();
  if (hasUas) {
    const [upd] = await pool
      .execute(
        'UPDATE user_admin_state SET disabled = ?, disabled_at = IF(?=1,NOW(),NULL), disabled_reason = ? WHERE user_id = ?',
        [d, d, reasonVal, userId]
      )
      .catch(() => [{ affectedRows: 0 } as any]);
    const affected = Number((upd as any)?.affectedRows ?? 0);
    if (affected === 0) {
      const [ins] = await pool
        .execute(
          'INSERT INTO user_admin_state (user_id, disabled, disabled_at, disabled_reason) VALUES (?, ?, IF(?=1,NOW(),NULL), ?)',
          [userId, d, d, reasonVal]
        )
        .catch(() => [{ affectedRows: 0 } as any]);
      const insAff = Number((ins as any)?.affectedRows ?? 0);
      if (insAff === 0) {
        console.warn('[db] setUserDisabled: user_admin_state insert/update had no effect for user', userId);
      }
    }
  }

  await ensureUsersIsDisabledColumn();
  await pool.execute('UPDATE users SET is_disabled = ? WHERE id = ?', [d, userId]);

  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]).catch(() => [[]]);
  const r = (rows as any[])[0];
  if (!r) return;
  const updates: string[] = [];
  const params: any[] = [];
  if (Object.prototype.hasOwnProperty.call(r, 'is_active')) {
    updates.push('is_active = ?');
    params.push(disabled ? 0 : 1);
  }
  if (Object.prototype.hasOwnProperty.call(r, 'active')) {
    updates.push('active = ?');
    params.push(disabled ? 0 : 1);
  }
  if (Object.prototype.hasOwnProperty.call(r, 'disabled')) {
    updates.push('disabled = ?');
    params.push(disabled ? 1 : 0);
  }
  if (Object.prototype.hasOwnProperty.call(r, 'status')) {
    updates.push('status = ?');
    params.push(disabled ? 'disabled' : 'active');
  }
  if (updates.length) {
    params.push(userId);
    await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  // Invalidate existing JWTs so the user is kicked immediately (single-session / security).
  if (disabled) {
    try {
      await ensureUserSessionNonceColumn();
      const kick = crypto.randomBytes(24).toString('hex');
      await pool.execute('UPDATE users SET session_nonce = ? WHERE id = ?', [kick, userId]);
    } catch {
      // non-fatal
    }
  }

  const persisted = await isUserDisabled(userId);
  if (persisted !== disabled) {
    throw new Error('Failed to persist account disabled state');
  }
};

const DAY_MS = 24 * 60 * 60 * 1000;

const maskActivationCode = (code?: string | null) => {
  const value = String(code || '').trim();
  if (!value) return '';
  if (value.length <= 8) return `${value.slice(0, 2)}****${value.slice(-2)}`;
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
};

/** YYYY-MM-DD or null for optional product date fields */
const parseProductOptionalDate = (val: unknown): string | null => {
  if (val == null || val === '') return null;
  const s = String(val).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
};

async function applyProductExpiryFields(
  poolRef: typeof pool,
  shopId: number,
  productId: number,
  body: Record<string, unknown>
) {
  const exp = parseProductOptionalDate(body.expiryDate ?? body.expiry_date);
  const prod = parseProductOptionalDate(body.productionDate ?? body.production_date);
  const hasExp = await hasColumn('products', 'expiry_date');
  const hasProd = await hasColumn('products', 'production_date');
  if (!hasExp && !hasProd) return;
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (hasExp) {
    sets.push('expiry_date = ?');
    vals.push(exp);
  }
  if (hasProd) {
    sets.push('production_date = ?');
    vals.push(prod);
  }
  if (sets.length) {
    await poolRef.execute(`UPDATE products SET ${sets.join(', ')} WHERE id = ? AND shop_id = ?`, [...vals, productId, shopId]);
  }
}

const parseDurationDays = (duration: string, customDays?: number | null) => {
  const key = String(duration || '').trim().toLowerCase();
  if (key === 'lifetime') return null;
  if (key === 'weekly') return 7;
  if (key === 'monthly') return 30;
  if (key === 'quarterly') return 90;
  if (key === 'yearly') return 365;
  if (key === 'custom') {
    const days = Number(customDays);
    return Number.isFinite(days) && days > 0 ? Math.floor(days) : null;
  }
  return 30;
};

const computeDaysLeft = (expiresAt?: string | Date | null) => {
  if (!expiresAt) return null;
  const ts = new Date(expiresAt).getTime();
  if (!Number.isFinite(ts)) return null;
  const diff = ts - Date.now();
  return diff >= 0 ? Math.ceil(diff / DAY_MS) : 0;
};

const computeRemainingSeconds = (expiresAt?: string | Date | null) => {
  if (!expiresAt) return null;
  const ts = new Date(expiresAt).getTime();
  if (!Number.isFinite(ts)) return null;
  const diff = ts - Date.now();
  return diff >= 0 ? Math.floor(diff / 1000) : 0;
};

/** Single source of truth: compute subscription from shop_subscriptions. */
interface ComputedSubscription {
  plan: string;
  status: 'active' | 'inactive' | 'expired';
  activated_at: string | null;
  expires_at: string | null;
  remainingDays: number | null;
  remainingSeconds: number | null;
  is_trial: boolean;
  blocked: boolean;
}

async function computeSubscription(shopId: number): Promise<ComputedSubscription> {
  const [rows] = await pool.execute(
    'SELECT plan, status, started_at, expires_at, activation_source, last_activated_at FROM shop_subscriptions WHERE shop_id = ?',
    [shopId]
  ).catch(() => [[]]);
  const sub = (rows as any[])[0];
  const is_trial = sub?.activation_source === 'trial' || sub?.status === 'trial';
  const activated_at = sub?.last_activated_at || sub?.started_at || null;
  const expires_at = sub?.expires_at || null;
  let plan = String(sub?.plan || 'none').trim().toLowerCase();
  if (plan === 'none' || !plan) plan = 'none';

  let status: 'active' | 'inactive' | 'expired' = 'inactive';
  let remainingDays: number | null = null;
  let remainingSeconds: number | null = null;

  if (!sub) {
    return { plan: 'none', status: 'inactive', activated_at: null, expires_at: null, remainingDays: null, remainingSeconds: null, is_trial: false, blocked: true };
  }

  const rawStatus = String(sub?.status || '').toLowerCase();
  if (plan === 'none' || rawStatus === 'inactive') {
    return { plan, status: 'inactive', activated_at, expires_at, remainingDays: null, remainingSeconds: null, is_trial, blocked: true };
  }

  if (expires_at) {
    const expiresMs = new Date(expires_at).getTime();
    if (Number.isFinite(expiresMs) && expiresMs < Date.now()) {
      return { plan, status: 'expired', activated_at, expires_at, remainingDays: 0, remainingSeconds: 0, is_trial, blocked: true };
    }
    remainingDays = computeDaysLeft(expires_at);
    remainingSeconds = computeRemainingSeconds(expires_at);
    status = (remainingDays != null && remainingDays > 0) ? 'active' : 'expired';
  } else {
    status = rawStatus === 'trial' ? 'active' : (rawStatus === 'active' && plan !== 'none') ? 'active' : 'inactive';
  }

  const blocked = plan === 'none' || status === 'inactive' || status === 'expired';
  return { plan, status, activated_at, expires_at, remainingDays, remainingSeconds, is_trial, blocked };
}

async function ensureShopSubscriptionRow(shopId: number) {
  const [rows] = await pool.execute('SELECT shop_id FROM shop_subscriptions WHERE shop_id = ?', [shopId]).catch(() => [[]]);
  const list = rows as any[];
  if (list.length > 0) return;
  await pool.execute(
    'INSERT INTO shop_subscriptions (shop_id, plan, status, started_at) VALUES (?, ?, ?, NOW())',
    [shopId, 'none', 'inactive']
  );
}

async function applyPlanToShop(shopId: number, plan: PlanId) {
  await pool.execute('UPDATE shops SET package = ?, plan_type = ?, is_active = 1 WHERE id = ?', [plan, plan, shopId]);
  await pool.execute('UPDATE users SET package = ? WHERE shop_id = ?', [plan, shopId]);
}

async function syncShopSubscription(shopId: number) {
  await ensureShopSubscriptionRow(shopId);
  const [rows] = await pool.execute(
    'SELECT shop_id, plan, status, started_at, expires_at, activation_code, activation_source, last_activated_at, last_notified_expiring_at FROM shop_subscriptions WHERE shop_id = ?',
    [shopId]
  ).catch(() => [[]]);
  const sub = (rows as any[])[0];
  if (!sub) return null;
  const computed = await computeSubscription(shopId);
  if (computed.status === 'expired') {
    const plan = sub.plan || 'bronze';
    await pool.execute(
      `UPDATE shop_subscriptions SET status = 'expired', activation_code = NULL, activation_source = 'expired', last_activated_at = COALESCE(last_activated_at, NOW()) WHERE shop_id = ?`,
      [shopId]
    );
    await pool.execute('UPDATE shops SET trial_ends_at = NULL WHERE id = ?', [shopId]);
    await applyPlanToShop(shopId, plan as PlanId);
    if (sub.status === 'active' || sub.status === 'trial') {
      await insertNotification({ shopId, source: 'system', type: 'subscription_expired' });
    }
  }
  if (computed.remainingDays != null && computed.remainingDays <= 5 && computed.remainingDays >= 0) {
    const [r2] = await pool.execute('SELECT last_notified_expiring_at FROM shop_subscriptions WHERE shop_id = ?', [shopId]);
    const lastNotified = (r2 as any[])[0]?.last_notified_expiring_at ? new Date((r2 as any[])[0].last_notified_expiring_at).getTime() : 0;
    const now = Date.now();
    if (now - lastNotified > DAY_MS) {
      await insertNotification({ shopId, source: 'system', type: 'subscription_expiring', data: { daysLeft: computed.remainingDays } });
      await pool.execute('UPDATE shop_subscriptions SET last_notified_expiring_at = NOW() WHERE shop_id = ?', [shopId]);
    }
  }
  return { ...sub, ...computed };
}

// ========== DOMAIN RESOLUTION + VERIFICATION ==========
const ALLOWED_DOMAIN_TLDS = new Set(['com', 'net', 'org', 'shop', 'store']);
const DOMAIN_VERIFY_RECORD_PREFIX = '_crown-verify';
const DOMAIN_VERIFY_CNAME_ROOT = process.env.DOMAIN_VERIFY_CNAME_ROOT || 'verify.crowncs.org';

const normalizeFqdn = (value: string) => String(value || '').trim().toLowerCase().replace(/\.+$/, '');

const normalizeHostHeader = (hostHeader: any) => {
  let host = String(hostHeader || '').trim();
  if (!host) return '';
  if (host.includes(',')) host = host.split(',')[0].trim();

  // IPv6: [::1]:3000
  if (host.startsWith('[')) {
    const idx = host.indexOf(']');
    if (idx !== -1) host = host.slice(1, idx);
  } else {
    host = host.split(':')[0];
  }

  return normalizeFqdn(host);
};

const normalizeDomainInput = (input: any) => {
  let raw = String(input || '').trim();
  if (!raw) return '';
  raw = raw.replace(/^https?:\/\//i, '');
  raw = raw.split('/')[0];
  raw = raw.split('?')[0];
  raw = raw.split('#')[0];
  raw = raw.split(':')[0];
  raw = normalizeFqdn(raw);
  const ascii = domainToASCII(raw);
  return normalizeFqdn(ascii || '');
};

const validateDomainOrThrow = (domain: string) => {
  if (!domain) throw new Error('domain is required');
  if (domain.length < 4 || domain.length > 253) throw new Error('invalid domain length');
  if (domain === 'localhost') throw new Error('invalid domain');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) throw new Error('ip domains are not allowed');

  const tld = domain.split('.').pop() || '';
  if (!ALLOWED_DOMAIN_TLDS.has(tld)) {
    throw new Error('invalid TLD');
  }

  const label = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
  const re = new RegExp(`^(?:${label}\\.)+(${Array.from(ALLOWED_DOMAIN_TLDS).join('|')})$`, 'i');
  if (!re.test(domain)) throw new Error('invalid domain format');
};

const dnsNameForDomain = (domain: string) => `${DOMAIN_VERIFY_RECORD_PREFIX}.${domain}`;
const expectedTxtValue = (token: string) => `crown-site-verification=${token}`;
const expectedCnameTarget = (token: string) => normalizeFqdn(`${token}.${DOMAIN_VERIFY_CNAME_ROOT}`);

const verifyDomainByTxt = async (domain: string, token: string) => {
  const name = dnsNameForDomain(domain);
  const expected = expectedTxtValue(token);
  try {
    const records = await dns.resolveTxt(name);
    const flattened = records.flat().map((s) => String(s || '').trim());
    return flattened.some((v) => v === expected || v === token);
  } catch {
    return false;
  }
};

const verifyDomainByCname = async (domain: string, token: string) => {
  const name = dnsNameForDomain(domain);
  const expected = expectedCnameTarget(token);
  try {
    const cnames = await dns.resolveCname(name);
    return cnames.some((c) => normalizeFqdn(c) === expected);
  } catch {
    return false;
  }
};

const verifyDomainDns = async (domain: string, method: 'txt' | 'cname', token: string) => {
  if (method === 'cname') return verifyDomainByCname(domain, token);
  return verifyDomainByTxt(domain, token);
};

// Public resolver: map Host header -> shop_id (reject unknown or inactive domains)
const resolveShopByDomainHost = async (req: any, res: Response, next: any) => {
  const forwardedHost = req.headers?.['x-forwarded-host'] || req.headers?.['x-shop-domain'];
  const host = normalizeHostHeader(forwardedHost || req.headers?.host);
  if (!host) return res.status(400).json({ error: 'Host header required' });

  const candidateA = host;
  const candidateB = host.startsWith('www.') ? host.slice(4) : `www.${host}`;

  try {
    const [rows] = await pool.execute(
      `
      SELECT d.shop_id, d.domain, d.status, d.is_active, d.verified_at, s.package, s.is_active as shop_active
      FROM domains d
      JOIN shops s ON s.id = d.shop_id
      WHERE d.domain IN (?, ?)
      LIMIT 1
      `,
      [candidateA, candidateB]
    );
    const row = (rows as any[])[0];
    if (!row) return res.status(404).json({ error: 'Unknown domain' });

    const domainActive =
      Number(row.is_active) === 1 && row.status === 'active' && row.verified_at !== null;
    const shopActive = Number(row.shop_active) === 1;

    if (!domainActive || !shopActive) {
      return res.status(403).json({ error: 'Domain inactive or unverified' });
    }

    req.shopId = Number(row.shop_id);
    req.resolvedDomain = row.domain;
    req.shopPackage = row.package;
    return next();
  } catch (error: any) {
    return res.status(500).json({ error: 'Domain resolution failed' });
  }
};

// Middleware for role-based access control
const requireRole = (...allowedRoles: string[]) => {
  return (req: any, res: Response, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

const capInventoryWrite = requireShopCapability('inventory_full', 'inventory_branch');
const capProductListRead = requireShopCapability('view_inventory', 'pos', 'inventory_full', 'inventory_branch', 'crm_pos_pick');
const capAdminProductsRead = requireShopCapability(
  'view_inventory',
  'pos',
  'inventory_full',
  'inventory_branch',
  'dashboard',
  'reports',
  'accounting'
);
const capAccountingRead = requireShopCapability('accounting', 'reports', 'taxes');
const capTaxRead = requireShopCapability('taxes', 'accounting', 'inventory_full', 'inventory_branch');
const capLowStockRead = requireShopCapability('view_inventory', 'inventory_full', 'inventory_branch', 'reports');
const capBranchTotalsRead = requireShopCapability('view_inventory', 'inventory_full', 'inventory_branch', 'dashboard', 'reports');
const capTaxWrite = requireShopCapability('taxes', 'accounting');
const capAccountingWrite = requireShopCapability('accounting');
const capActivityRead = requireShopCapability('users_manage');

// POST /api/products/bulk-delete
app.post('/api/products/bulk-delete', authenticateToken, capInventoryWrite, async (req: any, res: Response) => {
  console.log('HIT /api/products/bulk-delete', req.body);
  try {
    const ids = (req.body?.ids ?? []).map(Number).filter((n: number) => Number.isInteger(n) && n > 0);
    if (!ids.length) {
      return res.status(400).json({ ok: false, error: 'Invalid product id(s)' });
    }
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const placeholders = ids.map(() => '?').join(',');
    const [result] = await pool.execute(
      `UPDATE products SET is_deleted = 1 WHERE id IN (${placeholders}) AND shop_id = ?`,
      [...ids, shopId]
    );
    const deletedCount = (result as any).affectedRows ?? 0;
    return res.json({ ok: true, deletedCount });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Debug: list available Gemini models for this API key (super admin only)
app.get('/api/models', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const client = getGeminiClient();
    if (!client) {
      return res.status(400).json({
        error: 'AI API key is missing',
        hint: 'Set GEMINI_API_KEY (or GOOGLE_API_KEY / VERTEX_GEMINI_API_KEY / API_KEY) on crown-api.',
      });
    }

    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 200) : 50;

    const pager = await client.models.list();
    const models: any[] = [];
    for await (const model of pager) {
      const m = model as any;
      models.push({
        name: m?.name,
        displayName: m?.displayName,
        description: m?.description,
        inputTokenLimit: m?.inputTokenLimit,
        outputTokenLimit: m?.outputTokenLimit,
        supportedGenerationMethods: m?.supportedGenerationMethods,
      });
      if (models.length >= limit) break;
    }

    res.json({ count: models.length, models });
  } catch (error: any) {
    console.error('❌ /api/models error:', { name: error?.name, status: error?.status, message: error?.message });
    res.status(500).json({ error: 'Failed to list models' });
  }
});

type PlanId = 'bronze' | 'silver' | 'gold' | 'branches';

const PLAN_DEFINITIONS: Record<PlanId, {
  id: PlanId;
  name: string;
  totalUsers: number;
  additionalUsersLimit: number;
  features: {
    pos: boolean;
    manualEntry: boolean;
    inventory: boolean;
    excelImport: boolean;
    onlineStore: boolean;
    reports: boolean;
    notifications: boolean;
    ai: boolean;
    branches: boolean;
    crm: boolean;
    hr: boolean;
    accounting: boolean;
    purchases: boolean;
  };
}> = {
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    totalUsers: 2,
    additionalUsersLimit: 1,
    features: {
      pos: true,
      manualEntry: true,
      inventory: true,
      excelImport: false,
      onlineStore: false,
      reports: false,
      notifications: false,
      ai: false,
      branches: false,
      crm: false,
      hr: false,
      accounting: false,
      purchases: false,
    },
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    totalUsers: 5,
    additionalUsersLimit: 4,
    features: {
      pos: true,
      manualEntry: true,
      inventory: true,
      excelImport: true,
      onlineStore: false,
      reports: false,
      notifications: false,
      ai: false,
      branches: false,
      crm: false,
      hr: false,
      accounting: false,
      purchases: false,
    },
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    totalUsers: 10,
    additionalUsersLimit: 9,
    features: {
      pos: true,
      manualEntry: true,
      inventory: true,
      excelImport: true,
      onlineStore: true,
      reports: true,
      notifications: true,
      ai: true,
      branches: false,
      crm: true,
      hr: true,
      accounting: true,
      purchases: true,
    },
  },
  branches: {
    id: 'branches',
    name: 'Branches',
    totalUsers: 999,
    additionalUsersLimit: 998,
    features: {
      pos: true,
      manualEntry: true,
      inventory: true,
      excelImport: true,
      onlineStore: true,
      reports: true,
      notifications: true,
      ai: true,
      branches: true,
      crm: true,
      hr: true,
      accounting: true,
      purchases: true,
    },
  },
};

const normalizePlan = (plan?: string | null): PlanId => {
  const key = String(plan || '').trim().toLowerCase() as PlanId;
  return PLAN_DEFINITIONS[key] ? key : 'bronze';
};

const getPlanDefinition = (plan?: string | null) => PLAN_DEFINITIONS[normalizePlan(plan)];

// Middleware for package-based access control
const requirePackageFeature = (feature: 'qr' | 'pos' | 'dashboard' | 'excel' | 'ai' | 'storefront' | 'reports' | 'branches') => {
  return (req: any, res: Response, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    const plan = normalizePlan(req.user.package || 'bronze');
    const config = tierFeatures[plan] || tierFeatures.bronze;
    const planFeatures = getPlanDefinition(plan).features;

    const allowed =
      feature === 'pos'
        ? true
        : feature === 'dashboard'
        ? true
        : feature === 'excel'
        ? Boolean(planFeatures.excelImport)
        : feature === 'ai'
        ? Boolean(planFeatures.ai)
        : feature === 'qr'
        ? Boolean(config.qrCode || config.barcode)
        : feature === 'storefront'
        ? Boolean(planFeatures.onlineStore)
        : feature === 'reports'
        ? Boolean(planFeatures.reports)
        : feature === 'branches'
        ? Boolean(planFeatures.branches)
        : false;

    if (!allowed) {
      return res.status(403).json({ error: 'Plan does not allow this feature' });
    }

    return next();
  };
};

const tierFeatures = {
  bronze: {
    maxProducts: 500,
    barcode: false,
    qrCode: false,
    pharmacyExpiry: false,
    reports: false,
    voiceAssistant: false,
    excelImport: false,
  },
  silver: {
    maxProducts: null,
    barcode: true,
    qrCode: true,
    pharmacyExpiry: true,
    reports: false,
    voiceAssistant: false,
    excelImport: true,
  },
  gold: {
    maxProducts: null,
    barcode: true,
    qrCode: true,
    pharmacyExpiry: true,
    reports: true,
    voiceAssistant: true,
    excelImport: true,
  },
  branches: {
    maxProducts: null,
    barcode: true,
    qrCode: true,
    pharmacyExpiry: true,
    reports: true,
    voiceAssistant: true,
    excelImport: true,
  },
} as const;

const getShopTier = async (shopId: number) => {
  const [shops] = await pool.execute('SELECT package FROM shops WHERE id = ?', [shopId]);
  const shopArray = shops as any[];
  return normalizePlan(shopArray[0]?.package || 'bronze');
};

const enforceProductLimit = async (shopId: number, incomingCount: number) => {
  const tier = await getShopTier(shopId);
  const config = tierFeatures[tier];
  if (config.maxProducts === null) return { allowed: true, remaining: null, tier };

  const [counts] = await pool.execute('SELECT COUNT(*) as count FROM products WHERE shop_id = ?', [shopId]);
  const existingCount = Number((counts as any[])[0]?.count || 0);
  const totalAfter = existingCount + incomingCount;
  if (totalAfter > config.maxProducts) {
    const remaining = Math.max(0, config.maxProducts - existingCount);
    return { allowed: false, remaining, tier, maxProducts: config.maxProducts, existingCount };
  }
  return { allowed: true, remaining: config.maxProducts - existingCount, tier, maxProducts: config.maxProducts, existingCount };
};

const logAudit = async (params: {
  shopId: number;
  userId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: string | null;
  ipAddress?: string | null;
}) => {
  await pool.execute(
    `INSERT INTO audit_logs (shop_id, user_id, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      params.shopId,
      params.userId || null,
      params.action,
      params.entityType,
      params.entityId || null,
      params.details || null,
      params.ipAddress || null,
    ]
  );
};

const normalizeText = (value?: any) => {
  return String(value || '').trim().toLowerCase();
};

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

/** Prefer actual message script over UI locale: English message under Arabic UI must reply in English. */
const resolveChatReplyLanguage = (
  message: string,
  requestedLangRaw: unknown
): 'ar' | 'en' => {
  const sample = String(message || '');
  const msgLower = sample.toLowerCase().trim();
  const asksForEnglish =
    /\b(english|en\b|انجلش|انجليزي|بالإنجليزي|in english|reply in english|answer in english|speak english|say it in english|do you speak english|respond in english|talk in english)\b/i.test(
      msgLower
    );
  const asksForArabic =
    /\b(arabic|عربي|بالعربي|مصري|باللهجة|بالعامية|عامية)\b/i.test(msgLower);
  const hasArabicScript = ARABIC_SCRIPT_RE.test(sample);
  const hasLatinWord = /[A-Za-z]{2,}/.test(sample);

  if (asksForEnglish) return 'en';
  if (asksForArabic) return 'ar';
  if (hasArabicScript) return 'ar';
  if (hasLatinWord) return 'en';

  const requested =
    requestedLangRaw === 'ar' || requestedLangRaw === 'en' ? requestedLangRaw : null;
  return requested ?? 'en';
};

const userAskedForEnglishInText = (text: string) =>
  /\b(english|en\b|انجلش|انجليزي|بالإنجليزي|in english|reply in english|answer in english|speak english|say it in english|do you speak english|respond in english|talk in english)\b/i.test(
    String(text || '')
  );

/** If the user already asked for English earlier in the thread, keep English for Latin follow-ups (UI may still send lang=ar). */
const resolveChatReplyLanguageWithHistory = (
  message: string,
  requestedLangRaw: unknown,
  history: unknown
): 'ar' | 'en' => {
  const base = resolveChatReplyLanguage(message, requestedLangRaw);
  const sample = String(message || '');
  const hasArabicScript = ARABIC_SCRIPT_RE.test(sample);
  const hasLatinWord = /[A-Za-z]{2,}/.test(sample);
  const hist = Array.isArray(history) ? history : [];
  const priorUserTexts = hist
    .filter((h: any) => h && h.role === 'user' && typeof h.content === 'string')
    .map((h: any) => String(h.content))
    .slice(-12);
  const priorAskedEnglish = priorUserTexts.some(userAskedForEnglishInText);
  if (priorAskedEnglish && hasLatinWord && !hasArabicScript) return 'en';
  return base;
};

const formatChatHistoryForPrompt = (history: unknown, maxTurns = 8, maxLen = 320): string => {
  const hist = Array.isArray(history) ? history : [];
  const tail = hist.slice(-maxTurns) as { role?: string; content?: string }[];
  const lines: string[] = [];
  for (const h of tail) {
    const role = h.role === 'assistant' ? 'Assistant' : h.role === 'user' ? 'User' : null;
    if (!role || typeof h.content !== 'string') continue;
    const chunk = h.content.replace(/\s+/g, ' ').trim().slice(0, maxLen);
    if (chunk) lines.push(`${role}: ${chunk}`);
  }
  return lines.length ? lines.join('\n') : '';
};

const getTtsLocaleForLang = (lang: 'ar' | 'en') => {
  return lang === 'ar' ? 'ar-EG' : 'en-US';
};

// Normalize payment method to stable codes (avoid DB truncation / inconsistencies)
const normalizePaymentMethod = (value: unknown): string => {
  const s = String(value || '').toLowerCase();
  if (s.includes('cod') || s.includes('cash') || s.includes('استلام') || s.includes('نقد')) return 'COD';
  if (s.includes('transfer') || s.includes('bank') || s.includes('تحويل')) return 'TRANSFER';
  if (s.includes('card') || s.includes('credit') || s.includes('بطاقة')) return 'CARD';
  if (s.includes('wallet') || s.includes('instapay') || s.includes('vodafone')) return 'WALLET';
  return 'COD';
};

const generatePublicCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
};

const resolveUserDisplayName = async (user: any): Promise<string | null> => {
  if (!user) return null;
  let name = String(user?.name || '').trim();
  // Do NOT use username/email prefix as display name (e.g. "ahmed" from "ahmed@example.com")
  if (!name && user?.role === 'shop_owner' && user?.shop_id) {
    try {
      const [rows] = await pool.execute('SELECT owner_name FROM shops WHERE id = ?', [user.shop_id]);
      name = String((rows as any[])[0]?.owner_name || '').trim();
    } catch {
      // ignore lookup failure
    }
  }
  return name || null;
};

const normalizeNumber = (value?: string | number | null) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const normalizedDigits = raw
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[،٬]/g, ',');
  const cleaned = normalizedDigits.replace(/,/g, '').replace(/[^\d.\-]/g, '');
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

const fieldMatchers: Record<string, string[]> = {
  name: [
    'name',
    'product',
    'productname',
    'item',
    'title',
    'part name',
    'part_name',
    'partname',
    'Part_Name',
    'description',
    'item name',
    'اسم المنتج',
    'المنتج',
    'اسم',
    'اسم الصنف',
    'الوصف',
  ],
  nameAr: ['name_ar', 'name ar', 'arabic', 'arabicname', 'اسم عربي', 'اسم'],
  brand: ['brand', 'Brand', 'manufacturer', 'company', 'mark', 'الماركة', 'العلامة'],
  sku: ['sku', 'itemcode', 'code', 'partnumber', 'part', 'reference', 'ref', 'رقم الصنف'],
  barcode: ['barcode', 'bar code', 'ean', 'upc', 'gtin', 'باركود', 'qr code', 'qr_code', 'qrcode', 'QR_Code'],
  qrCode: ['qr', 'qrcode', 'qr code'],
  category: ['category', 'group', 'type', 'قسم', 'الفئة', 'تصنيف'],
  buyPrice: [
    'buy',
    'buy price',
    'buyprice',
    'buy_price',
    'BuyPrice',
    'cost',
    'purchase',
    'purchaseprice',
    'costprice',
    'سعر الشراء',
    'شراء',
    'تكلفة',
    'سعر التكلفة',
  ],
  sellPrice: [
    'sell',
    'sell price',
    'sellprice',
    'saleprice',
    'selling price',
    'price',
    'unitprice',
    'سعر البيع',
    'بيع',
    'السعر',
    'سعر',
  ],
  stockQuantity: ['qty', 'quantity', 'stock', 'Stock', 'available', 'onhand', 'كمية', 'المخزون'],
  minStockLevel: ['min', 'minimum', 'reorder', 'minstock', 'min stock', 'حد ادنى', 'حد أدنى'],
  imageUrl: ['image url', 'image_url', 'imageurl', 'img', 'photo', 'picture', 'Image_URL'],
  cartonPacksCount: ['x', 'packs per carton', 'carton packs', 'علب/كرتونة', 'carton_packs_count'],
  packUnitsCount: ['y', 'units per pack', 'وحدات/علبة', 'pack_units_count'],
  pieceBuyPrice: ['piece buy', 'شراء قطعة', 'piece_buy_price'],
  pieceSellPrice: ['piece sell', 'بيع قطعة', 'piece_sell_price'],
  packBuyPrice: ['pack buy', 'شراء علبة', 'pack_buy_price'],
  packSellPrice: ['pack sell', 'بيع علبة', 'pack_sell_price'],
  cartonBuyPrice: ['carton buy', 'شراء كرتونة', 'carton_buy_price'],
  cartonSellPrice: ['carton sell', 'بيع كرتونة', 'carton_sell_price'],
  descriptionShort: ['description short', 'short desc', 'وصف قصير', 'description_short'],
  descriptionLong: ['description long', 'long desc', 'وصف طويل', 'description_long'],
  warrantyText: ['warranty', 'ضمان', 'warranty_text'],
  returnPolicyText: ['return policy', 'سياسة إرجاع', 'return_policy_text'],
  specs: ['specs', 'specifications', 'مواصفات', 'specs_json'],
  galleryUrls: ['gallery urls', 'gallery_urls', 'galleryurls', 'images', 'صور إضافية'],
};

type ImportMappingValidation = {
  ok: boolean;
  missingFields: Array<'name' | 'sellPrice'>;
};

const validateProductImportMapping = (columnMap: Record<string, string>): ImportMappingValidation => {
  return { ok: true, missingFields: [] };
};

const buildProductImportMappingGuide = (headers: string[], columnMap: Record<string, string>, reason: string) => {
  return {
    ok: true,
    reason,
    missingFields: [] as Array<'name' | 'sellPrice'>,
    detectedHeaders: headers,
    currentMapping: columnMap,
    optionalFields: [
      { field: 'name', note: 'Product name (empty → draft name).', acceptedHeaders: fieldMatchers.name },
      { field: 'sellPrice', note: 'Sell price (empty → 0, row saved as draft).', acceptedHeaders: [...fieldMatchers.sellPrice, ...fieldMatchers.buyPrice] },
    ],
    suggestedHeaders: {
      name: fieldMatchers.name,
      nameAr: fieldMatchers.nameAr,
      sellPrice: fieldMatchers.sellPrice,
      buyPrice: fieldMatchers.buyPrice,
      stockQuantity: fieldMatchers.stockQuantity,
      sku: fieldMatchers.sku,
      barcode: fieldMatchers.barcode,
      qrCode: fieldMatchers.qrCode,
      brand: fieldMatchers.brand,
      category: fieldMatchers.category,
      minStockLevel: fieldMatchers.minStockLevel,
      imageUrl: fieldMatchers.imageUrl,
      cartonPacksCount: fieldMatchers.cartonPacksCount,
      packUnitsCount: fieldMatchers.packUnitsCount,
      pieceBuyPrice: fieldMatchers.pieceBuyPrice,
      pieceSellPrice: fieldMatchers.pieceSellPrice,
      packBuyPrice: fieldMatchers.packBuyPrice,
      packSellPrice: fieldMatchers.packSellPrice,
      cartonBuyPrice: fieldMatchers.cartonBuyPrice,
      cartonSellPrice: fieldMatchers.cartonSellPrice,
      descriptionShort: fieldMatchers.descriptionShort,
      descriptionLong: fieldMatchers.descriptionLong,
      warrantyText: fieldMatchers.warrantyText,
      returnPolicyText: fieldMatchers.returnPolicyText,
      specs: fieldMatchers.specs,
      galleryUrls: fieldMatchers.galleryUrls,
    },
    tip: 'Map columns for best results. Empty fields are imported as drafts.',
  };
};

const normalizeHeader = (value: string) => {
  const s = value.toString().trim().replace(/\s+/g, ' ');
  const lower = s.toLowerCase();
  return lower.replace(/[_\-]/g, ' ');
};

const normalizeHeaderForMatch = (value: string) => {
  const s = value.toString().trim().replace(/\s+/g, ' ');
  return s.replace(/[_\-]/g, ' ');
};

const isHeaderLike = (headers: string[]) => {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));
  const crownHeaders = new Set(['part name', 'brand', 'qr code', 'buyprice', 'stock', 'image url']);
  if (normalizedHeaders.some((h) => crownHeaders.has(h))) return true;
  const joined = headers.map((header) => normalizeHeaderForMatch(header)).join(' ');
  const matchers = Object.values(fieldMatchers).flat();
  const hasKnownToken = matchers.some((token) => {
    const normToken = normalizeHeaderForMatch(token);
    return joined.includes(normToken) || (token.length >= 2 && joined.toLowerCase().includes(normToken.toLowerCase()));
  });
  const hasLetters = /[a-zA-Z\u0600-\u06FF]/.test(joined);
  return hasKnownToken || hasLetters;
};

const buildIndexedMapping = (headers: string[]) => {
  const mapping: Record<string, string> = {};
  if (headers[0]) mapping[headers[0]] = 'sku';
  if (headers[1]) mapping[headers[1]] = 'name';
  if (headers[2]) mapping[headers[2]] = 'brand';
  if (headers[3]) mapping[headers[3]] = 'sellPrice';
  if (headers[4]) mapping[headers[4]] = 'qrCode';
  return mapping;
};

const heuristicColumnMap = (headers: string[]) => {
  const map: Record<string, string> = {};
  headers.forEach((header) => {
    const normalized = normalizeHeader(header);
    const normalizedFull = normalizeHeaderForMatch(header);
    const match = Object.keys(fieldMatchers).find((field) =>
      fieldMatchers[field].some((key) => {
        const nKey = normalizeHeaderForMatch(key);
        return normalized.includes(normalizeHeader(key)) || normalizedFull.includes(nKey) || (key.length >= 2 && (normalized.includes(nKey.toLowerCase()) || normalizedFull.toLowerCase().includes(nKey.toLowerCase())));
      })
    );
    if (match) map[header] = match;
  });
  return map;
};

const aiColumnMap = async (headers: string[]) => {
  if (!getGeminiClient()) return null;
  try {
    const result = await geminiGenerateContent({
      model: GEMINI_MODEL,
      config: GEMINI_GEN_CONFIG,
      contents: `You are a data mapping assistant. Map messy column headers to known product fields.
Known fields: name, nameAr, brand, sku, barcode, qrCode, category, buyPrice, sellPrice, stockQuantity, minStockLevel, imageUrl.
If sheet uses generic names like "quantity" map to stockQuantity; "price" map to sellPrice; "total"/"amount" may map to sellPrice only when unit price is not present.
Return ONLY valid JSON object mapping original header to field. Skip unknown headers.
Headers: ${JSON.stringify(headers)}`,
    });
    const text = String((result as any)?.text || '').trim();
    if (!text) return null;
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
    return parsed as Record<string, string>;
  } catch (error) {
    console.error('DEBUG_AI_ERROR:', error);
    return null;
  }
};

const mergeColumnMaps = (base: Record<string, string>, ai: Record<string, string> | null) => {
  if (!ai) return base;
  return { ...base, ...ai };
};

const enforcePlanLimits = async (shopId: number, requestedRole: string) => {
  const [shops] = await pool.execute('SELECT package FROM shops WHERE id = ?', [shopId]);
  const shopArray = shops as any[];
  if (shopArray.length === 0) {
    throw new Error('Shop not found');
  }

  const plan = normalizePlan(shopArray[0].package || 'bronze');
  const planConfig = getPlanDefinition(plan);

  const [counts] = await pool.execute(
    'SELECT role, COUNT(*) as count FROM users WHERE shop_id = ? GROUP BY role',
    [shopId]
  );
  const countArray = counts as any[];
  const roleCounts = countArray.reduce<Record<string, number>>((acc, row) => {
    acc[row.role] = row.count;
    return acc;
  }, {});
  const ownerCount = Number(roleCounts.shop_owner || 0);
  const totalUsers = Object.values(roleCounts).reduce((sum, n) => sum + Number(n || 0), 0);
  const additionalUsersCount = Math.max(0, totalUsers - ownerCount);

  if (totalUsers >= planConfig.totalUsers) {
    const err = new Error('PLAN_USER_LIMIT_REACHED') as any;
    err.message_ar = 'لقد وصلت للحد الأقصى لعدد المستخدمين في باقتك. قم بالترقية أو احذف مستخدمًا.';
    err.message_en = "You have reached your plan's user limit. Upgrade your plan or remove a user.";
    throw err;
  }

  if (requestedRole !== 'shop_owner' && additionalUsersCount >= planConfig.additionalUsersLimit) {
    const err = new Error('PLAN_USER_LIMIT_REACHED') as any;
    err.message_ar = 'لقد وصلت للحد الأقصى لعدد المستخدمين في باقتك. قم بالترقية أو احذف مستخدمًا.';
    err.message_en = "You have reached your plan's user limit. Upgrade your plan or remove a user.";
    throw err;
  }

};

/** Who may create which roles (shop-level user management). */
function actorCanCreateUserRole(actorRole: string, requestedRole: string, shopHasBranchesPlan: boolean): boolean {
  if (actorRole === 'super_admin') {
    return [
      'shop_owner',
      'branch_manager',
      'multi_branch_manager',
      'cashier',
      'warehouse',
      'hr_manager',
      'employee',
      'accountant',
      'sales',
    ].includes(requestedRole);
  }
  if (actorRole === 'shop_owner') {
    const allowed = shopHasBranchesPlan
      ? ['branch_manager', 'multi_branch_manager', 'cashier', 'warehouse', 'hr_manager', 'employee', 'accountant', 'sales']
      : ['branch_manager', 'multi_branch_manager', 'cashier', 'warehouse', 'hr_manager', 'employee', 'accountant', 'sales'];
    return allowed.includes(requestedRole);
  }
  if (actorRole === 'branch_manager') {
    return ['cashier', 'warehouse'].includes(requestedRole);
  }
  if (actorRole === 'multi_branch_manager') {
    return ['branch_manager', 'cashier', 'warehouse'].includes(requestedRole);
  }
  return false;
}

function actorCanDeleteShopUser(actorRole: string, targetRole: string): boolean {
  if (targetRole === 'super_admin') return false;
  if (actorRole === 'super_admin') return true;
  if (actorRole === 'shop_owner') {
    return targetRole !== 'shop_owner';
  }
  if (actorRole === 'branch_manager') {
    return ['cashier', 'warehouse'].includes(targetRole);
  }
  if (actorRole === 'multi_branch_manager') {
    return ['branch_manager', 'cashier', 'warehouse'].includes(targetRole);
  }
  return false;
}

const generateInvoiceNumber = async (shopId?: number) => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const params: any[] = [];
  let where = `WHERE invoice_number LIKE ?`;
  params.push(`${prefix}%`);
  if (shopId) {
    where += ' AND shop_id = ?';
    params.push(shopId);
  }

  const [rows] = await pool.execute(
    `SELECT invoice_number FROM sales ${where} ORDER BY id DESC LIMIT 1`,
    params
  );
  const last = (rows as any[])[0]?.invoice_number as string | undefined;
  const lastNumber = last ? parseInt(last.replace(prefix, ''), 10) : 0;
  const next = String(lastNumber + 1).padStart(4, '0');
  return `${prefix}${next}`;
};

const insertNotification = async (
  payload: {
    shopId: number;
    source: 'pos' | 'online' | 'system';
    type: string;
    data?: Record<string, any> | null;
  },
  connection?: any
) => {
  try {
    const exec = connection?.execute ? connection.execute.bind(connection) : pool.execute.bind(pool);
    const text = buildNotificationText(payload.type, payload.data || null) || getFallbackText();
    const titleAr = text.titleAr || 'إشعار جديد';
    const titleEn = text.titleEn || 'New notification';
    const bodyAr = text.bodyAr || 'تم إنشاء إشعار جديد. افتح التفاصيل.';
    const bodyEn = text.bodyEn || 'A new notification was created. Open details.';
    const meta = payload.data ? JSON.stringify(payload.data) : null;
    try {
      await exec(
        `INSERT INTO notifications (shop_id, source, type, title_ar, title_en, body_ar, body_en, is_read, meta, payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [payload.shopId, payload.source, payload.type, titleAr, titleEn, bodyAr, bodyEn, meta, meta]
      );
    } catch (err: any) {
      // Backward compatibility: payload column may not exist yet.
      await exec(
        `INSERT INTO notifications (shop_id, source, type, title_ar, title_en, body_ar, body_en, is_read, meta)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [payload.shopId, payload.source, payload.type, titleAr, titleEn, bodyAr, bodyEn, meta]
      );
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[notifications] insert failed:', (err as any)?.message || err);
    }
  }
};

const INVENTORY_ALERT_ROLES = ['shop_owner', 'branch_manager', 'multi_branch_manager', 'warehouse'] as const;

function withInventoryAlertPayload(data: Record<string, any>) {
  return { ...data, playSound: true, alertRoles: [...INVENTORY_ALERT_ROLES] };
}

function userMatchesInventoryAlert(role: string | undefined, payload: Record<string, any> | null | undefined): boolean {
  if (!role) return false;
  if (role === 'super_admin') return true;
  const roles = Array.isArray(payload?.alertRoles) ? (payload!.alertRoles as any[]).map(String) : [...INVENTORY_ALERT_ROLES];
  return roles.includes(role);
}

const createSaleAndItems = async (req: any, paymentMethodOverride?: string, shopIdOverride?: number) => {
  const { items, paymentMethod, customerName, customerPhone, customerAddress } = req.body;
  const shopId = shopIdOverride ?? getShopId(req).shopId ?? (resolveShopId(req) ? Number(resolveShopId(req)) : null);
  if (!shopId) {
    throw new Error('shopId is required');
  }
  let saleBranchId: number | null = null;
  if (await shopUsesBranchInventory(shopId)) {
    saleBranchId = await resolveOptionalBranchId(req, shopId);
    if (!saleBranchId) {
      const [rows] = await pool.execute('SELECT id FROM branches WHERE shop_id = ? ORDER BY id ASC LIMIT 1', [shopId]);
      saleBranchId = Number((rows as any[])[0]?.id || 0) || null;
    }
  }
  if (!items || items.length === 0) {
    throw new Error('Sale items required');
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const hasDiscountCols = await hasColumn('products', 'discount_type');
    const hasTaxRateId = await hasColumn('products', 'tax_rate_id');
    let prodSelect = hasDiscountCols
      ? 'SELECT id, sell_price, stock_quantity, discount_type, discount_value, discount_active'
      : 'SELECT id, sell_price, stock_quantity';
    if (hasTaxRateId) prodSelect += ', tax_rate_id';
    prodSelect += ' FROM products WHERE id = ? AND shop_id = ?';

    const [taxRows] = await connection.execute(
      'SELECT id, type, rate, inclusive, apply_before_discount FROM tax_rates WHERE shop_id = ? AND is_active = 1',
      [shopId]
    ).catch(() => [[]]);
    const taxMap = new Map<number, TaxRuleRow>();
    for (const row of (taxRows as any[])) {
      taxMap.set(row.id, {
        id: row.id,
        type: row.type || 'percentage',
        rate: Number(row.rate) || 0,
        inclusive: Boolean(row.inclusive),
        apply_before_discount: row.apply_before_discount !== 0,
      });
    }

    type ResolvedItem = {
      productId: number;
      quantity: number;
      unitPrice: number;
      factorToBase: number;
      unitId: number | null;
      productNameAr: string | null;
      productNameEn: string | null;
      productSku: string | null;
      productBarcode: string | null;
      unitPriceBeforeDiscount: number;
      unitDiscount: number;
      discountType: string | null;
      discountValue: number | null;
      discountApplied: number;
      taxRateId: number | null;
      taxRatePct: number;
      taxAmount: number;
      lineTotalBeforeTax: number;
      lineTotalAfterTax: number;
    };

    const resolvedItems: ResolvedItem[] = [];
    let totalAmount = 0;
    let totalBeforeDiscount = 0;
    let discountTotal = 0;
    let totalTax = 0;
    let subtotal = 0;

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      if (!Number.isFinite(productId) || productId <= 0) continue;

      const applyDiscount = item.applyDiscount !== false;

      const [prodRows] = await connection.execute(prodSelect, [productId, shopId]);
      const prod = (prodRows as any[])[0];
      if (!prod) {
        await connection.rollback();
        throw new Error(`Product ${productId} not found`);
      }

      const sellPrice = Number(prod.sell_price || 0);
      const sellPriceRounded = Math.round(sellPrice * 100) / 100;

      let unitPrice: number;
      let unitPriceBeforeDiscount = sellPriceRounded;
      let unitDiscount = 0;
      let discountType: string | null = null;
      let discountValue: number | null = null;
      let discountApplied = 1;

      if (applyDiscount && hasDiscountCols && prod.discount_active && prod.discount_type !== 'none') {
        const { unitPriceAfterDiscount, unitDiscount: ud } = computeProductUnitPrice(
          sellPrice,
          prod.discount_active,
          String(prod.discount_type || 'none'),
          prod.discount_value
        );
        unitPrice = unitPriceAfterDiscount;
        unitPriceBeforeDiscount = sellPriceRounded;
        unitDiscount = ud;
        discountType = String(prod.discount_type || 'none');
        discountValue = prod.discount_value != null ? Number(prod.discount_value) : null;
        discountApplied = 1;
      } else {
        unitPrice = sellPriceRounded;
        unitPriceBeforeDiscount = sellPriceRounded;
        unitDiscount = 0;
        discountType = null;
        discountValue = null;
        discountApplied = 0;
      }

      const factorToBase = Number(item.factorToBase) || 1;
      const quantityBase = quantity * factorToBase;
      let stock: number;
      if (saleBranchId != null) {
        const [invR] = await connection.execute(
          'SELECT COALESCE(quantity, 0) AS q FROM branch_inventory WHERE shop_id = ? AND branch_id = ? AND product_id = ?',
          [shopId, saleBranchId, productId]
        );
        stock = Number((invR as any[])[0]?.q ?? 0);
      } else {
        await connection.rollback();
        throw new Error('Branch not found');
      }
      if (stock < quantityBase) {
        await connection.rollback();
        throw new Error(`Insufficient stock for product ${productId}: requested ${quantityBase} base units, available ${stock}`);
      }

      const lineDiscountTotal = unitDiscount * quantity;
      const taxRule = resolveTaxRule(taxMap, prod.tax_rate_id, !!hasTaxRateId);
      const applyTaxBeforeDiscount = taxRule ? taxRule.apply_before_discount : true;
      const baseForTax = applyTaxBeforeDiscount ? unitPriceBeforeDiscount * quantity - lineDiscountTotal : unitPrice * quantity;
      const { lineTotalBeforeTax, taxAmount, lineTotalAfterTax, taxRatePct } = computeLineTax(
        applyTaxBeforeDiscount ? unitPriceBeforeDiscount : unitPrice,
        quantity,
        taxRule,
        lineDiscountTotal,
        applyTaxBeforeDiscount
      );
      const taxRateIdVal = hasTaxRateId && prod.tax_rate_id ? prod.tax_rate_id : null;

      resolvedItems.push({
        productId,
        quantity,
        unitPrice,
        factorToBase,
        unitId: item.unitId ?? null,
        productNameAr: prod.name_ar || prod.name_en || null,
        productNameEn: prod.name_en || prod.name_ar || null,
        productSku: prod.sku || null,
        productBarcode: prod.barcode || null,
        unitPriceBeforeDiscount,
        unitDiscount,
        discountType,
        discountValue,
        discountApplied,
        taxRateId: taxRateIdVal,
        taxRatePct,
        taxAmount,
        lineTotalBeforeTax,
        lineTotalAfterTax,
      });
      totalBeforeDiscount += unitPriceBeforeDiscount * quantity;
      discountTotal += unitDiscount * quantity;
      totalTax += taxAmount;
      subtotal += lineTotalBeforeTax;
      totalAmount += lineTotalAfterTax;
    }

    if (resolvedItems.length === 0) {
      await connection.rollback();
      throw new Error('No valid sale items');
    }

    const invoiceNumber = await generateInvoiceNumber(shopId);
    const normalizePosPaymentMethod = (value: unknown): string => {
      const v = String(value || '').trim().toLowerCase();
      if (!v) return 'cash';
      if (v === 'cash' || v === 'cod') return 'cash';
      if (v === 'bank' || v === 'transfer' || v === 'bank_transfer' || v === 'wire' || v === 'تحويل' || v === 'بنكي') return 'bank';
      if (v === 'card' || v === 'visa' || v === 'mastercard' || v === 'credit' || v === 'debit') return 'card';
      if (v === 'invoice') return 'invoice';
      if (v === 'on_account' || v === 'on-account' || v === 'onaccount') return 'on_account';
      if (v === 'other') return 'other';
      return 'other';
    };
    const resolveSalesPaymentMethod = async (normalized: string): Promise<string> => {
      const colType = await getColumnType('sales', 'payment_method');
      if (colType && colType.toLowerCase().startsWith('enum(')) {
        const allowed = colType
          .slice(5, -1)
          .split(',')
          .map((s) => s.trim().replace(/^'|'$/g, ''));
        if (!allowed.includes(normalized)) {
          if (normalized === 'bank' && allowed.includes('card')) return 'card';
          if (allowed.includes('other')) return 'other';
          if (allowed.includes('cash')) return 'cash';
          return allowed[0] || normalized;
        }
      }
      return normalized;
    };
    const pmRaw = paymentMethodOverride || paymentMethod || 'cash';
    const pmNormalized = normalizePosPaymentMethod(pmRaw);
    const pm = await resolveSalesPaymentMethod(pmNormalized);
    const isOnAccount = pmNormalized === 'on_account';
    const paymentStatus = isOnAccount ? 'unpaid' : 'paid';
    const hasPaymentStatus = await hasColumn('sales', 'payment_status');
    const hasSalesTaxCols = await hasColumn('sales', 'subtotal');
    const hasSalesBranchId = await hasColumn('sales', 'branch_id');
    let salesInsertCols = hasPaymentStatus
      ? 'shop_id, user_id, invoice_number, customer_name, customer_phone, customer_address, total_amount, payment_method, payment_status, paid_at'
      : 'shop_id, user_id, invoice_number, customer_name, customer_phone, customer_address, total_amount, payment_method';
    if (hasSalesTaxCols) salesInsertCols += ', subtotal, total_discount, total_tax, grand_total';
    if (hasSalesBranchId) salesInsertCols += ', branch_id';
    const salesPlaceholders = hasPaymentStatus ? '?, ?, ?, ?, ?, ?, ?, ?, ?, ?' : '?, ?, ?, ?, ?, ?, ?, ?';
    const salesInsertVals = 'VALUES (' + salesPlaceholders + (hasSalesTaxCols ? ', ?, ?, ?, ?' : '') + (hasSalesBranchId ? ', ?' : '') + ')';
    const insertParams: any[] = [
      shopId,
      req.user.id,
      invoiceNumber,
      customerName || null,
      customerPhone || null,
      customerAddress || null,
      totalAmount,
      pm,
    ];
    if (hasPaymentStatus) {
      insertParams.push(paymentStatus);
      insertParams.push(isOnAccount ? null : new Date());
    }
    if (hasSalesTaxCols) {
      insertParams.push(subtotal, discountTotal, totalTax, totalAmount);
    }
    if (hasSalesBranchId) {
      insertParams.push(saleBranchId);
    }
    const [saleResult] = await connection.execute(
      `INSERT INTO sales (${salesInsertCols}) ${salesInsertVals}`,
      insertParams
    );
    const saleInsert = saleResult as any;
    const saleId = saleInsert.insertId;

    const hasSaleItemDiscountCols = await hasColumn('sale_items', 'unit_price_before_discount');
    const hasSaleItemTaxCols = await hasColumn('sale_items', 'tax_amount');
    const hasSaleItemNameCols = await hasColumn('sale_items', 'product_name_ar');
    const hasSaleItemSkuCol = await hasColumn('sale_items', 'product_sku');
    const hasSaleItemBarcodeCol = await hasColumn('sale_items', 'product_barcode');
    const insertColsArr: string[] = [
      'sale_id',
      'product_id',
      'quantity',
      'unit_price',
      'total_price',
      'unit_id',
      'quantity_base_units',
    ];
    if (hasSaleItemNameCols) insertColsArr.push('product_name_ar', 'product_name_en');
    if (hasSaleItemSkuCol) insertColsArr.push('product_sku');
    if (hasSaleItemBarcodeCol) insertColsArr.push('product_barcode');
    if (hasSaleItemDiscountCols) {
      insertColsArr.push(
        'unit_price_before_discount',
        'unit_discount',
        'discount_type',
        'discount_value',
        'discount_applied'
      );
    }
    if (hasSaleItemTaxCols) {
      insertColsArr.push(
        'tax_rate_id',
        'tax_rate',
        'tax_amount',
        'line_total_before_tax',
        'line_total_after_tax'
      );
    }
    const insertCols = insertColsArr.join(', ');
    const insertPlaceholders = insertColsArr.map(() => '?').join(', ');

    for (const item of resolvedItems) {
      const quantityBase = item.quantity * item.factorToBase;
      const lineTotal = item.lineTotalAfterTax ?? (item.quantity * item.unitPrice);
      const insertParams: any[] = [
        saleId,
        item.productId,
        item.quantity,
        item.unitPrice,
        lineTotal,
        item.unitId,
        quantityBase,
      ];
      if (hasSaleItemNameCols) {
        insertParams.push(item.productNameAr ?? null, item.productNameEn ?? null);
      }
      if (hasSaleItemSkuCol) insertParams.push(item.productSku ?? null);
      if (hasSaleItemBarcodeCol) insertParams.push(item.productBarcode ?? null);
      if (hasSaleItemDiscountCols) {
        insertParams.push(
          item.unitPriceBeforeDiscount,
          item.unitDiscount,
          item.discountType,
          item.discountValue,
          item.discountApplied
        );
      }
      if (hasSaleItemTaxCols) {
        insertParams.push(
          item.taxRateId,
          item.taxRatePct,
          item.taxAmount,
          item.lineTotalBeforeTax,
          item.lineTotalAfterTax
        );
      }
      await connection.execute(
        `INSERT INTO sale_items (${insertCols}) VALUES (${insertPlaceholders})`,
        insertParams
      );
      if (saleBranchId == null || !Number.isFinite(saleBranchId)) {
        await connection.rollback();
        throw new Error('Selected branch is required');
      }
      const [invUpdate] = await connection.execute(
        `UPDATE branch_inventory
         SET quantity = quantity - ?
         WHERE shop_id = ? AND branch_id = ? AND product_id = ? AND quantity >= ?`,
        [quantityBase, shopId, saleBranchId, item.productId, quantityBase]
      );
      if (Number((invUpdate as any)?.affectedRows || 0) === 0) {
        await connection.rollback();
        throw new Error('Insufficient stock');
      }
      if (await hasTable('stock_movements')) {
        await connection.execute(
          'INSERT INTO stock_movements (shop_id, product_id, branch_id, type, quantity, reference) VALUES (?, ?, ?, ?, ?, ?)',
          [shopId, item.productId, saleBranchId, 'OUT', quantityBase, `sale_id:${saleId}`]
        );
      }
    }

    if (!isOnAccount) {
      await connection.execute(
        `INSERT INTO vault_transactions (shop_id, user_id, type, amount, reason, related_sale_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          shopId,
          req.user.id,
          'in',
          totalAmount,
          pm,
          saleId,
        ]
      );
    }

    await connection.execute(
      `INSERT INTO audit_logs (shop_id, user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        shopId,
        req.user.id,
        'New Sale',
        'sale',
        saleId,
        JSON.stringify({ invoiceNumber, totalAmount, paymentMethod: pm }),
        req.ip || null,
      ]
    );

    // Auto journal entry (double-entry) for sale
    try {
      const [jeTable] = await connection.execute(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'journal_entries'"
      );
      if ((jeTable as any[]).length > 0) {
        const accts = await ensureDefaultAccounts(connection, shopId);
        const cashId = accts.get('1000');
        const arId = accts.get('1200');
        const salesId = accts.get('4000');
        const taxId = accts.get('7000');
        const saleDate = new Date().toISOString().slice(0, 10);
        const dateCol = (await hasColumn('journal_entries', 'date')) ? 'date' : 'entry_date';
        const [jeRes] = await connection.execute(
          `INSERT INTO journal_entries (shop_id, ${dateCol}, reference, description, source_type, source_id) VALUES (?, ?, ?, ?, ?, ?)`,
          [shopId, saleDate, invoiceNumber, `Sale ${invoiceNumber}`, 'sale', saleId]
        );
        const jeId = (jeRes as any).insertId;
        const isOnAcc = pm === 'on_account';
        const drAccount = isOnAcc ? (arId ?? cashId) : (cashId ?? arId);
        if (drAccount && salesId && totalAmount > 0) {
          await connection.execute(
            'INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)',
            [jeId, drAccount, totalAmount]
          );
          const revenueAmount = subtotal ?? (totalAmount - totalTax);
          await connection.execute(
            'INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)',
            [jeId, salesId, revenueAmount]
          );
          if (taxId && totalTax > 0) {
            await connection.execute(
              'INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)',
              [jeId, taxId, totalTax]
            );
          }
        }
      }
    } catch (_) {
      // ignore if accounting tables not ready
    }

    const itemsCount = resolvedItems.length;
    await insertNotification(
      {
        shopId,
        source: 'pos',
        type: 'pos_sale_created',
        data: {
          invoiceId: saleId,
          saleId,
          invoiceNumber,
          total: totalAmount,
          itemsCount,
        },
      },
      connection
    );

    await connection.commit();

    const [sales] = await connection.execute(
      `
      SELECT s.*, 
             GROUP_CONCAT(
               CONCAT(si.quantity, 'x ', p.name_en, ' @ ', si.unit_price)
               SEPARATOR ', '
             ) as items_summary
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.id = ?
      GROUP BY s.id
      `,
      [saleId]
    );

    const saleRow = (sales as any[])[0];
    return {
      saleId,
      sale: saleRow,
      invoiceNumber,
      totalBeforeDiscount: totalBeforeDiscount,
      discountTotal: discountTotal,
      totalAmount,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/** Resolve login identifier against username/email and optional soft-delete column (avoids ER_BAD_FIELD_ERROR fallbacks that broke email login). */
const findUsersForLoginIdentifier = async (identifier: string): Promise<any[]> => {
  const hasEmailCol = await hasColumn('users', 'email');
  const hasDeletedAtCol = await hasColumn('users', 'deleted_at');
  let sql = 'SELECT * FROM users WHERE ';
  const params: any[] = [];
  if (hasEmailCol) {
    sql += '(username = ? OR email = ?)';
    params.push(identifier, identifier);
  } else {
    sql += 'username = ?';
    params.push(identifier);
  }
  if (hasDeletedAtCol) {
    sql += ' AND (deleted_at IS NULL)';
  }
  const [rows] = await pool.execute(sql, params);
  return rows as any[];
};

/** Same tax/discount math as createSaleAndItems, without stock checks or inserts — for POS cart preview. */
const previewPosCartTotals = async (req: any, shopId: number) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { subtotal: 0, totalTax: 0, discountTotal: 0, grandTotal: 0, totalBeforeDiscount: 0 };
  }

  const connection = await pool.getConnection();
  try {
    const hasDiscountCols = await hasColumn('products', 'discount_type');
    const hasTaxRateId = await hasColumn('products', 'tax_rate_id');
    let prodSelect = hasDiscountCols
      ? 'SELECT id, sell_price, stock_quantity, discount_type, discount_value, discount_active'
      : 'SELECT id, sell_price, stock_quantity';
    if (hasTaxRateId) prodSelect += ', tax_rate_id';
    prodSelect += ' FROM products WHERE id = ? AND shop_id = ?';

    const [taxRows] = await connection.execute(
      'SELECT id, type, rate, inclusive, apply_before_discount FROM tax_rates WHERE shop_id = ? AND is_active = 1',
      [shopId]
    ).catch(() => [[]]);
    const taxMap = new Map<number, TaxRuleRow>();
    for (const row of taxRows as any[]) {
      taxMap.set(row.id, {
        id: row.id,
        type: row.type || 'percentage',
        rate: Number(row.rate) || 0,
        inclusive: Boolean(row.inclusive),
        apply_before_discount: row.apply_before_discount !== 0,
      });
    }

    let totalBeforeDiscount = 0;
    let discountTotal = 0;
    let totalTax = 0;
    let subtotal = 0;
    let totalAmount = 0;

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      if (!Number.isFinite(productId) || productId <= 0) continue;

      const applyDiscount = item.applyDiscount !== false;

      const [prodRows] = await connection.execute(prodSelect, [productId, shopId]);
      const prod = (prodRows as any[])[0];
      if (!prod) continue;

      const sellPrice = Number(prod.sell_price || 0);
      const sellPriceRounded = Math.round(sellPrice * 100) / 100;

      let unitPrice: number;
      let unitPriceBeforeDiscount = sellPriceRounded;
      let unitDiscount = 0;

      if (applyDiscount && hasDiscountCols && prod.discount_active && prod.discount_type !== 'none') {
        const { unitPriceAfterDiscount, unitDiscount: ud } = computeProductUnitPrice(
          sellPrice,
          prod.discount_active,
          String(prod.discount_type || 'none'),
          prod.discount_value
        );
        unitPrice = unitPriceAfterDiscount;
        unitPriceBeforeDiscount = sellPriceRounded;
        unitDiscount = ud;
      } else {
        unitPrice = sellPriceRounded;
        unitPriceBeforeDiscount = sellPriceRounded;
        unitDiscount = 0;
      }

      const lineDiscountTotal = unitDiscount * quantity;
      const taxRule = resolveTaxRule(taxMap, prod.tax_rate_id, !!hasTaxRateId);
      const applyTaxBeforeDiscount = taxRule ? taxRule.apply_before_discount : true;
      const { lineTotalBeforeTax, taxAmount, lineTotalAfterTax } = computeLineTax(
        applyTaxBeforeDiscount ? unitPriceBeforeDiscount : unitPrice,
        quantity,
        taxRule,
        lineDiscountTotal,
        applyTaxBeforeDiscount
      );

      totalBeforeDiscount += unitPriceBeforeDiscount * quantity;
      discountTotal += unitDiscount * quantity;
      totalTax += taxAmount;
      subtotal += lineTotalBeforeTax;
      totalAmount += lineTotalAfterTax;
    }

    return {
      subtotal,
      totalTax,
      discountTotal,
      grandTotal: totalAmount,
      totalBeforeDiscount,
    };
  } finally {
    connection.release();
  }
};

// ========== AUTHENTICATION ROUTES ==========
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, password, role, package: pkg, shopId } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const requestedRole = role || 'cashier';
    if (!['super_admin', 'shop_owner', 'cashier', 'warehouse'].includes(requestedRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (requestedRole !== 'super_admin' && !shopId) {
      return res.status(400).json({ error: 'shopId is required for non-admin users' });
    }

    if (requestedRole !== 'super_admin') {
      try {
        await enforcePlanLimits(shopId, requestedRole);
      } catch (planError: any) {
        if (planError.message === 'Shop not found') {
          return res.status(404).json({ error: 'Shop not found' });
        }
        return res.status(403).json({ error: planError.message });
      }
    }

    let finalPackage = pkg || 'bronze';
    if (shopId) {
      const [shops] = await pool.execute('SELECT package FROM shops WHERE id = ?', [shopId]);
      const shopArray = shops as any[];
      if (shopArray.length > 0) {
        finalPackage = shopArray[0].package || finalPackage;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, role, package, shop_id) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, requestedRole, finalPackage, shopId || null]
    );

    const insertResult = result as any;
    res.status(201).json({ 
      id: insertResult.insertId, 
      username, 
      role: requestedRole,
      package: finalPackage
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const usernameInput = String(req.body?.username || '').trim();
    const emailInput = String(req.body?.email || '').trim();
    const password = req.body?.password;
    const identifier = usernameInput || emailInput;

    const hasUsername = !!usernameInput;
    const hasEmail = !!emailInput;
    const hasPassword = !!password;
    console.log('[AUTH] login start', { hasUsername, hasEmail, hasPassword });

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    console.log('[AUTH] lookup user');
    const userArray = await findUsersForLoginIdentifier(identifier);

    if (userArray.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userArray[0];
    const disabled = await isUserDisabled(Number(user.id));
    if (disabled) {
      return res.status(403).json({
        error: 'ACCOUNT_DISABLED',
        message: 'Account disabled. Contact support.',
        message_ar: 'تم تعطيل الحساب. تواصل مع الدعم الفني.',
      });
    }
    const storedHash = user.password ?? user.password_hash ?? null;
    if (!storedHash || typeof storedHash !== 'string') {
      console.warn('[AUTH] user has no password hash');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[AUTH] before password compare');
    let validPassword = false;
    try {
      validPassword = await bcrypt.compare(String(password), storedHash);
    } catch (bcryptErr: any) {
      // Invalid/corrupt hash or bcrypt format — must not become a 500
      console.error('[AUTH] bcrypt.compare failed:', bcryptErr?.message || bcryptErr);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[AUTH] before token sign');
    try {
      const userIdNum = Number(user.id);
      if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
        console.error('[AUTH] invalid user id from DB', user.id);
        return res.status(500).json({ ok: false, error: 'Login failed (server error)', message: 'Login failed (server error)' });
      }

      const shopIdRaw = user.shop_id ?? user.shopId;
      const shopIdNum =
        shopIdRaw != null && String(shopIdRaw).trim() !== '' ? Number(shopIdRaw) : NaN;
      const hasShop = Number.isFinite(shopIdNum) && shopIdNum > 0;

      if (hasShop) {
        try {
          const synced = await syncShopSubscription(shopIdNum);
          if (synced?.plan) {
            user.package = synced.plan;
          }
        } catch (subErr: any) {
          console.error('[AUTH] syncShopSubscription failed (non-fatal):', subErr?.message || subErr);
        }
      }

      const pkgStr = user.package != null && String(user.package).trim() !== '' ? String(user.package) : 'bronze';
      const roleStr = String(user.role || '');

      const sessionNonce = await issueLoginSessionNonce(userIdNum);
      const token = jwt.sign(
        { userId: userIdNum, role: roleStr, package: pkgStr, shopId: hasShop ? shopIdNum : null, sessionNonce },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      console.log('[AUTH] after token sign');

      const displayName = await resolveUserDisplayName(user);
      if (hasShop) {
        void logShopActivity(pool, {
          shopId: shopIdNum,
          userId: userIdNum,
          action: 'auth.login',
          entityType: 'session',
          entityId: null,
          meta: { username: String(user.username || '') },
          req: req as any,
        });
      }
      res.json({
        token,
        user: {
          id: userIdNum,
          name: displayName || undefined,
          username: String(user.username || ''),
          role: roleStr,
          package: pkgStr,
          shopId: hasShop ? shopIdNum : undefined,
        },
      });
    } catch (signErr: any) {
      console.error('[AUTH] token/response error:', signErr?.message || signErr);
      return res.status(500).json({ ok: false, error: 'Login failed (server error)', message: 'Login failed (server error)' });
    }
  } catch (error: any) {
    console.error('[AUTH] login error:', error?.message || error);
    res.status(500).json({ ok: false, error: 'Login failed (server error)', message: 'Login failed (server error)' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res: Response) => {
  const displayName = await resolveUserDisplayName(req.user);
  res.json({
    user: {
      id: req.user.id,
      name: displayName || undefined,
      username: req.user.username,
      role: req.user.role,
      package: req.user.package,
      shopId: req.user.shop_id,
    },
  });
});

app.post('/api/auth/register-shop', async (req: Request, res: Response) => {
  try {
    const {
      username,
      password,
      businessName,
      ownerName,
      activityType,
      address,
      contactEmail,
      contactPhone,
    } = req.body;

    if (!username || !password || !businessName) {
      return res.status(400).json({ error: 'Username, password, and business name are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const trialPlan: PlanId = 'gold';
    const trialEndsAt = new Date(Date.now() + 7 * DAY_MS);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const [userResult] = await connection.execute(
        'INSERT INTO users (username, password, role, package, shop_id) VALUES (?, ?, ?, ?, ?)',
        [username, hashedPassword, 'shop_owner', trialPlan, null]
      );
      const userInsert = userResult as any;

      const [shopResult] = await connection.execute(
        `INSERT INTO shops (name, business_name, owner_name, activity_type, address, contact_email, contact_phone, owner_id, package, plan_type, is_active, trial_ends_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          businessName,
          businessName,
          ownerName || null,
          activityType || null,
          address || null,
          contactEmail || null,
          contactPhone || null,
          userInsert.insertId,
          trialPlan,
          trialPlan,
          1,
          trialEndsAt,
        ]
      );
      const shopInsert = shopResult as any;

      await connection.execute('UPDATE users SET shop_id = ? WHERE id = ?', [shopInsert.insertId, userInsert.insertId]);
      await connection.execute(
        `INSERT INTO shop_subscriptions (shop_id, plan, status, started_at, expires_at, activation_source, activation_code, last_activated_at, activated_by_user_id)
         VALUES (?, ?, 'active', NOW(), ?, 'trial', NULL, NOW(), ?)
         ON DUPLICATE KEY UPDATE
           plan = VALUES(plan),
           status = 'active',
           expires_at = VALUES(expires_at),
           activation_source = 'trial',
           activation_code = NULL,
           last_activated_at = NOW(),
           activated_by_user_id = VALUES(activated_by_user_id)`,
        [shopInsert.insertId, trialPlan, trialEndsAt, userInsert.insertId]
      );
      await connection.commit();

      const sessionNonce = await issueLoginSessionNonce(Number(userInsert.insertId));
      const token = jwt.sign(
        { userId: userInsert.insertId, role: 'shop_owner', package: trialPlan, shopId: shopInsert.insertId, sessionNonce },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        token,
        user: {
          id: userInsert.insertId,
          name: ownerName || username,
          username,
          role: 'shop_owner',
          package: trialPlan,
          shopId: shopInsert.insertId,
        },
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [email]);
    const userArray = users as any[];
    if (userArray.length === 0) {
      return res.json({ message: 'If an account exists, a reset link will be sent.' });
    }

    const user = userArray[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await pool.execute(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const resetLink = `${appUrl}/reset-password/${token}`;
    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Reset your Crown ERP password',
      text: `Use this secure link to reset your password: ${resetLink}`,
      html: `<p>Use this secure link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
    });

    res.json({ message: 'Password reset email sent' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    const resetArray = rows as any[];
    if (resetArray.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const reset = resetArray[0];
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, reset.user_id]);
    await pool.execute('DELETE FROM password_resets WHERE user_id = ?', [reset.user_id]);

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GEMINI AI ASSISTANT ==========
/** Lightweight status for the floating assistant (mode badge); does not call Gemini. */
app.get('/api/ai/status', authenticateToken, (_req: Request, res: Response) => {
  const cloud = Boolean(getGeminiClient());
  res.json({
    ok: true,
    mode: cloud ? 'cloud' : 'offline',
    model: GEMINI_MODEL,
  });
});

/** Monthly AI/OCR usage + near-expiry product count (plan-aware). Cached briefly server-side. */
app.get('/api/shop/usage', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    if (req.user?.role === 'super_admin') {
      return res.json({
        ok: true,
        bypass: true,
        usage: null,
        nearExpiryCount: 0,
      });
    }
    const snap = await usageLimits.getUsageSnapshot(shopId);
    let nearExpiryCount = 0;
    try {
      const [nrows] = await pool.execute(
        `SELECT COUNT(*) as c FROM products
         WHERE shop_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)
           AND expiry_date IS NOT NULL
           AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
           AND expiry_date >= CURDATE()`,
        [shopId]
      );
      nearExpiryCount = Number((nrows as any[])[0]?.c ?? 0);
    } catch {
      // expiry_date may be missing on very old DB until migration runs
    }
    res.json({ ok: true, usage: snap, nearExpiryCount });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message || 'usage failed' });
  }
});

async function handleRedeemAiCode(req: any, res: Response) {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const raw = req.body?.code ?? req.body?.aiCode;
    const r = await usageLimits.redeemAiCode(shopId, String(raw ?? ''));
    if (!r.ok) return res.status(400).json({ ok: false, error: (r as { ok: false; error: string }).error });
    res.json({
      ok: true,
      message: 'Code redeemed successfully. Your AI and OCR limits have been updated.',
      messageAr: 'تم تطبيق الكود بنجاح. تم تحديث حدود الذكاء الاصطناعي والمسح الضوئي.',
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message || 'redeem failed' });
  }
}

app.post('/api/shop/redeem-ai-code', authenticateToken, requireRole('super_admin', 'shop_owner'), handleRedeemAiCode);

/** Backward-compatible alias (same behavior as /api/shop/redeem-ai-code). */
app.post('/api/redeem-ai-code', authenticateToken, requireRole('super_admin', 'shop_owner'), handleRedeemAiCode);

function generateRandomAiAddonCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 12; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `AI-${suffix}`;
}

app.post('/api/admin/ai-codes', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    let code = String(req.body?.code ?? '').trim().toUpperCase();
    const aiMessages = Math.max(0, Math.floor(Number(req.body?.ai_messages ?? req.body?.aiMessages ?? 0)));
    const ocrCredits = Math.max(0, Math.floor(Number(req.body?.ocr_credits ?? req.body?.ocrCredits ?? 0)));
    const validDays = Math.floor(
      Number(req.body?.validDays ?? req.body?.valid_days ?? req.body?.code_validity_days ?? NaN)
    );
    if (aiMessages === 0 && ocrCredits === 0) {
      return res.status(400).json({ ok: false, error: 'ai_messages or ocr_credits required' });
    }
    if (!Number.isFinite(validDays) || validDays < 1) {
      return res.status(400).json({
        ok: false,
        error: 'validDays is required — enter how many days the unused code stays valid (e.g. 90).',
      });
    }

    if (!code) {
      let inserted = false;
      for (let attempt = 0; attempt < 8 && !inserted; attempt++) {
        const candidate = generateRandomAiAddonCode();
        try {
          await pool.execute(
            `INSERT INTO ai_codes (code, ai_messages, ocr_credits, expires_at, is_used) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), 0)`,
            [candidate, aiMessages, ocrCredits, validDays]
          );
          code = candidate;
          inserted = true;
        } catch (e: any) {
          if (e?.code !== 'ER_DUP_ENTRY') throw e;
        }
      }
      if (!inserted) {
        return res.status(500).json({ ok: false, error: 'Could not generate a unique code; try again' });
      }
      const [expRows] = await pool.execute(`SELECT expires_at FROM ai_codes WHERE code = ? LIMIT 1`, [code]);
      const expiresAt = Array.isArray(expRows) && expRows[0] ? (expRows[0] as any).expires_at : null;
      return res.json({
        ok: true,
        code,
        ai_messages: aiMessages,
        ocr_credits: ocrCredits,
        valid_days: validDays,
        expires_at: expiresAt,
      });
    }

    await pool.execute(
      `INSERT INTO ai_codes (code, ai_messages, ocr_credits, expires_at, is_used) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), 0)`,
      [code, aiMessages, ocrCredits, validDays]
    );
    const [expRows2] = await pool.execute(`SELECT expires_at FROM ai_codes WHERE code = ? LIMIT 1`, [code]);
    const expiresAt2 = Array.isArray(expRows2) && expRows2[0] ? (expRows2[0] as any).expires_at : null;
    res.json({
      ok: true,
      code,
      ai_messages: aiMessages,
      ocr_credits: ocrCredits,
      valid_days: validDays,
      expires_at: expiresAt2,
    });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ ok: false, error: 'Code already exists' });
    }
    res.status(500).json({ ok: false, error: error?.message || 'create failed' });
  }
});

app.get('/api/admin/ai-codes', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const raw = String(req.query?.filter || 'all').toLowerCase();
    const filter = raw === 'active' || raw === 'expired' ? raw : 'all';
    let sql = `SELECT id, code, ai_messages, ocr_credits, expires_at, is_used, used_by_shop_id, used_at, created_at
               FROM ai_codes`;
    const params: any[] = [];
    if (filter === 'active') {
      sql += ` WHERE is_used = 0 AND (expires_at IS NULL OR expires_at >= NOW())`;
    } else if (filter === 'expired') {
      sql += ` WHERE is_used = 0 AND expires_at IS NOT NULL AND expires_at < NOW()`;
    }
    sql += ` ORDER BY created_at DESC`;
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'list failed' });
  }
});

app.delete('/api/admin/ai-codes/:id', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const id = parseInt(String(req.params?.id || ''), 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await pool.execute('DELETE FROM ai_codes WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'delete failed' });
  }
});

app.post('/api/chat', authenticateToken, requirePackageFeature('ai'), async (req: Request, res: Response) => {
  let detectedLang: 'ar' | 'en' = 'en';
  const startedAt = Date.now();
  try {
    if (!getGeminiClient()) {
      return res.status(400).json({
        error: 'AI API key is missing',
        hint:
          'Set GEMINI_API_KEY (or GOOGLE_API_KEY / VERTEX_GEMINI_API_KEY / API_KEY) on crown-api Cloud Run.',
      });
    }
    const body = (req as any).body || {};
    const { message } = body;
    const chatHistory = body.history;
    const aiContext = body?.aiContext || body?.context || {};
    const requestedLangRaw =
      body?.lang || body?.language || aiContext?.language || aiContext?.lang || aiContext?.languageCode;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }
    detectedLang = resolveChatReplyLanguageWithHistory(message, requestedLangRaw, chatHistory);
    /** TTS must follow UI `lang` from the client when sent (AR/EN), not reply detection (often mislabels Arabic as EN). */
    const rawUiLang = body?.lang ?? body?.language;
    const clientUiLangForTts: 'ar' | 'en' | null =
      rawUiLang === 'ar' || rawUiLang === 'en'
        ? (rawUiLang as 'ar' | 'en')
        : typeof rawUiLang === 'string' && rawUiLang.toLowerCase().startsWith('ar')
          ? 'ar'
          : null;
    const ttsLang = getTtsLocaleForLang(clientUiLangForTts ?? detectedLang);
    console.log('📩 Chat message:', { detectedLang, ttsLang, clientUiLangForTts, preview: String(message).slice(0, 120) });

    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const rawUid = (req as any).user?.id ?? (req as any).user?.userId ?? null;
    const userId = rawUid != null && Number.isFinite(Number(rawUid)) ? Number(rawUid) : null;

    if ((req as any).user?.role !== 'super_admin') {
      const aiPre = await usageLimits.checkAiAllowed(shopId);
      if (!aiPre.ok) {
        return res.status(429).json({
          error: 'AI limit reached',
          error_ar: 'تم بلوغ حد المساعد الذكي',
          message_en: 'AI monthly limit reached. Upgrade your plan or add AI credits from Settings.',
          message_ar: 'تم بلوغ حد المساعد الذكي الشهري. رقّي الباقة أو أضف رصيد AI من الإعدادات.',
          lang: detectedLang,
          ttsLang,
        });
      }
    }

    pruneChatCache();
    const cacheKey = chatCacheKey(shopId, userId, detectedLang, message);
    const cached = aiChatCache.get(cacheKey);
    if (cached && Date.now() - cached.at <= CHAT_CACHE_TTL_MS) {
      return res.json({
        ok: true,
        reply: cached.value.text,
        message: cached.value.text,
        lang: cached.value.lang,
        ttsLang: cached.value.ttsLang,
        cached: true,
      });
    }

    const [inventoryRows] = await pool.execute(
      `
      SELECT p.name_en, p.name_ar, p.stock_quantity, p.sell_price, p.brand
      FROM products p
      WHERE p.shop_id = ?
      ORDER BY p.stock_quantity DESC
      LIMIT 200
      `,
      [shopId]
    );

    const revenueFilter = `AND (s.payment_status IS NULL OR s.payment_status = '' OR s.payment_status = 'paid')
      AND (s.return_status IS NULL OR s.return_status = '' OR s.return_status != 'full')`;
    const revenueSum = 'COALESCE(SUM(s.total_amount - COALESCE(s.returned_amount, 0)), 0)';
    const [todayStatsRows] = await pool.execute(
      `
      SELECT 
        ${revenueSum} as today_revenue,
        COUNT(DISTINCT s.id) as today_sales
      FROM sales s
      WHERE s.shop_id = ?
      AND DATE(s.created_at) = CURRENT_DATE()
      ${revenueFilter}
      `,
      [shopId]
    );

    // Past 7 days sales/invoices (read-only analytics context)
    const [last7DaysRows] = await pool.execute(
      `
      SELECT
        DATE(s.created_at) as sale_date,
        ${revenueSum} as revenue,
        COUNT(DISTINCT s.id) as invoices
      FROM sales s
      WHERE s.shop_id = ?
        AND s.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      ${revenueFilter}
      GROUP BY DATE(s.created_at)
      ORDER BY sale_date ASC
      `,
      [shopId]
    );

    const [yesterdayRows] = await pool.execute(
      `
      SELECT
        ${revenueSum} as revenue,
        COUNT(DISTINCT s.id) as invoices
      FROM sales s
      WHERE s.shop_id = ?
        AND DATE(s.created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
      ${revenueFilter}
      `,
      [shopId]
    );

    const [recentInvoicesRows] = await pool.execute(
      `
      SELECT s.id, s.invoice_number, s.total_amount, s.payment_method, s.customer_name, s.created_at
      FROM sales s
      WHERE s.shop_id = ?
        AND s.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY s.created_at DESC
      LIMIT 25
      `,
      [shopId]
    );

    const [totalProductsRows] = await pool.execute(
      'SELECT COUNT(*) as total_products FROM products WHERE shop_id = ?',
      [shopId]
    );

    const [lowStockCountRows] = await pool.execute(
      'SELECT COUNT(*) as low_stock_count FROM products WHERE shop_id = ? AND stock_quantity <= min_stock_level',
      [shopId]
    );

    const [shopRows] = await pool.execute(
      `SELECT id, name, business_name, owner_name, activity_type, country_name, currency_code, currency_symbol, package, plan_type
       FROM shops WHERE id = ?`,
      [shopId]
    );
    const shopProfile = (shopRows as any[])[0] || {};

    const inventoryContextAr = (inventoryRows as any[])
      .map((item) => {
        const name = item.name_ar || item.name_en;
        const brand = item.brand ? `, ماركة ${item.brand}` : '';
        return `- ${name}: ${item.stock_quantity} في المخزن، السعر ${item.sell_price} جنيه${brand}`;
      })
      .join('\n');

    const inventoryContextEn = (inventoryRows as any[])
      .map((item) => {
        const name = item.name_en || item.name_ar;
        const brand = item.brand ? `, brand ${item.brand}` : '';
        return `- ${name}: ${item.stock_quantity} in stock, price ${item.sell_price} EGP${brand}`;
      })
      .join('\n');

    const stats = (todayStatsRows as any[])[0] || { today_revenue: 0, today_sales: 0 };
    const totalProducts = Number((totalProductsRows as any[])[0]?.total_products || 0);
    const lowStockCount = Number((lowStockCountRows as any[])[0]?.low_stock_count || 0);
    const yesterday = (yesterdayRows as any[])[0] || { revenue: 0, invoices: 0 };

    const last7 = (last7DaysRows as any[]).map((row) => ({
      date: row.sale_date ? String(row.sale_date).slice(0, 10) : null,
      revenue: Number(row.revenue || 0),
      invoices: Number(row.invoices || 0),
    }));

    const last7DaysContextAr =
      last7.length > 0
        ? last7
            .map((d) => `- ${d.date}: ${d.revenue} جنيه — ${d.invoices} فاتورة`)
            .join('\n')
        : 'لا توجد مبيعات خلال آخر 7 أيام.';

    const last7DaysContextEn =
      last7.length > 0
        ? last7
            .map((d) => `- ${d.date}: ${d.revenue} EGP — ${d.invoices} invoices`)
            .join('\n')
        : 'No sales in the last 7 days.';

    const recentInvoices = (recentInvoicesRows as any[]).map((row) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      totalAmount: Number(row.total_amount || 0),
      paymentMethod: row.payment_method,
      customerName: row.customer_name,
      createdAt: row.created_at,
    }));

    const ctxUser = aiContext?.user || {};
    const ctxStore = aiContext?.store || {};
    const authUser = (req as any).user || {};
    // Use only explicit display name or shop owner_name — never username/email prefix (e.g. "ahmed" from email)
    const rawUserName = String(ctxUser?.name || '').trim();
    const userRole = String(ctxUser?.role || authUser?.role || '').trim();
    let userName = rawUserName;
    if (!userName && userRole === 'shop_owner' && shopProfile?.owner_name) {
      userName = String(shopProfile.owner_name || '').trim();
    }
    const hasUserName = Boolean(userName);

    const shopName =
      String(
        shopProfile.business_name ||
          ctxStore?.name ||
          shopProfile.name ||
          (detectedLang === 'en' ? 'the store' : 'المتجر')
      ).trim() || (detectedLang === 'en' ? 'the store' : 'المتجر');
    const activityLabel =
      String(
        shopProfile.activity_type || ctxStore?.businessType || ctxStore?.category || ''
      ).trim() || (detectedLang === 'ar' ? 'غير محدد' : 'unspecified');
    const currencyCode = String(shopProfile.currency_code || ctxStore?.currency || 'EGP').trim();
    const countryName = String(shopProfile.country_name || ctxStore?.country || '').trim();
    const plan = normalizePlan(
      shopProfile.plan_type || shopProfile.package || authUser.package || ctxStore?.subscription || 'bronze'
    );
    const planFeatures = getPlanDefinition(plan).features;
    const roleLabelsAr: Record<string, string> = {
      super_admin: 'مدير النظام',
      shop_owner: 'مالك',
      branch_manager: 'مدير فرع',
      multi_branch_manager: 'مدير فروع',
      cashier: 'كاشير',
      warehouse: 'مخزن',
    };
    const roleLabelsEn: Record<string, string> = {
      super_admin: 'System admin',
      shop_owner: 'Owner',
      branch_manager: 'Branch manager',
      multi_branch_manager: 'Multi-branch manager',
      cashier: 'Cashier',
      warehouse: 'Warehouse',
    };
    const roleLabel =
      detectedLang === 'ar'
        ? roleLabelsAr[userRole] || userRole || 'مستخدم'
        : roleLabelsEn[userRole] || userRole || 'User';
    const featureLabelsAr: Record<string, string> = {
      ai: 'الذكاء الاصطناعي',
      onlineStore: 'المتجر الأونلاين',
      excelImport: 'استيراد Excel',
      manualEntry: 'الإدخال اليدوي',
      branches: 'الفروع',
      notifications: 'الإشعارات',
      reports: 'التقارير',
    };
    const featureLabelsEn: Record<string, string> = {
      ai: 'AI assistant',
      onlineStore: 'Online store',
      excelImport: 'Excel import',
      manualEntry: 'Manual entry',
      branches: 'Branches',
      notifications: 'Notifications',
      reports: 'Reports',
    };
    const enabledFeaturesAr = Object.entries(planFeatures)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => featureLabelsAr[key] || key)
      .filter(Boolean);
    const enabledFeaturesEn = Object.entries(planFeatures)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => featureLabelsEn[key] || key)
      .filter(Boolean);

    const whoLineAr = hasUserName
      ? `إنت بتتكلم مع "${userName}" (${roleLabel}) داخل متجر "${shopName}". نادِه باسمه أحياناً عشان يحس بالتخصيص.`
      : `إنت بتتكلم مع مستخدم داخل متجر "${shopName}" (${roleLabel}).`;
    const whoLineEn = hasUserName
      ? `You are speaking with "${userName}" (${roleLabel}) at "${shopName}".`
      : `You are speaking with a user at "${shopName}" (${roleLabel}).`;

    const streamRequested = Boolean(body?.stream);
    const confirmAction = body?.confirmAction;

    const agentInstructionsAr = `أنت Crown Agent — وكيل ذكي لنظام Crown Services ERP. أنت بتنفذ أوامر مباشرة.
${whoLineAr}

## سلوكك كوكيل (مهم جداً):
- لما المستخدم يقولك "اعمل فاتورة بيع" أو "بيع أرز" أو أي أمر بيع/إضافة/تعديل → **نفّذ فوراً** باستخدام الأدوات. ابحث عن المنتج الأول بـ search_products ثم اعمل create_sale.
- متسألش أسئلة كتير. لو المستخدم ذكر اسم المنتج والكمية → ابحث ونفّذ.
- لو المستخدم قال "بيع زيت شل واحدة كاش" → ابحث عن "زيت شل"، خد أول نتيجة، واعمل فاتورة بيع كاش.
- لو المستخدم قال "بيع أرز 3 كيلو" → ابحث عن "أرز"، خد أول نتيجة، كمية 3، واعمل فاتورة.
- لو المستخدم مقالش الكمية → افترض 1.
- لو المستخدم مقالش طريقة الدفع → افترض كاش.
- **فقط** اسأل توضيح لو مفيش أي اسم منتج أو الطلب غامض تماماً.
- لو البحث رجع أكتر من منتج متشابه، اختار الأقرب للاسم اللي قاله.
- لو البحث مرجعش حاجة، قل "المنتج مش موجود في المخزن" واقترح إضافته.

## لو المستخدم رفع صورة أو ملف:
- لو صورة فاتورة شراء: استخرج بيانات المنتجات (اسم، كمية، سعر) وبيانات المورد واعرضها بشكل واضح.
- لو ملف Excel/CSV: تعرّف على الأعمدة واعرض ملخص البيانات.
- بعد ما تعرض البيانات، اسأل المستخدم يأكد قبل ما تدخلها في المخزون.

## اللغة:
- رد بالعامية المصرية دايماً. لو المستخدم كتب إنجليزي، رد إنجليزي.
- ردود قصيرة ومباشرة. متكررش نفسك.

## معلومات المتجر:
النشاط: ${activityLabel} | الباقة: ${plan} | العملة: ${currencyCode} | البلد: ${countryName || 'غير محدد'}
اليوم: مبيعات ${stats.today_revenue} ${currencyCode} - فواتير ${stats.today_sales}
امبارح: مبيعات ${Number(yesterday.revenue || 0)} ${currencyCode} - فواتير ${Number(yesterday.invoices || 0)}
منخفض المخزون: ${lowStockCount} | إجمالي المنتجات: ${totalProducts}
خصائص الباقة: ${enabledFeaturesAr.join('، ')}
آخر 7 أيام:
${last7DaysContextAr}

## معرفة النظام الكاملة:
${SYSTEM_KNOWLEDGE}`;

    const agentInstructionsEn = `You are Crown Agent — an autonomous intelligent agent for Crown Services ERP. You EXECUTE commands directly.
${whoLineEn}

## Agent behavior (critical):
- When user says "create a sale" or "sell rice" or any sell/add/update command → **act immediately** using tools. Use search_products first then create_sale.
- Do NOT ask unnecessary questions. If the user mentioned a product name and quantity → search and execute.
- If user says "sell 1 shell oil cash" → search "shell oil", take first result, create sale with qty 1, cash.
- If user says "sell 3 rice" → search "rice", take first result, qty 3, create sale.
- If quantity not specified → assume 1.
- If payment method not specified → assume cash.
- **Only** ask for clarification if there is literally no product name or the request is completely ambiguous.
- If search returns multiple similar products, pick the closest match.
- If search returns nothing, say "product not found in inventory" and suggest adding it.

## When user uploads an image or file:
- If it's a purchase invoice image: extract product data (name, qty, price) and supplier info, display clearly.
- If it's Excel/CSV: identify columns and show data summary.
- After displaying extracted data, ask user to confirm before adding to inventory.

## Language:
- Reply in Egyptian Arabic by default. If user writes English, reply in English.
- Keep replies short and direct. Don't repeat yourself.

## Store info:
Business: ${activityLabel} | Plan: ${plan} | Currency: ${currencyCode} | Country: ${countryName || 'N/A'}
Today: revenue ${stats.today_revenue} ${currencyCode}, invoices ${stats.today_sales}
Yesterday: revenue ${Number(yesterday.revenue || 0)} ${currencyCode}, invoices ${Number(yesterday.invoices || 0)}
Low stock: ${lowStockCount} | Total products: ${totalProducts}
Plan features: ${enabledFeaturesEn.join(', ')}
Last 7 days:
${last7DaysContextEn}

## Full system knowledge:
${SYSTEM_KNOWLEDGE}`;

    const systemPrompt = detectedLang === 'ar' ? agentInstructionsAr : agentInstructionsEn;
    const userLine =
      detectedLang === 'ar'
        ? `رسالة المستخدم:\n${message}\n\n[إجباري: الرد بالعامية المصرية]`
        : `User message:\n${message}\n\n[Reply in English]`;

    const toolCtx: ToolContext = { pool, shopId, userId, userRole, lang: detectedLang };

    // ---------- Handle confirmed action (user pressed confirm) ----------
    if (confirmAction && typeof confirmAction === 'object') {
      const { toolName, toolArgs } = confirmAction;
      if (toolName && isWriteTool(toolName)) {
        try {
          const toolResult = await executeTool(toolName, toolArgs || {}, toolCtx);
          let summary: string;
          if (toolResult.ok) {
            if (toolName === 'create_sale') {
              const d = toolResult.data;
              summary = detectedLang === 'ar'
                ? `✅ تم إنشاء فاتورة بيع بنجاح!\nرقم الفاتورة: ${d.invoiceNumber}\nالإجمالي: ${d.totalAmount} ${currencyCode}\nطريقة الدفع: ${d.paymentMethod}\nعدد الأصناف: ${d.itemCount}\n\n${d.items.map((i: any) => `• ${i.name} × ${i.qty} = ${i.total} ${currencyCode}`).join('\n')}`
                : `✅ Sale invoice created successfully!\nInvoice #: ${d.invoiceNumber}\nTotal: ${d.totalAmount} ${currencyCode}\nPayment: ${d.paymentMethod}\nItems: ${d.itemCount}\n\n${d.items.map((i: any) => `• ${i.name} × ${i.qty} = ${i.total} ${currencyCode}`).join('\n')}`;
            } else if (toolName === 'add_product') {
              const d = toolResult.data;
              summary = detectedLang === 'ar'
                ? `✅ تم إضافة المنتج بنجاح!\nالاسم: ${d.nameAr || d.nameEn}\nالسعر: ${d.sellPrice} ${currencyCode}\nالكمية: ${d.stockQuantity}`
                : `✅ Product added successfully!\nName: ${d.nameEn || d.nameAr}\nPrice: ${d.sellPrice} ${currencyCode}\nStock: ${d.stockQuantity}`;
            } else if (toolName === 'update_product_price') {
              const d = toolResult.data;
              summary = detectedLang === 'ar'
                ? `✅ تم تعديل السعر بنجاح!\n${d.name}: ${d.oldPrice} → ${d.newPrice} ${currencyCode}`
                : `✅ Price updated!\n${d.name}: ${d.oldPrice} → ${d.newPrice} ${currencyCode}`;
            } else if (toolName === 'update_stock') {
              const d = toolResult.data;
              summary = detectedLang === 'ar'
                ? `✅ تم تحديث المخزون بنجاح!\n${d.name}: ${d.oldStock} → ${d.newStock}`
                : `✅ Stock updated!\n${d.name}: ${d.oldStock} → ${d.newStock}`;
            } else {
              summary = detectedLang === 'ar' ? '✅ تم التنفيذ بنجاح!' : '✅ Action executed successfully!';
            }
          } else {
            summary = detectedLang === 'ar'
              ? `❌ فشل التنفيذ: ${toolResult.error}`
              : `❌ Failed: ${toolResult.error}`;
          }
          if ((req as any).user?.role !== 'super_admin') {
            await usageLimits.recordAiMessage(shopId);
          }
          if (streamRequested) {
            res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders?.();
            const emit = (obj: Record<string, unknown>) => res.write(`${JSON.stringify(obj)}\n`);
            emit({ type: 'start', lang: detectedLang, ttsLang });
            emit({ type: 'done', ok: true, reply: summary, message: summary, lang: detectedLang, ttsLang, actionResult: toolResult });
            return res.end();
          }
          return res.json({ ok: true, reply: summary, message: summary, lang: detectedLang, ttsLang, actionResult: toolResult });
        } catch (err: any) {
          const errMsg = detectedLang === 'ar' ? `❌ خطأ: ${err?.message}` : `❌ Error: ${err?.message}`;
          return res.json({ ok: true, reply: errMsg, message: errMsg, lang: detectedLang, ttsLang });
        }
      }
    }

    // ---------- Main agent flow with Function Calling ----------
    // Helper to build confirmation summary for write tools
    const buildConfirmSummary = async (fcName: string, fcArgs: any): Promise<string> => {
      if (fcName === 'create_sale') {
        const searchResults: any[] = [];
        for (const it of (fcArgs.items || [])) {
          const [pRows] = await pool.execute('SELECT id, name_ar, name_en, sell_price, stock_quantity FROM products WHERE id = ? AND shop_id = ?', [it.productId, shopId]);
          const p = (pRows as any[])[0];
          if (p) searchResults.push({ id: p.id, name: p.name_ar || p.name_en, price: Number(p.sell_price), stock: Number(p.stock_quantity), qty: it.quantity });
        }
        if (searchResults.length > 0) {
          let total = 0;
          const lines = searchResults.map((sr) => {
            const lineTotal = sr.price * sr.qty;
            total += lineTotal;
            return `• ${sr.name} — ${sr.qty} × ${sr.price} = ${lineTotal} ${currencyCode}`;
          });
          return detectedLang === 'ar'
            ? `🔔 هل تريد إنشاء فاتورة بيع؟\n${lines.join('\n')}\n\n💰 الإجمالي: ${total} ${currencyCode}\nطريقة الدفع: ${fcArgs.paymentMethod || 'كاش'}`
            : `🔔 Create this sale?\n${lines.join('\n')}\n\n💰 Total: ${total} ${currencyCode}\nPayment: ${fcArgs.paymentMethod || 'cash'}`;
        }
        return detectedLang === 'ar' ? `🔔 هل تريد إنشاء فاتورة بيع؟` : `🔔 Create a sale?`;
      } else if (fcName === 'add_product') {
        return detectedLang === 'ar'
          ? `🔔 هل تريد إضافة منتج جديد؟\nالاسم: ${fcArgs.nameAr || fcArgs.nameEn || '—'}\nالسعر: ${fcArgs.sellPrice} ${currencyCode}\nالكمية: ${fcArgs.stockQuantity || 0}`
          : `🔔 Add this new product?\nName: ${fcArgs.nameEn || fcArgs.nameAr || '—'}\nPrice: ${fcArgs.sellPrice} ${currencyCode}\nStock: ${fcArgs.stockQuantity || 0}`;
      } else if (fcName === 'update_product_price') {
        const [pRows] = await pool.execute('SELECT name_ar, name_en, sell_price FROM products WHERE id = ? AND shop_id = ?', [fcArgs.productId, shopId]);
        const p = (pRows as any[])[0];
        const pName = p ? (p.name_ar || p.name_en) : `#${fcArgs.productId}`;
        return detectedLang === 'ar'
          ? `🔔 هل تريد تعديل سعر "${pName}"؟\nالسعر الحالي: ${p ? Number(p.sell_price) : '?'} → السعر الجديد: ${fcArgs.newPrice} ${currencyCode}`
          : `🔔 Update price of "${pName}"?\nCurrent: ${p ? Number(p.sell_price) : '?'} → New: ${fcArgs.newPrice} ${currencyCode}`;
      } else if (fcName === 'update_stock') {
        const [pRows] = await pool.execute('SELECT name_ar, name_en, stock_quantity FROM products WHERE id = ? AND shop_id = ?', [fcArgs.productId, shopId]);
        const p = (pRows as any[])[0];
        const pName = p ? (p.name_ar || p.name_en) : `#${fcArgs.productId}`;
        return detectedLang === 'ar'
          ? `🔔 هل تريد تحديث مخزون "${pName}"؟\nالكمية الحالية: ${p ? Number(p.stock_quantity) : '?'} → الكمية الجديدة: ${fcArgs.quantity}`
          : `🔔 Update stock of "${pName}"?\nCurrent: ${p ? Number(p.stock_quantity) : '?'} → New: ${fcArgs.quantity}`;
      }
      return detectedLang === 'ar' ? `🔔 هل تريد تنفيذ: ${fcName}؟` : `🔔 Execute: ${fcName}?`;
    };

    // Agent loop — uses systemInstruction in config + tools
    const agentConfig: any = {
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 1024,
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: CROWN_TOOL_DECLARATIONS }],
    };

    const runAgentLoop = async (): Promise<{ text?: string; pendingAction?: any; agentError?: string }> => {
      const client = getGeminiClient();
      if (!client) return { text: '', agentError: 'Gemini client not initialized' };

      const contents: any[] = [{ role: 'user', parts: [{ text: message }] }];
      let maxTurns = 5;

      while (maxTurns > 0) {
        maxTurns--;
        try {
          await throttleGeminiRequest();
          console.log(`[ai-agent] calling gemini model=${GEMINI_MODEL}, turns_left=${maxTurns}, contents_len=${contents.length}`);

          const genResult: any = await client.models.generateContent({
            model: GEMINI_MODEL,
            config: agentConfig,
            contents,
          });

          console.log(`[ai-agent] response received, has_text=${!!genResult?.text}, has_candidates=${!!genResult?.candidates}, has_functionCalls=${!!genResult?.functionCalls}`);

          // Extract function calls from all possible locations
          let fcName = '';
          let fcArgs: any = {};
          let fcId: string | undefined;
          let foundFc = false;

          // Method 1: SDK convenience property
          if (genResult?.functionCalls && genResult.functionCalls.length > 0) {
            const fc = genResult.functionCalls[0];
            fcName = fc.name;
            fcArgs = fc.args || {};
            fcId = fc.id;
            foundFc = true;
            console.log(`[ai-agent] FC via SDK: ${fcName}`, JSON.stringify(fcArgs).slice(0, 200));
          }

          // Method 2: candidates parts
          if (!foundFc) {
            const candidate = genResult?.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            for (const p of parts) {
              if (p.functionCall) {
                fcName = p.functionCall.name;
                fcArgs = p.functionCall.args || {};
                fcId = p.functionCall.id;
                foundFc = true;
                console.log(`[ai-agent] FC via parts: ${fcName}`, JSON.stringify(fcArgs).slice(0, 200));
                break;
              }
            }
          }

          if (foundFc && fcName) {
            if (isWriteTool(fcName)) {
              const summary = await buildConfirmSummary(fcName, fcArgs);
              return { text: summary, pendingAction: { toolName: fcName, toolArgs: fcArgs } };
            }

            const toolResult = await executeTool(fcName, fcArgs, toolCtx);
            console.log(`[ai-agent] tool_result: ${fcName} ok=${toolResult.ok}`);

            const fcObj: any = { name: fcName, args: fcArgs };
            if (fcId) fcObj.id = fcId;
            contents.push({ role: 'model', parts: [{ functionCall: fcObj }] });

            const frObj: any = { name: fcName, response: toolResult };
            if (fcId) frObj.id = fcId;
            contents.push({ role: 'user', parts: [{ functionResponse: frObj }] });
            continue;
          }

          // No function call — extract text response
          const textResult = genResult?.text || '';
          const candidate = genResult?.candidates?.[0];
          const partsText = (candidate?.content?.parts || []).filter((p: any) => p.text).map((p: any) => p.text).join('');
          const finalText = textResult || partsText || '';
          console.log(`[ai-agent] text response length=${finalText.length}`);

          if (finalText) return { text: finalText };
          break;
        } catch (loopErr: any) {
          console.error(`[ai-agent] ERROR in loop turn:`, loopErr?.message || loopErr, loopErr?.status, loopErr?.code);
          return { text: '', agentError: loopErr?.message || 'Agent loop error' };
        }
      }
      return { text: '' };
    };

    const agentResult = await runAgentLoop();

    // Log agent errors prominently
    if (agentResult.agentError) {
      console.error(`[ai-agent] AGENT_ERROR: ${agentResult.agentError}`);
    }

    const sendAgentResponse = (replyText: string, extra: Record<string, unknown> = {}) => {
      if ((req as any).user?.role !== 'super_admin') {
        usageLimits.recordAiMessage(shopId).catch(() => {});
      }
      const elapsed = Date.now() - startedAt;
      if (elapsed > 2000) console.warn(`[ai-chat] slow_response_ms=${elapsed} shop=${shopId} user=${userId ?? 0}`);
      console.log(`[ai-chat] success_ms=${elapsed} shop=${shopId} user=${userId ?? 0}`);

      if (streamRequested) {
        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
        const emit = (obj: Record<string, unknown>) => res.write(`${JSON.stringify(obj)}\n`);
        emit({ type: 'start', lang: detectedLang, ttsLang });
        emit({ type: 'done', ok: true, reply: replyText, message: replyText, lang: detectedLang, ttsLang, ...extra });
        return res.end();
      }
      return res.json({ ok: true, reply: replyText, message: replyText, lang: detectedLang, ttsLang, ...extra });
    };

    if (agentResult.pendingAction) {
      return sendAgentResponse(agentResult.text || '', { pendingAction: agentResult.pendingAction });
    }

    // For agent responses, skip the quality filter that was stripping valid tool-based replies
    let text = agentResult.text || '';
    if (text) {
      text = dedupeAssistantReply(text);
    }
    if (!text) {
      // Fallback only if agent produced nothing
      const fb = getFallbackAssistantAnswer(message, detectedLang);
      console.warn(`[ai-agent] using fallback, agentError=${agentResult.agentError || 'none'}`);
      return sendAgentResponse(fb.answer, { fallback: true });
    }
    aiChatCache.set(cacheKey, { at: Date.now(), value: { text, lang: detectedLang, ttsLang } });
    return sendAgentResponse(text);
  } catch (error: any) {
    console.error('DEBUG_AI_ERROR:', error);
    console.error('❌ Chat error:', {
      name: error?.name,
      message: error?.message,
      status: error?.status,
      code: error?.code,
      details: error?.errorDetails ?? error?.response?.data,
    });
    const reqBody = (req as any)?.body || {};
    const clientUiCatch: 'ar' | 'en' | null =
      reqBody.lang === 'ar' || reqBody.lang === 'en' ? (reqBody.lang as 'ar' | 'en') : null;
    const ttsLang = getTtsLocaleForLang(clientUiCatch ?? detectedLang);
    const fallback = getFallbackAssistantAnswer(String((req as any)?.body?.message || ''), detectedLang);
    const elapsed = Date.now() - startedAt;
    console.warn(
      `[ai-chat] fallback_used ms=${elapsed} lang=${detectedLang} score=${fallback.score} reason=${String(error?.message || 'unknown')}`
    );
    if (Boolean((req as any)?.body?.stream)) {
      try {
        res.write(
          `${JSON.stringify({
            type: 'done',
            ok: true,
            reply: fallback.answer,
            message: fallback.answer,
            lang: detectedLang,
            ttsLang,
            fallback: true,
          })}\n`
        );
      } catch {}
      return res.end();
    }
    return res.json({
      ok: true,
      reply: fallback.answer,
      message: fallback.answer,
      lang: detectedLang,
      ttsLang,
      fallback: true,
    });
  }
});

// ========== AI CHAT FILE UPLOAD (image/pdf/excel/csv processing) ==========
app.post('/api/chat/upload', authenticateToken, requirePackageFeature('ai'), async (req: Request, res: Response) => {
  const lang: 'ar' | 'en' = String((req as any).body?.lang || 'ar').startsWith('ar') ? 'ar' : 'en';
  try {
    const client = getGeminiClient();
    if (!client) return res.status(400).json({ error: 'AI API key missing' });

    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const body = (req as any).body || {};
    const fileData = body.fileData;
    const fileName = String(body.fileName || '').trim();
    const fileMime = String(body.fileMime || '').trim();
    const userMessage = String(body.message || '').trim();

    if (!fileData) return res.status(400).json({ error: 'fileData is required (base64)' });

    const isImage = fileMime.startsWith('image/');
    const isPdf = fileMime === 'application/pdf';
    const isExcel = fileMime.includes('spreadsheet') || fileMime.includes('excel') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileMime === 'text/csv' || fileName.endsWith('.csv');

    let extractedText = '';
    let visionResponse = '';

    if (isImage || isPdf) {
      await throttleGeminiRequest();
      const parts: any[] = [
        { inlineData: { mimeType: fileMime, data: fileData } },
        { text: lang === 'ar'
          ? `حلل الصورة/الملف ده بدقة. لو فاتورة شراء: استخرج كل المنتجات (اسم، كمية، سعر شراء، سعر بيع لو موجود، باركود لو موجود)، وبيانات المورد (اسم، تليفون، عنوان)، ورقم الفاتورة والتاريخ. لو ملف تاني (قائمة موظفين، جدول بيانات): استخرج كل البيانات في شكل منظم. رد بالعربية. ${userMessage ? `ملاحظة من المستخدم: ${userMessage}` : ''}`
          : `Analyze this image/file carefully. If it's a purchase invoice: extract all products (name, qty, buy price, sell price if visible, barcode if visible), supplier info (name, phone, address), invoice number and date. If it's another document (employee list, data table): extract all data in structured format. Reply in English. ${userMessage ? `User note: ${userMessage}` : ''}` },
      ];

      const genResult: any = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts }],
        config: { temperature: 0.1, maxOutputTokens: 2048 },
      });
      visionResponse = String(genResult?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '');
    } else if (isExcel || isCsv) {
      const buf = Buffer.from(fileData, 'base64');
      if (isCsv) {
        extractedText = buf.toString('utf-8').slice(0, 8000);
      } else {
        try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buf as any);
          const sheet = workbook.worksheets[0];
          if (sheet) {
            const rows: string[] = [];
            sheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
              if (rowNum > 200) return;
              const vals = (row.values as any[]).slice(1).map((v: any) => String(v ?? '').trim());
              rows.push(vals.join(' | '));
            });
            extractedText = rows.join('\n').slice(0, 8000);
          }
        } catch { extractedText = '(Could not parse Excel file)'; }
      }

      await throttleGeminiRequest();
      const genResult: any = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: lang === 'ar'
          ? `حلل البيانات دي من ملف ${isCsv ? 'CSV' : 'Excel'} (اسم: ${fileName}):\n\n${extractedText}\n\nلو بيانات منتجات: استخرج اسم المنتج والكمية والسعر. لو بيانات موظفين: استخرج الأسماء والبيانات. رتب البيانات بشكل واضح. ${userMessage ? `ملاحظة: ${userMessage}` : ''}`
          : `Analyze this data from ${isCsv ? 'CSV' : 'Excel'} file (name: ${fileName}):\n\n${extractedText}\n\nIf product data: extract product name, quantity, price. If employee data: extract names and details. Organize clearly. ${userMessage ? `Note: ${userMessage}` : ''}` }] }],
        config: { temperature: 0.1, maxOutputTokens: 2048 },
      });
      visionResponse = String(genResult?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '');
    } else {
      const buf = Buffer.from(fileData, 'base64');
      extractedText = buf.toString('utf-8').slice(0, 5000);
      await throttleGeminiRequest();
      const genResult: any = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: lang === 'ar'
          ? `حلل المحتوى ده:\n\n${extractedText}\n\nاستخرج البيانات المهمة بشكل منظم. ${userMessage ? `ملاحظة: ${userMessage}` : ''}`
          : `Analyze this content:\n\n${extractedText}\n\nExtract important data in structured format. ${userMessage ? `Note: ${userMessage}` : ''}` }] }],
        config: { temperature: 0.1, maxOutputTokens: 2048 },
      });
      visionResponse = String(genResult?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '');
    }

    if (!visionResponse) {
      return res.json({ ok: true, reply: lang === 'ar' ? 'مقدرتش أقرأ الملف ده. جرب ملف تاني.' : 'Could not read this file. Try another one.', lang });
    }

    if ((req as any).user?.role !== 'super_admin') {
      await usageLimits.recordAiMessage(shopId);
    }

    return res.json({ ok: true, reply: visionResponse, message: visionResponse, lang, fileProcessed: true, fileName });
  } catch (err: any) {
    console.error('[chat/upload] error:', err?.message);
    const msg = lang === 'ar' ? 'حصل خطأ أثناء معالجة الملف. حاول تاني.' : 'Error processing file. Please try again.';
    return res.json({ ok: true, reply: msg, message: msg, lang });
  }
});

// ========== GEMINI DATA CHAT (Gold only) ==========
app.post('/api/ai/data-chat', authenticateToken, requirePackageFeature('ai'), async (req: any, res: Response) => {
  try {
    if (!getGeminiClient()) {
      return res.status(400).json({
        error: 'AI API key is missing',
        hint: 'Set GEMINI_API_KEY (or GOOGLE_API_KEY / VERTEX_GEMINI_API_KEY / API_KEY) on crown-api.',
      });
    }
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    if (req.user?.role !== 'super_admin') {
      const aiPre = await usageLimits.checkAiAllowed(shopId);
      if (!aiPre.ok) {
        return res.status(429).json({ error: 'AI limit reached' });
      }
    }
    const params: any[] = [shopId];
    const whereClause = 'WHERE 1=1 AND s.shop_id = ?';

    const [stats] = await pool.execute(
      `
      SELECT 
        COALESCE(SUM(s.total_amount), 0) as monthly_revenue,
        COUNT(DISTINCT s.id) as transactions
      FROM sales s
      ${whereClause}
      AND MONTH(s.created_at) = MONTH(CURRENT_DATE())
      AND YEAR(s.created_at) = YEAR(CURRENT_DATE())
      `,
      params
    );

    const [lowStock] = await pool.execute(
      `
      SELECT p.name_en, p.name_ar, p.stock_quantity, p.min_stock_level
      FROM products p
      WHERE p.stock_quantity <= p.min_stock_level AND p.shop_id = ?
      ORDER BY p.stock_quantity ASC
      LIMIT 10
      `,
      [shopId]
    );

    const [inventorySummary] = await pool.execute(
      `
      SELECT COUNT(*) as total_products,
             COALESCE(SUM(p.stock_quantity), 0) as total_units,
             COALESCE(SUM(p.buy_price * p.stock_quantity), 0) as inventory_cost
      FROM products p
      WHERE p.shop_id = ?
      `,
      [shopId]
    );

    const [recentSales] = await pool.execute(
      `
      SELECT s.invoice_number, s.total_amount, s.created_at
      FROM sales s
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT 5
      `,
      params
    );

    const [todaySales] = await pool.execute(
      `
      SELECT COALESCE(SUM(s.total_amount), 0) as today_revenue,
             COUNT(s.id) as today_transactions
      FROM sales s
      ${whereClause}
      AND DATE(s.created_at) = CURRENT_DATE()
      `,
      params
    );

    const [topCustomers] = await pool.execute(
      `
      SELECT COALESCE(NULLIF(TRIM(s.customer_name), ''), ?) as customer_name, SUM(s.total_amount) as total_spent, COUNT(s.id) as orders
      FROM sales s
      ${whereClause}
      GROUP BY COALESCE(NULLIF(TRIM(s.customer_name), ''), ?)
      ORDER BY total_spent DESC
      LIMIT 3
      `,
      [...params, 'Guest', 'Guest']
    );

    let shopProfile = null;
    if (shopId) {
      const [shopRows] = await pool.execute(
        'SELECT business_name, owner_name, activity_type FROM shops WHERE id = ?',
        [shopId]
      );
      shopProfile = (shopRows as any[])[0] || null;
    }

    const summary = {
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
      },
      shopProfile,
      shopId: shopId || null,
      monthlyRevenue: (stats as any[])[0]?.monthly_revenue || 0,
      monthlyTransactions: (stats as any[])[0]?.transactions || 0,
      todayRevenue: (todaySales as any[])[0]?.today_revenue || 0,
      todayTransactions: (todaySales as any[])[0]?.today_transactions || 0,
      inventory: {
        totalProducts: (inventorySummary as any[])[0]?.total_products || 0,
        totalUnits: (inventorySummary as any[])[0]?.total_units || 0,
        inventoryCost: (inventorySummary as any[])[0]?.inventory_cost || 0,
      },
      lowStock,
      topCustomers,
      recentSales,
    };

    const langHint = (req.body?.lang || req.body?.language || 'ar') === 'en' ? 'en' : 'ar';
    const langRule =
      langHint === 'en'
        ? 'Reply in English. Be concise and use only the data below.'
        : 'رد باللهجة المصرية وباختصار. استخدم البيانات التالية فقط.';
    const result = await geminiGenerateContent({
      model: GEMINI_MODEL,
      config: GEMINI_GEN_CONFIG,
      contents: `You are Crown, the smart assistant. ${langRule} If the user asks in or for English, reply in English. If they ask in or for Arabic, reply in Egyptian Arabic. Never refuse a language. Use only the data below; if the question is outside this data, say the info is not available.\n\n${SYSTEM_KNOWLEDGE}\n\nData:\n${JSON.stringify(
        summary,
        null,
        2
      )}\n\nUser question: ${question}`,
    });
    const text = String((result as any)?.text || '').trim();

    if (text) {
      if (req.user?.role !== 'super_admin') {
        await usageLimits.recordAiMessage(shopId);
      }
      res.json({ ok: true, text, data: summary });
    } else {
      console.error('❌ Gemini empty response');
      return res.status(500).json({ ok: false, error: 'AI provider response empty' });
    }
  } catch (error: any) {
    console.error('DEBUG_AI_ERROR:', error);
    console.error('❌ Data chat error:', error);
    const httpStatus = Number(error?.status) === 429 ? 429 : 500;
    if (httpStatus === 429) {
      return res.status(429).json({
        ok: false,
        error: 'The AI service is busy. Please try again shortly.',
        errorCode: 'GEMINI_RATE_LIMIT',
      });
    }
    res.status(500).json({ ok: false, error: 'AI data chat unavailable' });
  }
});

// ========== SHOPS MANAGEMENT (Super Admin only) ==========
app.get('/api/shops', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const [shops] = await pool.execute(`
      SELECT s.*, u.username as owner_name 
      FROM shops s 
      LEFT JOIN users u ON s.owner_id = u.id
    `);
    res.json(shops);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/shops', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { name, ownerId, package: pkg } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO shops (name, owner_id, package) VALUES (?, ?, ?)',
      [name, ownerId, pkg || 'bronze']
    );
    const insertResult = result as any;
    res.status(201).json({ id: insertResult.insertId, name, ownerId, package: pkg || 'bronze' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN: branch-inventory/product — PUT with force table create and exact error exposure ==========

function parseStockMovementReference(ref: string | null | undefined): { key: string; id: number } | null {
  if (ref == null || typeof ref !== 'string') return null;
  const t = ref.trim();
  const colon = t.indexOf(':');
  if (colon <= 0) return null;
  const key = t.slice(0, colon).trim();
  const id = parseInt(t.slice(colon + 1).trim(), 10);
  if (!Number.isFinite(id) || id <= 0) return null;
  return { key, id };
}

function sqlInPlaceholders(n: number): string {
  return Array.from({ length: n }, () => '?').join(',');
}

/** Attach reference_label_ar / reference_label_en for UI (Arabic + English). */
async function enrichStockMovementRows(shopId: number, rows: any[]): Promise<void> {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const saleIds = new Set<number>();
  const transferIds = new Set<number>();
  const purchaseInvoiceIds = new Set<number>();
  const purchaseReturnIds = new Set<number>();

  for (const row of rows) {
    const p = parseStockMovementReference(row.reference);
    if (!p) continue;
    if (p.key === 'sale_id') saleIds.add(p.id);
    else if (p.key === 'transfer_id') transferIds.add(p.id);
    else if (p.key === 'purchase_invoice') purchaseInvoiceIds.add(p.id);
    else if (p.key === 'purchase_return') purchaseReturnIds.add(p.id);
  }

  type SaleRow = { id: number; invoice_number: string | null; customer_name: string | null; cashier: string | null };
  const salesById = new Map<number, SaleRow>();

  if (saleIds.size > 0 && (await hasTable('sales'))) {
    try {
      const ids = [...saleIds];
      const [saleRows] = await pool.execute(
        `SELECT s.id, s.invoice_number, s.customer_name,
          COALESCE(NULLIF(TRIM(u.username), ''), NULLIF(TRIM(u.email), '')) AS cashier
         FROM sales s
         LEFT JOIN users u ON u.id = s.user_id
         WHERE s.shop_id = ? AND s.id IN (${sqlInPlaceholders(ids.length)})`,
        [shopId, ...ids]
      );
      for (const s of saleRows as any[]) {
        salesById.set(Number(s.id), {
          id: Number(s.id),
          invoice_number: s.invoice_number != null ? String(s.invoice_number) : null,
          customer_name: s.customer_name != null ? String(s.customer_name) : null,
          cashier: s.cashier != null ? String(s.cashier) : null,
        });
      }
    } catch (e: any) {
      console.warn('[stock-movements] sales lookup:', e?.message || e);
    }
  }

  type TrRow = {
    id: number;
    from_branch_id: number;
    to_branch_id: number;
    from_ar: string;
    to_ar: string;
    from_en: string;
    to_en: string;
  };
  const transfersById = new Map<number, TrRow>();

  if (transferIds.size > 0 && (await hasTable('stock_transfers'))) {
    try {
      const ids = [...transferIds];
      const [trRows] = await pool.execute(
        `SELECT st.id, st.from_branch_id, st.to_branch_id,
          COALESCE(NULLIF(TRIM(bf.name_ar), ''), NULLIF(TRIM(bf.name_en), ''), bf.name) AS from_ar,
          COALESCE(NULLIF(TRIM(bt.name_ar), ''), NULLIF(TRIM(bt.name_en), ''), bt.name) AS to_ar,
          COALESCE(NULLIF(TRIM(bf.name_en), ''), NULLIF(TRIM(bf.name_ar), ''), bf.name) AS from_en,
          COALESCE(NULLIF(TRIM(bt.name_en), ''), NULLIF(TRIM(bt.name_ar), ''), bt.name) AS to_en
         FROM stock_transfers st
         LEFT JOIN branches bf ON bf.id = st.from_branch_id AND bf.shop_id = st.shop_id
         LEFT JOIN branches bt ON bt.id = st.to_branch_id AND bt.shop_id = st.shop_id
         WHERE st.shop_id = ? AND st.id IN (${sqlInPlaceholders(ids.length)})`,
        [shopId, ...ids]
      );
      for (const t of trRows as any[]) {
        transfersById.set(Number(t.id), {
          id: Number(t.id),
          from_branch_id: Number(t.from_branch_id),
          to_branch_id: Number(t.to_branch_id),
          from_ar: String(t.from_ar || '').trim() || '—',
          to_ar: String(t.to_ar || '').trim() || '—',
          from_en: String(t.from_en || '').trim() || '—',
          to_en: String(t.to_en || '').trim() || '—',
        });
      }
    } catch (e: any) {
      console.warn('[stock-movements] transfers lookup:', e?.message || e);
    }
  }

  const piById = new Map<number, { supplier: string | null }>();
  if (purchaseInvoiceIds.size > 0 && (await hasTable('purchase_invoices'))) {
    try {
      const ids = [...purchaseInvoiceIds];
      const hasSup = await hasTable('suppliers');
      const joinSup = hasSup
        ? 'LEFT JOIN suppliers sup ON sup.id = pi.supplier_id AND sup.shop_id = pi.shop_id'
        : '';
      const supCol = hasSup ? 'sup.name AS supplier_name' : 'NULL AS supplier_name';
      const [piRows] = await pool.execute(
        `SELECT pi.id, ${supCol}
         FROM purchase_invoices pi
         ${joinSup}
         WHERE pi.shop_id = ? AND pi.id IN (${sqlInPlaceholders(ids.length)})`,
        [shopId, ...ids]
      );
      for (const r of piRows as any[]) {
        piById.set(Number(r.id), { supplier: r.supplier_name != null ? String(r.supplier_name) : null });
      }
    } catch (e: any) {
      console.warn('[stock-movements] purchase_invoices lookup:', e?.message || e);
    }
  }

  const prById = new Map<number, { supplier: string | null }>();
  if (purchaseReturnIds.size > 0 && (await hasTable('purchase_returns'))) {
    try {
      const ids = [...purchaseReturnIds];
      const hasSup = await hasTable('suppliers');
      const joinSup = hasSup
        ? 'LEFT JOIN suppliers sup ON sup.id = pr.supplier_id AND sup.shop_id = pr.shop_id'
        : '';
      const supCol = hasSup ? 'sup.name AS supplier_name' : 'NULL AS supplier_name';
      const [prRows] = await pool.execute(
        `SELECT pr.id, ${supCol}
         FROM purchase_returns pr
         ${joinSup}
         WHERE pr.shop_id = ? AND pr.id IN (${sqlInPlaceholders(ids.length)})`,
        [shopId, ...ids]
      );
      for (const r of prRows as any[]) {
        prById.set(Number(r.id), { supplier: r.supplier_name != null ? String(r.supplier_name) : null });
      }
    } catch (e: any) {
      console.warn('[stock-movements] purchase_returns lookup:', e?.message || e);
    }
  }

  const unknownCashierAr = 'غير معروف';
  const unknownCashierEn = 'Unknown';

  for (const row of rows) {
    const rawRef = row.reference != null ? String(row.reference) : '';
    const p = parseStockMovementReference(row.reference);
    let ar = '';
    let en = '';

    if (!p) {
      if (rawRef.startsWith('branch-inventory:')) {
        ar = 'تعديل كميات المخزون حسب الفرع (لوحة الإدارة)';
        en = 'Per-branch stock update (admin inventory)';
      } else if (rawRef.startsWith('branch-allocation:')) {
        ar = 'توزيع المخزون على الفروع';
        en = 'Stock allocation across branches';
      } else {
        ar = rawRef || '—';
        en = rawRef || '—';
      }
    } else if (p.key === 'branch-inventory') {
      ar = 'تعديل كميات المخزون حسب الفرع (لوحة الإدارة)';
      en = 'Per-branch stock update (admin inventory)';
    } else if (p.key === 'branch-allocation') {
      ar = 'توزيع المخزون على الفروع';
      en = 'Stock allocation across branches';
    } else if (p.key === 'sale_id') {
      const s = salesById.get(p.id);
      const inv = s?.invoice_number?.trim() || `#${p.id}`;
      const cashier = (s?.cashier && s.cashier.trim()) || unknownCashierAr;
      const cashierEn = (s?.cashier && s.cashier.trim()) || unknownCashierEn;
      const cust = (s?.customer_name && s.customer_name.trim()) || '';
      ar = cust
        ? `حركة بيع — فاتورة ${inv} — من حساب: ${cashier} — عميل: ${cust}`
        : `حركة بيع — فاتورة ${inv} — من حساب: ${cashier}`;
      en = cust
        ? `Sale — invoice ${inv} — user: ${cashierEn} — customer: ${cust}`
        : `Sale — invoice ${inv} — user: ${cashierEn}`;
    } else if (p.key === 'transfer_id') {
      const t = transfersById.get(p.id);
      const br = row.branch_id != null ? Number(row.branch_id) : NaN;
      if (t && row.type === 'OUT' && br === t.from_branch_id) {
        ar = `نقل مخزون — صرف من هذا الفرع باتجاه فرع: ${t.to_ar} (عملية #${p.id})`;
        en = `Stock transfer — out to branch: ${t.to_en} (transfer #${p.id})`;
      } else if (t && row.type === 'IN' && br === t.to_branch_id) {
        ar = `نقل مخزون — إدخال إلى هذا الفرع قادمًا من فرع: ${t.from_ar} (عملية #${p.id})`;
        en = `Stock transfer — in from branch: ${t.from_en} (transfer #${p.id})`;
      } else if (t) {
        ar = `نقل مخزون بين الفروع — من ${t.from_ar} إلى ${t.to_ar} (عملية #${p.id})`;
        en = `Inter-branch transfer — ${t.from_en} → ${t.to_en} (#${p.id})`;
      } else {
        ar = `نقل مخزون (عملية #${p.id})`;
        en = `Stock transfer (#${p.id})`;
      }
    } else if (p.key === 'purchase_invoice') {
      const x = piById.get(p.id);
      const sup = x?.supplier?.trim();
      ar = sup
        ? `إدخال مخزون — فاتورة شراء #${p.id} — مورد: ${sup}`
        : `إدخال مخزون — فاتورة شراء #${p.id}`;
      en = sup
        ? `Stock IN — purchase invoice #${p.id} — supplier: ${sup}`
        : `Stock IN — purchase invoice #${p.id}`;
    } else if (p.key === 'purchase_return') {
      const x = prById.get(p.id);
      const sup = x?.supplier?.trim();
      ar = sup
        ? `مرتجع مشتريات — سجل #${p.id} — مورد: ${sup}`
        : `مرتجع مشتريات — سجل #${p.id}`;
      en = sup
        ? `Purchase return — #${p.id} — supplier: ${sup}`
        : `Purchase return — #${p.id}`;
    } else {
      ar = rawRef || '—';
      en = rawRef || '—';
    }

    row.reference_label_ar = ar;
    row.reference_label_en = en;
  }
}

/** GET /api/admin/stock-movements — SAFE: only primitives in params, ? count matches params.length. No arrays/undefined. */
async function getStockMovementsController(req: any, res: Response): Promise<void> {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensureStockMovementsTable();
    if (!(await hasTable('stock_movements'))) {
      res.status(200).json({ ok: true, movements: [] });
      return;
    }
    const shopIdNum = Number(shopId);
    const branchIdRaw = req.query?.branch_id;
    const branchId = branchIdRaw != null && String(branchIdRaw).trim() !== '' ? Number(branchIdRaw) : null;
    const limitRaw = parseInt(String(req.query?.limit), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, limitRaw)) : 100;

    let query = `
      SELECT sm.id, sm.shop_id, sm.product_id, sm.branch_id, sm.type, sm.quantity, sm.reference, sm.created_at,
        p.name_en AS product_name_en,
        p.name_ar AS product_name_ar,
        COALESCE(NULLIF(TRIM(p.name_ar), ''), NULLIF(TRIM(p.name_en), '')) AS product_name,
        b.name_en AS branch_name_en,
        b.name_ar AS branch_name_ar,
        COALESCE(NULLIF(TRIM(b.name_ar), ''), NULLIF(TRIM(b.name_en), ''), b.name) AS branch_name
      FROM stock_movements sm
      LEFT JOIN products p ON p.id = sm.product_id AND p.shop_id = sm.shop_id
      LEFT JOIN branches b ON b.id = sm.branch_id AND b.shop_id = sm.shop_id
      WHERE sm.shop_id = ?`;
    const params: number[] = [shopIdNum];

    if (branchId != null && Number.isFinite(branchId)) {
      query += ' AND sm.branch_id = ?';
      params.push(Number(branchId));
    }

    query += ' ORDER BY sm.created_at DESC LIMIT ' + String(Number(limit));

    let rows: any;
    if (params.length > 0) {
      const [r] = await pool.execute(query, params);
      rows = r;
    } else {
      const [r] = await pool.execute(query);
      rows = r;
    }
    const list = Array.isArray(rows) ? rows : [];
    await enrichStockMovementRows(shopIdNum, list);
    res.status(200).json({ ok: true, movements: list });
  } catch (error: any) {
    console.error('[stock-movements]', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to load stock movements' });
  }
}

const branchInventoryDeps = {
  getShopIdOrFail,
  authenticateToken,
  ensureBranchInventoryTable,
  hasColumn,
  getStockMovements: getStockMovementsController,
};

/** Redistribute total stock across existing branch_inventory rows for this product (so SUM(branch_inventory) = totalStock). */
async function syncProductStockToBranchInventory(productId: number, shopId: number, totalStock: number): Promise<void> {
  try {
    await ensureBranchInventoryTable();
    await ensureBranchInventoryColumns();
    const [rows] = await pool.execute(
      'SELECT branch_id FROM branch_inventory WHERE shop_id = ? AND product_id = ? ORDER BY branch_id',
      [shopId, productId]
    );
    const branches = (rows as any[]).map((r: any) => Number(r.branch_id));
    if (branches.length === 0) return;
    const perBranch = Math.floor(totalStock / branches.length);
    const remainder = totalStock - perBranch * branches.length;
    for (let i = 0; i < branches.length; i++) {
      const qty = perBranch + (i === 0 ? remainder : 0);
      await pool.execute(
        'UPDATE branch_inventory SET quantity = ? WHERE shop_id = ? AND product_id = ? AND branch_id = ?',
        [qty, shopId, productId, branches[i]]
      );
    }
  } catch (e: any) {
    console.warn('[syncProductStockToBranchInventory]:', e?.message || e);
  }
}

async function handlePutBranchInventoryProduct(req: any, res: Response): Promise<void> {
  console.log('REQUEST BODY:', req.body);
  const productIdParam = req.params.productId ?? req.params.id ?? '';
  const productId = parseInt(String(productIdParam), 10);
  if (!productId || Number.isNaN(productId)) {
    res.status(400).json({ success: false, message: 'Invalid product id' });
    return;
  }
  const shopId = getShopIdOrFail(req, res);
  if (shopId === null) return;

  const branches = req.body?.branches;
  if (!Array.isArray(branches) || branches.length === 0) {
    res.status(400).json({ success: false, message: 'Request body must include branches array with { branch_id, quantity }' });
    return;
  }
  // Hard stop: reject if any branch has missing or invalid quantity (no silent default to 0)
  for (const b of branches as any[]) {
    if (b.quantity === undefined || Number.isNaN(Number(b.quantity))) {
      console.error('FATAL ERROR: Payload missing quantity for branch', b);
      res.status(400).json({ success: false, message: 'Quantity missing for selected branch.' });
      return;
    }
  }
  const normalized: { branch_id: number; quantity: number }[] = [];
  for (const b of branches as any[]) {
    if (typeof b !== 'object' || (b.branch_id == null && b.id == null)) continue;
    const branch_id = Number(b.branch_id ?? b.id);
    if (Number.isNaN(branch_id) || branch_id <= 0) continue;
    const quantity = parseFloat(b.quantity);
    if (Number.isNaN(quantity)) {
      res.status(400).json({ success: false, message: 'Invalid quantity' });
      return;
    }
    if (quantity < 0) {
      res.status(400).json({ success: false, message: 'Invalid quantity for branch ' + branch_id });
      return;
    }
    normalized.push({ branch_id, quantity });
  }
  if (normalized.length === 0) {
    res.status(400).json({ success: false, message: 'No valid branches with branch_id and quantity' });
    return;
  }

  try {
    await ensureBranchInventoryTable();
    await ensureBranchInventoryColumns();
    await normalizeBranchInventorySchema();

    const shopIdNum = Number(shopId);
    const productIdNum = Number(productId);
    const [prevInvRows] = await pool.execute(
      'SELECT COALESCE(SUM(quantity), 0) AS total FROM branch_inventory WHERE product_id = ? AND shop_id = ?',
      [productIdNum, shopIdNum]
    );
    const quantityBeforeInv = Number((prevInvRows as any[])?.[0]?.total ?? 0) || 0;
    for (const branch of normalized) {
      const branchId = Number(branch.branch_id);
      const qty = Number(branch.quantity);
      await pool.execute(
        `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
        [shopIdNum, branchId, productIdNum, qty]
      );
      if (await hasTable('stock_movements')) {
        const ref = String(`branch-inventory:${productIdNum}`);
        await pool.execute(
          'INSERT INTO stock_movements (shop_id, product_id, branch_id, type, quantity, reference) VALUES (?, ?, ?, ?, ?, ?)',
          [shopIdNum, productIdNum, branchId, 'ADJUSTMENT', qty, ref]
        );
      }
    }
    const branchIds = normalized.map((b) => Number(b.branch_id));
    if (branchIds.length > 0) {
      const placeholders = branchIds.map(() => '?').join(',');
      const deleteParams: number[] = [shopIdNum, productIdNum, ...branchIds];
      await pool.execute(
        `DELETE FROM branch_inventory WHERE shop_id = ? AND product_id = ? AND branch_id NOT IN (${placeholders})`,
        deleteParams
      );
    } else {
      await pool.execute('DELETE FROM branch_inventory WHERE shop_id = ? AND product_id = ?', [shopIdNum, productIdNum]);
    }

    const [check] = await pool.execute(
      'SELECT branch_id, quantity FROM branch_inventory WHERE product_id = ? AND shop_id = ?',
      [productIdNum, shopIdNum]
    );
    console.log('DB RESULT:', check);

    // Always sync product stock from branch_inventory for all accounts.
    try {
      await pool.execute(
        `UPDATE products p SET p.stock_quantity = (SELECT IFNULL(SUM(bi.quantity), 0) FROM branch_inventory bi WHERE bi.shop_id = p.shop_id AND bi.product_id = p.id) WHERE p.id = ? AND p.shop_id = ?`,
        [productIdNum, shopIdNum]
      );
    } catch (syncErr: any) {
      console.warn('[branch-inventory] global stock sync failed:', syncErr?.message || syncErr);
    }

    const [stockRows] = await pool.execute(
      'SELECT COALESCE(SUM(quantity), 0) AS stock FROM branch_inventory WHERE shop_id = ? AND product_id = ?',
      [shopIdNum, productIdNum]
    );
    const stockRow = (stockRows as any[])?.[0];
    const stock = stockRow ? parseFloat(String(stockRow.stock)) : 0;
    if (quantityBeforeInv !== stock) {
      const [nm] = await pool.execute(
        'SELECT name_en, name_ar FROM products WHERE id = ? AND shop_id = ? LIMIT 1',
        [productIdNum, shopIdNum]
      );
      const pr = (nm as any[])[0] || {};
      await insertNotification({
        shopId: shopIdNum,
        source: 'system',
        type: 'inventory_stock_updated',
        data: withInventoryAlertPayload({
          productId: productIdNum,
          nameAr: pr.name_ar || pr.name_en,
          nameEn: pr.name_en,
          quantityBefore: quantityBeforeInv,
          quantityAfter: stock,
        }),
      });
    }
    res.status(200).json({ message: 'Success', productId, stock });
  } catch (error: any) {
    console.error('CRITICAL SQL ERROR [branch-inventory]:', error?.message, error?.code, error?.sqlMessage, error?.sql, error);
    const details = error?.sqlMessage || error?.message || String(error) || 'Unknown DB Error';
    res.status(500).json({ details });
  }
}

// CRITICAL: Register stock-movements and branch-inventory/product FIRST (before /single and before app.use('/api/admin')) so they are never 404'd
app.get('/api/admin/stock-movements', authenticateToken, capInventoryWrite, getStockMovementsController);
app.put('/api/admin/branch-inventory/product/:productId', authenticateToken, capInventoryWrite, handlePutBranchInventoryProduct);
app.put('/api/admin/branch-inventory/product/:id', authenticateToken, capInventoryWrite, handlePutBranchInventoryProduct);
// FAIL-SAFE: Register /single (literal path) so no parameterized route can match it
app.put('/api/admin/branch-inventory/single', authenticateToken, capInventoryWrite, async (req: any, res: Response) => {
  console.log('🚀 HIT /api/admin/branch-inventory/single', req.body);
  try {
    const part_id = req.body?.product_id ?? req.body?.part_id;
    const branch_id = req.body?.branch_id;
    const quantity = req.body?.quantity;
    if (part_id == null || branch_id == null || quantity === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const productId = Number(part_id);
    const branchIdNum = Number(branch_id);
    const qty = Math.max(0, Number(quantity) || 0);
    if (!productId || !branchIdNum || Number.isNaN(productId) || Number.isNaN(branchIdNum)) {
      return res.status(400).json({ error: 'Invalid product_id or branch_id' });
    }
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const shopIdNum = Number(shopId);
    const productIdNum = Number(productId);
    let quantityBeforeInv = 0;
    if (await shopUsesBranchInventory(shopIdNum)) {
      const [prevInvRows] = await pool.execute(
        'SELECT COALESCE(SUM(quantity), 0) AS total FROM branch_inventory WHERE product_id = ? AND shop_id = ?',
        [productIdNum, shopIdNum]
      );
      quantityBeforeInv = Number((prevInvRows as any[])?.[0]?.total ?? 0) || 0;
    } else {
      const [pr] = await pool.execute(
        'SELECT COALESCE(stock_quantity, 0) AS s FROM products WHERE id = ? AND shop_id = ?',
        [productIdNum, shopIdNum]
      );
      quantityBeforeInv = Number((pr as any[])?.[0]?.s ?? 0) || 0;
    }
    if (!(await shopUsesBranchInventory(shopIdNum))) {
      await pool.execute(
        'UPDATE products SET stock_quantity = ? WHERE id = ? AND shop_id = ?',
        [qty, productIdNum, shopIdNum]
      );
      if (quantityBeforeInv !== qty) {
        const [nm] = await pool.execute(
          'SELECT name_en, name_ar FROM products WHERE id = ? AND shop_id = ? LIMIT 1',
          [productIdNum, shopIdNum]
        );
        const pr = (nm as any[])[0] || {};
        await insertNotification({
          shopId: shopIdNum,
          source: 'system',
          type: 'inventory_stock_updated',
          data: withInventoryAlertPayload({
            productId: productIdNum,
            nameAr: pr.name_ar || pr.name_en,
            nameEn: pr.name_en,
            quantityBefore: quantityBeforeInv,
            quantityAfter: qty,
          }),
        });
      }
      return res.status(200).json({
        message: 'Quick edit saved successfully',
        product_id: productIdNum,
        branch_id: null,
        quantity: qty,
        playSound: quantityBeforeInv !== qty,
      });
    }
    await ensureBranchInventoryTable();
    await pool.execute(
      `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
      [shopIdNum, branchIdNum, productIdNum, qty]
    );
    const isBranchAccountSingle = (req as any)?.user?.package === 'branches';
    if (isBranchAccountSingle) {
      console.log('RUNNING BRANCH RECALC');
      await pool.execute(
        `UPDATE products p SET p.stock_quantity = (SELECT COALESCE(SUM(bi.quantity), 0) FROM branch_inventory bi WHERE bi.shop_id = p.shop_id AND bi.product_id = p.id) WHERE p.id = ? AND p.shop_id = ?`,
        [productIdNum, shopIdNum]
      );
    }
    const [sumRows] = await pool.execute(
      'SELECT COALESCE(SUM(quantity), 0) AS total FROM branch_inventory WHERE product_id = ? AND shop_id = ?',
      [productIdNum, shopIdNum]
    );
    const stockAfter = Number((sumRows as any[])?.[0]?.total ?? 0) || 0;
    if (quantityBeforeInv !== stockAfter) {
      const [nm] = await pool.execute(
        'SELECT name_en, name_ar FROM products WHERE id = ? AND shop_id = ? LIMIT 1',
        [productIdNum, shopIdNum]
      );
      const pr = (nm as any[])[0] || {};
      await insertNotification({
        shopId: shopIdNum,
        source: 'system',
        type: 'inventory_stock_updated',
        data: withInventoryAlertPayload({
          productId: productIdNum,
          nameAr: pr.name_ar || pr.name_en,
          nameEn: pr.name_en,
          quantityBefore: quantityBeforeInv,
          quantityAfter: stockAfter,
        }),
      });
    }
    return res.status(200).json({
      message: 'Quick edit saved successfully',
      product_id: productIdNum,
      branch_id: branchIdNum,
      quantity: qty,
      playSound: quantityBeforeInv !== stockAfter,
    });
  } catch (error: any) {
    console.error('Quick Edit Error:', error?.message || error);
    return res.status(500).json({ error: 'Server error during quick edit' });
  }
});
console.log('[API] GET /api/admin/stock-movements + PUT branch-inventory/product + /single registered (before admin router)');

// Branch allocation MUST be registered before app.use('/api/admin') so Express matches it instead of 404 from admin router
app.put('/api/admin/products/:id/branch-allocation', authenticateToken, capInventoryWrite, async (req: any, res: Response) => {
  try {
    // Allow all accounts (clients + admin) to update branch allocation.
    console.log('BRANCH ALLOCATION BODY:', req.body);
    const productId = parseInt(req.params.id, 10);
    if (!productId) return res.status(400).json({ error: 'Invalid product id' });
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const raw = req.body?.branches;
    if (!Array.isArray(raw) || raw.length === 0) {
      return res.status(400).json({ error: 'Branches required' });
    }
    const branches: { branch_id: number; quantity: number }[] = [];
    for (const b of raw) {
      const branch_id = b?.branch_id != null ? Number(b.branch_id) : NaN;
      const qty = b?.quantity != null ? Number(b.quantity) : NaN;
      if (!Number.isFinite(branch_id) || branch_id <= 0) {
        return res.status(400).json({ error: 'Invalid branch_id in branches array' });
      }
      if (!Number.isFinite(qty) || qty < 0) {
        return res.status(400).json({ error: 'Invalid quantity' });
      }
      branches.push({ branch_id, quantity: qty });
    }

    const totalRequested = branches.reduce((s, b) => s + b.quantity, 0);
    await ensureBranchInventoryTable();

    const [[productRow]] = (await pool.execute(
      'SELECT COALESCE(stock_quantity, 0) AS total FROM products WHERE id = ? AND shop_id = ?',
      [productId, shopId]
    )) as any;
    const totalProductStock = productRow ? Number((productRow as { total?: number }).total ?? 0) : 0;
    const isSingleBranchUpdate = branches.length === 1;
    if (isSingleBranchUpdate) {
      const [[sumRow]] = (await pool.execute(
        'SELECT COALESCE(SUM(quantity), 0) AS s FROM branch_inventory WHERE product_id = ? AND shop_id = ?',
        [productId, shopId]
      )) as any;
      const currentSum = sumRow ? Number((sumRow as { s?: number }).s ?? 0) : 0;
      const [[branchRow]] = (await pool.execute(
        'SELECT quantity FROM branch_inventory WHERE product_id = ? AND shop_id = ? AND branch_id = ?',
        [productId, shopId, branches[0].branch_id]
      )) as any;
      const oldBranchQty = branchRow ? Number((branchRow as { quantity?: number }).quantity ?? 0) : 0;
      const newTotal = currentSum - oldBranchQty + branches[0].quantity;
      if (newTotal > totalProductStock) {
        return res.status(400).json({ error: 'Not enough stock in warehouse' });
      }
    } else {
      if (totalRequested > totalProductStock) {
        return res.status(400).json({ error: 'Not enough stock in warehouse' });
      }
    }

    const conn = await pool.getConnection();
    const shopIdNum = Number(shopId);
    const productIdNum = Number(productId);
    try {
      await conn.beginTransaction();
      for (const b of branches) {
        const branchId = Number(b.branch_id);
        const qty = Number(b.quantity);
        await conn.execute(
          `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
          [shopIdNum, branchId, productIdNum, qty]
        );
        if (await hasTable('stock_movements')) {
          const ref = String(`branch-allocation:${productIdNum}`);
          await conn.execute(
            'INSERT INTO stock_movements (shop_id, product_id, branch_id, type, quantity, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [shopIdNum, productIdNum, branchId, 'TRANSFER', qty, ref]
          );
        }
      }
      if (!isSingleBranchUpdate) {
        const branchIds = branches.map((b) => Number(b.branch_id));
        if (branchIds.length > 0) {
          const placeholders = branchIds.map(() => '?').join(',');
          const deleteParams: number[] = [shopIdNum, productIdNum, ...branchIds];
          await conn.execute(
            `DELETE FROM branch_inventory WHERE shop_id = ? AND product_id = ? AND branch_id NOT IN (${placeholders})`,
            deleteParams
          );
        }
      }
      // Always sync product stock from branch_inventory for all accounts.
      await conn.execute(
        'UPDATE products p SET p.stock_quantity = (SELECT IFNULL(SUM(bi.quantity), 0) FROM branch_inventory bi WHERE bi.shop_id = p.shop_id AND bi.product_id = p.id) WHERE p.id = ? AND p.shop_id = ?',
        [productIdNum, shopIdNum]
      ).catch((err: any) => console.warn('[branch-allocation] stock sync failed:', err?.message));
      await conn.commit();
    } finally {
      conn.release();
    }
    return res.status(200).json({
      success: true,
      message: 'Stock allocated successfully',
      product_id: productId,
      branches: branches.map((b) => ({ branch_id: b.branch_id, quantity: b.quantity })),
    });
  } catch (error: any) {
    console.error('Branch allocation error:', error?.message || error);
    return res.status(500).json({ error: 'Server error during allocation' });
  }
});

console.log('[API] routes registered: stock-movements, branch-inventory/product, branch-allocation (before admin router)');

app.post('/api/admin/print-log', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const type = String(req.body?.type || 'report').slice(0, 64);
    const referenceId = Number(req.body?.reference_id) || 0;
    const docBranch = req.body?.branch_id != null ? Number(req.body.branch_id) : null;
    await insertPrintLog(req, shopId, type, referenceId, docBranch);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ========== GET /api/current-branch — Header: branch_id, branch_name. NEVER 404; create branch if missing. ==========
app.get('/api/current-branch', authenticateToken, async (req: any, res: Response) => {
  try {
    const fromHeader = req.headers['x-shop-id'];
    const headerVal = fromHeader != null ? (Array.isArray(fromHeader) ? fromHeader[0] : fromHeader) : null;
    const shopId = Number(req.user?.shopId ?? req.user?.shop_id ?? headerVal) || null;
    if (shopId == null) return res.status(400).json({ error: 'Missing shop_id' });
    let [rows] = await pool.execute(
      'SELECT * FROM branches WHERE shop_id = ? LIMIT 1',
      [shopId]
    );
    let branch = Array.isArray(rows) && (rows as any[]).length > 0 ? (rows as any[])[0] : null;
    if (!branch) {
      const code = `MAIN_${shopId}`;
      await pool.execute(
        "INSERT INTO branches (shop_id, name, name_ar, code) VALUES (?, 'Main Branch', 'الفرع الرئيسي', ?)",
        [shopId, code]
      );
      [rows] = await pool.execute(
        'SELECT * FROM branches WHERE shop_id = ? LIMIT 1',
        [shopId]
      );
      branch = Array.isArray(rows) && (rows as any[]).length > 0 ? (rows as any[])[0] : null;
    }
    if (!branch) return res.status(500).json({ error: 'Server error' });
    res.json({ branch_id: branch.id, branch_name: branch.name });
  } catch (err: any) {
    console.error('current-branch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== GET /api/branches — Return existing branches for shop (read-only, no create). ==========
app.get('/api/branches', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('frequent:branches', req, shopId, req.user?.id);
    const cached = getCachedPayload<any[]>(frequentCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const [rows] = await pool.execute(
      'SELECT id, shop_id, name, name_ar, name_en, code, created_at FROM branches WHERE shop_id = ? ORDER BY id ASC',
      [shopId]
    );
    const list = (rows as any[]) || [];
    setCachedPayload(frequentCache, cacheKey, list);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN BRANCHES — for admin UI (POST/PUT/DELETE). GET also available via /api/branches above. ==========
app.get('/api/admin/branches', authenticateToken, async (req: any, res: Response) => {
  try {
    // Super admin sees all branches; any other authenticated user sees own shop branches.
    if (req.user?.role === 'super_admin') {
      const cacheKey = getCacheKey('frequent:admin-branches:all', req, null, req.user?.id);
      const cached = getCachedPayload<any[]>(frequentCache, cacheKey);
      if (cached !== null) return res.json(cached);
      const [rows] = await pool.execute('SELECT id, name, shop_id FROM branches ORDER BY id DESC');
      const list = (rows as any[]) || [];
      setCachedPayload(frequentCache, cacheKey, list);
      return res.json(list);
    }
    const headerShop = req.headers['x-shop-id'];
    const headerShopId = headerShop ? Number(Array.isArray(headerShop) ? headerShop[0] : headerShop) : 0;
    const shopId = Number(req.user?.shop_id || req.user?.shopId || headerShopId || 0);
    if (!shopId) return res.status(400).json({ error: 'shopId is required' });
    const cacheKey = getCacheKey('frequent:admin-branches', req, shopId, req.user?.id);
    const cached = getCachedPayload<any[]>(frequentCache, cacheKey);
    if (cached !== null) return res.json(cached);
    let [rows] = await pool.execute(
      'SELECT id, name, shop_id FROM branches WHERE shop_id = ? ORDER BY id ASC',
      [shopId]
    );
    let list = (rows as any[]) || [];
    if (list.length === 0) {
      await pool.execute(
        "INSERT INTO branches (shop_id, name, name_ar, code) VALUES (?, 'الفرع الرئيسي', 'الفرع الرئيسي', ?)",
        [shopId, `MAIN_${shopId}`]
      );
      [rows] = await pool.execute(
        'SELECT id, name, shop_id FROM branches WHERE shop_id = ? ORDER BY id ASC',
        [shopId]
      );
      list = (rows as any[]) || [];
    }
    setCachedPayload(frequentCache, cacheKey, list);
    return res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/branches', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const [pkgRows] = await pool.execute('SELECT package FROM shops WHERE id = ?', [shopId]);
    const pkg = String((pkgRows as any[])[0]?.package ?? '').trim().toLowerCase();
    const isNormalPlan = pkg !== 'branches';
    if (isNormalPlan) {
      const [countRows] = await pool.execute('SELECT COUNT(*) AS c FROM branches WHERE shop_id = ?', [shopId]);
      const branchCount = Number((countRows as any[])[0]?.c ?? 0);
      // Only block when they ALREADY have at least one branch. Allow first branch (branchCount === 0).
      if (branchCount >= 1) {
        return res.status(403).json({ error: 'Your plan allows a maximum of 1 branch.' });
      }
    }
    const name = String(req.body?.name || 'Branch').trim() || 'Branch';
    const code = String(req.body?.code || 'branch').trim().toLowerCase().replace(/\s+/g, '_') || 'branch';
    const [result] = await pool.execute(
      'INSERT INTO branches (shop_id, name, name_ar, name_en, code) VALUES (?, ?, ?, ?, ?)',
      [shopId, name, name, name, code]
    );
    const insertResult = result as any;
    res.status(201).json({ id: insertResult.insertId, shop_id: shopId, name, code });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Branch code already exists' });
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/admin', createAdminRouter(branchInventoryDeps));

// Production compatibility: same data as /api/shops for frontend ShopSwitcher (expects /admin/shops)
app.get('/api/admin/shops', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const [shops] = await pool.execute(`
      SELECT s.*, u.username as owner_name 
      FROM shops s 
      LEFT JOIN users u ON s.owner_id = u.id
    `);
    res.json(shops);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/branches/:id', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid branch id' });
    const [rows] = await pool.execute('SELECT id, shop_id, name, name_ar, name_en, code, created_at FROM branches WHERE id = ? AND shop_id = ?', [id, shopId]);
    const list = rows as any[];
    if (list.length === 0) return res.status(404).json({ error: 'Branch not found' });
    res.json(list[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/branches/:id', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid branch id' });
    const name = String(req.body?.name || '').trim();
    const code = String(req.body?.code || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!name && !code) return res.status(400).json({ error: 'name or code required' });
    const updates: string[] = [];
    const params: any[] = [];
    if (name) { updates.push('name = ?, name_ar = ?, name_en = ?'); params.push(name, name, name); }
    if (code) { updates.push('code = ?'); params.push(code); }
    params.push(id, shopId);
    const [result] = await pool.execute(
      `UPDATE branches SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`,
      params
    );
    const affected = (result as any).affectedRows;
    if (affected === 0) return res.status(404).json({ error: 'Branch not found' });
    res.json({ ok: true });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Branch code already exists' });
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/branches/:id', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid branch id' });
    const [result] = await pool.execute('DELETE FROM branches WHERE id = ? AND shop_id = ?', [id, shopId]);
    const affected = (result as any).affectedRows;
    if (affected === 0) return res.status(404).json({ error: 'Branch not found' });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN STATS / PRODUCTS / INVENTORY (dashboard and store-admin) ==========
app.get('/api/admin/stats', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('dashboard:admin-stats', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(dashboardCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const [revenue] = await pool.execute(
      `SELECT COALESCE(SUM(total_amount - COALESCE(returned_amount, 0)), 0) as monthly_revenue FROM sales WHERE shop_id = ? AND MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())
       AND (payment_status IS NULL OR payment_status = '' OR payment_status = 'paid')
       AND (return_status IS NULL OR return_status = '' OR return_status != 'full')`,
      [shopId]
    );
    const [products] = await pool.execute('SELECT COUNT(*) as total_products FROM products WHERE shop_id = ? AND (is_deleted = 0 OR is_deleted IS NULL) AND stock_quantity > 0', [shopId]);
    const [lowStock] = await pool.execute('SELECT COUNT(*) as low_stock_count FROM products WHERE shop_id = ? AND (stock_quantity <= min_stock_level OR (min_stock_level IS NULL AND stock_quantity = 0))', [shopId]);
    const payload = {
      monthlyRevenue: (revenue as any[])[0]?.monthly_revenue || 0,
      totalProducts: (products as any[])[0]?.total_products || 0,
      lowStockCount: (lowStock as any[])[0]?.low_stock_count || 0,
    };
    setCachedPayload(dashboardCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/products', authenticateToken, capAdminProductsRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('frequent:admin-products', req, shopId, req.user?.id);
    const cached = getCachedPayload<any[]>(frequentCache, cacheKey);
    if (cached !== null) return res.json(cached);
    await ensureBranchInventoryTable();
    // Source of truth: products.stock_quantity; branches array included for ALL accounts (unified).
    const [products] = await pool.execute(
      `SELECT p.*, c.name_en AS category_name_en, c.name_ar AS category_name_ar,
       COALESCE(p.stock_quantity, 0) AS stock
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
       ORDER BY p.created_at DESC`,
      [shopId]
    );
    const list = (products || []) as any[];
    for (const p of list) {
      const dbVal = p.stock_quantity != null && String(p.stock_quantity).trim() !== '' ? Number(p.stock_quantity) : (p.stock != null ? Number(p.stock) : 0);
      const raw = Number.isNaN(dbVal) ? 0 : dbVal;
      p.stock_quantity = raw;
      p.quantity = raw;
      p.available_stock = raw;
    }
    if (list.length > 0) console.log('GET /api/admin/products first product DB STOCK:', list[0].id, list[0].stock_quantity);
    if (list.length > 0) {
      try {
        const [branchRows] = await pool.execute(
          'SELECT product_id, branch_id, quantity FROM branch_inventory WHERE shop_id = ?',
          [shopId]
        );
        const branchesByProduct: Record<number, { branch_id: number; quantity: number }[]> = {};
        for (const r of (branchRows as any[])) {
          const pid = Number(r.product_id);
          if (!branchesByProduct[pid]) branchesByProduct[pid] = [];
          branchesByProduct[pid].push({
            branch_id: Number(r.branch_id),
            quantity: parseFloat(String(r.quantity)) || 0,
          });
        }
        for (const p of list) {
          p.branches = branchesByProduct[Number(p.id)] || [];
        }
      } catch (_) {
        for (const p of list) p.branches = [];
      }
    }
    setCachedPayload(frequentCache, cacheKey, list);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/inventory/low-stock', authenticateToken, capLowStockRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const [products] = await pool.execute(
      `SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.shop_id = ?
         AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
         AND p.stock_quantity > 0
         AND (p.stock_quantity <= p.min_stock_level OR (p.min_stock_level IS NULL AND p.stock_quantity = 0))
       ORDER BY p.stock_quantity ASC`,
      [shopId]
    );
    res.json(products || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Product branch assignment + availability: return branch_ids and list of branches with quantity
app.get('/api/admin/inventory/product-branches/:productId', authenticateToken, capAdminProductsRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const productId = parseInt(req.params.productId, 10);
    if (!productId) return res.json({ productId: 0, branch_ids: [], availability: [] });
    await ensureBranchInventoryTable();
    const [rows] = await pool.execute(
      'SELECT branch_id FROM branch_inventory WHERE shop_id = ? AND product_id = ?',
      [shopId, productId]
    );
    const branch_ids = (rows as any[]).map((r) => Number(r.branch_id));
    const [availability] = await pool.execute(
      `SELECT b.id, b.name, b.name_ar, b.name_en, COALESCE(bi.quantity, 0) AS quantity
       FROM branches b
       LEFT JOIN branch_inventory bi ON bi.branch_id = b.id AND bi.product_id = ? AND bi.shop_id = b.shop_id
       WHERE b.shop_id = ?
       ORDER BY b.id`,
      [productId, shopId]
    );
    res.json({ productId, branch_ids, availability: availability || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/inventory/product-branches/:productId', authenticateToken, capInventoryWrite, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const productId = parseInt(req.params.productId, 10);
    if (!productId) return res.json({ success: true, productId: 0, branch_ids: [] });
    const branch_ids = Array.isArray(req.body?.branch_ids) ? req.body.branch_ids.map((x: any) => Number(x)).filter((n: number) => n > 0) : [];
    await ensureBranchInventoryTable();
    const conn = await pool.getConnection();
    const shopIdNum = Number(shopId);
    const productIdNum = Number(productId);
    try {
      await conn.beginTransaction();
      const [existing] = await conn.execute(
        'SELECT branch_id FROM branch_inventory WHERE shop_id = ? AND product_id = ?',
        [shopIdNum, productIdNum]
      );
      const current = new Set<number>((existing as any[]).map((r: any) => Number(r.branch_id)));
      const wanted = new Set<number>(branch_ids);
      for (const bid of wanted) {
        const branchIdNum = Number(bid);
        if (!current.has(branchIdNum)) {
          await conn.execute(
            `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
            [shopIdNum, branchIdNum, productIdNum, 0]
          );
        }
      }
      for (const bid of current) {
        const branchIdNum = Number(bid);
        if (!wanted.has(branchIdNum)) {
          await conn.execute(
            'DELETE FROM branch_inventory WHERE shop_id = ? AND branch_id = ? AND product_id = ?',
            [shopIdNum, branchIdNum, productIdNum]
          );
        }
      }
      await conn.commit();
    } finally {
      conn.release();
    }
    res.json({ ok: true, productId, branch_ids });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/inventory/availability', authenticateToken, capAdminProductsRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const productId = parseInt(req.query.productId as string, 10);
    if (!productId) return res.status(400).json({ error: 'productId required' });
    if (!(await shopUsesBranchInventory(shopId))) {
      const [pr] = await pool.execute(
        'SELECT COALESCE(stock_quantity, 0) AS s FROM products WHERE id = ? AND shop_id = ?',
        [productId, shopId]
      );
      const s = parseFloat(String((pr as any[])[0]?.s ?? 0)) || 0;
      return res.json({ available: s, productId, shopId, branches: [] });
    }
    await ensureBranchInventoryTable();
    const [rows] = await pool.execute(
      `SELECT b.id AS branch_id, b.name_en AS branch_name_en, b.name_ar AS branch_name_ar, b.name AS branch_name,
              COALESCE(bi.quantity, 0) AS qty
       FROM branches b
       LEFT JOIN branch_inventory bi ON bi.branch_id = b.id AND bi.shop_id = b.shop_id AND bi.product_id = ?
       WHERE b.shop_id = ?
       ORDER BY b.id`,
      [productId, shopId]
    );
    const branches = (rows as any[]).map((r) => ({
      branchId: r.branch_id,
      branchNameEn: r.branch_name_en || r.branch_name || '',
      branchNameAr: r.branch_name_ar || r.branch_name || '',
      qty: parseFloat(String(r.qty)) || 0,
    }));
    const total = branches.reduce((sum, b) => sum + b.qty, 0);
    res.json({ available: total, productId, shopId, branches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/parts/:id/availability', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const partId = parseInt(req.params.id, 10);
    if (!partId) return res.status(400).json({ error: 'part id required' });
    await ensureBranchInventoryTable();
    const [rows] = await pool.execute(
      `SELECT b.id AS branch_id, b.name_en AS branch_name_en, b.name_ar AS branch_name_ar, b.name AS branch_name,
              COALESCE(bi.quantity, 0) AS qty
       FROM branches b
       LEFT JOIN branch_inventory bi ON bi.branch_id = b.id AND bi.shop_id = b.shop_id AND bi.product_id = ?
       WHERE b.shop_id = ?
       ORDER BY b.id`,
      [partId, shopId]
    );
    const branches = (rows as any[]).map((r: any) => ({
      branchId: r.branch_id,
      branchNameEn: r.branch_name_en || r.branch_name || '',
      branchNameAr: r.branch_name_ar || r.branch_name || '',
      qty: parseFloat(String(r.qty)) || 0,
    }));
    res.json({ productId: partId, partId, branches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/inventory/branch-totals', authenticateToken, capBranchTotalsRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensureBranchInventoryTable();
    const [rows] = await pool.execute(
      'SELECT product_id, SUM(quantity) AS total_quantity FROM branch_inventory WHERE shop_id = ? GROUP BY product_id',
      [shopId]
    );
    const totals: Record<number, number> = {};
    for (const r of (rows as any[])) {
      totals[Number(r.product_id)] = parseFloat(String(r.total_quantity)) || 0;
    }
    const [byBranchRows] = await pool.execute(
      'SELECT branch_id, product_id, quantity FROM branch_inventory WHERE shop_id = ?',
      [shopId]
    );
    const totalsByBranch: Record<number, Record<number, number>> = {};
    for (const r of (byBranchRows as any[])) {
      const bid = Number(r.branch_id);
      const pid = Number(r.product_id);
      if (!totalsByBranch[bid]) totalsByBranch[bid] = {};
      totalsByBranch[bid][pid] = parseFloat(String(r.quantity)) || 0;
    }
    res.json({ totals, totalsByBranch });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/products/:id/branches', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const productId = parseInt(req.params.id, 10);
    if (!productId) return res.status(400).json({ error: 'Invalid product id' });
    await ensureBranchInventoryTable();
    const [rows] = await pool.execute(
      'SELECT branch_id, quantity FROM branch_inventory WHERE shop_id = ? AND product_id = ?',
      [shopId, productId]
    );
    const branch_ids = (rows as any[]).map((r) => Number(r.branch_id));
    const availability = (rows as any[]).map((r) => ({ branch_id: Number(r.branch_id), quantity: parseFloat(String(r.quantity)) || 0 }));
    res.json({ productId, branch_ids, availability });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/products/:id/branches', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const productId = parseInt(req.params.id, 10);
    if (!productId) return res.status(400).json({ error: 'Invalid product id' });
    const raw = req.body?.branches ?? req.body?.branch_ids ?? [];
    const branches: { branch_id: number; quantity: number }[] = [];
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      if (typeof first === 'object' && (first?.branch_id != null || first?.id != null)) {
        for (const b of raw as any[]) {
          const branch_id = Number(b?.branch_id ?? b?.id ?? 0);
          if (Number.isNaN(branch_id) || branch_id <= 0) continue;
          const quantity = parseFloat(b.quantity);
          if (Number.isNaN(quantity)) {
            return res.status(400).json({ error: 'Invalid quantity value' });
          }
          if (quantity < 0) {
            return res.status(400).json({ error: 'Invalid quantity for branch ' + branch_id });
          }
          branches.push({ branch_id, quantity });
        }
      }
    }
    if (branches.length === 0) {
      return res.status(400).json({ error: 'Request must include branches array with { branch_id, quantity } per branch' });
    }
    await ensureBranchInventoryTable();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const { branch_id, quantity } of branches) {
        await conn.execute(
          `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
          [shopId, branch_id, productId, quantity]
        );
      }
      const branchIds = branches.map((b) => b.branch_id);
      if (branchIds.length > 0) {
        const placeholders = branchIds.map(() => '?').join(',');
        await conn.execute(
          `DELETE FROM branch_inventory WHERE shop_id = ? AND product_id = ? AND branch_id NOT IN (${placeholders})`,
          [shopId, productId, ...branchIds]
        );
      } else {
        await conn.execute('DELETE FROM branch_inventory WHERE shop_id = ? AND product_id = ?', [shopId, productId]);
      }
      await conn.commit();
      const isBranchAccountBranches = (req as any)?.user?.package === 'branches';
      if (isBranchAccountBranches) {
        console.log('RUNNING BRANCH RECALC');
        await pool.execute(
          'UPDATE products p SET p.stock_quantity = (SELECT IFNULL(SUM(bi.quantity), 0) FROM branch_inventory bi WHERE bi.shop_id = p.shop_id AND bi.product_id = p.id) WHERE p.id = ? AND p.shop_id = ?',
          [productId, shopId]
        ).catch(() => {});
      }
    } finally {
      conn.release();
    }
    const branch_ids = branches.map((b) => b.branch_id);
    const [stockRows] = await pool.execute(
      'SELECT COALESCE(SUM(quantity), 0) AS stock FROM branch_inventory WHERE shop_id = ? AND product_id = ?',
      [shopId, productId]
    );
    const stockRow = (stockRows as any[])?.[0];
    res.json({ ok: true, productId, branch_ids, stock: stockRow ? parseFloat(String(stockRow.stock)) : 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/inventory/slow-moving/summary', authenticateToken, capLowStockRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const daysRaw = req.query.days;
    const thresholdRaw = req.query.threshold;
    const parsedDays = daysRaw != null && String(daysRaw).trim() !== '' ? Number.parseInt(String(daysRaw), 10) : 120;
    if (!Number.isFinite(parsedDays)) {
      return res.status(400).json({ error: 'days must be an integer' });
    }
    const parsedThreshold = thresholdRaw != null && String(thresholdRaw).trim() !== '' ? Number(String(thresholdRaw)) : 2;
    if (!Number.isFinite(parsedThreshold)) {
      return res.status(400).json({ error: 'threshold must be a number' });
    }
    const days = Math.min(365, Math.max(1, Math.floor(parsedDays)));
    const threshold = Math.min(100, Math.max(0, parsedThreshold));
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);
    const [dead] = await pool.execute(
      `SELECT COUNT(*) as c, COALESCE(SUM(p.sell_price * COALESCE(bi.branch_stock, p.stock_quantity)), 0) as v
       FROM products p
       LEFT JOIN (
         SELECT product_id, SUM(quantity) AS branch_stock
         FROM branch_inventory
         WHERE shop_id = ?
         GROUP BY product_id
       ) bi ON bi.product_id = p.id
       WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
       AND COALESCE(bi.branch_stock, p.stock_quantity) > 0
       AND NOT EXISTS (SELECT 1 FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE si.product_id = p.id AND s.created_at >= ?)`,
      [shopId, shopId, sinceStr]
    ).catch(() => [[{ c: 0, v: 0 }]]);
    const [slow] = await pool.execute(
      `SELECT COUNT(*) as c, COALESCE(SUM(p.sell_price * COALESCE(bi.branch_stock, p.stock_quantity)), 0) as v
       FROM products p
       LEFT JOIN (
         SELECT product_id, SUM(quantity) AS branch_stock
         FROM branch_inventory
         WHERE shop_id = ?
         GROUP BY product_id
       ) bi ON bi.product_id = p.id
       WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
       AND COALESCE(bi.branch_stock, p.stock_quantity) > 0
       AND EXISTS (SELECT 1 FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE si.product_id = p.id AND s.created_at >= ?)
       AND (SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE si.product_id = p.id AND s.created_at >= ?) <= ?`,
      [shopId, shopId, sinceStr, sinceStr, threshold]
    ).catch(() => [[{ c: 0, v: 0 }]]);
    const deadRow = (dead as any[])[0] || {};
    const slowRow = (slow as any[])[0] || {};
    let nearExpiryCount = 0;
    let nearExpiryValue = 0;
    try {
      const [nearEx] = await pool.execute(
        `SELECT COUNT(*) as c, COALESCE(SUM(p.sell_price * COALESCE(bi.branch_stock, p.stock_quantity)), 0) as v
         FROM products p
         LEFT JOIN (
           SELECT product_id, SUM(quantity) AS branch_stock
           FROM branch_inventory WHERE shop_id = ? GROUP BY product_id
         ) bi ON bi.product_id = p.id
        WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
          AND COALESCE(bi_agg.branch_stock, p.stock_quantity) > 0
           AND p.expiry_date IS NOT NULL
           AND p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
           AND p.expiry_date >= CURDATE()`,
        [shopId, shopId]
      );
      const nx = (nearEx as any[])[0] || {};
      nearExpiryCount = Number(nx.c ?? 0);
      nearExpiryValue = Number(nx.v ?? 0);
    } catch {
      // expiry_date may not exist until migration
    }
    if (!Number(deadRow.c ?? 0) && !Number(slowRow.c ?? 0)) {
      console.log('[admin/inventory/slow-moving/summary] empty result', { shopId, days, threshold });
    }
    res.json({
      ok: true,
      days,
      threshold,
      deadCount: Number(deadRow.c ?? 0),
      deadValue: Number(deadRow.v ?? 0),
      slowCount: Number(slowRow.c ?? 0),
      slowValue: Number(slowRow.v ?? 0),
      nearExpiryCount,
      nearExpiryValue,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pos/alerts', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as c
       FROM products
       WHERE shop_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)
       AND stock_quantity > 0
       AND stock_quantity <= COALESCE(min_stock_level, 0)`,
      [shopId]
    ).catch(() => [[{ c: 0 }]]);
    const lowStockCount = Number((countRows as any[])[0]?.c ?? 0);
    const [lowStock] = await pool.execute(
      `SELECT id, name_en, name_ar, stock_quantity, min_stock_level
       FROM products
       WHERE shop_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)
       AND stock_quantity > 0
       AND stock_quantity <= COALESCE(min_stock_level, 0)
       ORDER BY stock_quantity ASC
       LIMIT 20`,
      [shopId]
    ).catch(() => [[]]);

    const days = 120;
    const threshold = 2;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);
    const [dead] = await pool.execute(
      `SELECT COUNT(*) as c FROM products p
       WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
       AND p.stock_quantity > 0
       AND NOT EXISTS (SELECT 1 FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE si.product_id = p.id AND s.created_at >= ?)`,
      [shopId, sinceStr]
    ).catch(() => [[{ c: 0 }]]);
    const [slow] = await pool.execute(
      `SELECT COUNT(*) as c FROM products p
       WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
       AND p.stock_quantity > 0
       AND EXISTS (SELECT 1 FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE si.product_id = p.id AND s.created_at >= ?)
       AND (SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE si.product_id = p.id AND s.created_at >= ?) <= ?`,
      [shopId, sinceStr, sinceStr, threshold]
    ).catch(() => [[{ c: 0 }]]);
    const deadCount = Number((dead as any[])[0]?.c ?? 0);
    const slowCount = Number((slow as any[])[0]?.c ?? 0);

    res.json({
      lowStock: (lowStock as any[]) || [],
      lowStockCount,
      slowSummary: { deadCount, slowCount },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/inventory/slow-moving', authenticateToken, capLowStockRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const typeRaw = String(req.query.type || 'all').trim().toLowerCase();
    const type =
      typeRaw === 'dead' || typeRaw === 'slow' || typeRaw === 'all' || typeRaw === 'near_expiry' ? typeRaw : null;
    if (!type) return res.status(400).json({ error: 'type must be one of: all, dead, slow, near_expiry' });

    if (type === 'near_expiry') {
      const limitRaw = req.query.limit;
      const offsetRaw = req.query.offset;
      const parsedLimit = limitRaw != null && String(limitRaw).trim() !== '' ? Number.parseInt(String(limitRaw), 10) : 100;
      const parsedOffset = offsetRaw != null && String(offsetRaw).trim() !== '' ? Number.parseInt(String(offsetRaw), 10) : 0;
      const limit = Math.min(500, Math.max(1, Math.floor(parsedLimit)));
      const offset = Math.max(0, Math.floor(parsedOffset));
      const q = String(req.query.q || '').trim();
      let sqlNear = `
        SELECT p.id as productId,
               p.name_en as nameEn,
               p.name_ar as nameAr,
               p.sku,
               p.expiry_date as expiryDate,
               COALESCE(bi_agg.branch_stock, p.stock_quantity) as stock,
               p.sell_price as price,
               DATEDIFF(p.expiry_date, CURDATE()) as daysToExpiry
        FROM products p
        LEFT JOIN (
          SELECT product_id, SUM(quantity) AS branch_stock
          FROM branch_inventory
          WHERE shop_id = ?
          GROUP BY product_id
        ) bi_agg ON bi_agg.product_id = p.id
        WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
          AND COALESCE(bi_agg.branch_stock, p.stock_quantity) > 0
          AND p.expiry_date IS NOT NULL
          AND p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
          AND p.expiry_date >= CURDATE()
      `;
      const pNear: any[] = [shopId, shopId];
      if (q) {
        sqlNear += ' AND (p.name_en LIKE ? OR p.name_ar LIKE ? OR p.sku LIKE ?)';
        pNear.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      sqlNear += ` ORDER BY p.expiry_date ASC LIMIT ${limit} OFFSET ${offset}`;
      try {
        const [nearRows] = await pool.execute(sqlNear, pNear);
        const items = (nearRows as any[]).map((row: any) => ({
          productId: row.productId,
          name: row.nameEn,
          nameAr: row.nameAr,
          sku: row.sku,
          expiryDate: row.expiryDate,
          stock: Number(row.stock ?? 0),
          price: Number(row.price ?? 0),
          daysToExpiry: Number(row.daysToExpiry ?? 0),
          bucket: 'near_expiry',
          recommendationEn: 'Sell or rotate before expiry',
          recommendationAr: 'بِع أو دوّر المخزون قبل انتهاء الصلاحية',
        }));
        return res.json({ items: items || [], type: 'near_expiry' });
      } catch (e: any) {
        if (String(e?.message || '').includes('expiry_date')) {
          return res.json({ items: [], type: 'near_expiry', note: 'expiry_date column pending migration' });
        }
        throw e;
      }
    }

    const bucketRaw = String(req.query.bucket || '').trim();
    const allowedBuckets = new Set(['', '0_30', '31_90', '91_180', '180_plus', 'never_sold']);
    if (!allowedBuckets.has(bucketRaw)) {
      return res.status(400).json({ error: 'bucket is invalid' });
    }

    const daysRaw = req.query.days;
    const thresholdRaw = req.query.threshold;
    const limitRaw = req.query.limit;
    const offsetRaw = req.query.offset;

    const parsedDays = daysRaw != null && String(daysRaw).trim() !== '' ? Number.parseInt(String(daysRaw), 10) : 120;
    if (!Number.isFinite(parsedDays)) {
      return res.status(400).json({ error: 'days must be an integer' });
    }
    const parsedThreshold = thresholdRaw != null && String(thresholdRaw).trim() !== '' ? Number(String(thresholdRaw)) : 2;
    if (!Number.isFinite(parsedThreshold)) {
      return res.status(400).json({ error: 'threshold must be a number' });
    }
    const parsedLimit = limitRaw != null && String(limitRaw).trim() !== '' ? Number.parseInt(String(limitRaw), 10) : 100;
    if (!Number.isFinite(parsedLimit)) {
      return res.status(400).json({ error: 'limit must be an integer' });
    }
    const parsedOffset = offsetRaw != null && String(offsetRaw).trim() !== '' ? Number.parseInt(String(offsetRaw), 10) : 0;
    if (!Number.isFinite(parsedOffset)) {
      return res.status(400).json({ error: 'offset must be an integer' });
    }

    const days = Math.min(365, Math.max(1, Math.floor(parsedDays)));
    const threshold = Math.min(100, Math.max(0, parsedThreshold));
    const limit = Math.min(500, Math.max(1, Math.floor(parsedLimit)));
    const offset = Math.max(0, Math.floor(parsedOffset));
    const q = String(req.query.q || '').trim();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);
    let sql = `
      SELECT p.id as productId,
             p.name_en as nameEn,
             p.name_ar as nameAr,
             p.sku,
             COALESCE(bi_agg.branch_stock, p.stock_quantity) as stock,
             p.sell_price as price,
             p.buy_price as costPrice,
             (p.sell_price * COALESCE(bi_agg.branch_stock, p.stock_quantity)) as tiedValue,
             c.name_en as categoryNameEn,
             c.name_ar as categoryNameAr,
             ls.lastSoldAt as lastSoldAt,
             COALESCE(sw.soldQtyWindow, 0) as soldQtyWindow
      FROM products p
      LEFT JOIN (
        SELECT product_id, SUM(quantity) AS branch_stock
        FROM branch_inventory
        WHERE shop_id = ?
        GROUP BY product_id
      ) bi_agg ON bi_agg.product_id = p.id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN (
        SELECT si.product_id, MAX(s.created_at) as lastSoldAt
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE s.shop_id = ?
        GROUP BY si.product_id
      ) ls ON ls.product_id = p.id
      LEFT JOIN (
        SELECT si.product_id, COALESCE(SUM(si.quantity), 0) as soldQtyWindow
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE s.shop_id = ? AND s.created_at >= ?
        GROUP BY si.product_id
      ) sw ON sw.product_id = p.id
      WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
        AND COALESCE(bi_agg.branch_stock, p.stock_quantity) > 0
    `;
    const params: any[] = [shopId, shopId, shopId, sinceStr, shopId];
    const windowExpr = 'COALESCE(sw.soldQtyWindow, 0)';
    if (type === 'dead') {
      sql += ` AND ${windowExpr} = 0`;
    } else if (type === 'slow') {
      sql += ` AND ${windowExpr} > 0 AND ${windowExpr} <= ?`;
      params.push(threshold);
    } else {
      sql += ` AND ${windowExpr} <= ?`;
      params.push(threshold);
    }
    if (bucketRaw === 'never_sold') {
      sql += ' AND ls.lastSoldAt IS NULL';
    } else if (bucketRaw === '0_30') {
      sql += ' AND ls.lastSoldAt IS NOT NULL AND DATEDIFF(CURRENT_DATE(), ls.lastSoldAt) BETWEEN 0 AND 30';
    } else if (bucketRaw === '31_90') {
      sql += ' AND ls.lastSoldAt IS NOT NULL AND DATEDIFF(CURRENT_DATE(), ls.lastSoldAt) BETWEEN 31 AND 90';
    } else if (bucketRaw === '91_180') {
      sql += ' AND ls.lastSoldAt IS NOT NULL AND DATEDIFF(CURRENT_DATE(), ls.lastSoldAt) BETWEEN 91 AND 180';
    } else if (bucketRaw === '180_plus') {
      sql += ' AND ls.lastSoldAt IS NOT NULL AND DATEDIFF(CURRENT_DATE(), ls.lastSoldAt) > 180';
    }
    if (q) {
      sql += ' AND (p.name_en LIKE ? OR p.name_ar LIKE ? OR p.sku LIKE ?)';
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    // NOTE: Some MySQL setups throw mysqld_stmt_execute errors with LIMIT placeholders.
    // To keep bindings stable, inject clamped numeric LIMIT/OFFSET directly.
    sql += ` ORDER BY (p.sell_price * COALESCE(bi_agg.branch_stock, p.stock_quantity)) DESC LIMIT ${limit} OFFSET ${offset}`;
    const [rows] = await pool.execute(sql, params);
    const now = Date.now();
    const items = (rows as any[]).map((row: any) => {
      const lastSoldAt = row.lastSoldAt ? new Date(row.lastSoldAt) : null;
      const daysSinceLastSale = lastSoldAt ? Math.max(0, Math.floor((now - lastSoldAt.getTime()) / 86400000)) : null;
      let bucket = 'never_sold';
      if (daysSinceLastSale != null) {
        if (daysSinceLastSale <= 30) bucket = '0_30';
        else if (daysSinceLastSale <= 90) bucket = '31_90';
        else if (daysSinceLastSale <= 180) bucket = '91_180';
        else bucket = '180_plus';
      }
      const suggestedDiscountPct =
        bucket === '0_30' ? null : bucket === '31_90' ? 5 : bucket === '91_180' ? 10 : bucket === '180_plus' ? 20 : 25;
      return {
        productId: row.productId,
        name: row.nameEn,
        nameAr: row.nameAr,
        sku: row.sku,
        category: row.categoryNameEn || row.categoryNameAr || null,
        stock: Number(row.stock ?? 0),
        price: Number(row.price ?? 0),
        costPrice: row.costPrice != null ? Number(row.costPrice) : null,
        tiedValue: Number(row.tiedValue ?? 0),
        lastSoldAt: row.lastSoldAt ?? null,
        soldQtyWindow: Number(row.soldQtyWindow ?? 0),
        daysSinceLastSale,
        bucket,
        suggestedDiscountPct,
        recommendationEn: 'Reduce stock',
        recommendationAr: 'تقليل الكمية',
      };
    });
    if (items.length === 0) {
      logEmptyResult('inventory_slow_moving', { shopId, days, threshold, type, bucket: bucketRaw, q, limit, offset });
    }
    res.json({ items: items || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ANALYTICS (dashboard summary/timeseries) ==========

/** Normalize MySQL DATE / Date object / string to YYYY-MM-DD (merge keys + JSON). */
function sqlDateKeyFromRow(d: any): string {
  if (d == null || d === '') return '';
  if (d instanceof Date && !isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const t = new Date(s);
  if (!isNaN(t.getTime())) {
    return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
  }
  return s.slice(0, 10);
}

/** Online orders counted in analytics (confirmed + paid-but-not-yet-status-confirmed). Pass alias e.g. 'o' for JOINs. */
function onlineOrdersAnalyticsWhere(tableAlias?: string): string {
  const a = tableAlias ? `${tableAlias}.` : '';
  return `(
  ${a}status IN ('confirmed','completed')
  OR (${a}payment_status = 'confirmed' AND COALESCE(${a}status,'') != 'cancelled')
)`;
}
const ONLINE_ORDERS_ANALYTICS_WHERE = onlineOrdersAnalyticsWhere();

app.get('/api/admin/analytics/summary', authenticateToken, async (req: any, res: Response) => {
  setNoCacheHeaders(res);
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('dashboard:analytics-summary', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(dashboardCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const tzOffsetMinutes = req.query.tzOffsetMinutes != null ? parseInt(String(req.query.tzOffsetMinutes), 10) : undefined;
    const tzOk = typeof tzOffsetMinutes === 'number' && !isNaN(tzOffsetMinutes) && tzOffsetMinutes >= -720 && tzOffsetMinutes <= 720;
    const { fromStart, toEnd } = parseDateRangeForDb(from || '1970-01-01', to || '9999-12-31', tzOk ? tzOffsetMinutes : undefined);
    const [pos] = await pool.execute(
      `SELECT COALESCE(SUM(total_amount - COALESCE(returned_amount, 0)), 0) as amount, COUNT(*) as count FROM sales WHERE shop_id = ? AND (source = 'pos' OR source IS NULL) AND created_at >= ? AND created_at <= ?
       AND (payment_status IS NULL OR payment_status = '' OR payment_status = 'paid')
       AND (return_status IS NULL OR return_status = '' OR return_status != 'full')`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ amount: 0, count: 0 }]]);
    const [online] = await pool.execute(
      `SELECT COALESCE(SUM(total), 0) as amount, COUNT(*) as count FROM online_orders WHERE shop_id = ? AND ${ONLINE_ORDERS_ANALYTICS_WHERE} AND created_at >= ? AND created_at <= ?`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ amount: 0, count: 0 }]]);
    const posRow = (pos as any[])[0] || {};
    const onlineRow = (online as any[])[0] || {};
    const payload = {
      ok: true,
      pos: { total: Number(posRow.amount ?? 0), count: Number(posRow.count ?? 0) },
      online: { total: Number(onlineRow.amount ?? 0), count: Number(onlineRow.count ?? 0) },
    };
    console.log('[DASHBOARD] analytics/summary shopId=%s onlineCount=%s onlineTotal=%s', shopId, payload.online.count, payload.online.total);
    setCachedPayload(dashboardCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** Fill 24 slots for a single-day range. bySlot is slot index (0-23) -> { posAmount, posCount, onlineAmount, onlineCount }. startDate is YYYY-MM-DD. */
function fillHourlySlotsByRange(startDate: string, bySlot: Record<number, { posAmount: number; posCount: number; onlineAmount: number; onlineCount: number }>) {
  const out: any[] = [];
  for (let i = 0; i < 24; i++) {
    const slot = bySlot[i] || { posAmount: 0, posCount: 0, onlineAmount: 0, onlineCount: 0 };
    const date = `${startDate} ${String(i).padStart(2, '0')}:00:00`;
    out.push({
      date,
      posAmount: slot.posAmount,
      posCount: slot.posCount,
      onlineAmount: slot.onlineAmount,
      onlineCount: slot.onlineCount,
      totalAmount: slot.posAmount + slot.onlineAmount,
      totalCount: slot.posCount + slot.onlineCount,
    });
  }
  return out;
}

/** Map (date, hour) from DB to slot index 0-23 for a range starting at startDate and startHour. */
function rangeSlotIndex(rowDate: string, rowHour: number, startDate: string, startHour: number): number {
  const d1 = new Date(startDate + 'T00:00:00Z').getTime();
  const d2 = new Date(String(rowDate).slice(0, 10) + 'T00:00:00Z').getTime();
  const days = Math.round((d2 - d1) / 86400000);
  return days * 24 + (rowHour - startHour);
}

/** Convert UTC (dateStr YYYY-MM-DD, hour 0-23) to user local (localDateStr, localHour) using tzOffsetMinutes (minutes ahead of UTC). */
function utcToLocalSlot(dateStr: string, hour: number, tzOffsetMinutes: number): { localDate: string; localHour: number } {
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(5, 7);
  const d = dateStr.slice(8, 10);
  const utcMs = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10), hour, 0, 0, 0)).getTime();
  const localMs = utcMs + tzOffsetMinutes * 60 * 1000;
  const local = new Date(localMs);
  const localDate = local.getUTCFullYear() + '-' + String(local.getUTCMonth() + 1).padStart(2, '0') + '-' + String(local.getUTCDate()).padStart(2, '0');
  const localHour = local.getUTCHours();
  return { localDate, localHour };
}

/** Get user's local date (YYYY-MM-DD) at the start of the range. fromStart is UTC "YYYY-MM-DD HH:mm:ss". */
function getLocalDateFromUtcRange(fromStart: string, tzOffsetMinutes: number): string {
  const utcMs = new Date(fromStart.replace(' ', 'T') + 'Z').getTime();
  const localMs = utcMs + tzOffsetMinutes * 60 * 1000;
  const local = new Date(localMs);
  return local.getUTCFullYear() + '-' + String(local.getUTCMonth() + 1).padStart(2, '0') + '-' + String(local.getUTCDate()).padStart(2, '0');
}

app.get('/api/admin/analytics/timeseries', authenticateToken, async (req: any, res: Response) => {
  setNoCacheHeaders(res);
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('dashboard:analytics-timeseries', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(dashboardCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const cacheAndRespond = (payload: any) => {
      setCachedPayload(dashboardCache, cacheKey, payload);
      return res.json(payload);
    };
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const tzRaw = req.query.tzOffsetMinutes;
    const tzParsed = tzRaw != null && String(tzRaw).trim() !== '' ? parseInt(String(tzRaw), 10) : NaN;
    const tzOffsetMinutes = !isNaN(tzParsed) ? tzParsed : undefined;
    const tzOk = typeof tzOffsetMinutes === 'number' && !isNaN(tzOffsetMinutes) && tzOffsetMinutes >= -720 && tzOffsetMinutes <= 720;
    const tz = tzOk ? (tzOffsetMinutes as number) : 0;
    const { fromStart, toEnd, fromDateOnly, toDateOnly } = parseDateRangeForDb(
      from || '1970-01-01',
      to || '9999-12-31',
      tzOk ? tzOffsetMinutes : undefined
    );
    const source = String(req.query.source || 'all').toLowerCase();
    const bucket = String(req.query.bucket || 'day').toLowerCase();
    const baseDate = fromStart.slice(0, 10);
    const fromMs = new Date(fromStart.replace(' ', 'T') + 'Z').getTime();
    const toMs = new Date(toEnd.replace(' ', 'T') + 'Z').getTime();
    const rangeHours = (toMs - fromMs) / 3600000;
    const isSingleDay = rangeHours > 0 && rangeHours <= 25 && baseDate !== '1970-01-01';

    if (isSingleDay) {
      /** Inclusive local calendar days from range (YYYY-MM-DD string compare). */
      const slotFrom = fromDateOnly.slice(0, 10);
      const slotTo = toDateOnly.slice(0, 10);
      const dLo = slotFrom <= slotTo ? slotFrom : slotTo;
      const dHi = slotFrom <= slotTo ? slotTo : slotFrom;
      const labelDay = dLo;
      const tzAdj = tzOk ? (tzOffsetMinutes as number) : 0;
      const hasReturnedAmount = await hasColumn('sales', 'returned_amount');
      const hasPaymentStatus = await hasColumn('sales', 'payment_status');
      const hasReturnStatus = await hasColumn('sales', 'return_status');
      const posAmtExpr = hasReturnedAmount
        ? 'COALESCE(SUM(total_amount - COALESCE(returned_amount, 0)), 0)'
        : 'COALESCE(SUM(total_amount), 0)';
      const payF = hasPaymentStatus
        ? "AND (payment_status IS NULL OR payment_status = '' OR payment_status = 'paid')"
        : '';
      const retF = hasReturnStatus ? "AND (return_status IS NULL OR return_status = '' OR return_status != 'full')" : '';
      const [salesRows] = await pool
        .execute(
          `SELECT DATE(DATE_ADD(created_at, INTERVAL ? MINUTE)) AS ld,
                  HOUR(DATE_ADD(created_at, INTERVAL ? MINUTE)) AS lh,
                  ${posAmtExpr} AS posAmount,
                  COUNT(*) AS posCount
           FROM sales
           WHERE shop_id = ? AND created_at >= ? AND created_at <= ?
           ${payF}
           ${retF}
           GROUP BY DATE(DATE_ADD(created_at, INTERVAL ? MINUTE)), HOUR(DATE_ADD(created_at, INTERVAL ? MINUTE))`,
          [tzAdj, tzAdj, shopId, fromStart, toEnd, tzAdj, tzAdj]
        )
        .catch(() => [[]]);
      const [onlineRows] = await pool
        .execute(
          `SELECT DATE(DATE_ADD(created_at, INTERVAL ? MINUTE)) AS ld,
                  HOUR(DATE_ADD(created_at, INTERVAL ? MINUTE)) AS lh,
                  COALESCE(SUM(total), 0) AS onlineAmount,
                  COUNT(*) AS onlineCount
           FROM online_orders
           WHERE shop_id = ? AND ${ONLINE_ORDERS_ANALYTICS_WHERE} AND created_at >= ? AND created_at <= ?
           GROUP BY DATE(DATE_ADD(created_at, INTERVAL ? MINUTE)), HOUR(DATE_ADD(created_at, INTERVAL ? MINUTE))`,
          [tzAdj, tzAdj, shopId, fromStart, toEnd, tzAdj, tzAdj]
        )
        .catch(() => [[]]);
      const bySlot: Record<number, { posAmount: number; posCount: number; onlineAmount: number; onlineCount: number }> = {};
      for (let i = 0; i < 24; i++) bySlot[i] = { posAmount: 0, posCount: 0, onlineAmount: 0, onlineCount: 0 };
      for (const r of salesRows as any[]) {
        const d = normalizeDateOnly(r.ld);
        if (!d || d < dLo || d > dHi) continue;
        const lh = Number(r.lh);
        if (!Number.isFinite(lh) || lh < 0 || lh > 23) continue;
        bySlot[lh].posAmount = (bySlot[lh].posAmount || 0) + (Number(r.posAmount) || 0);
        bySlot[lh].posCount = (bySlot[lh].posCount || 0) + (Number(r.posCount) || 0);
      }
      for (const r of onlineRows as any[]) {
        const d = normalizeDateOnly(r.ld);
        if (!d || d < dLo || d > dHi) continue;
        const lh = Number(r.lh);
        if (!Number.isFinite(lh) || lh < 0 || lh > 23) continue;
        bySlot[lh].onlineAmount = (bySlot[lh].onlineAmount || 0) + (Number(r.onlineAmount) || 0);
        bySlot[lh].onlineCount = (bySlot[lh].onlineCount || 0) + (Number(r.onlineCount) || 0);
      }
      const points = fillHourlySlotsByRange(labelDay, bySlot);
      if (source === 'online') {
        cacheAndRespond({ ok: true, bucket: 'hour', points: points.map((p) => ({ date: p.date, onlineAmount: p.onlineAmount, onlineCount: p.onlineCount, totalAmount: p.onlineAmount, totalCount: p.onlineCount })) });
        return;
      }
      if (source === 'pos') {
        cacheAndRespond({ ok: true, bucket: 'hour', points: points.map((p) => ({ date: p.date, posAmount: p.posAmount, posCount: p.posCount, totalAmount: p.posAmount, totalCount: p.posCount })) });
        return;
      }
      cacheAndRespond({ ok: true, bucket: 'hour', points });
      return;
    }

    if (source === 'online') {
      const [rows] = await pool.execute(
        `SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as onlineAmount, COUNT(*) as onlineCount FROM online_orders WHERE shop_id = ? AND ${ONLINE_ORDERS_ANALYTICS_WHERE} AND created_at >= ? AND created_at <= ? GROUP BY DATE(created_at) ORDER BY date ASC`,
        [shopId, fromStart, toEnd]
      ).catch(() => [[]]);
      cacheAndRespond({
        ok: true,
        bucket: 'day',
        points: (rows as any[]).map((r: any) => {
          const dk = sqlDateKeyFromRow(r.date);
          return {
            date: dk,
            onlineAmount: r.onlineAmount,
            onlineCount: r.onlineCount,
            totalAmount: r.onlineAmount,
            totalCount: r.onlineCount,
          };
        }),
      });
      return;
    }
    if (source === 'pos') {
      const [rows] = await pool.execute(
        `SELECT DATE(created_at) as date, COALESCE(SUM(total_amount - COALESCE(returned_amount, 0)), 0) as posAmount, COUNT(*) as posCount FROM sales WHERE shop_id = ? AND (source = 'pos' OR source IS NULL) AND created_at >= ? AND created_at <= ?
         AND (payment_status IS NULL OR payment_status = '' OR payment_status = 'paid')
         AND (return_status IS NULL OR return_status = '' OR return_status != 'full')
         GROUP BY DATE(created_at) ORDER BY date ASC`,
        [shopId, fromStart, toEnd]
      ).catch(() => [[]]);
      cacheAndRespond({ ok: true, bucket: 'day', points: (rows as any[]).map((r: any) => ({ date: r.date, posAmount: r.posAmount, posCount: r.posCount, totalAmount: r.posAmount, totalCount: r.posCount })) });
      return;
    }
    const [salesRows] = await pool.execute(
      `SELECT DATE(created_at) as date, COALESCE(SUM(total_amount - COALESCE(returned_amount, 0)), 0) as posAmount, COUNT(*) as posCount FROM sales WHERE shop_id = ? AND created_at >= ? AND created_at <= ?
       AND (payment_status IS NULL OR payment_status = '' OR payment_status = 'paid')
       AND (return_status IS NULL OR return_status = '' OR return_status != 'full')
       GROUP BY DATE(created_at)`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[]]);
    const [onlineRows] = await pool.execute(
      `SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as onlineAmount, COUNT(*) as onlineCount FROM online_orders WHERE shop_id = ? AND ${ONLINE_ORDERS_ANALYTICS_WHERE} AND created_at >= ? AND created_at <= ? GROUP BY DATE(created_at)`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[]]);
    const points: Record<string, any> = {};
    for (const r of salesRows as any[]) {
      const posAmt = Number(r.posAmount) || 0;
      const posCnt = Number(r.posCount) || 0;
      const k = sqlDateKeyFromRow(r.date);
      points[k] = { date: k, posAmount: posAmt, posCount: posCnt, totalAmount: posAmt, totalCount: posCnt };
    }
    for (const r of onlineRows as any[]) {
      const k = sqlDateKeyFromRow(r.date);
      const p = points[k] || { date: k, posAmount: 0, posCount: 0 };
      const onlineAmt = Number(r.onlineAmount) || 0;
      const onlineCnt = Number(r.onlineCount) || 0;
      p.onlineAmount = onlineAmt;
      p.onlineCount = onlineCnt;
      p.totalAmount = (Number(p.posAmount) || 0) + onlineAmt;
      p.totalCount = (Number(p.posCount) || 0) + onlineCnt;
      points[k] = p;
    }
    cacheAndRespond({ ok: true, bucket: 'day', points: Object.values(points).sort((a: any, b: any) => (a.date > b.date ? 1 : -1)) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SYSTEM (super_admin dashboard) ==========
app.post('/api/system/heartbeat', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const canUpdate = await hasColumn('users', 'last_seen_at');
    if (!canUpdate) return res.json({ ok: false, skipped: 'last_seen_at_missing' });
    await pool.execute('UPDATE users SET last_seen_at = NOW() WHERE id = ?', [userId]);
    res.json({ ok: true, userId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/system/stats', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const cacheKey = getCacheKey('dashboard:system-stats', req, null, req.user?.id);
    const cached = getCachedPayload<any>(dashboardCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const [users] = await pool.execute('SELECT COUNT(*) as c FROM users').catch(() => [[{ c: 0 }]]);
    const [shops] = await pool.execute('SELECT COUNT(*) as c FROM shops').catch(() => [[{ c: 0 }]]);
    let onlineUsers = 0;
    let active15m = 0;
    let active60m = 0;
    if (await hasColumn('users', 'last_seen_at')) {
      // Do NOT filter by u.active or u.is_active - schema may not have these columns
      const [rows15] = await pool.execute(
        'SELECT COUNT(*) as c FROM users u WHERE u.last_seen_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)'
      );
      const [rows60] = await pool.execute(
        'SELECT COUNT(*) as c FROM users u WHERE u.last_seen_at >= DATE_SUB(NOW(), INTERVAL 60 MINUTE)'
      );
      onlineUsers = Number((rows15 as any[])[0]?.c ?? 0);
      active15m = onlineUsers;
      active60m = Number((rows60 as any[])[0]?.c ?? 0);
    }
    const payload = {
      ok: true,
      totalUsers: (users as any[])[0]?.c ?? 0,
      totalShops: (shops as any[])[0]?.c ?? 0,
      onlineUsers,
      active15m,
      active60m,
    };
    setCachedPayload(dashboardCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/system/users', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const limitRaw = Number(req.query.limit);
    const offsetRaw = Number(req.query.offset);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 100) : 20;
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;
    const q = String(req.query.q || '').trim();
    const uasReady = await ensureUserAdminStateTable();

    const [hasLastSeen, hasPhone] = await Promise.all([
      hasColumn('users', 'last_seen_at'),
      hasColumn('users', 'phone'),
    ]);

    const conditions: string[] = [];
    const params: any[] = [];
    const hasDeletedAt = await hasColumn('users', 'deleted_at');
    if (hasDeletedAt) conditions.push('(u.deleted_at IS NULL)');
    if (q) {
      conditions.push('(u.username LIKE ? OR u.email LIKE ? OR s.name LIKE ? OR s.business_name LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const lastSeenSelect = hasLastSeen ? 'u.last_seen_at as last_seen_at,' : 'NULL as last_seen_at,';
    const phoneSelect = hasPhone ? 'u.phone as user_phone,' : 'NULL as user_phone,';
    const [hasIsActiveCol, hasActiveCol, hasDisabledCol, hasIsDisabledCol, hasStatusCol] = await Promise.all([
      hasColumn('users', 'is_active'),
      hasColumn('users', 'active'),
      hasColumn('users', 'disabled'),
      hasColumn('users', 'is_disabled'),
      hasColumn('users', 'status'),
    ]);
    // Prefer ensureUserAdminStateTable() result — hasTable() cache can be stale.
    const hasUserAdminState = uasReady || (await hasTable('user_admin_state'));
    const fallbackDisabledExpr = [
      hasIsActiveCol ? '(u.is_active = 0)' : '',
      hasActiveCol ? '(u.active = 0)' : '',
      hasDisabledCol ? '(u.disabled = 1)' : '',
      hasIsDisabledCol ? '(u.is_disabled = 1)' : '',
      hasStatusCol ? "(LOWER(TRIM(COALESCE(u.status,''))) = 'disabled')" : '',
    ]
      .filter(Boolean)
      .join(' OR ');
    // Use alias admin_disabled to avoid any duplicate column name issues in mysql2 row objects.
    const disabledSelect = hasUserAdminState
      ? fallbackDisabledExpr
        ? `CASE WHEN COALESCE(uas.disabled, 0) = 1 OR (${fallbackDisabledExpr}) THEN 1 ELSE 0 END as admin_disabled,`
        : 'COALESCE(uas.disabled, 0) as admin_disabled,'
      : fallbackDisabledExpr
      ? `CASE WHEN ${fallbackDisabledExpr} THEN 1 ELSE 0 END as admin_disabled,`
      : '0 as admin_disabled,';
    const uasJoin = hasUserAdminState
      ? `LEFT JOIN (
           SELECT user_id, MAX(CASE WHEN disabled = 1 THEN 1 ELSE 0 END) AS disabled
           FROM user_admin_state
           GROUP BY user_id
         ) uas ON uas.user_id = u.id`
      : '';
    const sql = `
      SELECT u.id, u.username, u.email, u.role, u.shop_id AS user_shop_id, u.created_at, u.package as user_package,
             ${phoneSelect}
             ${lastSeenSelect}
             ${disabledSelect}
             s.name as shop_name, s.business_name as shop_business_name, s.package as shop_package, s.contact_phone as shop_phone,
             b.branch_count as branch_count,
             COALESCE(ss.plan, 'none') as sub_plan,
             ss.last_activated_at as sub_activated_at,
             ss.expires_at as sub_expires_at,
             ss.activation_source as sub_activation_source,
             CASE
               WHEN ss.shop_id IS NULL OR ss.plan = 'none' OR ss.status = 'inactive' THEN 'inactive'
               WHEN ss.expires_at IS NOT NULL AND ss.expires_at < NOW() THEN 'expired'
               WHEN ss.status IN ('active', 'trial') THEN 'active'
               ELSE 'inactive'
             END as sub_status,
             CASE
               WHEN ss.expires_at IS NULL THEN NULL
               WHEN ss.expires_at < NOW() THEN 0
               ELSE GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), ss.expires_at))
             END as remaining_seconds,
             CASE
               WHEN ss.expires_at IS NULL THEN NULL
               WHEN ss.expires_at < NOW() THEN 0
               ELSE GREATEST(0, CEIL(TIMESTAMPDIFF(SECOND, NOW(), ss.expires_at) / 86400))
             END as remaining_days
      FROM users u
      LEFT JOIN shops s ON s.id = u.shop_id
      LEFT JOIN shop_subscriptions ss ON ss.shop_id = u.shop_id
      ${uasJoin}
      LEFT JOIN (
        SELECT shop_id, COUNT(*) as branch_count
        FROM branches
        GROUP BY shop_id
      ) b ON b.shop_id = u.shop_id
      ${where}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await pool.execute(sql, params).catch(() => [[]]);
    const items = (rows as any[]).map((r: any) => {
      const dis =
        r.admin_disabled != null
          ? Number(r.admin_disabled)
          : r.disabled != null
          ? Number(r.disabled)
          : 0;
      const isDis = dis === 1;
      return {
      id: r.id,
      username: r.username,
      email: r.email ?? null,
      phone: r.user_phone ?? r.shop_phone ?? null,
      role: r.role,
      package: r.user_package ?? r.shop_package ?? null,
      shop: r.user_shop_id
        ? {
            id: r.user_shop_id,
            name: r.shop_name || r.shop_business_name || null,
            slug: null,
            package: r.shop_package ?? null,
            branchCount: Number(r.branch_count ?? 0),
            subscription_status: r.sub_status ?? 'inactive',
            plan: r.sub_plan ?? 'none',
            activated_at: r.sub_activated_at ?? null,
            expires_at: r.sub_expires_at ?? null,
            remaining_seconds: r.remaining_seconds != null ? Number(r.remaining_seconds) : null,
            remaining_days: r.remaining_days != null ? Number(r.remaining_days) : null,
            is_trial: r.sub_activation_source === 'trial',
          }
        : null,
      branch: null,
      last_seen_at: r.last_seen_at ?? null,
      created_at: r.created_at,
      is_active: !isDis,
      disabled: isDis,
      storeCount: r.user_shop_id ? 1 : 0,
      branchCount: Number(r.branch_count ?? 0),
      subscription_status: r.sub_status ?? 'inactive',
      plan: r.sub_plan ?? 'none',
      activated_at: r.sub_activated_at ?? null,
      expires_at: r.sub_expires_at ?? null,
      remaining_seconds: r.remaining_seconds != null ? Number(r.remaining_seconds) : null,
      remaining_days: r.remaining_days != null ? Number(r.remaining_days) : null,
      is_trial: r.sub_activation_source === 'trial',
    };
    });
    if (items.length === 0) {
      logEmptyResult('system_users', { q, limit, offset });
    }
    const nextOffset = items.length >= limit ? offset + limit : null;
    res.json({ ok: true, items, nextOffset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/system/users/:id/status', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    const nextActive =
      typeof req.body?.disabled === 'boolean'
        ? !req.body.disabled
        : typeof req.body?.is_active === 'boolean'
        ? req.body.is_active
        : typeof req.body?.active === 'boolean'
        ? req.body.active
        : typeof req.body?.status === 'string'
        ? req.body.status === 'active'
        : null;
    if (nextActive === null) {
      return res.status(400).json({ error: 'is_active or disabled is required' });
    }

    const [rows] = await pool.execute('SELECT id, role FROM users WHERE id = ?', [userId]);
    const row = (rows as any[])[0];
    if (!row) return res.status(404).json({ error: 'User not found' });
    if (row.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot disable super_admin' });
    }
    if (req.user?.id === userId && !nextActive) {
      return res.status(403).json({ error: 'Cannot disable your own account' });
    }

    await setUserDisabled(userId, !nextActive);
    res.json({ ok: true, id: userId, is_active: nextActive ? 1 : 0, disabled: !nextActive });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/system/users/:id/reset-password', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    const incoming = String(req.body?.newPassword || '').trim();
    let tempPassword: string | null = null;
    let finalPassword = incoming;
    if (!finalPassword) {
      tempPassword = crypto.randomBytes(6).toString('hex');
      finalPassword = tempPassword;
    }
    if (finalPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const hashedPassword = await bcrypt.hash(finalPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
    res.json({ ok: true, tempPassword: tempPassword || undefined });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN: Delete user account (super_admin only) ==========
app.get('/api/admin/users/:userId/delete-preview', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    const hasDeletedAt = await hasColumn('users', 'deleted_at');
    const deletedFilter = hasDeletedAt ? ' AND deleted_at IS NULL' : '';
    const [userRows] = await pool.execute(`SELECT id, username, email, role, shop_id, created_at, last_login_at, last_seen_at FROM users WHERE id = ?${deletedFilter}`, [userId]);
    const u = (userRows as any[])[0];
    if (!u) return res.status(404).json({ error: 'User not found' });
    if (u.role === 'super_admin') return res.status(403).json({ error: 'Cannot delete super_admin' });
    const shopId = u.shop_id ?? null;
    const summary: Record<string, number> = {};
    if (shopId) {
      const tables = [
        ['products', 'products'],
        ['sales', 'orders'],
        ['online_orders', 'online_orders'],
        ['payments', 'payments'],
        ['branches', 'branches'],
        ['notifications', 'notifications'],
      ];
      for (const [table, key] of tables) {
        try {
          const [rows] = await pool.execute(`SELECT COUNT(*) as c FROM ${table} WHERE shop_id = ?`, [shopId]);
          summary[key] = Number((rows as any[])[0]?.c ?? 0);
        } catch {
          summary[key] = 0;
        }
      }
    }
    const totalData = Object.values(summary).reduce((a, b) => a + b, 0);
    const hasData = totalData > 0;
    res.json({
      ok: true,
      user: { id: u.id, username: u.username, email: u.email, role: u.role, shop_id: shopId },
      shopId,
      summary,
      hasData,
      message: hasData ? 'This account has associated data. Deleting will soft-delete the user and shop.' : null,
      created_at: u.created_at,
      last_login_at: u.last_login_at ?? u.last_seen_at,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/users/:userId', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const force = req.query.force === 'true' || req.query.force === '1';
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    const hasDeletedAt = await hasColumn('users', 'deleted_at');
    const deletedFilter = hasDeletedAt ? ' AND deleted_at IS NULL' : '';
    const [userRows] = await pool.execute(`SELECT id, username, role, shop_id FROM users WHERE id = ?${deletedFilter}`, [userId]);
    const u = (userRows as any[])[0];
    if (!u) return res.status(404).json({ error: 'User not found' });
    if (u.role === 'super_admin') return res.status(403).json({ error: 'Cannot delete super_admin' });
    const shopId = u.shop_id ?? null;
    const shopsHasDeletedAt = await hasColumn('shops', 'deleted_at');
    if (hasDeletedAt) {
      await pool.execute('UPDATE users SET deleted_at = NOW() WHERE id = ?', [userId]);
    } else {
      await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    }
    let deletedShopId: number | null = null;
    if (shopId && shopsHasDeletedAt) {
      await pool.execute('UPDATE shops SET deleted_at = NOW() WHERE id = ?', [shopId]);
      deletedShopId = shopId;
    }
    res.json({ ok: true, deletedUserId: userId, deletedShopId, forced: force });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/admin/users/disable', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const userId = req.body?.userId != null ? Number(req.body.userId) : null;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId is required' });
    const [rows] = await pool.execute('SELECT id, role FROM users WHERE id = ? LIMIT 1', [userId]);
    const u = (rows as any[])[0];
    if (!u) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
    if (u.role === 'super_admin') return res.status(403).json({ ok: false, error: 'Cannot disable super_admin' });
    if (req.user?.id === userId) return res.status(403).json({ ok: false, error: 'Cannot disable your own account' });
    await setUserDisabled(userId, true, reason);
    res.json({ ok: true, userId, disabled: true });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/admin/users/enable', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const userId = req.body?.userId != null ? Number(req.body.userId) : null;
    if (!userId) return res.status(400).json({ ok: false, error: 'userId is required' });
    const [rows] = await pool.execute('SELECT id, role FROM users WHERE id = ? LIMIT 1', [userId]);
    const u = (rows as any[])[0];
    if (!u) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
    await setUserDisabled(userId, false);
    res.json({ ok: true, userId, disabled: false });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== ADMIN: Subscription reset + impersonate (super_admin only) ==========
app.post('/api/admin/subscription/reset', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const { userId, shopId, reason } = req.body || {};
    const targetShopId = shopId != null ? Number(shopId) : null;
    const targetUserId = userId != null ? Number(userId) : null;
    if (!targetShopId && !targetUserId) {
      return res.status(400).json({ error: 'userId or shopId is required' });
    }
    let resolvedShopId = targetShopId;
    if (!resolvedShopId && targetUserId) {
      const [rows] = await pool.execute('SELECT shop_id FROM users WHERE id = ?', [targetUserId]);
      const r = (rows as any[])[0];
      if (!r?.shop_id) return res.status(400).json({ error: 'User has no shop' });
      resolvedShopId = r.shop_id;
    }
    if (!resolvedShopId) return res.status(400).json({ error: 'Could not resolve shopId' });

    const [rows] = await pool.execute('SELECT shop_id FROM shop_subscriptions WHERE shop_id = ?', [resolvedShopId]);
    if ((rows as any[]).length === 0) {
      await pool.execute(
        'INSERT INTO shop_subscriptions (shop_id, plan, status, started_at, expires_at, activation_code, activation_source) VALUES (?, ?, ?, NOW(), NULL, NULL, NULL)',
        [resolvedShopId, 'none', 'inactive']
      );
    } else {
      await pool.execute(
        `UPDATE shop_subscriptions SET plan = 'none', status = 'inactive', expires_at = NULL, activation_code = NULL, activation_source = NULL, last_activated_at = NULL, activated_by_user_id = NULL, last_notified_expiring_at = NULL WHERE shop_id = ?`,
        [resolvedShopId]
      );
    }
    await pool.execute('UPDATE shops SET trial_ends_at = NULL, package = ? WHERE id = ?', ['none', resolvedShopId]);
    await pool.execute('UPDATE users SET package = ? WHERE shop_id = ?', ['none', resolvedShopId]);

    if (reason && process.env.NODE_ENV !== 'production') {
      console.log(`[ADMIN] Subscription reset: shopId=${resolvedShopId}, userId=${targetUserId}, reason=${reason}`);
    }
    res.json({ ok: true, shopId: resolvedShopId, userId: targetUserId ?? null, status: 'inactive' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/subscription/status', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const userId = req.query.userId != null ? Number(req.query.userId) : null;
    const shopId = req.query.shopId != null ? Number(req.query.shopId) : null;
    if (!shopId && !userId) {
      return res.status(400).json({ error: 'userId or shopId query param is required' });
    }
    let resolvedShopId = shopId;
    if (!resolvedShopId && userId) {
      const [rows] = await pool.execute('SELECT shop_id FROM users WHERE id = ?', [userId]);
      const r = (rows as any[])[0];
      resolvedShopId = r?.shop_id ?? null;
    }
    if (!resolvedShopId) {
      return res.json({ ok: true, plan: 'none', status: 'inactive', activated_at: null, expires_at: null, remaining_days: null, remaining_seconds: null, is_trial: false, message: 'User has no shop' });
    }
    const computed = await computeSubscription(resolvedShopId);
    const [subRow] = await pool.execute('SELECT activation_code FROM shop_subscriptions WHERE shop_id = ?', [resolvedShopId]).catch(() => [[]]);
    const subCode = (subRow as any[])[0]?.activation_code;
    res.json({
      ok: true,
      shopId: resolvedShopId,
      plan: computed.plan,
      status: computed.status,
      activated_at: computed.activated_at,
      expires_at: computed.expires_at,
      remaining_days: computed.remainingDays,
      remaining_seconds: computed.remainingSeconds,
      is_trial: computed.is_trial,
      activation_code_masked: subCode ? maskActivationCode(subCode) : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/impersonate', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    const { userId } = req.body || {};
    const targetUserId = userId != null ? Number(userId) : null;
    if (!targetUserId) return res.status(400).json({ error: 'userId is required' });

    await ensureUserSessionNonceColumn();

    // Simple query - do NOT filter by active/is_active (schema may not have these columns)
    const [rows] = await pool.execute(
      'SELECT id, username, role, package, shop_id, session_nonce FROM users WHERE id = ? LIMIT 1',
      [targetUserId]
    );
    const targetUser = (rows as any[])[0];
    if (!targetUser) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
    if (targetUser.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot impersonate super_admin' });
    }

    let sessionNonce = targetUser.session_nonce ? String(targetUser.session_nonce) : '';
    if (!sessionNonce) {
      sessionNonce = await issueLoginSessionNonce(Number(targetUser.id));
    }
    const impersonatedToken = jwt.sign(
      {
        userId: targetUser.id,
        role: targetUser.role,
        package: targetUser.package,
        shopId: targetUser.shop_id,
        sessionNonce,
        impersonatedBy: req.user?.id,
      },
      JWT_SECRET,
      { expiresIn: '30m' }
    );
    res.json({
      ok: true,
      token: impersonatedToken,
      user: { id: targetUser.id, username: targetUser.username, role: targetUser.role, package: targetUser.package, shopId: targetUser.shop_id },
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ========== SUBSCRIPTION (per-shop plan) ==========
app.get('/api/subscription', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await syncShopSubscription(shopId);
    const computed = await computeSubscription(shopId);
    const plan = computed.plan === 'none' ? 'bronze' : normalizePlan(computed.plan);
    const planConfig = getPlanDefinition(plan);
    const startedAt = computed.activated_at || null;
    const expiresAt = computed.expires_at || null;
    const daysLeft = computed.remainingDays;
    const hasActivation = computed.status === 'active' || computed.is_trial;
    const planStatus =
      computed.is_trial
        ? 'TRIAL'
        : computed.plan === 'none' || computed.status === 'inactive'
        ? 'NONE'
        : computed.status === 'expired'
        ? 'EXPIRED'
        : !expiresAt
        ? 'LIFETIME'
        : daysLeft != null && daysLeft > 0
        ? 'ACTIVE'
        : 'EXPIRED';

    const [counts] = await pool.execute(
      'SELECT role, COUNT(*) as count FROM users WHERE shop_id = ? GROUP BY role',
      [shopId]
    );
    const countArray = counts as any[];
    const roleCounts = countArray.reduce<Record<string, number>>((acc, row) => {
      acc[row.role] = row.count;
      return acc;
    }, {});
    const ownerCount = Number(roleCounts.shop_owner || 0);
    const totalUsers = Object.values(roleCounts).reduce((sum, n) => sum + Number(n || 0), 0);
    const additionalUsersCount = Math.max(0, totalUsers - ownerCount);
    const canAddUser =
      totalUsers < planConfig.totalUsers && additionalUsersCount < planConfig.additionalUsersLimit;

    const [activations] = await pool.execute(
      `SELECT license_key as code, duration, duration_days, used_at as activated_at, expires_at as new_expires_at
       FROM licenses
       WHERE used_by_shop_id = ?
       ORDER BY used_at DESC
       LIMIT 5`,
      [shopId]
    ).catch(() => [[]]);

    const [subRow] = await pool.execute('SELECT activation_code FROM shop_subscriptions WHERE shop_id = ?', [shopId]).catch(() => [[]]);
    const subCode = (subRow as any[])[0]?.activation_code || null;

    const [aiAddonRows] = await pool.execute(
      `SELECT code, ai_messages, ocr_credits, used_at, expires_at
       FROM ai_codes WHERE used_by_shop_id = ? ORDER BY used_at DESC LIMIT 5`,
      [shopId]
    ).catch(() => [[]]);

    res.json({
      planName: plan,
      planStatus,
      status: computed.status,
      startedAt,
      expiresAt,
      activatedAt: computed.activated_at,
      lastActivatedAt: computed.activated_at || startedAt,
      activationCode: subCode,
      activationCodeMasked: subCode ? maskActivationCode(subCode) : null,
      daysLeft,
      remainingDays: daysLeft,
      is_trial: computed.is_trial,
      userLimit: planConfig.totalUsers,
      userLimitTotal: planConfig.totalUsers,
      additionalUsersLimit: planConfig.additionalUsersLimit,
      userCount: totalUsers,
      userCountTotal: totalUsers,
      additionalUsersCount,
      canAddUser,
      permissions: planConfig.features,
      activations: Array.isArray(activations)
        ? (activations as any[]).map((row) => ({
            code: row.code,
            days: parseDurationDays(row.duration, row.duration_days) ?? 0,
            activated_at: row.activated_at,
            new_expires_at: row.new_expires_at,
          }))
        : [],
      aiAddonActivations: Array.isArray(aiAddonRows)
        ? (aiAddonRows as any[]).map((row) => ({
            codeMasked: row.code ? maskActivationCode(row.code) : '',
            ai_messages: Number(row.ai_messages ?? 0),
            ocr_credits: Number(row.ocr_credits ?? 0),
            redeemed_at: row.used_at,
            code_expires_at: row.expires_at,
          }))
        : [],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ONLINE INVOICES / ORDERS (invoices page) ==========
app.get('/api/admin/online-invoices', authenticateToken, requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const limit = Math.min(500, parseInt(req.query.limit as string, 10) || 200);
    const queryParam = String(req.query.query || '').trim();
    let sql = `SELECT o.id, o.shop_id, o.customer_name, o.phone, o.total as total, o.created_at as order_created_at, o.public_code, o.status,
              oi.id as invoice_id, oi.invoice_number, oi.printed_count as printed_count
       FROM online_orders o
       LEFT JOIN online_invoices oi ON oi.order_id = o.id
       WHERE o.shop_id = ?`;
    const params: any[] = [shopId];
    if (queryParam) {
      const likeVal = `%${queryParam}%`;
      const idNum = parseInt(queryParam, 10);
      sql += ` AND (o.customer_name LIKE ? OR o.phone LIKE ? OR o.public_code LIKE ? OR o.id = ? OR oi.invoice_number LIKE ?)`;
      params.push(likeVal, likeVal, likeVal, Number.isFinite(idNum) ? idNum : 0, likeVal);
    }
    sql += ` ORDER BY o.created_at DESC LIMIT ${limit}`;
    const [rows] = await pool.execute(sql, params).catch(() => [[]]);
    const list = (rows as any[]).map((row) => {
      const resolved =
        row.invoice_number != null && row.invoice_number !== ''
          ? row.invoice_number
          : row.public_code || row.id;
      return { ...row, invoice_number: resolved };
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** Paginated POS + online invoices for /invoices page (sorted by date, searchable by ON-… / phone / name / id). */
app.get('/api/invoices/list', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(5, parseInt(String(req.query.pageSize || '25'), 10) || 25));
    const offset = (page - 1) * pageSize;
    const source = String(req.query.source || 'all').toLowerCase();
    const qRaw = String(req.query.q || req.query.query || '').trim();
    const q = qRaw.replace(/^ON-/i, '').trim() || qRaw.trim();

    const plan = normalizePlan(req.user?.package);
    const planFeat = getPlanDefinition(plan).features;
    const hasOnline =
      req.user?.role === 'super_admin' || Boolean(planFeat?.onlineStore);

    const includePos = source === 'all' || source === 'pos';
    let includeOnline = source === 'all' || source === 'online';
    if (source === 'online' || source === 'all') {
      if (!hasOnline) {
        if (source === 'online') {
          return res.json({ rows: [], total: 0, page, pageSize });
        }
        includeOnline = false;
      }
    }

    const buildPosFrag = () => {
      let frag = `SELECT s.id, 'pos' AS src, s.created_at FROM sales s WHERE s.shop_id = ? AND (s.source = 'pos' OR s.source IS NULL)`;
      const params: any[] = [shopId];
      if (q) {
        const likeVal = `%${q}%`;
        const idNum = parseInt(q, 10);
        frag +=
          ' AND (s.customer_name LIKE ? OR s.customer_phone LIKE ? OR s.invoice_number LIKE ? OR s.invoice_serial LIKE ? OR s.id = ?)';
        params.push(likeVal, likeVal, likeVal, likeVal, Number.isFinite(idNum) ? idNum : 0);
      }
      return { frag, params };
    };

    const buildOnlineFrag = () => {
      let frag = `SELECT o.id, 'online' AS src, o.created_at FROM online_orders o LEFT JOIN online_invoices oi ON oi.order_id = o.id WHERE o.shop_id = ?`;
      const params: any[] = [shopId];
      if (q) {
        const likeVal = `%${q}%`;
        const idNum = parseInt(q, 10);
        frag +=
          ' AND (o.customer_name LIKE ? OR o.phone LIKE ? OR o.public_code LIKE ? OR o.id = ? OR CAST(oi.invoice_number AS CHAR) LIKE ?)';
        params.push(likeVal, likeVal, likeVal, Number.isFinite(idNum) ? idNum : 0, likeVal);
      }
      return { frag, params };
    };

    const innerParts: string[] = [];
    const innerParams: any[] = [];
    if (includePos) {
      const p = buildPosFrag();
      innerParts.push(p.frag);
      innerParams.push(...p.params);
    }
    if (includeOnline) {
      const o = buildOnlineFrag();
      innerParts.push(o.frag);
      innerParams.push(...o.params);
    }

    if (innerParts.length === 0) {
      return res.json({ rows: [], total: 0, page, pageSize });
    }

    const innerSql = innerParts.join(' UNION ALL ');
    const countSql = `SELECT COUNT(*) AS c FROM (${innerSql}) tcount`;
    const [countRows] = await pool.execute(countSql, innerParams);
    const total = Number((countRows as any[])[0]?.c ?? 0);

    const listSql = `SELECT * FROM (${innerSql}) t ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
    const [idRows] = await pool.execute(listSql, innerParams);
    const ordered = idRows as { id: number; src: string; created_at: string }[];

    const posIds = ordered.filter((r) => r.src === 'pos').map((r) => r.id);
    const onlineIds = ordered.filter((r) => r.src === 'online').map((r) => r.id);

    const posById = new Map<number, any>();
    if (posIds.length) {
      const ph = posIds.map(() => '?').join(',');
      const [pr] = await pool.execute(
        `SELECT s.*, u.username AS cashier_name,
                b.name AS branch_name, b.name_ar AS branch_name_ar, b.name_en AS branch_name_en
         FROM sales s
         LEFT JOIN users u ON u.id = s.user_id
         LEFT JOIN branches b ON b.id = s.branch_id AND b.shop_id = s.shop_id
         WHERE s.shop_id = ? AND s.id IN (${ph})`,
        [shopId, ...posIds]
      );
      for (const row of pr as any[]) {
        posById.set(row.id, { ...row, invoiceSource: 'pos' });
      }
    }

    const onlineById = new Map<number, any>();
    if (onlineIds.length) {
      const ph = onlineIds.map(() => '?').join(',');
      const [orows] = await pool.execute(
        `SELECT o.id, o.shop_id, o.customer_name, o.phone, o.total, o.created_at AS order_created_at, o.public_code, o.status,
                oi.invoice_number, oi.printed_count, oi.last_printed_at, o.address, o.payment_method,
                br.name AS branch_name, br.name_ar AS branch_name_ar, br.name_en AS branch_name_en
         FROM online_orders o
         LEFT JOIN online_invoices oi ON oi.order_id = o.id
         LEFT JOIN branches br ON br.id = o.branch_id AND br.shop_id = o.shop_id
         WHERE o.shop_id = ? AND o.id IN (${ph})`,
        [shopId, ...onlineIds]
      );
      for (const row of orows as any[]) {
        const invNum =
          row.invoice_number != null && row.invoice_number !== '' ? row.invoice_number : row.public_code || row.id;
        onlineById.set(row.id, {
          ...row,
          invoiceSource: 'online',
          total_amount: row.total,
          created_at: row.order_created_at,
          print_count: row.printed_count,
          printed_count: row.printed_count,
          customer_phone: row.phone,
          invoice_number: invNum,
          source: 'online',
        });
      }
    }

    const rows = ordered
      .map((r) => (r.src === 'pos' ? posById.get(r.id) : onlineById.get(r.id)))
      .filter(Boolean);

    res.json({ rows, total, page, pageSize });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/online-invoices/:id', authenticateToken, requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const [orders] = await pool.execute('SELECT * FROM online_orders WHERE id = ? AND shop_id = ?', [id, shopId]);
    if ((orders as any[]).length === 0) return res.status(404).json({ error: 'Not found' });
    const [items] = await pool.execute(
      'SELECT id, product_id, name_snapshot, sku_snapshot, quantity, sell_price_snapshot as unit_price FROM online_order_items WHERE order_id = ?',
      [id]
    ).catch(() => [[]]);
    res.json({ id, items: items || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/online-invoices/:id/print', authenticateToken, requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const [inv] = await pool.execute('SELECT id, printed_count FROM online_invoices WHERE order_id = ? AND shop_id = ?', [id, shopId]);
    let printCount = 0;
    if ((inv as any[]).length > 0) {
      const invId = (inv as any[])[0].id;
      await pool.execute('UPDATE online_invoices SET printed_count = printed_count + 1, last_printed_at = CURRENT_TIMESTAMP WHERE id = ?', [invId]);
      const [updated] = await pool.execute('SELECT printed_count FROM online_invoices WHERE id = ?', [invId]);
      printCount = (updated as any[])[0]?.printed_count ?? 0;
    }
    res.json({ printCount, lastPrintedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ONLINE ORDERS (online orders page) ==========
app.get('/api/admin/orders', authenticateToken, requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const status = String(req.query.status || '').trim();
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 500) : 200;

    const conditions: string[] = ['o.shop_id = ?'];
    const params: any[] = [shopId];
    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT o.id, o.shop_id, o.status, o.customer_name, o.phone, o.governorate, o.city, o.address, o.notes,
             o.total, o.payment_method, o.payment_status, o.order_status, o.branch_id,
             b.name as branch_name, b.name_ar as branch_name_ar, b.name_en as branch_name_en,
             o.created_at
      FROM online_orders o
      LEFT JOIN branches b ON b.id = o.branch_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ${limit}
    `;
    const [rows] = await pool.execute(sql, params).catch(() => [[]]);
    const list = rows as any[];
    if (list.length === 0) {
      logEmptyResult('admin_orders', { shopId, status, limit });
    }
    res.json(list || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/orders/:id', authenticateToken, requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid order id' });
    const [orders] = await pool.execute('SELECT * FROM online_orders WHERE id = ? AND shop_id = ?', [id, shopId]);
    if ((orders as any[]).length === 0) return res.status(404).json({ error: 'Not found' });
    const order = (orders as any[])[0];
    const [items] = await pool.execute(
      'SELECT id, product_id, name_snapshot, sku_snapshot, quantity, sell_price_snapshot as unit_price FROM online_order_items WHERE order_id = ?',
      [id]
    ).catch(() => [[]]);
    res.json({ ...order, items: items || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/orders/:id/status', authenticateToken, requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid order id' });
    const status = String(req.body?.status || '').trim();
    if (!status) return res.status(400).json({ error: 'status is required' });
    const [prevRows] = await pool.execute('SELECT status, total, public_code FROM online_orders WHERE id = ? AND shop_id = ?', [
      id,
      shopId,
    ]);
    const prevOrder = (prevRows as any[])[0];
    if (!prevOrder) return res.status(404).json({ error: 'Order not found' });
    const [itemsRows] = await pool.execute('SELECT COUNT(*) as cnt FROM online_order_items WHERE order_id = ?', [id]);
    const itemsCount = Number((itemsRows as any[])[0]?.cnt ?? 0);
    const orderStatus =
      status === 'pending'
        ? 'NEW'
        : status === 'confirmed'
        ? 'PROCESSING'
        : status === 'completed'
        ? 'DELIVERED'
        : status === 'cancelled'
        ? 'CANCELLED'
        : status;
    await pool.execute(
      'UPDATE online_orders SET status = ?, order_status = ? WHERE id = ? AND shop_id = ?',
      [status, orderStatus, id, shopId]
    );
    const type =
      status === 'confirmed'
        ? 'online_order_confirmed'
        : status === 'completed'
        ? 'online_order_completed'
        : status === 'cancelled'
        ? 'online_order_cancelled'
        : 'online_order_status_changed';
    await insertNotification({
      shopId,
      source: 'online',
      type,
      data: {
        orderId: id,
        total: Number(prevOrder?.total || 0),
        itemsCount,
        publicCode: prevOrder?.public_code ?? null,
        fromStatus: prevOrder?.status ?? null,
        toStatus: status,
      },
    });
    if (status === 'confirmed' || status === 'completed') {
      console.log('[DASHBOARD] order_confirmed shopId=%s orderId=%s status=%s — dashboard metrics will reflect on next fetch', shopId, id, status);
    }
    res.json({ ok: true, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN COUPONS (shop-scoped) ==========
app.post('/api/coupons', authenticateToken, requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const { type, value, starts_at, expires_at, usage_limit, min_order_total } = req.body || {};
    const couponType = String(type || 'percent').toLowerCase();
    if (couponType !== 'percent' && couponType !== 'fixed') {
      return res.status(400).json({ error: 'type must be percent or fixed' });
    }
    const couponValue = Number(value);
    if (!Number.isFinite(couponValue) || couponValue < 0) {
      return res.status(400).json({ error: 'value must be a non-negative number' });
    }
    const code = await generateCouponCode(shopId, couponType as 'percent' | 'fixed', couponValue);
    const startsAt = starts_at ? new Date(starts_at) : null;
    const expiresAt = expires_at ? new Date(expires_at) : null;
    const usageLimit = usage_limit != null && Number.isFinite(Number(usage_limit)) ? Math.max(0, Math.floor(Number(usage_limit))) : null;
    const minOrderTotal = min_order_total != null && Number.isFinite(Number(min_order_total)) ? Number(min_order_total) : null;
    const userId = req.user?.id ?? null;
    const [result] = await pool.execute(
      `INSERT INTO coupons (shop_id, code, type, value, is_active, starts_at, expires_at, usage_limit, min_order_total, created_by_user_id)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
      [shopId, code, couponType, couponValue, startsAt, expiresAt, usageLimit, minOrderTotal, userId]
    );
    const insertId = (result as any).insertId;
    const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [insertId]);
    const coupon = (rows as any[])[0];
    res.status(201).json({ coupon });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/coupons', authenticateToken, requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const [rows] = await pool.execute(
      'SELECT * FROM coupons WHERE shop_id = ? ORDER BY created_at DESC',
      [shopId]
    );
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/coupons/:id', authenticateToken, requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid coupon id' });
    const [existing] = await pool.execute('SELECT * FROM coupons WHERE id = ? AND shop_id = ?', [id, shopId]);
    if ((existing as any[]).length === 0) return res.status(404).json({ error: 'Coupon not found' });
    const { is_active, starts_at, expires_at, usage_limit, min_order_total } = req.body || {};
    const updates: string[] = [];
    const params: any[] = [];
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    if (starts_at !== undefined) {
      updates.push('starts_at = ?');
      params.push(starts_at ? new Date(starts_at) : null);
    }
    if (expires_at !== undefined) {
      updates.push('expires_at = ?');
      params.push(expires_at ? new Date(expires_at) : null);
    }
    if (usage_limit !== undefined) {
      updates.push('usage_limit = ?');
      params.push(usage_limit != null && Number.isFinite(Number(usage_limit)) ? Math.max(0, Math.floor(Number(usage_limit))) : null);
    }
    if (min_order_total !== undefined) {
      updates.push('min_order_total = ?');
      params.push(min_order_total != null && Number.isFinite(Number(min_order_total)) ? Number(min_order_total) : null);
    }
    if (updates.length === 0) return res.json({ coupon: (existing as any[])[0] });
    params.push(id, shopId);
    await pool.execute(
      `UPDATE coupons SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`,
      params
    );
    const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [id]);
    res.json({ coupon: (rows as any[])[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/coupons/:id', authenticateToken, requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid coupon id' });
    await pool.execute('UPDATE coupons SET is_active = 0 WHERE id = ? AND shop_id = ?', [id, shopId]);
    const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ? AND shop_id = ?', [id, shopId]);
    if ((rows as any[]).length === 0) return res.status(404).json({ error: 'Coupon not found' });
    res.json({ ok: true, message: 'Coupon disabled' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== CHECKOUT APPLY COUPON (public, for online store) ==========
const handleApplyCoupon = async (req: Request, res: Response) => {
  const body = (req as any).body || {};
  const requestLang = body?.lang === 'en' ? 'en' : 'ar';
  const t = (ar: string, en: string) => (requestLang === 'ar' ? ar : en);
  try {
    const { shopId: rawShopId, code, orderTotal } = body;
    let shopId = Number(rawShopId || 0);
    if (!Number.isFinite(shopId) || shopId <= 0) {
      const dom = String(req.headers?.['x-shop-domain'] || req.headers?.['x-forwarded-host'] || req.headers?.host || '').trim().toLowerCase();
      if (dom) {
        const [rows] = await pool.execute(
          'SELECT shop_id FROM domains WHERE domain = ? AND is_active = 1 AND status = ? LIMIT 1',
          [dom, 'active']
        );
        shopId = Number((rows as any[])[0]?.shop_id || 0);
      }
    }
    if (!Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ valid: false, error: t('معرف المتجر مطلوب', 'shopId is required') });
    }
    const codeStr = String(code || '').trim();
    if (!codeStr) {
      return res.status(400).json({ valid: false, error: t('كود القسيمة مطلوب', 'Coupon code is required') });
    }
    const orderTotalNum = Number(orderTotal);
    if (!Number.isFinite(orderTotalNum) || orderTotalNum < 0) {
      return res.status(400).json({ valid: false, error: t('إجمالي الطلب مطلوب', 'Order total is required') });
    }
    const [rows] = await pool.execute(
      'SELECT * FROM coupons WHERE shop_id = ? AND LOWER(code) = LOWER(?)',
      [shopId, codeStr]
    );
    const coupon = (rows as any[])[0];
    if (!coupon) {
      return res.json({
        valid: false,
        error: t('كود القسيمة غير صالح', 'Invalid coupon code'),
      });
    }
    if (!coupon.is_active) {
      return res.json({
        valid: false,
        error: t('هذه القسيمة غير نشطة', 'This coupon is not active'),
      });
    }
    const now = new Date();
    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return res.json({
        valid: false,
        error: t('هذه القسيمة لم تبدأ بعد', 'This coupon has not started yet'),
      });
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return res.json({
        valid: false,
        error: t('هذه القسيمة منتهية الصلاحية', 'This coupon has expired'),
      });
    }
    if (coupon.usage_limit != null && Number(coupon.usage_count) >= Number(coupon.usage_limit)) {
      return res.json({
        valid: false,
        error: t('تم استنفاد استخدام هذه القسيمة', 'This coupon has reached its usage limit'),
      });
    }
    if (coupon.min_order_total != null && orderTotalNum < Number(coupon.min_order_total)) {
      return res.json({
        valid: false,
        error: t('الحد الأدنى للطلب غير محقق', 'Minimum order total not met'),
      });
    }
    const discountTotal = calculateCouponDiscount(orderTotalNum, coupon.type, Number(coupon.value));
    const totalAfterDiscount = Math.max(0, orderTotalNum - discountTotal);
    res.json({
      valid: true,
      discountTotal,
      totalBeforeDiscount: orderTotalNum,
      totalAfterDiscount,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
      },
    });
  } catch (error: any) {
    res.status(500).json({ valid: false, error: error?.message || 'Server error' });
  }
};

app.post('/api/checkout/apply-coupon', handleApplyCoupon);
app.post('/api/public/storefront/checkout/apply-coupon', handleApplyCoupon);

// ========== ADMIN PAYMENTS / ORDERS (payments page) ==========
app.get('/api/admin/payments-orders/orders', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const allowOnline = getPlanDefinition(normalizePlan(req.user?.package)).features.onlineStore;
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 500) : 200;
    const status = String(req.query.status || '').trim();
    const paymentStatus = String(req.query.paymentStatus || '').trim();
    const branchIdRaw = Number(req.query.branchId);
    const branchId = Number.isFinite(branchIdRaw) && branchIdRaw > 0 ? Math.floor(branchIdRaw) : null;
    const search = String(req.query.search || '').trim();
    let dateFrom = String(req.query.dateFrom || '').trim();
    let dateTo = String(req.query.dateTo || '').trim();
    if (!dateFrom && !dateTo) {
      const now = new Date();
      const toDefault = now.toISOString().slice(0, 10);
      const fromDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      dateFrom = fromDate.toISOString().slice(0, 10);
      dateTo = `${toDefault} 23:59:59`;
    }

    const conditions: string[] = ['o.shop_id = ?'];
    const params: any[] = [shopId];
    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }
    if (paymentStatus) {
      conditions.push('o.payment_status = ?');
      params.push(paymentStatus);
    }
    if (branchId) {
      conditions.push('o.branch_id = ?');
      params.push(branchId);
    }
    if (search) {
      const like = `%${search}%`;
      const num = Number(search);
      conditions.push('(o.customer_name LIKE ? OR o.phone LIKE ? OR o.public_code LIKE ? OR o.id = ?)');
      params.push(like, like, like, Number.isFinite(num) ? num : -1);
    }
    if (dateFrom) {
      conditions.push('o.created_at >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push('o.created_at <= ?');
      params.push(dateTo);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT o.id, o.shop_id, o.status, o.order_status, o.payment_status, o.customer_name, o.phone, o.governorate, o.city, o.address, o.notes,
             o.total, o.payment_method, o.branch_id,
             b.name as branch_name, b.name_ar as branch_name_ar, b.name_en as branch_name_en,
             o.created_at
      FROM online_orders o
      LEFT JOIN branches b ON b.id = o.branch_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ${limit}
    `;
    let onlineList: any[] = [];
    if (allowOnline) {
      const [rows] = await pool.execute(sql, params).catch(() => [[]]);
      onlineList = (rows as any[]).map((row: any) => ({ ...row, source: 'online' }));
    }

    const allowPosByStatus = !status || status === 'completed' || status === 'confirmed';
    const allowPosByPayment = !paymentStatus || paymentStatus === 'confirmed';
    let posList: any[] = [];
    if (allowPosByStatus && allowPosByPayment) {
      const posConditions: string[] = ['s.shop_id = ?'];
      const posParams: any[] = [shopId];
      if (branchId) {
        posConditions.push('s.branch_id = ?');
        posParams.push(branchId);
      }
      if (search) {
        const like = `%${search}%`;
        const num = Number(search);
        posConditions.push('(s.customer_name LIKE ? OR s.customer_phone LIKE ? OR s.invoice_number LIKE ? OR s.id = ?)');
        posParams.push(like, like, like, Number.isFinite(num) ? num : -1);
      }
      if (dateFrom) {
        posConditions.push('s.created_at >= ?');
        posParams.push(dateFrom);
      }
      if (dateTo) {
        posConditions.push('s.created_at <= ?');
        posParams.push(dateTo);
      }
      const posWhere = posConditions.length ? `WHERE ${posConditions.join(' AND ')}` : '';
      const posSql = `
        SELECT s.id, s.shop_id, s.customer_name, s.customer_phone as phone, s.customer_address as address,
               s.total_amount as total, s.payment_method, s.branch_id, s.created_at,
               b.name as branch_name, b.name_ar as branch_name_ar, b.name_en as branch_name_en
        FROM sales s
        LEFT JOIN branches b ON b.id = s.branch_id
        ${posWhere}
        ORDER BY s.created_at DESC
        LIMIT ${limit}
      `;
      const [posRows] = await pool.execute(posSql, posParams).catch(() => [[]]);
      posList = (posRows as any[]).map((row: any) => ({
        ...row,
        status: 'completed',
        order_status: 'DELIVERED',
        payment_status: 'confirmed',
        governorate: row.governorate ?? '',
        city: row.city ?? '',
        notes: null,
        source: 'pos',
      }));
    }

    const list = [...onlineList, ...posList]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, limit);
    if (list.length === 0) {
      logEmptyResult('payments_orders_orders', { shopId, status, paymentStatus, branchId, search, dateFrom, dateTo, limit });
    }
    res.json(list || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/payments-orders/payments', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const allowOnline = getPlanDefinition(normalizePlan(req.user?.package)).features.onlineStore;
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 500) : 200;
    const status = String(req.query.status || '').trim();
    const method = String(req.query.method || '').trim();
    const branchIdRaw = Number(req.query.branchId);
    const branchId = Number.isFinite(branchIdRaw) && branchIdRaw > 0 ? Math.floor(branchIdRaw) : null;
    const search = String(req.query.search || '').trim();
    let dateFrom = String(req.query.dateFrom || '').trim();
    let dateTo = String(req.query.dateTo || '').trim();
    if (!dateFrom && !dateTo) {
      const now = new Date();
      const toDefault = now.toISOString().slice(0, 10);
      const fromDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      dateFrom = fromDate.toISOString().slice(0, 10);
      dateTo = `${toDefault} 23:59:59`;
    }

    const conditions: string[] = ['p.shop_id = ?'];
    const params: any[] = [shopId];
    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    if (method) {
      conditions.push('p.method = ?');
      params.push(method);
    }
    if (branchId) {
      conditions.push('p.branch_id = ?');
      params.push(branchId);
    }
    if (search) {
      const like = `%${search}%`;
      const num = Number(search);
      conditions.push('(o.customer_name LIKE ? OR o.phone LIKE ? OR o.public_code LIKE ? OR p.order_id = ?)');
      params.push(like, like, like, Number.isFinite(num) ? num : -1);
    }
    if (dateFrom) {
      conditions.push('p.created_at >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push('p.created_at <= ?');
      params.push(dateTo);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT p.id, p.shop_id, p.order_id, p.method, p.amount, p.reference, p.status, p.proof_url, p.reject_reason,
             o.customer_name, o.phone, o.public_code,
             b.name as branch_name, b.name_ar as branch_name_ar, b.name_en as branch_name_en,
             p.created_at
      FROM payments p
      LEFT JOIN online_orders o ON o.id = p.order_id
      LEFT JOIN branches b ON b.id = p.branch_id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ${limit}
    `;
    let onlinePayments: any[] = [];
    if (allowOnline) {
      const [rows] = await pool.execute(sql, params).catch(() => [[]]);
      onlinePayments = (rows as any[]).map((row: any) => ({ ...row, source: 'online' }));
    }

    const allowPosByStatus = !status || status === 'confirmed';
    let posPayments: any[] = [];
    if (allowPosByStatus) {
      const posConditions: string[] = ['s.shop_id = ?'];
      const posParams: any[] = [shopId];
      if (method) {
        posConditions.push('s.payment_method = ?');
        posParams.push(method);
      }
      if (branchId) {
        posConditions.push('s.branch_id = ?');
        posParams.push(branchId);
      }
      if (search) {
        const like = `%${search}%`;
        const num = Number(search);
        posConditions.push('(s.customer_name LIKE ? OR s.customer_phone LIKE ? OR s.invoice_number LIKE ? OR s.id = ?)');
        posParams.push(like, like, like, Number.isFinite(num) ? num : -1);
      }
      if (dateFrom) {
        posConditions.push('s.created_at >= ?');
        posParams.push(dateFrom);
      }
      if (dateTo) {
        posConditions.push('s.created_at <= ?');
        posParams.push(dateTo);
      }
      const posWhere = posConditions.length ? `WHERE ${posConditions.join(' AND ')}` : '';
      const posSql = `
        SELECT s.id, s.shop_id, s.payment_method as method, s.total_amount as amount,
               s.invoice_number as reference, s.customer_name, s.customer_phone as phone, s.created_at,
               b.name as branch_name, b.name_ar as branch_name_ar, b.name_en as branch_name_en
        FROM sales s
        LEFT JOIN branches b ON b.id = s.branch_id
        ${posWhere}
        ORDER BY s.created_at DESC
        LIMIT ${limit}
      `;
      const [posRows] = await pool.execute(posSql, posParams).catch(() => [[]]);
      posPayments = (posRows as any[]).map((row: any) => ({
        id: -Number(row.id),
        shop_id: row.shop_id,
        order_id: row.id,
        method: row.method,
        amount: row.amount,
        reference: row.reference || null,
        status: 'confirmed',
        proof_url: null,
        reject_reason: null,
        customer_name: row.customer_name,
        phone: row.phone,
        public_code: null,
        branch_name: row.branch_name,
        branch_name_ar: row.branch_name_ar,
        branch_name_en: row.branch_name_en,
        created_at: row.created_at,
        source: 'pos',
      }));
    }

    const list = [...onlinePayments, ...posPayments]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, limit);
    if (list.length === 0) {
      logEmptyResult('payments_orders_payments', { shopId, status, method, branchId, search, dateFrom, dateTo, limit });
    }
    res.json(list || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/payments/:id/confirm', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid payment id' });
    const [rows] = await pool.execute('SELECT order_id FROM payments WHERE id = ? AND shop_id = ?', [id, shopId]);
    if ((rows as any[]).length === 0) return res.status(404).json({ error: 'Payment not found' });
    const orderId = (rows as any[])[0]?.order_id;
    await pool.execute('UPDATE payments SET status = "confirmed", reject_reason = NULL WHERE id = ? AND shop_id = ?', [id, shopId]);
    if (orderId) {
      await pool.execute('UPDATE online_orders SET payment_status = "confirmed" WHERE id = ? AND shop_id = ?', [orderId, shopId]);
    }
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/payments/:id/reject', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid payment id' });
    const reason = String(req.body?.reason || '').trim() || null;
    const [rows] = await pool.execute('SELECT order_id FROM payments WHERE id = ? AND shop_id = ?', [id, shopId]);
    if ((rows as any[]).length === 0) return res.status(404).json({ error: 'Payment not found' });
    const orderId = (rows as any[])[0]?.order_id;
    await pool.execute('UPDATE payments SET status = "rejected", reject_reason = ? WHERE id = ? AND shop_id = ?', [reason, id, shopId]);
    if (orderId) {
      await pool.execute('UPDATE online_orders SET payment_status = "rejected" WHERE id = ? AND shop_id = ?', [orderId, shopId]);
    }
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN REPORTS (reports page) ==========
// Reports summary: flat keys + sales object for frontend sync; net_drawer = posTotal + collections - expenses - returns
app.get('/api/admin/reports/summary', authenticateToken, requirePackageFeature('reports'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('reports:summary', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(reportsCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const tzOffsetMinutes = req.query.tzOffsetMinutes != null ? parseInt(String(req.query.tzOffsetMinutes), 10) : undefined;
    const tzOk = typeof tzOffsetMinutes === 'number' && !isNaN(tzOffsetMinutes) && tzOffsetMinutes >= -720 && tzOffsetMinutes <= 720;
    const mode = String(req.query.mode || req.query.source || 'all').toLowerCase();
    const bucket = String(req.query.bucket || 'day').toLowerCase();
    const { fromStart, toEnd, fromDateOnly, toDateOnly } = parseDateRangeForDb(from || '1970-01-01', to || '9999-12-31', tzOk ? tzOffsetMinutes : undefined);

    const hasSource = await hasColumn('sales', 'source');
    const salesSourceFilter = hasSource ? "AND (source = 'pos' OR source IS NULL)" : '';

    const [pos] = await pool.execute(
      `SELECT COALESCE(SUM(total_amount - COALESCE(returned_amount, 0)), 0) as amount, COUNT(*) as count FROM sales WHERE shop_id = ? ${salesSourceFilter} AND created_at >= ? AND created_at <= ?
       AND (payment_status IS NULL OR payment_status = '' OR payment_status = 'paid')
       AND (return_status IS NULL OR return_status = '' OR return_status != 'full')`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ amount: 0, count: 0 }]]);
    const [online] = await pool.execute(
      `SELECT COALESCE(SUM(total), 0) as amount, COUNT(*) as count FROM online_orders WHERE shop_id = ? AND ${ONLINE_ORDERS_ANALYTICS_WHERE} AND created_at >= ? AND created_at <= ?`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ amount: 0, count: 0 }]]);
    const [returns] = await pool.execute(
      'SELECT COALESCE(SUM(total_amount), 0) as returns_total FROM returns WHERE shop_id = ? AND created_at >= ? AND created_at <= ?',
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ returns_total: 0 }]]);
    const [collections] = await pool.execute(
      `SELECT COALESCE(SUM(p.amount), 0) as collections_total FROM customer_debt_payments p
       INNER JOIN customer_debts d ON d.id = p.debt_id AND d.shop_id = ?
       WHERE p.created_at >= ? AND p.created_at <= ?`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ collections_total: 0 }]]);
    const [expenses] = await pool.execute(
      'SELECT COALESCE(SUM(amount), 0) as expenses_total FROM expenses WHERE shop_id = ? AND expense_date >= ? AND expense_date <= ?',
      [shopId, fromDateOnly, toDateOnly]
    ).catch(() => [[{ expenses_total: 0 }]]);

    const posRow = (pos as any[])[0] || { amount: 0, count: 0 };
    const onlineRow = (online as any[])[0] || { amount: 0, count: 0 };
    const retRow = (returns as any[])[0] || {};
    const collRow = (collections as any[])[0] || {};
    const expRow = (expenses as any[])[0] || {};
    const posTotal = Number(posRow.amount) || 0;
    const posCount = Number(posRow.count) || 0;
    const onlineTotal = Number(onlineRow.amount) || 0;
    const onlineCount = Number(onlineRow.count) || 0;
    const returnsTotal = Number(retRow.returns_total ?? 0) || 0;
    const collectionsTotal = Number(collRow.collections_total ?? 0) || 0;
    const expensesTotal = Number(expRow.expenses_total ?? 0) || 0;
    const grossSales = posTotal + onlineTotal;
    const netSales = grossSales - returnsTotal;
    const netDrawer = posTotal + collectionsTotal - expensesTotal - returnsTotal;
    const totalRevenue = grossSales;
    const totalCount = posCount + onlineCount;

    let revenue = totalRevenue;
    let orders = totalCount;
    if (mode === 'pos') { revenue = posTotal; orders = posCount; }
    else if (mode === 'online') { revenue = onlineTotal; orders = onlineCount; }

    const body = {
      ok: true,
      pos: { total: posTotal, count: posCount },
      online: { total: onlineTotal, count: onlineCount },
      totalRevenue,
      ordersCount: totalCount,
      posRevenue: posTotal,
      posOrdersCount: posCount,
      onlineRevenueConfirmed: onlineTotal,
      onlineOrdersConfirmedCount: onlineCount,
      expenses_total: expensesTotal,
      returns_total: returnsTotal,
      collections_total: collectionsTotal,
      net_sales: netSales,
      cash_drawer_net: netDrawer,
      sales: {
        totalRevenue,
        ordersCount: totalCount,
        avgOrderValue: totalCount > 0 ? totalRevenue / totalCount : 0,
        posRevenue: posTotal,
        posOrdersCount: posCount,
        onlineRevenueConfirmed: onlineTotal,
        onlineOrdersConfirmedCount: onlineCount,
        expenses_total: expensesTotal,
        net_sales: netSales,
        cash_drawer_net: netDrawer,
        returns_total: returnsTotal,
        collections_total: collectionsTotal,
      },
      summary: {
        total: { revenue: totalRevenue, orders: totalCount, avgOrder: totalCount > 0 ? totalRevenue / totalCount : 0 },
        online: { revenue: onlineTotal, orders: onlineCount, avgOrder: onlineCount > 0 ? onlineTotal / onlineCount : 0 },
        pos: { revenue: posTotal, orders: posCount, avgOrder: posCount > 0 ? posTotal / posCount : 0 },
      },
      bucket,
      mode,
    };
    if (process.env.NODE_ENV !== 'production') {
      console.log('[REPORTS SUMMARY]', { from: fromStart, to: toEnd, shopId, posTotal, onlineTotal, returnsTotal, expensesTotal, collectionsTotal, netSales, netDrawer });
    }
    setCachedPayload(reportsCache, cacheKey, body);
    res.json(body);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/reports/profit', authenticateToken, requirePackageFeature('reports'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('reports:profit', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(reportsCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const cacheAndRespond = (payload: any) => {
      setCachedPayload(reportsCache, cacheKey, payload);
      return res.json(payload);
    };
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const tzOffsetMinutes = req.query.tzOffsetMinutes != null ? parseInt(String(req.query.tzOffsetMinutes), 10) : 0;
    const tzOk = typeof tzOffsetMinutes === 'number' && !isNaN(tzOffsetMinutes) && tzOffsetMinutes >= -720 && tzOffsetMinutes <= 720;
    const tz = tzOk ? tzOffsetMinutes : 0;
    const { fromStart, toEnd, fromDateOnly, toDateOnly } = parseDateRangeForDb(from || '1970-01-01', to || '9999-12-31', tzOk ? tzOffsetMinutes : undefined);
    const baseDate = fromStart.slice(0, 10);
    const fromMs = new Date(fromStart.replace(' ', 'T') + 'Z').getTime();
    const toMs = new Date(toEnd.replace(' ', 'T') + 'Z').getTime();
    const rangeHours = (toMs - fromMs) / 3600000;
    const isSingleDay = rangeHours > 0 && rangeHours <= 25 && baseDate !== '1970-01-01';

    const hasQtyReturned = await hasColumn('sale_items', 'quantity_returned');
    const qtyExpr = hasQtyReturned ? '(si.quantity - COALESCE(si.quantity_returned, 0))' : 'si.quantity';
    const hasPurchasePrice = await hasColumn('products', 'purchase_price');
    const costExpr = hasPurchasePrice ? 'COALESCE(p.buy_price, p.purchase_price, 0)' : 'COALESCE(p.buy_price, 0)';
    const profitSelect = `COALESCE(SUM((si.unit_price - ${costExpr}) * ${qtyExpr}), 0) as profit`;
    const cogsSelect = `COALESCE(SUM(${costExpr} * ${qtyExpr}), 0) as cogs`;
    const onlineProfitSelect = `COALESCE(SUM((oi.sell_price_snapshot - ${costExpr}) * oi.quantity), 0) as profit`;
    const onlineCogsSelect = `COALESCE(SUM(${costExpr} * oi.quantity), 0) as cogs`;

    const [totalSalesRows] = await pool.execute(
      `SELECT COALESCE(SUM(s.total_amount - COALESCE(s.returned_amount, 0)), 0) as pos_sales FROM sales s
       WHERE s.shop_id = ? AND s.created_at >= ? AND s.created_at <= ?
         AND (s.payment_status IS NULL OR s.payment_status = '' OR s.payment_status = 'paid')
         AND (s.return_status IS NULL OR s.return_status = '' OR s.return_status != 'full')`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ pos_sales: 0 }]]);
    const [onlineSalesRows] = await pool.execute(
      `SELECT COALESCE(SUM(total), 0) as online_sales FROM online_orders WHERE shop_id = ? AND ${ONLINE_ORDERS_ANALYTICS_WHERE} AND created_at >= ? AND created_at <= ?`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ online_sales: 0 }]]);
    const [returnsRows] = await pool.execute(
      'SELECT COALESCE(SUM(total_amount), 0) as returns_total FROM returns WHERE shop_id = ? AND created_at >= ? AND created_at <= ?',
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ returns_total: 0 }]]);
    const [expensesRows] = await pool.execute(
      'SELECT COALESCE(SUM(amount), 0) as expenses_total FROM expenses WHERE shop_id = ? AND expense_date >= ? AND expense_date <= ?',
      [shopId, fromDateOnly, toDateOnly]
    ).catch(() => [[{ expenses_total: 0 }]]);
    const [cogsRows] = await pool.execute(
      `SELECT ${cogsSelect}
       FROM sales s
       JOIN sale_items si ON s.id = si.sale_id
       LEFT JOIN products p ON si.product_id = p.id
       WHERE s.shop_id = ? AND s.created_at >= ? AND s.created_at <= ?
         AND (s.payment_status IS NULL OR s.payment_status = '' OR s.payment_status = 'paid')
         AND (s.return_status IS NULL OR s.return_status = '' OR s.return_status != 'full')`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ cogs: 0 }]]);
    const [cogsOnlineRows] = await pool.execute(
      `SELECT ${onlineCogsSelect}
       FROM online_orders o
       JOIN online_order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.shop_id = ? AND ${onlineOrdersAnalyticsWhere('o')} AND o.created_at >= ? AND o.created_at <= ?`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ cogs: 0 }]]);

    const posSales = Number((totalSalesRows as any[])[0]?.pos_sales ?? 0);
    const onlineSales = Number((onlineSalesRows as any[])[0]?.online_sales ?? 0);
    const returnsTotal = Number((returnsRows as any[])[0]?.returns_total ?? 0);
    const expensesTotal = Number((expensesRows as any[])[0]?.expenses_total ?? 0);
    const cogs =
      Number((cogsRows as any[])[0]?.cogs ?? 0) + Number((cogsOnlineRows as any[])[0]?.cogs ?? 0);
    const totalSales = posSales + onlineSales - returnsTotal;
    const totalProfit = totalSales - cogs - expensesTotal;

    const [ordersCountRows] = await pool.execute(
      `SELECT (SELECT COUNT(*) FROM sales WHERE shop_id = ? AND created_at >= ? AND created_at <= ? AND (payment_status IS NULL OR payment_status = '' OR payment_status = 'paid') AND (return_status IS NULL OR return_status = '' OR return_status != 'full')) +
       (SELECT COUNT(*) FROM online_orders WHERE shop_id = ? AND ${ONLINE_ORDERS_ANALYTICS_WHERE} AND created_at >= ? AND created_at <= ?) as cnt`,
      [shopId, fromStart, toEnd, shopId, fromStart, toEnd]
    ).catch(() => [[{ cnt: 0 }]]);
    const orders_count = Number((ordersCountRows as any[])[0]?.cnt ?? 0);

    const reportPayload = {
      sales: totalSales,
      expenses: expensesTotal,
      cogs,
      profit: totalProfit,
      orders_count,
      totalProfit,
      totalSales,
      returns_total: returnsTotal,
    };

    if (isSingleDay) {
      const localDate = getLocalDateFromUtcRange(fromStart, tz);
      const [rows] = await pool.execute(
        `SELECT DATE(s.created_at) as date, HOUR(s.created_at) as hour, ${profitSelect}
         FROM sales s
         JOIN sale_items si ON s.id = si.sale_id
         LEFT JOIN products p ON si.product_id = p.id
         WHERE s.shop_id = ? AND s.created_at >= ? AND s.created_at <= ?
           AND (s.payment_status IS NULL OR s.payment_status = '' OR s.payment_status = 'paid')
           AND (s.return_status IS NULL OR s.return_status = '' OR s.return_status != 'full')
         GROUP BY DATE(s.created_at), HOUR(s.created_at)`,
        [shopId, fromStart, toEnd]
      ).catch(() => [[]]);
      const [onlineHourRows] = await pool.execute(
        `SELECT DATE(o.created_at) as date, HOUR(o.created_at) as hour, ${onlineProfitSelect}
         FROM online_orders o
         JOIN online_order_items oi ON o.id = oi.order_id
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE o.shop_id = ? AND ${onlineOrdersAnalyticsWhere('o')}
           AND o.created_at >= ? AND o.created_at <= ?
         GROUP BY DATE(o.created_at), HOUR(o.created_at)`,
        [shopId, fromStart, toEnd]
      ).catch(() => [[]]);
      const bySlot: Record<number, number> = {};
      for (let i = 0; i < 24; i++) bySlot[i] = 0;
      for (const r of rows as any[]) {
        const { localDate: rowLocalDate, localHour } = utcToLocalSlot(String(r.date), Number(r.hour), tz);
        if (rowLocalDate === localDate && localHour >= 0 && localHour < 24) {
          bySlot[localHour] = (bySlot[localHour] || 0) + (Number(r.profit ?? 0) || 0);
        }
      }
      for (const r of onlineHourRows as any[]) {
        const { localDate: rowLocalDate, localHour } = utcToLocalSlot(String(r.date), Number(r.hour), tz);
        if (rowLocalDate === localDate && localHour >= 0 && localHour < 24) {
          bySlot[localHour] = (bySlot[localHour] || 0) + (Number(r.profit ?? 0) || 0);
        }
      }
      const dailyProfit: { date: string; profit: number }[] = [];
      for (let i = 0; i < 24; i++) {
        dailyProfit.push({ date: `${localDate} ${String(i).padStart(2, '0')}:00:00`, profit: bySlot[i] ?? 0 });
      }
      return cacheAndRespond({
        ok: true,
        ...reportPayload,
        dailyProfit,
        bucket: 'hour',
      });
    }

    const [rows] = await pool.execute(
      `SELECT DATE(s.created_at) as date, ${profitSelect}
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.shop_id = ? AND s.created_at >= ? AND s.created_at <= ?
        AND (s.payment_status IS NULL OR s.payment_status = '' OR s.payment_status = 'paid')
        AND (s.return_status IS NULL OR s.return_status = '' OR s.return_status != 'full')
      GROUP BY DATE(s.created_at)
      ORDER BY date ASC`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[]]);
    const [onlineDayRows] = await pool.execute(
      `SELECT DATE(o.created_at) as date, ${onlineProfitSelect}
       FROM online_orders o
       JOIN online_order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.shop_id = ? AND ${onlineOrdersAnalyticsWhere('o')}
         AND o.created_at >= ? AND o.created_at <= ?
       GROUP BY DATE(o.created_at)`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[]]);

    const byDateProfit = new Map<string, number>();
    for (const r of rows as any[]) {
      const k = String(r.date).slice(0, 10);
      byDateProfit.set(k, (byDateProfit.get(k) || 0) + Number(r.profit ?? 0));
    }
    for (const r of onlineDayRows as any[]) {
      const k = String(r.date).slice(0, 10);
      byDateProfit.set(k, (byDateProfit.get(k) || 0) + Number(r.profit ?? 0));
    }
    const dailyProfit = [...byDateProfit.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, profit]) => ({ date, profit }));
    return cacheAndRespond({
      ok: true,
      ...reportPayload,
      dailyProfit,
      bucket: 'day',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/reports/sales', authenticateToken, requirePackageFeature('reports'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('reports:sales', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(reportsCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const tzOffsetMinutes = req.query.tzOffsetMinutes != null ? parseInt(String(req.query.tzOffsetMinutes), 10) : 0;
    const tzOk = typeof tzOffsetMinutes === 'number' && !isNaN(tzOffsetMinutes) && tzOffsetMinutes >= -720 && tzOffsetMinutes <= 720;
    const { fromStart, toEnd, fromDateOnly, toDateOnly } = parseDateRangeForDb(from || '1970-01-01', to || '9999-12-31', tzOk ? tzOffsetMinutes : undefined);
    const hasQtyReturned = await hasColumn('sale_items', 'quantity_returned');
    const qtyExpr = hasQtyReturned ? '(si.quantity - COALESCE(si.quantity_returned, 0))' : 'si.quantity';
    const hasPurchasePrice = await hasColumn('products', 'purchase_price');
    const costExpr = hasPurchasePrice ? 'COALESCE(p.buy_price, p.purchase_price, 0)' : 'COALESCE(p.buy_price, 0)';
    const cogsSelect = `COALESCE(SUM(${costExpr} * ${qtyExpr}), 0) as cogs`;
    const [totalSalesRows] = await pool.execute(
      `SELECT COALESCE(SUM(s.total_amount - COALESCE(s.returned_amount, 0)), 0) as pos_sales FROM sales s
       WHERE s.shop_id = ? AND s.created_at >= ? AND s.created_at <= ?
         AND (s.payment_status IS NULL OR s.payment_status = '' OR s.payment_status = 'paid')
         AND (s.return_status IS NULL OR s.return_status = '' OR s.return_status != 'full')`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ pos_sales: 0 }]]);
    const [onlineSalesRows] = await pool.execute(
      `SELECT COALESCE(SUM(total), 0) as online_sales FROM online_orders WHERE shop_id = ? AND ${ONLINE_ORDERS_ANALYTICS_WHERE} AND created_at >= ? AND created_at <= ?`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ online_sales: 0 }]]);
    const [returnsRows] = await pool.execute(
      'SELECT COALESCE(SUM(total_amount), 0) as returns_total FROM returns WHERE shop_id = ? AND created_at >= ? AND created_at <= ?',
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ returns_total: 0 }]]);
    const [expensesRows] = await pool.execute(
      'SELECT COALESCE(SUM(amount), 0) as expenses_total FROM expenses WHERE shop_id = ? AND expense_date >= ? AND expense_date <= ?',
      [shopId, fromDateOnly, toDateOnly]
    ).catch(() => [[{ expenses_total: 0 }]]);
    const [cogsRows] = await pool.execute(
      `SELECT ${cogsSelect}
       FROM sales s
       JOIN sale_items si ON s.id = si.sale_id
       LEFT JOIN products p ON si.product_id = p.id
       WHERE s.shop_id = ? AND s.created_at >= ? AND s.created_at <= ?
         AND (s.payment_status IS NULL OR s.payment_status = '' OR s.payment_status = 'paid')
         AND (s.return_status IS NULL OR s.return_status = '' OR s.return_status != 'full')`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ cogs: 0 }]]);
    const posSales = Number((totalSalesRows as any[])[0]?.pos_sales ?? 0);
    const onlineSales = Number((onlineSalesRows as any[])[0]?.online_sales ?? 0);
    const returnsTotal = Number((returnsRows as any[])[0]?.returns_total ?? 0);
    const expensesTotal = Number((expensesRows as any[])[0]?.expenses_total ?? 0);
    const cogs = Number((cogsRows as any[])[0]?.cogs ?? 0);
    const sales = posSales + onlineSales - returnsTotal;
    const profit = sales - cogs - expensesTotal;
    const [ordersCountRows] = await pool.execute(
      `SELECT (SELECT COUNT(*) FROM sales WHERE shop_id = ? AND created_at >= ? AND created_at <= ? AND (payment_status IS NULL OR payment_status = '' OR payment_status = 'paid') AND (return_status IS NULL OR return_status = '' OR return_status != 'full')) +
       (SELECT COUNT(*) FROM online_orders WHERE shop_id = ? AND ${ONLINE_ORDERS_ANALYTICS_WHERE} AND created_at >= ? AND created_at <= ?) as cnt`,
      [shopId, fromStart, toEnd, shopId, fromStart, toEnd]
    ).catch(() => [[{ cnt: 0 }]]);
    const orders_count = Number((ordersCountRows as any[])[0]?.cnt ?? 0);
    const payload = { ok: true, sales, expenses: expensesTotal, cogs, profit, orders_count };
    setCachedPayload(reportsCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/reports/transactions', authenticateToken, requirePackageFeature('reports'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('reports:transactions', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(reportsCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const tzOffsetMinutes = req.query.tzOffsetMinutes != null ? parseInt(String(req.query.tzOffsetMinutes), 10) : undefined;
    const tzOk = typeof tzOffsetMinutes === 'number' && !isNaN(tzOffsetMinutes) && tzOffsetMinutes >= -720 && tzOffsetMinutes <= 720;
    const { fromStart, toEnd } = parseDateRangeForDb(from || '1970-01-01', to || '9999-12-31', tzOk ? tzOffsetMinutes : undefined);
    const limit = Math.min(500, parseInt(req.query.limit as string, 10) || 100);
    const [salesRows] = await pool.execute(
      'SELECT id, total_amount as amount, created_at, "pos" as source FROM sales WHERE shop_id = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC LIMIT ?',
      [shopId, fromStart, toEnd, limit]
    ).catch(() => [[]]);
    const [onlineRows] = await pool.execute(
      'SELECT id, total as amount, created_at, "online" as source FROM online_orders WHERE shop_id = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at DESC LIMIT ?',
      [shopId, fromStart, toEnd, limit]
    ).catch(() => [[]]);
    const items = [...(salesRows as any[]).map((r) => ({ ...r, id: r.id })), ...(onlineRows as any[]).map((r) => ({ ...r, id: r.id }))];
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const payload = { ok: true, items: items.slice(0, limit) };
    setCachedPayload(reportsCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SUPPLIERS (purchase module) – mounted router so GET /api/admin/suppliers is always registered ==========
const suppliersRouter = express.Router();
const suppliersAuth = [authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'hr_manager', 'warehouse')];

suppliersRouter.get('/', ...suppliersAuth, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    if (!(await hasTable('suppliers'))) await ensureSuppliersTable();
    const [rows] = await pool.execute(
      'SELECT id, name, phone, email, address, balance, shop_id, branch_id, created_at, updated_at FROM suppliers WHERE shop_id = ? ORDER BY id DESC',
      [shopId]
    ).catch(() => [[]]);
    res.json({ ok: true, items: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

suppliersRouter.post('/', ...suppliersAuth, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    if (!(await hasTable('suppliers'))) await ensureSuppliersTable();
    const { name, phone, email, address, balance, branch_id } = req.body || {};
    const [r] = await pool.execute(
      'INSERT INTO suppliers (shop_id, name, phone, email, address, balance, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        shopId,
        String(name || '').trim() || 'Supplier',
        phone != null ? String(phone).trim() : null,
        email != null ? String(email).trim() : null,
        address != null ? String(address).trim() : null,
        Number(balance) || 0,
        branch_id != null ? (Number(branch_id) || null) : null
      ]
    );
    const id = (r as any).insertId;
    const [rows] = await pool.execute('SELECT id, name, phone, email, address, balance, shop_id, branch_id, created_at, updated_at FROM suppliers WHERE id = ?', [id]);
    res.status(201).json({ ok: true, item: (rows as any[])[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

suppliersRouter.get('/:id', ...suppliersAuth, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    if (!(await hasTable('suppliers'))) await ensureSuppliersTable();
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT id, name, phone, email, address, balance, shop_id, branch_id, created_at, updated_at FROM suppliers WHERE id = ? AND shop_id = ?', [id, shopId]);
    const item = (rows as any[])[0];
    if (!item) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ ok: true, item });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

suppliersRouter.put('/:id', ...suppliersAuth, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    if (!(await hasTable('suppliers'))) await ensureSuppliersTable();
    const id = parseInt(req.params.id, 10);
    const { name, phone, email, address, balance, branch_id } = req.body || {};
    const [rows] = await pool.execute('SELECT id, name, phone, email, address, balance, branch_id FROM suppliers WHERE id = ? AND shop_id = ?', [id, shopId]);
    const existing = (rows as any[])[0];
    if (!existing) return res.status(404).json({ error: 'Supplier not found' });
    const newName = name != null ? String(name).trim() || 'Supplier' : existing.name;
    const newPhone = phone !== undefined ? (phone != null ? String(phone).trim() : null) : existing.phone;
    const newEmail = email !== undefined ? (email != null ? String(email).trim() : null) : existing.email;
    const newAddress = address !== undefined ? (address != null ? String(address).trim() : null) : existing.address;
    const newBalance = typeof balance === 'number' ? balance : Number(existing.balance) || 0;
    const newBranchId = branch_id !== undefined ? (branch_id != null ? Number(branch_id) || null : null) : existing.branch_id;
    await pool.execute(
      'UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, balance = ?, branch_id = ? WHERE id = ? AND shop_id = ?',
      [newName, newPhone, newEmail, newAddress, newBalance, newBranchId, id, shopId]
    );
    const [updated] = await pool.execute('SELECT id, name, phone, email, address, balance, shop_id, branch_id, created_at, updated_at FROM suppliers WHERE id = ?', [id]);
    res.json({ ok: true, item: (updated as any[])[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

suppliersRouter.delete('/:id', ...suppliersAuth, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT id FROM suppliers WHERE id = ? AND shop_id = ?', [id, shopId]);
    if (!(rows as any[]).length) return res.status(404).json({ error: 'Supplier not found' });
    await pool.execute('DELETE FROM suppliers WHERE id = ? AND shop_id = ?', [id, shopId]);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/admin/suppliers', suppliersRouter);

// ---------- Purchase Orders ----------
app.get('/api/admin/purchase-orders', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'hr_manager', 'warehouse'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensurePurchaseTables();
    const [rows] = await pool.execute(
      `SELECT po.id, po.shop_id, po.supplier_id, po.branch_id, po.order_number, po.status, po.total_amount, po.created_at,
        s.name as supplier_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id AND s.shop_id = po.shop_id
       WHERE po.shop_id = ? ORDER BY po.id DESC LIMIT 500`,
      [shopId]
    ).catch(() => [[]]);
    const orders = rows as any[];
    const ids = orders.map((o: any) => o.id).filter(Boolean);
    const [linkRows] = await pool.execute(
      `SELECT order_id, MIN(id) AS linked_invoice_id FROM purchase_invoices WHERE shop_id = ? AND order_id IS NOT NULL GROUP BY order_id`,
      [shopId]
    ).catch(() => [[]]);
    const invByOrder = new Map<number, number>();
    for (const lr of linkRows as any[]) {
      invByOrder.set(Number(lr.order_id), Number(lr.linked_invoice_id));
    }
    const ordersOut = orders.map((o: any) => ({
      ...o,
      linked_invoice_id: invByOrder.get(Number(o.id)) ?? null,
    }));
    let items: any[] = [];
    if (ids.length > 0 && (await hasTable('purchase_order_items'))) {
      const [itemRows] = await pool.execute(
        `SELECT poi.id, poi.order_id, poi.product_id, poi.quantity, poi.cost_price, p.name_en, p.name_ar
         FROM purchase_order_items poi
         LEFT JOIN products p ON p.id = poi.product_id
         WHERE poi.order_id IN (${ids.join(',')})`
      ).catch(() => [[]]);
      items = itemRows as any[];
    }
    res.json({ ok: true, orders: ordersOut, items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/purchase-orders', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'hr_manager', 'warehouse'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensurePurchaseTables();
    const { supplier_id, branch_id, status, items: lineItems } = req.body || {};
    const total = (lineItems || []).reduce((sum: number, i: any) => sum + (Number(i.quantity) || 0) * (Number(i.cost_price) || 0), 0);
    const [r] = await pool.execute(
      'INSERT INTO purchase_orders (shop_id, supplier_id, branch_id, status, total_amount) VALUES (?, ?, ?, ?, ?)',
      [shopId, supplier_id ? Number(supplier_id) : null, branch_id ? Number(branch_id) : null, status || 'draft', total]
    );
    const orderId = (r as any).insertId;
    const hasOrderItems = await hasTable('purchase_order_items');
    for (const it of lineItems || []) {
      const qty = Math.max(0, Number(it.quantity) || 0);
      const cost = Number(it.cost_price) || 0;
      if (it.product_id && qty > 0 && hasOrderItems) {
        await pool.execute(
          'INSERT INTO purchase_order_items (order_id, product_id, quantity, cost_price) VALUES (?, ?, ?, ?)',
          [orderId, Number(it.product_id), qty, cost]
        );
      }
    }
    const [rows] = await pool.execute(
      'SELECT id, shop_id, supplier_id, branch_id, status, total_amount, created_at FROM purchase_orders WHERE id = ?',
      [orderId]
    );
    res.status(201).json({ ok: true, order: (rows as any[])[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/purchase-orders/:id', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'hr_manager', 'warehouse'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensurePurchaseTables();
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });
    const { status } = req.body || {};
    const allowed = new Set(['draft', 'approved', 'received', 'sent', 'partial', 'cancelled']);
    if (typeof status !== 'string' || !allowed.has(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const [exist] = await pool.execute('SELECT id FROM purchase_orders WHERE id = ? AND shop_id = ?', [id, shopId]);
    if (!(exist as any[]).length) return res.status(404).json({ error: 'Purchase order not found' });
    await pool.execute('UPDATE purchase_orders SET status = ? WHERE id = ? AND shop_id = ?', [status, id, shopId]);
    const [updated] = await pool.execute(
      `SELECT po.id, po.shop_id, po.supplier_id, po.branch_id, po.order_number, po.status, po.total_amount, po.created_at,
        s.name as supplier_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id AND s.shop_id = po.shop_id
       WHERE po.id = ? AND po.shop_id = ?`,
      [id, shopId]
    );
    const [linkRows] = await pool.execute(
      'SELECT MIN(id) AS linked_invoice_id FROM purchase_invoices WHERE shop_id = ? AND order_id = ?',
      [shopId, id]
    ).catch(() => [[]]);
    const linked = (linkRows as any[])[0]?.linked_invoice_id;
    const row = (updated as any[])[0];
    res.json({ ok: true, order: { ...row, linked_invoice_id: linked != null ? Number(linked) : null } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Purchase Invoices (increase stock, supplier balance, accounting, inventory_movements) ----------
app.get('/api/admin/purchase-invoices', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'hr_manager', 'warehouse'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensurePurchaseTables();
    const [rows] = await pool.execute(
      `SELECT pi.id, pi.shop_id, pi.supplier_id, pi.order_id, pi.branch_id, pi.invoice_number, pi.total_amount, pi.status, pi.created_at,
        s.name as supplier_name,
        b.name as branch_name, b.name_ar as branch_name_ar, b.name_en as branch_name_en
       FROM purchase_invoices pi
       LEFT JOIN suppliers s ON s.id = pi.supplier_id AND s.shop_id = pi.shop_id
       LEFT JOIN branches b ON b.id = pi.branch_id AND b.shop_id = pi.shop_id
       WHERE pi.shop_id = ? ORDER BY pi.id DESC LIMIT 500`,
      [shopId]
    ).catch(() => [[]]);
    const invoices = rows as any[];
    const ids = invoices.map((i: any) => i.id).filter(Boolean);
    let items: any[] = [];
    if (ids.length > 0) {
      const hasPiExp = await hasColumn('purchase_items', 'expiry_date');
      const hasPiTp = await hasColumn('purchase_items', 'tax_percent');
      const hasPiTa = await hasColumn('purchase_items', 'tax_amount');
      const extra =
        `${hasPiExp ? ', pi.expiry_date' : ''}` +
        `${hasPiTp ? ', pi.tax_percent' : ''}` +
        `${hasPiTa ? ', pi.tax_amount' : ''}`;
      const [itemRows] = await pool.execute(
        `SELECT pi.id, pi.purchase_invoice_id, pi.product_id, pi.quantity, pi.unit_price as cost_price, pi.total_price, p.name_en, p.name_ar${extra}
         FROM purchase_items pi
         LEFT JOIN products p ON p.id = pi.product_id
         WHERE pi.purchase_invoice_id IN (${ids.join(',')})`
      ).catch(() => [[]]);
      items = itemRows as any[];
    }
    res.json({ ok: true, invoices, items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/purchase-invoices', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'hr_manager', 'warehouse'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensurePurchaseTables();
    const { supplier_id, order_id, status, items: lineItems } = req.body || {};
    const total = (lineItems || []).reduce((sum: number, i: any) => sum + (Number(i.quantity) || 0) * (Number(i.cost_price) || 0), 0);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const orderIdNum = order_id != null && String(order_id).trim() !== '' ? Number(order_id) : null;
      let effectiveSupplierId = supplier_id != null && String(supplier_id).trim() !== '' ? Number(supplier_id) : null;
      let invBranchId = await resolveOptionalBranchId(req, shopId);
      if (orderIdNum != null && Number.isFinite(orderIdNum) && orderIdNum > 0) {
        const [dup] = await conn.execute(
          'SELECT id FROM purchase_invoices WHERE shop_id = ? AND order_id = ? LIMIT 1',
          [shopId, orderIdNum]
        );
        if ((dup as any[]).length) {
          await conn.rollback();
          conn.release();
          return res.status(400).json({ error: 'Invoice already exists for this purchase order' });
        }
        const [poRows] = await conn.execute(
          'SELECT supplier_id, branch_id FROM purchase_orders WHERE id = ? AND shop_id = ?',
          [orderIdNum, shopId]
        );
        if ((poRows as any[]).length === 0) {
          await conn.rollback();
          conn.release();
          return res.status(404).json({ error: 'Purchase order not found' });
        }
        const poRow = (poRows as any[])[0];
        if (!effectiveSupplierId && poRow.supplier_id != null) effectiveSupplierId = Number(poRow.supplier_id);
        const poBr = poRow.branch_id != null ? Number(poRow.branch_id) : null;
        if (invBranchId == null && poBr != null && poBr > 0 && (await branchBelongsToShop(shopId, poBr))) {
          invBranchId = poBr;
        }
      }
      const [r] = await conn.execute(
        'INSERT INTO purchase_invoices (shop_id, supplier_id, order_id, branch_id, total_amount, status) VALUES (?, ?, ?, ?, ?, ?)',
        [shopId, effectiveSupplierId, orderIdNum, invBranchId, total, status || 'unpaid']
      );
      const invoiceId = (r as any).insertId;
      for (const it of lineItems || []) {
        const qty = Math.max(0, Number(it.quantity) || 0);
        const cost = Number(it.cost_price) || 0;
        if (it.product_id && qty > 0) {
          const lineTotal = qty * cost;
          await conn.execute(
            'INSERT INTO purchase_items (purchase_invoice_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
            [invoiceId, Number(it.product_id), qty, cost, lineTotal]
          );
          await conn.execute(
            'UPDATE products SET stock_quantity = stock_quantity + ?, buy_price = ? WHERE id = ? AND shop_id = ?',
            [qty, cost, Number(it.product_id), shopId]
          );
          if (invBranchId != null) {
            await ensureBranchInventoryTable();
            await conn.execute(
              `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE quantity = quantity + ?, updated_at = NOW()`,
              [shopId, invBranchId, Number(it.product_id), qty, qty]
            );
            if (await hasTable('stock_movements')) {
              await conn.execute(
                'INSERT INTO stock_movements (shop_id, product_id, branch_id, type, quantity, reference) VALUES (?, ?, ?, ?, ?, ?)',
                [shopId, Number(it.product_id), invBranchId, 'IN', qty, `purchase_invoice:${invoiceId}`]
              );
            }
          }
          const hasMovements = await hasTable('inventory_movements');
          if (hasMovements) {
            await conn.execute(
              'INSERT INTO inventory_movements (shop_id, product_id, type, quantity, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
              [shopId, Number(it.product_id), 'purchase', qty, 'purchase_invoice', invoiceId]
            );
          }
        }
      }
      const hasSuppliers = await hasTable('suppliers');
      if (hasSuppliers && effectiveSupplierId) {
        await conn.execute(
          'UPDATE suppliers SET balance = balance + ? WHERE id = ? AND shop_id = ?',
          [total, effectiveSupplierId, shopId]
        );
      }
      const hasJournal = await hasTable('journal_entries');
      if (hasJournal && total > 0) {
        const accts = await ensureDefaultAccounts(conn, shopId);
        const invId = accts.get('1500') || accts.get('1000');
        const apId = accts.get('2000');
        const today = new Date().toISOString().slice(0, 10);
        const ref = `PI-${invoiceId}`;
        const desc = `Purchase invoice #${invoiceId}`;
        const hasDateCol = await hasColumn('journal_entries', 'date');
        const dateCol = hasDateCol ? 'date' : 'entry_date';
        await conn.execute(
          `INSERT INTO journal_entries (shop_id, ${dateCol}, reference, description) VALUES (?, ?, ?, ?)`,
          [shopId, today, ref, desc]
        );
        const [jeR] = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const jeId = (jeR as any[])[0]?.id;
        if (jeId && invId) {
          await conn.execute('INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)', [jeId, invId, total]);
        }
        if (jeId && apId) {
          await conn.execute('INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)', [jeId, apId, total]);
        }
      }
      await conn.commit();
      const [rows] = await pool.execute(
        'SELECT id, shop_id, supplier_id, order_id, branch_id, total_amount, status, created_at FROM purchase_invoices WHERE id = ?',
        [invoiceId]
      );
      res.status(201).json({ ok: true, invoice: (rows as any[])[0] });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Purchase Returns (decrease stock, decrease supplier balance, accounting) ----------
app.get('/api/admin/purchase-returns', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'hr_manager', 'warehouse'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensurePurchaseTables();
    const [rows] = await pool.execute(
      `SELECT pr.id, pr.shop_id, pr.supplier_id, pr.invoice_id, pr.branch_id, pr.total_amount, pr.created_at,
        s.name as supplier_name,
        b.name as branch_name, b.name_ar as branch_name_ar, b.name_en as branch_name_en
       FROM purchase_returns pr
       LEFT JOIN suppliers s ON s.id = pr.supplier_id AND s.shop_id = pr.shop_id
       LEFT JOIN branches b ON b.id = pr.branch_id AND b.shop_id = pr.shop_id
       WHERE pr.shop_id = ? ORDER BY pr.id DESC LIMIT 500`,
      [shopId]
    ).catch(() => [[]]);
    const returns = rows as any[];
    const ids = returns.map((r: any) => r.id).filter(Boolean);
    let items: any[] = [];
    if (ids.length > 0 && await hasTable('purchase_return_items')) {
      const [itemRows] = await pool.execute(
        `SELECT pri.id, pri.return_id, pri.product_id, pri.quantity, pri.cost_price, p.name_en, p.name_ar
         FROM purchase_return_items pri
         LEFT JOIN products p ON p.id = pri.product_id
         WHERE pri.return_id IN (${ids.join(',')})`
      ).catch(() => [[]]);
      items = itemRows as any[];
    }
    res.json({ ok: true, returns, items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/purchase-returns', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'hr_manager', 'warehouse'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensurePurchaseTables();
    const { supplier_id, invoice_id, items: lineItems } = req.body || {};
    const total = (lineItems || []).reduce((sum: number, i: any) => sum + (Number(i.quantity) || 0) * (Number(i.cost_price) || 0), 0);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const prBranchId = await resolveOptionalBranchId(req, shopId);
      const [r] = await conn.execute(
        'INSERT INTO purchase_returns (shop_id, supplier_id, invoice_id, branch_id, total_amount) VALUES (?, ?, ?, ?, ?)',
        [shopId, supplier_id ? Number(supplier_id) : null, invoice_id ? Number(invoice_id) : null, prBranchId, total]
      );
      const returnId = (r as any).insertId;
      await ensureBranchInventoryTable();
      const hasStockMv = await hasTable('stock_movements');
      for (const it of lineItems || []) {
        const qty = Math.max(0, Number(it.quantity) || 0);
        const cost = Number(it.cost_price) || 0;
        if (it.product_id && qty > 0) {
          await conn.execute(
            'INSERT INTO purchase_return_items (return_id, product_id, quantity, cost_price) VALUES (?, ?, ?, ?)',
            [returnId, Number(it.product_id), qty, cost]
          );
          await conn.execute(
            'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ? AND shop_id = ?',
            [qty, Number(it.product_id), shopId]
          );
          if (prBranchId != null) {
            await conn.execute(
              'UPDATE branch_inventory SET quantity = GREATEST(0, COALESCE(quantity, 0) - ?) WHERE shop_id = ? AND branch_id = ? AND product_id = ?',
              [qty, shopId, prBranchId, Number(it.product_id)]
            );
            if (hasStockMv) {
              await conn.execute(
                'INSERT INTO stock_movements (shop_id, product_id, branch_id, type, quantity, reference) VALUES (?, ?, ?, ?, ?, ?)',
                [shopId, Number(it.product_id), prBranchId, 'OUT', qty, `purchase_return:${returnId}`]
              );
            }
          }
          const hasMovements = await hasTable('inventory_movements');
          if (hasMovements) {
            await conn.execute(
              'INSERT INTO inventory_movements (shop_id, product_id, type, quantity, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
              [shopId, Number(it.product_id), 'purchase_return', -qty, 'purchase_return', returnId]
            );
          }
        }
      }
      const hasSuppliers = await hasTable('suppliers');
      if (hasSuppliers && supplier_id && total > 0) {
        await conn.execute(
          'UPDATE suppliers SET balance = balance - ? WHERE id = ? AND shop_id = ?',
          [total, Number(supplier_id), shopId]
        );
      }
      const hasJournal = await hasTable('journal_entries');
      if (hasJournal && total > 0) {
        const accts = await ensureDefaultAccounts(conn, shopId);
        const apId = accts.get('2000');
        const invId = accts.get('1500') || accts.get('1000');
        const today = new Date().toISOString().slice(0, 10);
        const ref = `PR-${returnId}`;
        const desc = `Purchase return #${returnId}`;
        const hasDateCol = await hasColumn('journal_entries', 'date');
        const dateCol = hasDateCol ? 'date' : 'entry_date';
        await conn.execute(
          `INSERT INTO journal_entries (shop_id, ${dateCol}, reference, description) VALUES (?, ?, ?, ?)`,
          [shopId, today, ref, desc]
        );
        const [jeR] = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const jeId = (jeR as any[])[0]?.id;
        if (jeId && apId) {
          await conn.execute('INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)', [jeId, apId, total]);
        }
        if (jeId && invId) {
          await conn.execute('INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)', [jeId, invId, total]);
        }
      }
      await conn.commit();
      const [rows] = await pool.execute(
        'SELECT id, shop_id, supplier_id, invoice_id, branch_id, total_amount, created_at FROM purchase_returns WHERE id = ?',
        [returnId]
      );
      res.status(201).json({ ok: true, return: (rows as any[])[0] });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Branch inventory (per-branch stock view) ----------
app.get('/api/admin/branch-inventory', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'warehouse'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const branchId = req.query.branch_id != null ? Number(req.query.branch_id) : null;
    if (!branchId) return res.json({ items: [], branch_id: null });
    await ensureBranchInventoryTable();
    const [rows] = await pool.execute(
      `SELECT bi.product_id, bi.quantity, p.name_en AS product_name_en, p.name_ar AS product_name_ar
       FROM branch_inventory bi
       LEFT JOIN products p ON p.id = bi.product_id AND p.shop_id = bi.shop_id
       WHERE bi.shop_id = ? AND bi.branch_id = ?
       ORDER BY COALESCE(p.name_en, p.name_ar, '')`,
      [shopId, branchId]
    );
    res.json({ branch_id: branchId, items: rows || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Quick edit PUT /api/admin/branch-inventory/single is registered in routes/admin.ts (createAdminRouter) so it is reached before app.use('/api/admin') catches the request.

// Branch-inventory: PUT /api/admin/branch-inventory/product/:productId (route file: routes/branchInventory.ts)
const branchInventoryRoutes = createBranchInventoryRoutes({
  getShopIdOrFail,
  authenticateToken,
  ensureBranchInventoryTable,
  hasColumn,
});
app.use('/api/admin/branch-inventory', branchInventoryRoutes);

// ---------- Stock Transfers (between branches) ----------
// All branches: read from branch_inventory.quantity where branch_id = sourceBranchId. Sync ensures branch 1 is populated.
app.get('/api/admin/stock-transfers/available', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'warehouse'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const branchId = req.query.branch_id != null ? Number(req.query.branch_id) : null;
    const productId = req.query.product_id != null ? Number(req.query.product_id) : (req.query.part_id != null ? Number(req.query.part_id) : null);
    if (!branchId || !productId) {
      return res.json({ available: 0, branch_id: branchId, product_id: productId });
    }
    await ensureBranchInventoryTable();
    const [rows] = await pool.execute(
      'SELECT quantity FROM branch_inventory WHERE shop_id = ? AND branch_id = ? AND product_id = ?',
      [shopId, branchId, productId]
    );
    let available_stock = 0;
    const row = (rows as any[])[0];
    if (row != null) {
      available_stock = parseFloat(String(row.quantity)) || 0;
    } else {
      const [prodRows] = await pool.execute(
        'SELECT COALESCE(stock_quantity, 0) as stock_quantity FROM products WHERE id = ? AND shop_id = ?',
        [productId, shopId]
      );
      const prodRow = (prodRows as any[])[0];
      available_stock = prodRow != null ? parseFloat(String(prodRow.stock_quantity)) || 0 : 0;
    }
    res.json({ available: Number(available_stock), branch_id: branchId, product_id: productId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/stock-transfers', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'warehouse'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    if (!(await hasTable('stock_transfers'))) {
      await ensureStockTransferTables();
    }
    const [rows] = await pool.execute(
      `SELECT st.id, st.shop_id, st.from_branch_id, st.to_branch_id, st.product_id, st.quantity, st.status, st.created_at,
        p.name_en as product_name_en, p.name_ar as product_name_ar,
        fb.name_en as from_branch_name_en, fb.name_ar as from_branch_name_ar,
        tb.name_en as to_branch_name_en, tb.name_ar as to_branch_name_ar
       FROM stock_transfers st
       LEFT JOIN products p ON p.id = st.product_id
       LEFT JOIN branches fb ON fb.id = st.from_branch_id AND fb.shop_id = st.shop_id
       LEFT JOIN branches tb ON tb.id = st.to_branch_id AND tb.shop_id = st.shop_id
       WHERE st.shop_id = ? ORDER BY st.id DESC LIMIT 500`,
      [shopId]
    ).catch(() => [[]]);
    res.json({ ok: true, transfers: rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/stock-transfers', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'warehouse'), async (req: any, res: Response) => {
  const t0 = Date.now();
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    if (!(await hasTable('stock_transfers'))) await ensureStockTransferTables();
    if (!(await hasTable('stock_transfers'))) {
      res.status(503).json({ error: 'Stock transfer table not ready.' });
      return;
    }
    await ensureBranchInventoryTable();
    const body = req.body || {};
    const sourceBranchId = body.source != null ? Number(body.source) : (body.from_branch_id != null ? Number(body.from_branch_id) : null);
    const targetBranchId = body.target != null ? Number(body.target) : (body.to_branch_id != null ? Number(body.to_branch_id) : null);
    const productId = body.part_id != null ? Number(body.part_id) : (body.product_id != null ? Number(body.product_id) : null);
    const requested = parseFloat(String(body.qty ?? body.quantity ?? 0)) || 0;
    const transferQty = Math.max(0, requested);
    const confirm = body.confirm !== false;
    if (!sourceBranchId || !targetBranchId || sourceBranchId === targetBranchId || !productId || transferQty < 1) {
      res.status(400).json({ error: 'source (or from_branch_id), target (or to_branch_id) (different), part_id (or product_id), and qty (or quantity) >= 1 required' });
      return;
    }
    // Ensure source row exists *before* transaction to keep transaction short (< 1s)
    const [preRows] = await pool.execute(
      'SELECT quantity FROM branch_inventory WHERE shop_id = ? AND branch_id = ? AND product_id = ?',
      [shopId, sourceBranchId, productId]
    );
    let srcExists = (preRows as any[]).length > 0;
    if (!srcExists && (await hasTable('products'))) {
      const [prodRows] = await pool.execute(
        'SELECT COALESCE(stock_quantity, 0) as stock_quantity FROM products WHERE id = ? AND shop_id = ?',
        [productId, shopId]
      );
      const prod = (prodRows as any[])[0];
      const qty = prod != null ? parseFloat(String(prod.stock_quantity)) || 0 : 0;
      if (qty > 0) {
        await pool.execute(
          `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity = GREATEST(COALESCE(quantity, 0), ?)`,
          [shopId, sourceBranchId, productId, qty, qty]
        ).catch(() => {});
        srcExists = true;
      }
    }
    if (!srcExists) {
      res.status(400).json({ error: 'Insufficient stock' });
      return;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const firstBranchId = Math.min(sourceBranchId, targetBranchId);
      const secondBranchId = Math.max(sourceBranchId, targetBranchId);
      const [rows1] = await conn.execute(
        'SELECT quantity FROM branch_inventory WHERE shop_id = ? AND branch_id = ? AND product_id = ? FOR UPDATE',
        [shopId, firstBranchId, productId]
      );
      const [rows2] = await conn.execute(
        'SELECT quantity FROM branch_inventory WHERE shop_id = ? AND branch_id = ? AND product_id = ? FOR UPDATE',
        [shopId, secondBranchId, productId]
      );
      const srcRow = firstBranchId === sourceBranchId ? (rows1 as any[])[0] : (rows2 as any[])[0];
      const available = srcRow != null ? parseFloat(String(srcRow.quantity)) || 0 : 0;
      if (available < transferQty) {
        await conn.rollback();
        conn.release();
        console.log('[stock-transfers] insufficient', { productId, sourceBranchId, available, transferQty });
        res.status(400).json({ error: 'Insufficient stock' });
        return;
      }
      await conn.execute(
        'UPDATE branch_inventory SET quantity = quantity - ? WHERE shop_id = ? AND branch_id = ? AND product_id = ?',
        [transferQty, shopId, sourceBranchId, productId]
      );
      await conn.execute(
        `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
        [shopId, targetBranchId, productId, transferQty, transferQty]
      );
      // 4) INSERT stock_transfers log
      const [r] = await conn.execute(
        'INSERT INTO stock_transfers (shop_id, from_branch_id, to_branch_id, product_id, quantity, status) VALUES (?, ?, ?, ?, ?, ?)',
        [shopId, sourceBranchId, targetBranchId, productId, transferQty, confirm ? 'completed' : 'pending']
      );
      const transferId = (r as any).insertId;
      try {
        await ensureInventoryMovementsTable();
        await conn.execute(
          'INSERT INTO inventory_movements (shop_id, product_id, branch_id, type, quantity, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
          [shopId, productId, sourceBranchId, 'transfer_out', transferQty, transferId]
        );
        await conn.execute(
          'INSERT INTO inventory_movements (shop_id, product_id, branch_id, type, quantity, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
          [shopId, productId, targetBranchId, 'transfer_in', transferQty, transferId]
        );
      } catch (movErr: any) {
        console.warn('[stock-transfers] inventory_movements insert:', movErr?.message || movErr);
      }
      try {
        await ensureStockMovementsTable();
        const ref = `transfer_id:${transferId}`;
        await conn.execute(
          'INSERT INTO stock_movements (shop_id, product_id, branch_id, type, quantity, reference) VALUES (?, ?, ?, ?, ?, ?)',
          [shopId, productId, sourceBranchId, 'OUT', transferQty, ref]
        );
        await conn.execute(
          'INSERT INTO stock_movements (shop_id, product_id, branch_id, type, quantity, reference) VALUES (?, ?, ?, ?, ?, ?)',
          [shopId, productId, targetBranchId, 'IN', transferQty, ref]
        );
      } catch (smErr: any) {
        console.warn('[stock-transfers] stock_movements insert:', smErr?.message || smErr);
      }
      await conn.commit();
      const id = transferId;
      const [rows] = await pool.execute(
        'SELECT id, shop_id, from_branch_id, to_branch_id, product_id, quantity, status, created_at FROM stock_transfers WHERE id = ?',
        [id]
      );
      const elapsed = Date.now() - t0;
      console.log('[stock-transfers] ok', { id, productId, sourceBranchId, targetBranchId, transferQty, elapsedMs: elapsed });
      res.status(201).json({ ok: true, transfer: (rows as any[])[0] });
    } catch (e: any) {
      try {
        await conn.rollback();
      } catch (rbErr: any) {
        console.error('[stock-transfers] rollback error:', rbErr?.message || rbErr);
      }
      console.error('[stock-transfers] error', e?.message || e, e?.code, 'elapsedMs', Date.now() - t0);
      res.status(500).json({ error: e?.message || 'Internal server error' });
    } finally {
      conn.release();
    }
  } catch (error: any) {
    console.error('[stock-transfers] outer error', error?.message || error, 'elapsedMs', Date.now() - t0);
    res.status(500).json({ error: error.message });
  }
});

// Purchase report (invoices and returns summary)
app.get('/api/admin/reports/purchases', authenticateToken, requirePackageFeature('reports'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('reports:purchases', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(reportsCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';
    const fromBound = from ? `${from} 00:00:00` : '';
    const toBound = to ? `${to} 23:59:59` : '';
    let totalInvoices = 0;
    let totalInvoiceAmount = 0;
    let totalReturns = 0;
    let totalReturnAmount = 0;
    if (await hasTable('purchase_invoices')) {
      const range = from && to ? ' AND created_at >= ? AND created_at <= ?' : '';
      const params = from && to ? [shopId, fromBound, toBound] : [shopId];
      const [inv] = await pool.execute(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total FROM purchase_invoices WHERE shop_id = ?${range}`,
        params
      ).catch(() => [[{ cnt: 0, total: 0 }]]);
      totalInvoices = Number((inv as any[])[0]?.cnt ?? 0);
      totalInvoiceAmount = Number((inv as any[])[0]?.total ?? 0);
    }
    if (await hasTable('purchase_returns')) {
      const range = from && to ? ' AND created_at >= ? AND created_at <= ?' : '';
      const params = from && to ? [shopId, fromBound, toBound] : [shopId];
      const [ret] = await pool.execute(
        `SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as total FROM purchase_returns WHERE shop_id = ?${range}`,
        params
      ).catch(() => [[{ cnt: 0, total: 0 }]]);
      totalReturns = Number((ret as any[])[0]?.cnt ?? 0);
      totalReturnAmount = Number((ret as any[])[0]?.total ?? 0);
    }
    const payload = {
      ok: true,
      total_invoices: totalInvoices,
      total_invoice_amount: totalInvoiceAmount,
      total_returns: totalReturns,
      total_return_amount: totalReturnAmount,
    };
    setCachedPayload(reportsCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/reports/dead-stock', authenticateToken, requirePackageFeature('reports'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('reports:dead-stock', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(reportsCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const days = Math.min(365, Math.max(1, parseInt(req.query.days as string, 10) || 120));
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);
    const [rows] = await pool.execute(
      `SELECT p.id, p.name_en, p.name_ar, p.sku, p.stock_quantity, p.sell_price FROM products p
       WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
       AND NOT EXISTS (SELECT 1 FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE si.product_id = p.id AND s.created_at >= ?)`,
      [shopId, sinceStr]
    ).catch(() => [[]]);
    const payload = { ok: true, items: rows || [] };
    setCachedPayload(reportsCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/reports/day-details', authenticateToken, requirePackageFeature('reports'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('reports:day-details', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(reportsCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const date = String(req.query.date || '').trim();
    const source = String(req.query.source || 'all').toLowerCase();
    if (!date) return res.status(400).json({ error: 'date required' });
    const [sales] = await pool.execute(
      'SELECT id, invoice_number, total_amount as amount, created_at, customer_name, "pos" as source FROM sales WHERE shop_id = ? AND DATE(created_at) = ?',
      [shopId, date]
    ).catch(() => [[]]);
    const [online] = await pool.execute(
      'SELECT id, total as amount, created_at, "online" as source FROM online_orders WHERE shop_id = ? AND DATE(created_at) = ?',
      [shopId, date]
    ).catch(() => [[]]);
    const salesMapped = (sales as any[]).map((r) => ({ ...r, total: r.amount, invoice_number: r.invoice_number ?? r.id }));
    const onlineMapped = (online as any[]).map((r) => ({ ...r, total: r.amount, invoice_number: r.id, customer_name: (r as any).customer_name ?? null }));
    let items = [...salesMapped, ...onlineMapped];
    if (source === 'pos') items = items.filter((i: any) => i.source === 'pos');
    if (source === 'online') items = items.filter((i: any) => i.source === 'online');
    items.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const totals = { total: items.reduce((s, i) => s + Number(i.total || 0), 0), online: items.filter((i: any) => i.source === 'online').reduce((s, i) => s + Number(i.total || 0), 0), pos: items.filter((i: any) => i.source === 'pos').reduce((s, i) => s + Number(i.total || 0), 0) };
    const payload = { ok: true, items, invoices: items, totals };
    setCachedPayload(reportsCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Notifications unread count (frontend NotificationsBell). Returns 0 if notifications table missing. Uses shop_id (schema has shop_id, not user_id).
app.get('/api/notifications/unread-count', authenticateToken, async (req: any, res: Response) => {
  try {
    res.set('Content-Type', 'application/json; charset=utf-8');
    const allowNotifications = getPlanDefinition(normalizePlan(req.user?.package)).features.notifications;
    if (!allowNotifications) return res.json({ count: 0, playSound: false });
    const shopId = getShopId(req).shopId;
    if (shopId == null) return res.json({ count: 0, playSound: false });
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM notifications WHERE shop_id = ? AND (is_read = 0 OR is_read IS NULL)',
      [shopId]
    );
    const cnt = (rows as any[])[0]?.cnt ?? 0;
    let playSound = false;
    try {
      const [invRows] = await pool.execute(
        `SELECT type, meta, payload FROM notifications WHERE shop_id = ? AND (is_read = 0 OR is_read IS NULL)
         AND type IN ('inventory_product_created','inventory_stock_updated') ORDER BY id DESC LIMIT 1`,
        [shopId]
      );
      const inv = (invRows as any[])[0];
      if (inv) {
        const p = parseNotificationPayload(inv.payload ?? inv.meta);
        if (p?.playSound && userMatchesInventoryAlert(req.user?.role, p)) playSound = true;
      }
    } catch {
      /* ignore */
    }
    return res.json({ count: Number(cnt), playSound });
  } catch {
    return res.json({ count: 0, playSound: false });
  }
});

// Notifications list (Activity & Notifications page)
app.get('/api/notifications', authenticateToken, async (req: any, res: Response) => {
  try {
    res.set('Content-Type', 'application/json; charset=utf-8');
    const allowNotifications = getPlanDefinition(normalizePlan(req.user?.package)).features.notifications;
    if (!allowNotifications) return res.json({ ok: true, items: [], unreadCount: 0, nextOffset: null });
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const limitRaw = Number(req.query.limit);
    const offsetRaw = Number(req.query.offset);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 100) : 20;
    const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;
    const source = String(req.query.source || '').trim().toLowerCase();
    const q = String(req.query.q || '').trim();

    const conditions: string[] = ['shop_id = ?'];
    const params: any[] = [shopId];
    if (source && ['online', 'pos', 'system'].includes(source)) {
      conditions.push('source = ?');
      params.push(source);
    }
    if (q) {
      conditions.push('(title_ar LIKE ? OR title_en LIKE ? OR body_ar LIKE ? OR body_en LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT id, source, type, title_ar, title_en, body_ar, body_en, is_read, meta, payload, created_at
      FROM notifications
      ${where}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const [rows] = await pool.execute(sql, params).catch(() => [[]]);
    const fixEncoding = (value: string) => {
      if (!value) return value;
      const hasMojibake = /Ã.|Ø.|Ù./.test(value);
      return hasMojibake ? Buffer.from(value, 'latin1').toString('utf8') : value;
    };
    const normalizeDate = (value: any) => {
      if (!value) return null;
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString();
    };
    const fallbackText = getFallbackText();
    const items = (rows as any[]).map((row: any) => {
      const hasCorrupt =
        isCorruptedText(row.title_ar) ||
        isCorruptedText(row.title_en) ||
        isCorruptedText(row.body_ar) ||
        isCorruptedText(row.body_en);
      if (hasCorrupt) {
        console.warn('[notifications] corrupted text detected', { id: row.id });
      }

      const resolved = resolveNotificationText(row);
      const titleCandidate = resolved.titleAr || resolved.titleEn || fallbackText.titleAr;
      const bodyCandidate = resolved.bodyAr || resolved.bodyEn || fallbackText.bodyAr;

      const pl = resolved.payload ?? null;
      return {
        id: Number(row.id),
        source: row.source ?? 'system',
        type: row.type ?? 'system',
        title_ar: resolved.titleAr,
        title_en: resolved.titleEn,
        body_ar: resolved.bodyAr,
        body_en: resolved.bodyEn,
        title: fixEncoding(titleCandidate),
        body: fixEncoding(bodyCandidate),
        is_read: Number(row.is_read ?? 0),
        meta: row.meta ?? null,
        payload: pl,
        playSound: Boolean(pl && (pl as any).playSound),
        alertRoles: Array.isArray((pl as any)?.alertRoles) ? (pl as any).alertRoles : undefined,
        created_at: normalizeDate(row.created_at),
        createdAt: normalizeDate(row.created_at),
        read_at: row.read_at ?? null,
      };
    });
    if (items.length === 0) {
      logEmptyResult('notifications', { shopId, source, q, limit, offset });
    }

    const [unreadRows] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM notifications WHERE shop_id = ? AND (is_read = 0 OR is_read IS NULL)',
      [shopId]
    ).catch(() => [[{ cnt: 0 }]]);
    const unreadCount = Number((unreadRows as any[])[0]?.cnt || 0);
    const nextOffset = items.length >= limit ? offset + limit : null;
    res.json({ ok: true, items, unreadCount, nextOffset });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req: any, res: Response) => {
  try {
    res.set('Content-Type', 'application/json; charset=utf-8');
    const allowNotifications = getPlanDefinition(normalizePlan(req.user?.package)).features.notifications;
    if (!allowNotifications) return res.json({ ok: true });
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid notification id' });
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await pool.execute('UPDATE notifications SET is_read = 1 WHERE id = ? AND shop_id = ?', [id, shopId]);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/notifications/mark-all-read', authenticateToken, async (req: any, res: Response) => {
  try {
    res.set('Content-Type', 'application/json; charset=utf-8');
    const allowNotifications = getPlanDefinition(normalizePlan(req.user?.package)).features.notifications;
    if (!allowNotifications) return res.json({ ok: true, updated: 0 });
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const [result] = await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE shop_id = ? AND (is_read = 0 OR is_read IS NULL)',
      [shopId]
    );
    const updated = (result as any)?.affectedRows ?? 0;
    res.json({ ok: true, updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SHOP PROFILE ==========
app.get('/api/shops/profile', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const [shops] = await pool.execute('SELECT * FROM shops WHERE id = ?', [shopId]);
    const shopArray = shops as any[];
    if (shopArray.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    res.json(shopArray[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/shops/profile', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    const {
      businessName,
      ownerName,
      activityType,
      address,
      contactEmail,
      contactPhone,
      logoUrl,
      countryName,
      currencyCode,
      currencySymbol,
    } = req.body;

    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    await pool.execute(
      `UPDATE shops 
       SET business_name = ?, owner_name = ?, activity_type = ?, address = ?, contact_email = ?, contact_phone = ?, logo_url = ?,
           country_name = ?, currency_code = ?, currency_symbol = ?
       WHERE id = ?`,
      [
        businessName,
        ownerName,
        activityType,
        address,
        contactEmail,
        contactPhone,
        logoUrl,
        countryName,
        currencyCode,
        currencySymbol,
        shopId,
      ]
    );

    const [shops] = await pool.execute('SELECT * FROM shops WHERE id = ?', [shopId]);
    res.json((shops as any[])[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== STORE DOMAINS (Store Admin - shop_owner) ==========
app.post('/api/domains/add', authenticateToken, requireRole('super_admin', 'shop_owner'), requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const domain = normalizeDomainInput(req.body?.domain);
    validateDomainOrThrow(domain);

    const methodRaw = String(req.body?.verificationMethod || 'txt').toLowerCase();
    const verificationMethod: 'txt' | 'cname' = methodRaw === 'cname' ? 'cname' : 'txt';

    const token = crypto.randomBytes(32).toString('hex');

    try {
      await pool.execute(
        `INSERT INTO domains (shop_id, domain, status, is_active, verification_method, verification_token)
         VALUES (?, ?, 'pending', 0, ?, ?)`,
        [shopId, domain, verificationMethod, token]
      );
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Domain already in use' });
      }
      throw error;
    }

    const recordName = dnsNameForDomain(domain);
    const dnsRecord =
      verificationMethod === 'txt'
        ? { type: 'TXT', name: recordName, value: expectedTxtValue(token) }
        : { type: 'CNAME', name: recordName, value: expectedCnameTarget(token) };

    return res.status(201).json({
      shopId,
      domain,
      status: 'pending',
      isActive: false,
      verificationMethod,
      verificationToken: token,
      dns: dnsRecord,
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Invalid request' });
  }
});

app.post('/api/domains/verify', authenticateToken, requireRole('super_admin', 'shop_owner'), requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const domain = normalizeDomainInput(req.body?.domain);
    validateDomainOrThrow(domain);

    const [rows] = await pool.execute(
      `SELECT id, domain, shop_id, status, is_active, verification_method, verification_token, verified_at
       FROM domains
       WHERE shop_id = ? AND domain = ?
       LIMIT 1`,
      [shopId, domain]
    );
    const row = (rows as any[])[0];
    if (!row) return res.status(404).json({ error: 'Domain not found' });

    const method = (row.verification_method as 'txt' | 'cname') || 'txt';
    const token = String(row.verification_token || '');
    if (!token) return res.status(500).json({ error: 'Domain token missing' });

    const ok = await verifyDomainDns(domain, method, token);
    if (!ok) {
      return res.status(409).json({
        error: 'DNS verification failed',
        dns:
          method === 'txt'
            ? { type: 'TXT', name: dnsNameForDomain(domain), value: expectedTxtValue(token) }
            : { type: 'CNAME', name: dnsNameForDomain(domain), value: expectedCnameTarget(token) },
      });
    }

    await pool.execute(
      `UPDATE domains
       SET status = IF(status = 'active', 'active', 'verified'),
           verified_at = IFNULL(verified_at, NOW())
       WHERE id = ? AND shop_id = ?`,
      [row.id, shopId]
    );

    return res.json({ domain, verified: true, verificationMethod: method });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Invalid request' });
  }
});

app.post('/api/domains/activate', authenticateToken, requireRole('super_admin', 'shop_owner'), requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const domain = normalizeDomainInput(req.body?.domain);
    validateDomainOrThrow(domain);

    const [rows] = await pool.execute(
      `SELECT id, domain, verification_method, verification_token, verified_at
       FROM domains
       WHERE shop_id = ? AND domain = ?
       LIMIT 1`,
      [shopId, domain]
    );
    const row = (rows as any[])[0];
    if (!row) return res.status(404).json({ error: 'Domain not found' });

    if (!row.verified_at) {
      // Best-effort verify (server-side) before activation
      const method = (row.verification_method as 'txt' | 'cname') || 'txt';
      const token = String(row.verification_token || '');
      const ok = token ? await verifyDomainDns(domain, method, token) : false;
      if (!ok) {
        return res.status(409).json({ error: 'Domain must be verified before activation' });
      }
      await pool.execute(
        `UPDATE domains
         SET status = 'verified', verified_at = NOW()
         WHERE id = ? AND shop_id = ?`,
        [row.id, shopId]
      );
    }

    await pool.execute(
      `UPDATE domains
       SET status = 'active',
           is_active = 1,
           activated_at = IFNULL(activated_at, NOW()),
           deactivated_at = NULL
       WHERE id = ? AND shop_id = ? AND verified_at IS NOT NULL`,
      [row.id, shopId]
    );

    return res.json({ domain, active: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Invalid request' });
  }
});

app.post('/api/domains/deactivate', authenticateToken, requireRole('super_admin', 'shop_owner'), requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const domain = normalizeDomainInput(req.body?.domain);
    validateDomainOrThrow(domain);

    const [rows] = await pool.execute(
      `SELECT id FROM domains WHERE shop_id = ? AND domain = ? LIMIT 1`,
      [shopId, domain]
    );
    const row = (rows as any[])[0];
    if (!row) return res.status(404).json({ error: 'Domain not found' });

    await pool.execute(
      `UPDATE domains
       SET status = 'inactive',
           is_active = 0,
           deactivated_at = NOW()
       WHERE id = ? AND shop_id = ?`,
      [row.id, shopId]
    );

    return res.json({ domain, active: false });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Invalid request' });
  }
});

app.get('/api/domains', authenticateToken, requireRole('super_admin', 'shop_owner'), requirePackageFeature('storefront'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const [rows] = await pool.execute(
      `SELECT id, domain, status, is_active, verification_method, verification_token,
              verified_at, activated_at, deactivated_at, created_at, updated_at
       FROM domains
       WHERE shop_id = ?
       ORDER BY created_at DESC`,
      [shopId]
    );

    return res.json({
      config: {
        verifyRecordPrefix: DOMAIN_VERIFY_RECORD_PREFIX,
        cnameRoot: DOMAIN_VERIFY_CNAME_ROOT,
      },
      domains: rows,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========== USERS MANAGEMENT ==========
const shopUserManagers = ['super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager'] as const;

app.get('/api/activity-log', authenticateToken, capActivityRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensureActivityLogTable(pool);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const [rows] = await pool.execute(
      `SELECT id, shop_id, user_id, action, entity_type, entity_id, meta_json, ip, user_agent, created_at
       FROM shop_activity_log WHERE shop_id = ? ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`,
      [shopId]
    );
    const items = (rows as any[]).map((r) => {
      let meta: unknown = null;
      try {
        meta = r.meta_json ? JSON.parse(String(r.meta_json)) : null;
      } catch {
        meta = null;
      }
      const { meta_json: _mj, ...rest } = r;
      return { ...rest, meta };
    });
    res.json({ ok: true, items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/online-count', authenticateToken, requireRole(...shopUserManagers), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const hasLastSeen = await hasColumn('users', 'last_seen_at');
    if (!hasLastSeen) return res.json({ count: 0, windowMinutes: 15 });
    const hasDeletedAt = await hasColumn('users', 'deleted_at');
    const whereDeleted = hasDeletedAt ? ' AND (deleted_at IS NULL)' : '';
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as c FROM users WHERE shop_id = ? AND id != ? ${whereDeleted} AND last_seen_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
      [shopId, Number(req.user?.id || 0)]
    );
    res.json({ count: Number((rows as any[])[0]?.c || 0), windowMinutes: 15 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', authenticateToken, requireRole(...shopUserManagers), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const hasEmail = await hasColumn('users', 'email');
    const hasEmployee = await hasColumn('users', 'employee_id');
    const hasHrEmployee = await hasColumn('users', 'hr_employee_id');
    const baseCols = 'id, username, role, package, shop_id, created_at';
    const extra = [hasEmail ? 'email' : null, hasEmployee ? 'employee_id' : null, hasHrEmployee ? 'hr_employee_id' : null]
      .filter(Boolean)
      .join(', ');
    const cols = extra ? `${baseCols}, ${extra}` : baseCols;
    const hasDeletedAt = await hasColumn('users', 'deleted_at');
    const deletedSql = hasDeletedAt ? 'AND deleted_at IS NULL' : '';
    const [users] = await pool.execute(
      `SELECT ${cols} FROM users WHERE shop_id = ? ${deletedSql} ORDER BY created_at DESC`,
      [shopId]
    );
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', authenticateToken, requireRole(...shopUserManagers), async (req: any, res: Response) => {
  try {
    const rawUsername = req.body?.username ?? req.body?.identifier ?? req.body?.email ?? '';
    const username = String(rawUsername || '').trim();
    const password = req.body?.password;
    const role = req.body?.role ?? req.body?.userRole ?? '';
    const branchId = req.body?.branchId != null ? Number(req.body.branchId) : null;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'username, password, and role are required' });
    }

    const requestedRole = String(role);
    if (
      ![
        'shop_owner',
        'branch_manager',
        'multi_branch_manager',
        'cashier',
        'warehouse',
        'hr_manager',
        'employee',
        'accountant',
        'sales',
      ].includes(requestedRole)
    ) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const r = getShopId(req);
    if (r.forbidden) return res.status(403).json({ error: 'shopId must match your shop' });
    const shopId = req.user.role === 'super_admin' ? (r.shopId ?? req.body.shopId) : req.user.shop_id;
    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required' });
    }

    const [shopRowsForPlan] = await pool.execute('SELECT package FROM shops WHERE id = ?', [shopId]);
    const shopPkgRow = (shopRowsForPlan as any[])[0];
    const shopPlanNorm = normalizePlan(shopPkgRow?.package || 'bronze');
    const shopHasBranchesPlan = shopPlanNorm === 'branches';

    if (!actorCanCreateUserRole(req.user.role, requestedRole, shopHasBranchesPlan)) {
      return res.status(403).json({ error: 'Not allowed to create this role' });
    }

    try {
      await enforcePlanLimits(shopId, requestedRole);
    } catch (planError: any) {
      if (planError.message === 'Shop not found') {
        return res.status(404).json({ error: 'Shop not found' });
      }
      return res.status(403).json({ error: planError.message });
    }

    const [shopRows] = await pool.execute('SELECT package FROM shops WHERE id = ?', [shopId]);
    const shopArray = shopRows as any[];
    if (shopArray.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    const shopPackage = shopArray[0].package;

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, role, package, shop_id) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, requestedRole, shopPackage || 'bronze', shopId]
    );
    const insertResult = result as any;
    const hrEmpId = req.body?.hr_employee_id != null ? Number(req.body.hr_employee_id) : null;
    if (requestedRole === 'employee' && hrEmpId && Number.isFinite(hrEmpId) && hrEmpId > 0) {
      try {
        if (await hasColumn('users', 'hr_employee_id')) {
          await pool.execute('UPDATE users SET hr_employee_id = ? WHERE id = ?', [hrEmpId, insertResult.insertId]);
        }
      } catch {
        // best effort
      }
    }
    if (branchId && Number.isFinite(branchId)) {
      try {
        const [branchRows] = await pool.execute('SELECT id FROM branches WHERE id = ? AND shop_id = ?', [branchId, shopId]);
        if ((branchRows as any[]).length > 0) {
          await pool.execute(
            'INSERT IGNORE INTO user_branch_assignments (user_id, branch_id, shop_id) VALUES (?, ?, ?)',
            [insertResult.insertId, branchId, shopId]
          );
        }
      } catch {
        // best effort; don't block user creation
      }
    }
    await logShopActivity(pool, {
      shopId,
      userId: req.user.id,
      action: 'users.create',
      entityType: 'user',
      entityId: insertResult.insertId,
      meta: { username, role: requestedRole },
      req,
    });
    res.status(201).json({ id: insertResult.insertId, username, role: requestedRole });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', authenticateToken, requireRole(...shopUserManagers), async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    const userArray = rows as any[];
    if (userArray.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = userArray[0];
    const shopId = req.user.role === 'super_admin' ? targetUser.shop_id : req.user.shop_id;
    if (req.user.role !== 'super_admin' && targetUser.shop_id !== shopId) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const actorRole = req.user.role;
    const targetRole = String(targetUser.role || '');
    if (!actorCanDeleteShopUser(actorRole, targetRole)) {
      return res.status(403).json({ error: 'Not allowed to delete this user' });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:id/change-password', authenticateToken, requireRole(...shopUserManagers), async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const newPassword = String(req.body?.newPassword || '').trim();
    if (!userId || !newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Valid newPassword (min 4 chars) required' });
    }

    const [rows] = await pool.execute('SELECT id, shop_id, role FROM users WHERE id = ?', [userId]);
    const target = (rows as any[])[0];
    if (!target) return res.status(404).json({ error: 'User not found' });

    const shopId = req.user.role === 'super_admin' ? target.shop_id : req.user.shop_id;
    if (req.user.role !== 'super_admin' && target.shop_id !== shopId) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const actorRole = req.user.role;
    const targetRole = String(target.role || '');
    if (targetRole === 'super_admin' && actorRole !== 'super_admin') {
      return res.status(403).json({ error: 'Not allowed' });
    }
    if (actorRole === 'branch_manager' && !['cashier', 'warehouse'].includes(targetRole)) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    if (actorRole === 'multi_branch_manager' && !['branch_manager', 'cashier', 'warehouse'].includes(targetRole)) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== LICENSES (Super Admin) ==========
const buildLicensePermissions = (plan: string) => {
  const config = getPlanDefinition(normalizePlan(plan));
  return config.features;
};

const activateLicenseCode = async (req: any, res: Response) => {
  try {
    const code = String(req.body?.code || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'Activation code required' });
    }

    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const [licenses] = await pool.execute('SELECT * FROM licenses WHERE license_key = ? LIMIT 1', [code]);
    const licenseArray = licenses as any[];
    if (licenseArray.length === 0) {
      return res.status(404).json({ error: 'Invalid code' });
    }

    const license = licenseArray[0];
    if (license.status !== 'unused' || license.used_at) {
      return res.status(409).json({ error: 'Code already used' });
    }
    if (license.code_expires_at) {
      const codeExpires = new Date(license.code_expires_at).getTime();
      if (Number.isFinite(codeExpires) && codeExpires < Date.now()) {
        await pool.execute('UPDATE licenses SET status = "expired" WHERE id = ?', [license.id]);
        return res.status(410).json({ error: 'Code expired' });
      }
    }

    const plan = normalizePlan(license.plan);
    const durationDays = parseDurationDays(license.duration, license.duration_days);
    if (String(license.duration).toLowerCase() === 'custom' && !durationDays) {
      return res.status(400).json({ error: 'Invalid code duration' });
    }
    const expiresAt = durationDays ? new Date(Date.now() + durationDays * DAY_MS) : null;
    let permissions = buildLicensePermissions(plan);
    if (license.permissions_json) {
      try {
        permissions = JSON.parse(license.permissions_json);
      } catch {
        permissions = buildLicensePermissions(plan);
      }
    }

    await pool.execute(
      `UPDATE licenses
       SET status = "active", used_by_user_id = ?, used_by_shop_id = ?, used_at = NOW(),
           expires_at = ?, permissions_json = ?
       WHERE id = ?`,
      [req.user.id, shopId, expiresAt, JSON.stringify(permissions), license.id]
    );

    await pool.execute(
      `INSERT INTO shop_subscriptions (shop_id, plan, status, started_at, expires_at, activation_code, activation_source, last_activated_at, activated_by_user_id)
       VALUES (?, ?, 'active', NOW(), ?, ?, 'code', NOW(), ?)
       ON DUPLICATE KEY UPDATE
         plan = VALUES(plan),
         status = 'active',
         expires_at = VALUES(expires_at),
         activation_code = VALUES(activation_code),
         activation_source = 'code',
         last_activated_at = NOW(),
         activated_by_user_id = VALUES(activated_by_user_id)`,
      [shopId, plan, expiresAt, code, req.user.id]
    );
    await pool.execute('UPDATE shops SET trial_ends_at = NULL WHERE id = ?', [shopId]);
    await applyPlanToShop(shopId, plan);

    res.json({
      success: true,
      plan,
      planStatus: expiresAt ? 'ACTIVE' : 'LIFETIME',
      duration: license.duration,
      durationDays,
      expiresAt,
      daysLeft: computeDaysLeft(expiresAt),
      permissions,
      activationCode: code,
      activationCodeMasked: maskActivationCode(code),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

app.get('/api/licenses', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const filter = String((req.query as any)?.filter || 'all').toLowerCase();
    await pool.execute(
      `UPDATE licenses
       SET status = 'expired'
       WHERE status = 'unused' AND code_expires_at IS NOT NULL AND code_expires_at < NOW()`
    ).catch(() => null);

    const conditions: string[] = [];
    if (filter === 'activated') conditions.push("status = 'active'");
    if (filter === 'not_activated') conditions.push("status = 'unused'");
    if (filter === 'expired') conditions.push("status = 'expired'");
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [licenses] = await pool.execute(`SELECT * FROM licenses ${where} ORDER BY created_at DESC`);
    const list = (licenses as any[]).map((row) => {
      let permissions = buildLicensePermissions(row.plan);
      if (row.permissions_json) {
        try {
          permissions = JSON.parse(row.permissions_json);
        } catch {
          permissions = buildLicensePermissions(row.plan);
        }
      }
      return {
        ...row,
        plan: normalizePlan(row.plan),
        permissions,
      };
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/licenses/generate', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { plan, duration, count, customDays, codeExpiresAt, validDays } = req.body || {};
    const allowedPlans = Object.keys(PLAN_DEFINITIONS);
    const allowedDurations = ['weekly', 'monthly', 'quarterly', 'yearly', 'lifetime', 'custom'];
    if (!allowedPlans.includes(String(plan)) || !allowedDurations.includes(String(duration))) {
      return res.status(400).json({ error: 'Invalid plan or duration' });
    }
    if (String(duration) === 'custom') {
      const days = Number(customDays);
      if (!Number.isFinite(days) || days <= 0) {
        return res.status(400).json({ error: 'Custom duration requires valid days' });
      }
    }

    const durationDays = parseDurationDays(duration, customDays);
    const total = Math.min(parseInt(count || '1', 10), 100);
    const durationSuffix = String(duration).toLowerCase() === 'lifetime' ? 'lifetime' : String(durationDays ?? duration);
    const codes: string[] = [];
    for (let i = 0; i < total; i += 1) {
      const random = crypto.randomBytes(6).toString('hex').toLowerCase();
      codes.push(`crown-${plan}-${durationSuffix}-${random}`);
    }

    const permissions = buildLicensePermissions(plan);
    let codeExpires: Date | null = null;
    if (codeExpiresAt) {
      const parsed = new Date(codeExpiresAt);
      if (Number.isFinite(parsed.getTime())) codeExpires = parsed;
    } else if (validDays) {
      const days = Number(validDays);
      if (Number.isFinite(days) && days > 0) codeExpires = new Date(Date.now() + Math.floor(days) * DAY_MS);
    }

    const values = codes.map((code) => [
      code,
      plan,
      duration,
      durationDays,
      JSON.stringify(permissions),
      codeExpires,
    ]);
    await pool.query(
      'INSERT INTO licenses (license_key, plan, duration, duration_days, permissions_json, code_expires_at) VALUES ?',
      [values]
    );

    res.status(201).json({ codes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/licenses/:id', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt((req.params as any).id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await pool.execute('DELETE FROM licenses WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/licenses/bulk-delete', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const ids = Array.isArray((req as any).body?.ids) ? (req as any).body.ids : [];
    if (ids.length === 0) return res.json({ deleted: 0 });
    const clean = ids.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0);
    if (clean.length === 0) return res.json({ deleted: 0 });
    const placeholders = clean.map(() => '?').join(',');
    const [result] = await pool.execute(`DELETE FROM licenses WHERE id IN (${placeholders})`, clean);
    res.json({ deleted: (result as any)?.affectedRows ?? 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/licenses/archive-activated', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const [result] = await pool.execute('DELETE FROM licenses WHERE status = "active"');
    res.json({ deleted: (result as any)?.affectedRows ?? 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/licenses/activate', authenticateToken, async (req: any, res: Response) => {
  await activateLicenseCode(req, res);
});

app.post('/api/activate', authenticateToken, async (req: any, res: Response) => {
  await activateLicenseCode(req, res);
});

// ========== PRODUCTS/INVENTORY ==========
/** Create/update product_units from carton_packs_count (X) and pack_units_count (Y). 1 كرتونة = X*Y قطعة, 1 علبة = Y قطعة. */
async function upsertProductUnits(
  productId: number,
  cartonPacksCount: number | null,
  packUnitsCount: number | null,
  unitPrices?: { piece?: { sell?: number; buy?: number }; pack?: { sell?: number; buy?: number }; carton?: { sell?: number; buy?: number } }
) {
  await pool.execute('DELETE FROM product_units WHERE product_id = ?', [productId]);
  const units: Array<{ name_ar: string; name_en: string; factor_to_base: number; level: number; sell_price?: number; buy_price?: number }> = [
    {
      name_ar: 'قطعة',
      name_en: 'Piece',
      factor_to_base: 1,
      level: 0,
      sell_price: unitPrices?.piece?.sell ?? undefined,
      buy_price: unitPrices?.piece?.buy ?? undefined,
    },
  ];
  const X = Number(cartonPacksCount) || 0;
  const Y = Number(packUnitsCount) || 0;
  if (Y > 0) {
    units.push({
      name_ar: 'علبة',
      name_en: 'Pack',
      factor_to_base: Y,
      level: 1,
      sell_price: unitPrices?.pack?.sell ?? undefined,
      buy_price: unitPrices?.pack?.buy ?? undefined,
    });
  }
  if (X > 0 && Y > 0) {
    units.push({
      name_ar: 'كرتونة',
      name_en: 'Carton',
      factor_to_base: X * Y,
      level: 2,
      sell_price: unitPrices?.carton?.sell ?? undefined,
      buy_price: unitPrices?.carton?.buy ?? undefined,
    });
  }
  const hasUnitPrices = await hasColumn('product_units', 'sell_price');
  for (const u of units) {
    if (hasUnitPrices) {
      await pool.execute(
        'INSERT INTO product_units (product_id, name_ar, name_en, factor_to_base, level, sell_price, buy_price) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [productId, u.name_ar, u.name_en, u.factor_to_base, u.level, u.sell_price ?? null, u.buy_price ?? null]
      );
    } else {
      await pool.execute(
        'INSERT INTO product_units (product_id, name_ar, name_en, factor_to_base, level) VALUES (?, ?, ?, ?, ?)',
        [productId, u.name_ar, u.name_en, u.factor_to_base, u.level]
      );
    }
  }
}

/** Sync product barcode to product_barcodes table for lookup. Shop-scoped when shop_id column exists. */
async function syncProductBarcode(productId: number, barcode: string | null, shopId?: number, unitId?: number | null) {
  if (!barcode || !String(barcode).trim()) return;
  const val = String(barcode).trim();
  const hasShopId = await hasColumn('product_barcodes', 'shop_id');
  const resolvedShopId = shopId ?? (hasShopId ? await getProductShopId(productId) : null);
  try {
    if (hasShopId && resolvedShopId != null) {
      const hasUnitId = await hasColumn('product_barcodes', 'unit_id');
      if (hasUnitId) {
        await pool.execute(
          `INSERT INTO product_barcodes (product_id, barcode_value, shop_id, unit_id, is_active) 
           VALUES (?, ?, ?, ?, 1) 
           ON DUPLICATE KEY UPDATE product_id = VALUES(product_id), unit_id = VALUES(unit_id)`,
          [productId, val, resolvedShopId, unitId ?? null]
        );
      } else {
        await pool.execute(
          `INSERT INTO product_barcodes (product_id, barcode_value, shop_id) VALUES (?, ?, ?) 
           ON DUPLICATE KEY UPDATE product_id = VALUES(product_id)`,
          [productId, val, resolvedShopId]
        );
      }
    } else {
      await pool.execute(
        'INSERT INTO product_barcodes (product_id, barcode_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE product_id = VALUES(product_id)',
        [productId, val]
      );
    }
  } catch (e: any) {
    if (e?.code?.includes?.('ER_DUP')) return;
    throw e;
  }
}

async function getProductShopId(productId: number): Promise<number | null> {
  const [rows] = await pool.execute('SELECT shop_id FROM products WHERE id = ? LIMIT 1', [productId]);
  return (rows as any[])[0]?.shop_id ?? null;
}

app.get('/api/products/lookup', authenticateToken, capProductListRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const rawCode = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
    const rawBarcode = Array.isArray(req.query.barcode) ? req.query.barcode[0] : req.query.barcode;
    const code = String(rawCode || rawBarcode || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'code or barcode is required' });
    }

    let product: any = null;
    let matchedUnitId: number | null = null;

    // 1) Try product_barcodes first (shop-scoped, supports unit mapping)
    const hasBarcodesShop = await hasColumn('product_barcodes', 'shop_id');
    if (hasBarcodesShop) {
      const [barcodeRows] = await pool.execute(
        `SELECT pb.product_id, pb.unit_id
         FROM product_barcodes pb
         WHERE pb.shop_id = ? AND pb.barcode_value = ? AND (pb.is_active = 1 OR pb.is_active IS NULL)
         LIMIT 1`,
        [shopId, code]
      );
      const barcodeList = barcodeRows as any[];
      if (barcodeList.length > 0) {
        matchedUnitId = barcodeList[0].unit_id ?? null;
        const [prodRows] = await pool.execute(
          `SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar
           FROM products p
           LEFT JOIN categories c ON p.category_id = c.id
           WHERE p.id = ? AND p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
           LIMIT 1`,
          [barcodeList[0].product_id, shopId]
        );
        if ((prodRows as any[]).length > 0) product = (prodRows as any[])[0];
      }
    }

    // 2) Fallback: products.barcode/sku/qr_code
    if (!product) {
      const [rows] = await pool.execute(
        `SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
           AND (p.barcode = ? OR p.sku = ? OR p.qr_code = ?)
         LIMIT 1`,
        [shopId, code, code, code]
      );
      const list = rows as any[];
      if (list.length > 0) product = list[0];
    }

    // 3) Legacy product_barcodes (no shop_id) fallback
    if (!product && !hasBarcodesShop) {
      const [barcodeRows] = await pool.execute(
        `SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar
         FROM products p
         JOIN product_barcodes pb ON pb.product_id = p.id AND pb.barcode_value = ?
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.shop_id = ?
         LIMIT 1`,
        [code, shopId]
      );
      const list = barcodeRows as any[];
      if (list.length > 0) product = list[0];
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Load units with pricing (backward compatible when sell_price/buy_price columns missing)
    const hasUnitPrices = await hasColumn('product_units', 'sell_price');
    const unitCols = hasUnitPrices ? 'id, name_ar, name_en, factor_to_base, level, sell_price, buy_price' : 'id, name_ar, name_en, factor_to_base, level';
    const [units] = await pool.execute(
      `SELECT ${unitCols} FROM product_units WHERE product_id = ? ORDER BY level`,
      [product.id]
    );
    let unitsList = (units || []) as any[];
    if (unitsList.length === 0) {
      unitsList = [{ id: 0, name_ar: 'قطعة', name_en: 'Piece', factor_to_base: 1, level: 0, sell_price: null, buy_price: null }];
    }
    (product as any).units = unitsList;

    console.log('DB STOCK:', product.stock_quantity);
    const stockVal = product.stock_quantity != null && String(product.stock_quantity).trim() !== '' ? Number(product.stock_quantity) : 0;
    const finalStock = Number.isNaN(stockVal) ? 0 : stockVal;
    (product as any).stock_quantity = finalStock;
    (product as any).quantity = finalStock;
    (product as any).available_stock = finalStock;

    // Branches array for ALL accounts (unified)
    try {
      const [biRows] = await pool.execute(
        'SELECT branch_id, quantity FROM branch_inventory WHERE shop_id = ? AND product_id = ?',
        [shopId, product.id]
      );
      (product as any).branches = (biRows as any[]).map((r: any) => ({
        branch_id: Number(r.branch_id),
        quantity: parseFloat(String(r.quantity)) || 0,
      }));
    } catch (_) {
      (product as any).branches = [];
    }

    // Resolve unit for response (barcode may map to specific unit)
    let unit = unitsList.find((u: any) => u.id === matchedUnitId) || unitsList.find((u: any) => u.level === 0) || unitsList[0];
    const sellPrice = unit?.sell_price != null ? Number(unit.sell_price) : Number(product.sell_price ?? 0);
    const buyPrice = unit?.buy_price != null ? Number(unit.buy_price) : Number(product.buy_price ?? product.purchase_price ?? 0);

    res.json({
      ...product,
      unit: {
        id: unit?.id ?? 0,
        name_ar: unit?.name_ar ?? 'قطعة',
        name_en: unit?.name_en ?? 'Piece',
        level: unit?.level ?? 0,
        factor_to_base: unit?.factor_to_base ?? 1,
        sell_price: sellPrice,
        buy_price: buyPrice,
      },
      sell_price: sellPrice,
      buy_price: buyPrice,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products', authenticateToken, capProductListRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const includeUnits = req.query.includeUnits === '1' || req.query.includeUnits === 'true';

    await ensureBranchInventoryTable();
    // Ensure every account (including clients) has at least one branch and products have branch_inventory rows.
    await ensureShopHasDefaultBranch(shopId);
    await migrateStockToBranchInventory(shopId);
    // Source of truth: products.stock_quantity; branches array included for ALL accounts (unified).
    const query = `
      SELECT p.*, c.name_en AS category_name_en, c.name_ar AS category_name_ar,
      COALESCE(p.stock_quantity, 0) AS stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
      ORDER BY p.created_at DESC
    `;
    const [products] = await pool.execute(query, [shopId]);
    const list = (products || []) as any[];

    for (const p of list) {
      const dbVal = p.stock_quantity != null && String(p.stock_quantity).trim() !== '' ? Number(p.stock_quantity) : (p.stock != null ? Number(p.stock) : 0);
      const raw = Number.isNaN(dbVal) ? 0 : dbVal;
      p.stock_quantity = raw;
      p.quantity = raw;
      p.available_stock = raw;
    }
    if (list.length > 0) console.log('GET /api/products first product DB STOCK:', list[0].id, list[0].stock_quantity);
    if (list.length > 0) {
      try {
        const [branchRows] = await pool.execute(
          `SELECT bi.product_id, bi.branch_id, bi.quantity, b.name AS branch_name, b.name_ar AS branch_name_ar, b.name_en AS branch_name_en
           FROM branch_inventory bi
           INNER JOIN branches b ON b.id = bi.branch_id AND b.shop_id = bi.shop_id
           WHERE bi.shop_id = ?`,
          [shopId]
        );
        const branchesByProduct: Record<number, { branch_id: number; branch_name: string; quantity: number }[]> = {};
        for (const r of (branchRows as any[])) {
          const pid = Number(r.product_id);
          if (!branchesByProduct[pid]) branchesByProduct[pid] = [];
          const branchName = String(r.branch_name_ar || r.branch_name || r.branch_name_en || '').trim() || String(r.branch_name || '').trim() || '—';
          branchesByProduct[pid].push({
            branch_id: Number(r.branch_id),
            branch_name: branchName,
            quantity: parseFloat(String(r.quantity)) || 0,
          });
        }
        const [defaultBranchRows] = await pool.execute(
          'SELECT id, name, name_ar, name_en FROM branches WHERE shop_id = ? ORDER BY id ASC LIMIT 1',
          [shopId]
        );
        const defaultBranch = (defaultBranchRows as any[])[0];
        const defaultBranchName = defaultBranch ? (String(defaultBranch.name_ar || defaultBranch.name || defaultBranch.name_en || '').trim() || 'الفرع الرئيسي') : 'الفرع الرئيسي';
        for (const p of list) {
          const pid = Number(p.id);
          p.branches = branchesByProduct[pid] && branchesByProduct[pid].length > 0
            ? branchesByProduct[pid]
            : (defaultBranch ? [{ branch_id: Number(defaultBranch.id), branch_name: defaultBranchName, quantity: 0 }] : []);
        }
      } catch (_) {
        for (const p of list) p.branches = [];
      }
    }

    if (includeUnits && list.length > 0) {
      const ids = list.map((p) => p.id);
      const placeholders = ids.map(() => '?').join(',');
      const hasUnitPrices = await hasColumn('product_units', 'sell_price');
      const unitCols = hasUnitPrices ? 'product_id, id, name_ar, name_en, factor_to_base, level, sell_price, buy_price' : 'product_id, id, name_ar, name_en, factor_to_base, level';
      const [units] = await pool.execute(
        `SELECT ${unitCols} FROM product_units WHERE product_id IN (${placeholders}) ORDER BY product_id, level`,
        ids
      );
      const unitsByProduct: Record<number, any[]> = {};
      for (const u of units as any[]) {
        const pid = u.product_id;
        if (!unitsByProduct[pid]) unitsByProduct[pid] = [];
        unitsByProduct[pid].push({
          id: u.id,
          name_ar: u.name_ar,
          name_en: u.name_en,
          factor_to_base: u.factor_to_base,
          level: u.level,
          ...(hasUnitPrices && { sell_price: u.sell_price, buy_price: u.buy_price }),
        });
      }
      for (const p of list) {
        p.units = unitsByProduct[p.id] || [{ id: 0, name_ar: 'قطعة', name_en: 'Piece', factor_to_base: 1, level: 0 }];
      }
    }

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', authenticateToken, capInventoryWrite, async (req: any, res: Response) => {
  try {
    const {
      nameEn,
      nameAr,
      brand,
      categoryId,
      buyPrice,
      sellPrice,
      stockQuantity,
      minStockLevel,
      imageUrl,
      galleryUrls,
      sku,
      barcode,
      qrCode,
      cartonPacksCount,
      packUnitsCount,
      discountType,
      discountValue,
      discountActive,
      taxRateId,
    } = req.body;
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const limitCheck = await enforceProductLimit(shopId, 1);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: `لقد وصلت للحد الأقصى من المنتجات (${limitCheck.maxProducts}). يرجى الترقية للباقة الفضية أو الذهبية.`,
        code: 'PRODUCT_LIMIT_REACHED',
      });
    }

    if (!nameEn) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const isValidUrl = (s: string) => /^https?:\/\/.+/i.test(String(s || '').trim());
    const urlsFromImage = String(imageUrl || '').split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    const urlsFromGallery = Array.isArray(galleryUrls)
      ? galleryUrls.map((u) => String(u || '').trim()).filter(Boolean)
      : typeof galleryUrls === 'string'
        ? galleryUrls.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
        : [];
    const allUrls = [...new Set([...urlsFromImage, ...urlsFromGallery].filter((u) => isValidUrl(u)))];
    const invalidUrls = [...urlsFromImage, ...urlsFromGallery].filter((u) => u && !isValidUrl(u));
    if (invalidUrls.length > 0) {
      return res.status(400).json({ error: 'Invalid image URL(s). Must start with http:// or https://' });
    }
    const primaryImage = allUrls[0] || (imageUrl && String(imageUrl).trim()) || null;
    const galleryJson = allUrls.length > 0 ? JSON.stringify(allUrls) : null;

    const [existing] = await pool.execute(
      `SELECT id FROM products 
       WHERE shop_id = ? AND (
         (sku IS NOT NULL AND sku = ?) OR
         (barcode IS NOT NULL AND barcode = ?) OR
         (LOWER(name_en) = LOWER(?)) OR
         (LOWER(name_ar) = LOWER(?))
       )
       LIMIT 1`,
      [shopId, sku || null, barcode || null, nameEn, nameAr || nameEn]
    );
    const existingArray = existing as any[];
    if (existingArray.length > 0) {
      return res.status(400).json({ error: 'Duplicate product detected' });
    }
    
    const computedSellPrice =
      sellPrice ?? (buyPrice ? Number((Number(buyPrice) * 1.2).toFixed(2)) : 0);

    const xVal = cartonPacksCount != null ? Number(cartonPacksCount) : null;
    const yVal = packUnitsCount != null ? Number(packUnitsCount) : null;
    const unitPrices = {
      piece: { sell: req.body.pieceSellPrice, buy: req.body.pieceBuyPrice },
      pack: { sell: req.body.packSellPrice, buy: req.body.packBuyPrice },
      carton: { sell: req.body.cartonSellPrice, buy: req.body.cartonBuyPrice },
    };

    const hasDiscountCols = await hasColumn('products', 'discount_type');
    const hasTaxRateId = await hasColumn('products', 'tax_rate_id');
    const discountTypeVal = ['none', 'percent', 'fixed'].includes(String(discountType || 'none')) ? String(discountType) : 'none';
    const discountValueVal = discountValue != null && Number.isFinite(Number(discountValue)) ? Number(discountValue) : null;
    const discountActiveVal = discountActive ? 1 : 0;
    const taxRateIdVal = taxRateId != null && Number.isFinite(Number(taxRateId)) ? Number(taxRateId) : null;

    let insertCols = hasDiscountCols
      ? 'name_en, name_ar, sku, barcode, qr_code, brand, category_id, buy_price, sell_price, stock_quantity, min_stock_level, image_url, gallery_urls_json, shop_id, carton_packs_count, pack_units_count, discount_type, discount_value, discount_active'
      : 'name_en, name_ar, sku, barcode, qr_code, brand, category_id, buy_price, sell_price, stock_quantity, min_stock_level, image_url, gallery_urls_json, shop_id, carton_packs_count, pack_units_count';
    if (hasTaxRateId) insertCols += ', tax_rate_id';
    const insertPlaceholders = (hasDiscountCols ? '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?' : '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?') + (hasTaxRateId ? ', ?' : '');
    const insertParams: any[] = [
      nameEn,
      nameAr || nameEn,
      sku || null,
      barcode || null,
      qrCode || null,
      brand || null,
      categoryId || null,
      buyPrice || 0,
      computedSellPrice,
      stockQuantity || 0,
      minStockLevel || 5,
      primaryImage,
      galleryJson,
      shopId,
      Number.isFinite(xVal) ? xVal : null,
      Number.isFinite(yVal) ? yVal : null,
    ];
    if (hasDiscountCols) {
      insertParams.push(discountTypeVal, discountValueVal, discountActiveVal);
    }
    if (hasTaxRateId) {
      insertParams.push(taxRateIdVal);
    }
    const initialStock = Math.max(0, Number(req.body.stock_quantity) || Number(req.body.stockQuantity) || Number(req.body.quantity) || 0);
    insertParams[9] = initialStock;

    const [result] = await pool.execute(
      `INSERT INTO products (${insertCols}) VALUES (${insertPlaceholders})`,
      insertParams
    );

    const insertResult = result as any;
    const productId = insertResult.insertId;
    await applyProductExpiryFields(pool, shopId, productId, req.body as Record<string, unknown>);
    await upsertProductUnits(productId, xVal, yVal, unitPrices);
    if (barcode) await syncProductBarcode(productId, barcode, shopId);

    // --- Stock: branch_inventory is source-of-truth for ALL accounts ---
    await ensureBranchInventoryTable();
    await ensureBranchInventoryColumns();
    await normalizeBranchInventorySchema();

    const defaultBranchId = await ensureShopHasDefaultBranch(shopId);
    const branchHdrRaw = req.headers['x-branch-id'] ?? req.headers['X-Branch-Id'];
    const headerBranchId = Number(branchHdrRaw);
    const effectiveBranchId =
      Number.isFinite(headerBranchId) && headerBranchId > 0 && (await branchBelongsToShop(shopId, Math.floor(headerBranchId)))
        ? Math.floor(headerBranchId)
        : defaultBranchId;

    const branchesPayload = Array.isArray(req.body.branches) ? req.body.branches : [];
    const hasBranchesPayload = branchesPayload.length > 0;
    const qtyRawLegacy = req.body.stock_quantity ?? req.body.stockQuantity ?? req.body.quantity;

    const entries: Array<{ branch_id: number; quantity: number }> = [];
    if (hasBranchesPayload) {
      for (const b of branchesPayload) {
        const branchId = Number(b?.branch_id ?? b?.id ?? 0);
        if (!Number.isFinite(branchId) || branchId <= 0) continue;
        const quantity = Math.max(0, Number(b?.quantity) || 0);
        if (await branchBelongsToShop(shopId, Math.floor(branchId))) {
          entries.push({ branch_id: Math.floor(branchId), quantity });
        }
      }
    } else if (qtyRawLegacy !== undefined && qtyRawLegacy !== null && String(qtyRawLegacy).trim() !== '') {
      const qty = Number(qtyRawLegacy);
      if (!Number.isNaN(qty)) {
        entries.push({ branch_id: effectiveBranchId, quantity: Math.max(0, qty) });
      }
    }

    if (entries.length > 0) {
      // New product: no rows expected, but delete defensively to keep logic idempotent.
      await pool.execute('DELETE FROM branch_inventory WHERE product_id = ? AND shop_id = ?', [productId, shopId]);
      for (const e of entries) {
        await pool.execute(
          `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
          [shopId, e.branch_id, productId, e.quantity]
        );
      }
    }

    const [sumRows] = await pool.execute(
      'SELECT COALESCE(SUM(quantity), 0) AS total FROM branch_inventory WHERE product_id = ? AND shop_id = ?',
      [productId, shopId]
    ) as [any[], any];
    const total = Number((sumRows as any[])?.[0]?.total ?? 0) || 0;
    await pool.execute('UPDATE products SET stock_quantity = ? WHERE id = ? AND shop_id = ?', [total, productId, shopId]);
    if (await hasColumn('products', 'stock_reference_qty')) {
      await pool.execute(
        'UPDATE products SET stock_reference_qty = ? WHERE id = ? AND shop_id = ? AND (stock_reference_qty IS NULL OR stock_reference_qty = 0)',
        [total, productId, shopId]
      );
    }

    await insertNotification({
      shopId,
      source: 'system',
      type: 'inventory_product_created',
      data: withInventoryAlertPayload({
        productId,
        nameAr: nameAr || nameEn,
        nameEn,
        totalQuantity: total,
      }),
    });

    await logShopActivity(pool, {
      shopId,
      userId: req.user.id,
      action: 'products.create',
      entityType: 'product',
      entityId: productId,
      meta: { nameEn },
      req,
    });
    res.status(201).json({ id: productId, playSound: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', authenticateToken, capProductListRead, async (req: any, res: Response, next: NextFunction) => {
  try {
    // Let static routes like /api/products/low-stock continue to their own handlers.
    if (!/^\d+$/.test(String(req.params.id ?? ''))) return next();
    const productId = parseInt(req.params.id, 10);
    if (!productId) return res.status(400).json({ error: 'Invalid product id' });
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const [rows] = await pool.execute(
      'SELECT p.*, COALESCE(p.stock_quantity, 0) AS stock FROM products p WHERE p.id = ? AND p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)',
      [productId, shopId]
    );
    const list = (rows as any[]);
    if (!list.length) return res.status(404).json({ error: 'Product not found' });
    const p = list[0];
    p.stock_quantity = Number(p.stock_quantity ?? p.stock ?? 0);
    p.quantity = p.stock_quantity;
    const [branchRows] = await pool.execute(
      `SELECT bi.branch_id, bi.quantity, b.name AS branch_name, b.name_ar AS branch_name_ar, b.name_en AS branch_name_en
       FROM branch_inventory bi
       INNER JOIN branches b ON b.id = bi.branch_id AND b.shop_id = bi.shop_id
       WHERE bi.shop_id = ? AND bi.product_id = ?`,
      [shopId, productId]
    );
    const brs = (branchRows as any[]);
    p.branches =
      brs.length > 0
        ? brs.map((r) => ({
            branch_id: Number(r.branch_id),
            branch_name: String(r.branch_name_ar || r.branch_name || r.branch_name_en || '').trim() || '—',
            quantity: parseFloat(String(r.quantity)) || 0,
          }))
        : [];
    res.json(p);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', authenticateToken, capInventoryWrite, async (req: any, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (!productId) {
      return res.status(400).json({ error: 'Invalid product id' });
    }
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const {
      nameEn,
      nameAr,
      brand,
      sku,
      barcode,
      qrCode,
      buyPrice,
      sellPrice,
      stockQuantity,
      minStockLevel,
      imageUrl,
      galleryUrls,
      descriptionShort,
      descriptionLong,
      specs,
      warrantyText,
      returnPolicyText,
      extra_fields: extraFieldsBody,
      cartonPacksCount,
      packUnitsCount,
      discountType,
      discountValue,
      discountActive,
      taxRateId,
    } = req.body;
    const toNum = (v: any): number | undefined => (v !== undefined && v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined);
    const unitPrices = {
      piece: { sell: toNum(req.body.pieceSellPrice), buy: toNum(req.body.pieceBuyPrice) },
      pack: { sell: toNum(req.body.packSellPrice), buy: toNum(req.body.packBuyPrice) },
      carton: { sell: toNum(req.body.cartonSellPrice), buy: toNum(req.body.cartonBuyPrice) },
    };

    if (!nameEn) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const isValidUrl = (s: string) => /^https?:\/\/.+/i.test(String(s || '').trim());
    const urlsFromImage = String(imageUrl || '')
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const urlsFromGallery = Array.isArray(galleryUrls)
      ? galleryUrls.map((u) => String(u || '').trim()).filter(Boolean)
      : typeof galleryUrls === 'string'
        ? galleryUrls.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
        : [];
    const allUrls = [...new Set([...urlsFromImage, ...urlsFromGallery].filter((u) => isValidUrl(u)))];
    const invalidUrls = [...urlsFromImage, ...urlsFromGallery].filter((u) => u && !isValidUrl(u));
    if (invalidUrls.length > 0) {
      return res.status(400).json({ error: 'Invalid image URL(s). Must start with http:// or https://' });
    }
    const primaryImage = allUrls[0] || (imageUrl && String(imageUrl).trim()) || null;
    const galleryJson = allUrls.length > 0 ? JSON.stringify(allUrls) : null;

    const computedSellPrice =
      sellPrice ?? (buyPrice ? Number((Number(buyPrice) * 1.2).toFixed(2)) : 0);
    const hasPrice = computedSellPrice > 0 || (buyPrice != null && Number(buyPrice) > 0);
    const isComplete = Boolean(nameEn && hasPrice);
    const missingList: string[] = [];
    if (!nameEn) missingList.push('ProductName');
    if (!hasPrice) missingList.push('SellPrice');
    const missingFieldsJson = missingList.length > 0 ? JSON.stringify(missingList) : null;
    const extraFieldsJson =
      extraFieldsBody != null && typeof extraFieldsBody === 'object'
        ? JSON.stringify(extraFieldsBody)
        : null;
    const specsJson = Array.isArray(specs) && specs.length > 0 ? JSON.stringify(specs) : null;

    const xVal = cartonPacksCount != null ? Number(cartonPacksCount) : null;
    const yVal = packUnitsCount != null ? Number(packUnitsCount) : null;

    const hasDiscountCols = await hasColumn('products', 'discount_type');
    const hasTaxRateId = await hasColumn('products', 'tax_rate_id');
    const discountTypeVal = ['none', 'percent', 'fixed'].includes(String(discountType || 'none')) ? String(discountType) : 'none';
    const discountValueVal = discountValue != null && Number.isFinite(Number(discountValue)) ? Number(discountValue) : null;
    const discountActiveVal = discountActive ? 1 : 0;
    const taxRateIdVal = taxRateId != null && Number.isFinite(Number(taxRateId)) ? Number(taxRateId) : null;

    let updateSet = hasDiscountCols
      ? `name_en = ?, name_ar = ?, sku = ?, barcode = ?, qr_code = ?, brand = ?, buy_price = ?, sell_price = ?,
         min_stock_level = ?, image_url = ?, gallery_urls_json = ?,
         description_short = ?, description_long = ?, specs_json = ?, warranty_text = ?, return_policy_text = ?,
         is_incomplete = ?, missing_fields = ?, extra_fields = ?,
         carton_packs_count = ?, pack_units_count = ?, discount_type = ?, discount_value = ?, discount_active = ?`
      : `name_en = ?, name_ar = ?, sku = ?, barcode = ?, qr_code = ?, brand = ?, buy_price = ?, sell_price = ?,
         min_stock_level = ?, image_url = ?, gallery_urls_json = ?,
         description_short = ?, description_long = ?, specs_json = ?, warranty_text = ?, return_policy_text = ?,
         is_incomplete = ?, missing_fields = ?, extra_fields = ?,
         carton_packs_count = ?, pack_units_count = ?`;
    if (hasTaxRateId) updateSet += ', tax_rate_id = ?';
    const updateParams: any[] = [
      nameEn,
      nameAr || nameEn,
      sku || null,
      barcode || null,
      qrCode || null,
      brand || null,
      buyPrice || 0,
      computedSellPrice,
      minStockLevel || 5,
      primaryImage,
      galleryJson,
      descriptionShort || null,
      descriptionLong || null,
      specsJson,
      warrantyText || null,
      returnPolicyText || null,
      isComplete ? 0 : 1,
      isComplete ? null : missingFieldsJson,
      extraFieldsJson,
      Number.isFinite(xVal) ? xVal : null,
      Number.isFinite(yVal) ? yVal : null,
    ];
    if (hasDiscountCols) {
      updateParams.push(discountTypeVal, discountValueVal, discountActiveVal);
    }
    if (hasTaxRateId) {
      updateParams.push(taxRateIdVal);
    }
    updateParams.push(productId, shopId);

    await pool.execute(
      `UPDATE products SET ${updateSet} WHERE id = ? AND shop_id = ?`,
      updateParams
    );

    await applyProductExpiryFields(pool, shopId, productId, req.body as Record<string, unknown>);
    await upsertProductUnits(productId, xVal, yVal, unitPrices);
    if (barcode) await syncProductBarcode(productId, barcode, shopId);

    const branchHdrRaw = req.headers['x-branch-id'] ?? req.headers['X-Branch-Id'];
    const headerBranchId = Number(branchHdrRaw);
    const [firstBranchRow] = await pool.execute(
      'SELECT id FROM branches WHERE shop_id = ? ORDER BY id ASC LIMIT 1',
      [shopId]
    );
    const firstBranchId = (firstBranchRow as any[])?.[0]?.id;
    const effectiveBranchId =
      Number.isFinite(headerBranchId) && headerBranchId > 0 && (await branchBelongsToShop(shopId, Math.floor(headerBranchId)))
        ? Math.floor(headerBranchId)
        : (firstBranchId ? Number(firstBranchId) : 0);

    const branchesPayload = Array.isArray(req.body.branches) ? req.body.branches : [];
    const hasBranchesPayload = branchesPayload.length > 0;
    const qtyRawLegacy = req.body.stock_quantity ?? req.body.stockQuantity;

    const entries: Array<{ branch_id: number; quantity: number }> = [];
    if (hasBranchesPayload) {
      for (const b of branchesPayload) {
        const branchId = Number(b?.branch_id ?? b?.id ?? 0);
        if (!Number.isFinite(branchId) || branchId <= 0) continue;
        const quantity = Math.max(0, Number(b?.quantity) || 0);
        if (await branchBelongsToShop(shopId, Math.floor(branchId))) {
          entries.push({ branch_id: Math.floor(branchId), quantity });
        }
      }
    } else if (qtyRawLegacy !== undefined && qtyRawLegacy !== null && String(qtyRawLegacy).trim() !== '') {
      const qty = Number(qtyRawLegacy);
      if (!Number.isNaN(qty) && effectiveBranchId > 0) {
        entries.push({ branch_id: effectiveBranchId, quantity: Math.max(0, qty) });
      }
    }

    const [prevSumRows] = await pool.execute(
      'SELECT COALESCE(SUM(quantity), 0) AS total FROM branch_inventory WHERE product_id = ? AND shop_id = ?',
      [productId, shopId]
    ) as [any[], any];
    const quantityBefore = Number((prevSumRows as any[])?.[0]?.total ?? 0) || 0;

    for (const e of entries) {
      await pool.execute(
        `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
        [shopId, e.branch_id, productId, e.quantity]
      );
    }

    const [sumRows] = await pool.execute(
      'SELECT COALESCE(SUM(quantity), 0) AS total FROM branch_inventory WHERE product_id = ? AND shop_id = ?',
      [productId, shopId]
    ) as [any[], any];
    const totalFromBranches = Number((sumRows as any[])?.[0]?.total ?? 0) || 0;

    await pool.execute('UPDATE products SET stock_quantity = ? WHERE id = ? AND shop_id = ?', [
      totalFromBranches,
      productId,
      shopId,
    ]);
    if (await hasColumn('products', 'stock_reference_qty')) {
      const [refRows] = await pool.execute(
        'SELECT stock_reference_qty FROM products WHERE id = ? AND shop_id = ?',
        [productId, shopId]
      );
      const prevRef = (refRows as any[])?.[0]?.stock_reference_qty;
      if ((prevRef == null || Number(prevRef) === 0) && totalFromBranches > 0) {
        await pool.execute('UPDATE products SET stock_reference_qty = ? WHERE id = ? AND shop_id = ?', [
          totalFromBranches,
          productId,
          shopId,
        ]);
      }
    }

    if (entries.length > 0 && quantityBefore !== totalFromBranches) {
      await insertNotification({
        shopId,
        source: 'system',
        type: 'inventory_stock_updated',
        data: withInventoryAlertPayload({
          productId,
          nameAr: nameAr || nameEn,
          nameEn,
          quantityBefore,
          quantityAfter: totalFromBranches,
        }),
      });
    }

    return res.json({
      success: true,
      stock: totalFromBranches,
      updatedQuantity: totalFromBranches,
      playSound: entries.length > 0 && quantityBefore !== totalFromBranches,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', authenticateToken, capInventoryWrite, async (req: any, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (!productId) {
      return res.status(400).json({ error: 'Invalid product id' });
    }
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const [result] = await pool.execute(
      'UPDATE products SET is_deleted = 1 WHERE id = ? AND shop_id = ?',
      [productId, shopId]
    );
    const affected = (result as any).affectedRows;
    if (affected === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Tax rates (ضريبة الصنف) ----------
app.get('/api/taxes', authenticateToken, capTaxRead, async (req: any, res: Response) => {
  try {
    await ensureTaxRatesTable();
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const [rows] = await pool.execute(
      'SELECT id, shop_id, name, type, rate, inclusive, apply_before_discount, is_active, created_at FROM tax_rates WHERE shop_id = ? ORDER BY name',
      [shopId]
    );
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/taxes', authenticateToken, capTaxWrite, async (req: any, res: Response) => {
  try {
    await ensureTaxRatesTable();
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const { name, type, rate, inclusive, apply_before_discount } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Tax name is required' });
    }
    const t = ['percentage', 'fixed'].includes(String(type)) ? type : 'percentage';
    const r = Number(rate);
    const inc = Boolean(inclusive);
    const beforeDisc = apply_before_discount !== false;
    const [result] = await pool.execute(
      'INSERT INTO tax_rates (shop_id, name, type, rate, inclusive, apply_before_discount) VALUES (?, ?, ?, ?, ?, ?)',
      [shopId, name.trim(), t, Number.isFinite(r) ? r : 0, inc ? 1 : 0, beforeDisc ? 1 : 0]
    );
    const id = (result as any).insertId;
    res.status(201).json({ id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/taxes/:id', authenticateToken, capTaxWrite, async (req: any, res: Response) => {
  try {
    await ensureTaxRatesTable();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid tax id' });
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const { name, type, rate, inclusive, apply_before_discount, is_active } = req.body;
    const [existing] = await pool.execute('SELECT id FROM tax_rates WHERE id = ? AND shop_id = ?', [id, shopId]);
    if ((existing as any[]).length === 0) return res.status(404).json({ error: 'Tax not found' });
    const updates: string[] = [];
    const params: any[] = [];
    if (name !== undefined && typeof name === 'string' && name.trim()) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (type !== undefined && ['percentage', 'fixed'].includes(String(type))) {
      updates.push('type = ?');
      params.push(type);
    }
    if (rate !== undefined && Number.isFinite(Number(rate))) {
      updates.push('rate = ?');
      params.push(Number(rate));
    }
    if (inclusive !== undefined) {
      updates.push('inclusive = ?');
      params.push(inclusive ? 1 : 0);
    }
    if (apply_before_discount !== undefined) {
      updates.push('apply_before_discount = ?');
      params.push(apply_before_discount ? 1 : 0);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }
    if (updates.length === 0) return res.json({ success: true });
    params.push(id, shopId);
    await pool.execute(`UPDATE tax_rates SET ${updates.join(', ')} WHERE id = ? AND shop_id = ?`, params);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/taxes/:id', authenticateToken, capTaxWrite, async (req: any, res: Response) => {
  try {
    await ensureTaxRatesTable();
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid tax id' });
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const [result] = await pool.execute('DELETE FROM tax_rates WHERE id = ? AND shop_id = ?', [id, shopId]);
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Tax not found' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tax reports
app.get('/api/tax-reports/daily-vat', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('reports:tax-daily-vat', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(reportsCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

    const hasReturnStatus = await hasColumn('sales', 'return_status');
    const returnStatusFilter = hasReturnStatus ? " AND (s.return_status IS NULL OR s.return_status <> 'full')" : '';

    const [saleRows] = await pool.execute(
      `SELECT DATE(s.created_at) as sale_date,
              SUM(si.tax_amount) as total_tax,
              SUM(si.line_total_before_tax) as total_net,
              COUNT(DISTINCT s.id) as invoice_count
       FROM sales s
       JOIN sale_items si ON s.id = si.sale_id
       WHERE s.shop_id = ? AND DATE(s.created_at) = ?${returnStatusFilter}
       GROUP BY DATE(s.created_at)`,
      [shopId, date]
    ).catch(() => [[]]);

    const salesRow = (saleRows as any[])[0] || null;
    let total_tax = Number(salesRow?.total_tax ?? 0) || 0;
    let total_net = Number(salesRow?.total_net ?? 0) || 0;
    const invoice_count = Number(salesRow?.invoice_count ?? 0) || 0;

    // Returns negative contribution
    await ensureTaxRatesTable();
    const [taxRows] = await pool.execute(
      'SELECT id, type, rate, inclusive, apply_before_discount FROM tax_rates WHERE shop_id = ? AND is_active = 1',
      [shopId]
    ).catch(() => [[]]);
    const taxMap = new Map<number, any>();
    for (const row of (taxRows as any[])) {
      taxMap.set(Number(row.id), {
        id: Number(row.id),
        type: row.type,
        rate: Number(row.rate),
        inclusive: Boolean(row.inclusive),
        apply_before_discount: Boolean(row.apply_before_discount),
      });
    }

    const hasTaxRateId = await hasColumn('products', 'tax_rate_id');
    const hasReturnSaleItemId = await hasColumn('return_items', 'sale_item_id');
    const selectTaxRate = hasTaxRateId
      ? `, COALESCE(si.tax_rate_id, p.tax_rate_id) as product_tax_rate_id`
      : ', NULL as product_tax_rate_id';

    const [returnLines] = await pool.execute(
      `SELECT
          ri.quantity,
          ri.unit_price,
          ${selectTaxRate}
       FROM returns r
       JOIN return_items ri ON ri.return_id = r.id
       JOIN products p ON p.id = ri.product_id
       WHERE r.shop_id = ? AND DATE(r.created_at) = ?`,
      [shopId, date]
    ).catch(() => [[]]);

    let returns_tax = 0;
    let returns_net = 0;
    for (const ln of (returnLines as any[])) {
      const productTaxRateId = hasTaxRateId ? Number(ln.product_tax_rate_id ?? 0) : null;
      const taxRule = resolveTaxRule(taxMap as any, productTaxRateId, hasTaxRateId);
      const qty = Number(ln.quantity ?? 0) || 0;
      const unitPrice = Number(ln.unit_price ?? 0) || 0;
      const { lineTotalBeforeTax, taxAmount } = computeLineTax(unitPrice, qty, taxRule as any, 0, (taxRule as any)?.apply_before_discount ?? true);
      returns_net += Number(lineTotalBeforeTax) || 0;
      returns_tax += Number(taxAmount) || 0;
    }

    total_net -= returns_net;
    total_tax -= returns_tax;

    const hasAny = Boolean(salesRow) || (Array.isArray(returnLines) && (returnLines as any[]).length > 0);
    const payload = {
      date,
      items: hasAny ? [{ sale_date: date, total_net, total_tax, invoice_count }] : [],
    };
    setCachedPayload(reportsCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tax-reports/monthly-summary', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('reports:tax-monthly-summary', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(reportsCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

    const hasReturnStatus = await hasColumn('sales', 'return_status');
    const returnStatusFilter = hasReturnStatus ? " AND (s.return_status IS NULL OR s.return_status <> 'full')" : '';

    const [saleRows] = await pool.execute(
      `SELECT DATE_FORMAT(s.created_at, '%Y-%m') as month,
              SUM(si.tax_amount) as total_tax,
              SUM(si.line_total_before_tax) as total_net,
              COUNT(DISTINCT s.id) as invoice_count
       FROM sales s
       JOIN sale_items si ON s.id = si.sale_id
       WHERE s.shop_id = ? AND DATE_FORMAT(s.created_at, '%Y-%m') = ?${returnStatusFilter}
       GROUP BY DATE_FORMAT(s.created_at, '%Y-%m')`,
      [shopId, month]
    ).catch(() => [[]]);

    const salesRow = (saleRows as any[])[0] || null;
    let total_tax = Number(salesRow?.total_tax ?? 0) || 0;
    let total_net = Number(salesRow?.total_net ?? 0) || 0;
    const invoice_count = Number(salesRow?.invoice_count ?? 0) || 0;

    // Returns negative contribution
    await ensureTaxRatesTable();
    const [taxRows] = await pool.execute(
      'SELECT id, type, rate, inclusive, apply_before_discount FROM tax_rates WHERE shop_id = ? AND is_active = 1',
      [shopId]
    ).catch(() => [[]]);
    const taxMap = new Map<number, any>();
    for (const row of (taxRows as any[])) {
      taxMap.set(Number(row.id), {
        id: Number(row.id),
        type: row.type,
        rate: Number(row.rate),
        inclusive: Boolean(row.inclusive),
        apply_before_discount: Boolean(row.apply_before_discount),
      });
    }

    const hasTaxRateId = await hasColumn('products', 'tax_rate_id');
    const hasReturnSaleItemId = await hasColumn('return_items', 'sale_item_id');
    const selectTaxRate = hasTaxRateId
      ? ', COALESCE(si.tax_rate_id, p.tax_rate_id) as product_tax_rate_id'
      : ', NULL as product_tax_rate_id';

    const [returnLines] = await pool.execute(
      `SELECT
          ri.quantity,
          ri.unit_price,
          ${selectTaxRate}
       FROM returns r
       JOIN return_items ri ON ri.return_id = r.id
       JOIN products p ON p.id = ri.product_id
       WHERE r.shop_id = ? AND DATE_FORMAT(r.created_at, '%Y-%m') = ?`,
      [shopId, month]
    ).catch(() => [[]]);

    let returns_tax = 0;
    let returns_net = 0;
    for (const ln of (returnLines as any[])) {
      const productTaxRateId = hasTaxRateId ? Number(ln.product_tax_rate_id ?? 0) : null;
      const taxRule = resolveTaxRule(taxMap as any, productTaxRateId, hasTaxRateId);
      const qty = Number(ln.quantity ?? 0) || 0;
      const unitPrice = Number(ln.unit_price ?? 0) || 0;
      const { lineTotalBeforeTax, taxAmount } = computeLineTax(unitPrice, qty, taxRule as any, 0, (taxRule as any)?.apply_before_discount ?? true);
      returns_net += Number(lineTotalBeforeTax) || 0;
      returns_tax += Number(taxAmount) || 0;
    }

    total_net -= returns_net;
    total_tax -= returns_tax;

    const hasAny = Boolean(salesRow) || (Array.isArray(returnLines) && (returnLines as any[]).length > 0);
    const payload = {
      month,
      items: hasAny ? [{ month, total_net, total_tax, invoice_count }] : [],
    };
    setCachedPayload(reportsCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tax-reports/by-product', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('reports:tax-by-product', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(reportsCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';
    const hasRange = from && to;

    const hasReturnStatus = await hasColumn('sales', 'return_status');
    const returnStatusFilter = hasReturnStatus ? " AND (s.return_status IS NULL OR s.return_status <> 'full')" : '';

    const [salesRows] = hasRange
      ? await pool.execute(
          `SELECT si.product_id,
                  COALESCE(p.name_ar, si.product_name_ar, 'منتج محذوف') AS name_ar,
                  COALESCE(p.name_en, si.product_name_en, 'Deleted product') AS name_en,
                  SUM(si.tax_amount) as total_tax,
                  SUM(si.line_total_after_tax) as total_sales
           FROM sale_items si
           JOIN sales s ON si.sale_id = s.id
           LEFT JOIN products p ON si.product_id = p.id
           WHERE s.shop_id = ? AND DATE(s.created_at) BETWEEN ? AND ?${returnStatusFilter}
           GROUP BY si.product_id, name_ar, name_en`,
          [shopId, from, to]
        ).catch(() => [[]])
      : await pool.execute(
          `SELECT si.product_id,
                  COALESCE(p.name_ar, si.product_name_ar, 'منتج محذوف') AS name_ar,
                  COALESCE(p.name_en, si.product_name_en, 'Deleted product') AS name_en,
                  SUM(si.tax_amount) as total_tax,
                  SUM(si.line_total_after_tax) as total_sales
           FROM sale_items si
           JOIN sales s ON si.sale_id = s.id
           LEFT JOIN products p ON si.product_id = p.id
           WHERE s.shop_id = ?${returnStatusFilter}
           GROUP BY si.product_id, name_ar, name_en`,
          [shopId]
        ).catch(() => [[]]);

    const byProductMap = new Map<number, any>();
    for (const row of (salesRows as any[])) {
      const pid = Number(row.product_id);
      byProductMap.set(pid, {
        product_id: pid,
        name_ar: row.name_ar,
        name_en: row.name_en,
        total_tax: Number(row.total_tax ?? 0) || 0,
        total_sales: Number(row.total_sales ?? 0) || 0,
      });
    }

    await ensureTaxRatesTable();
    const [taxRows] = await pool.execute(
      'SELECT id, type, rate, inclusive, apply_before_discount FROM tax_rates WHERE shop_id = ? AND is_active = 1',
      [shopId]
    ).catch(() => [[]]);
    const taxMap = new Map<number, any>();
    for (const row of (taxRows as any[])) {
      taxMap.set(Number(row.id), {
        id: Number(row.id),
        type: row.type,
        rate: Number(row.rate),
        inclusive: Boolean(row.inclusive),
        apply_before_discount: Boolean(row.apply_before_discount),
      });
    }

    const hasTaxRateId = await hasColumn('products', 'tax_rate_id');
    const hasReturnSaleItemId = await hasColumn('return_items', 'sale_item_id');
    const selectTaxRate = hasTaxRateId
      ? `, COALESCE(si.tax_rate_id, p.tax_rate_id) as product_tax_rate_id`
      : ', NULL as product_tax_rate_id';

    const returnWhere = hasRange ? 'DATE(r.created_at) BETWEEN ? AND ?' : '1=1';
    const returnParams = hasRange ? [from, to] : [];

    const [returnLines] = await pool.execute(
      `SELECT
          ri.product_id,
          ri.quantity,
          ri.unit_price,
          COALESCE(p.name_ar, si.product_name_ar, 'منتج محذوف') AS name_ar,
          COALESCE(p.name_en, si.product_name_en, 'Deleted product') AS name_en
          ${selectTaxRate}
       FROM returns r
       JOIN return_items ri ON ri.return_id = r.id
       ${hasReturnSaleItemId ? 'LEFT JOIN sale_items si ON si.id = ri.sale_item_id' : 'LEFT JOIN sale_items si ON 1=0'}
       LEFT JOIN products p ON p.id = ri.product_id
       WHERE r.shop_id = ? AND ${returnWhere}`,
      [shopId, ...returnParams]
    ).catch(() => [[]]);

    for (const ln of (returnLines as any[])) {
      const pid = Number(ln.product_id);
      if (!byProductMap.has(pid)) {
        byProductMap.set(pid, { product_id: pid, name_ar: ln.name_ar, name_en: ln.name_en, total_tax: 0, total_sales: 0 });
      }
      const taxRule = resolveTaxRule(taxMap as any, hasTaxRateId ? Number(ln.product_tax_rate_id ?? 0) : null, hasTaxRateId);
      const qty = Number(ln.quantity ?? 0) || 0;
      const unitPrice = Number(ln.unit_price ?? 0) || 0;
      const { taxAmount, lineTotalAfterTax } = computeLineTax(unitPrice, qty, taxRule as any, 0, (taxRule as any)?.apply_before_discount ?? true);
      const row = byProductMap.get(pid)!;
      row.total_tax = Number(row.total_tax) - (Number(taxAmount) || 0);
      row.total_sales = Number(row.total_sales) - (Number(lineTotalAfterTax) || 0);
    }

    const payload = { items: Array.from(byProductMap.values()) };
    setCachedPayload(reportsCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tax-reports/by-invoice', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('reports:tax-by-invoice', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(reportsCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';
    const hasRange = from && to;

    const hasReturnStatus = await hasColumn('sales', 'return_status');
    const returnStatusFilter = hasReturnStatus ? " AND (s.return_status IS NULL OR s.return_status <> 'full')" : '';

    const [salesRows] = hasRange
      ? await pool.execute(
          `SELECT s.id, s.invoice_number, s.created_at, s.subtotal, s.total_tax, s.grand_total
           FROM sales s
           WHERE s.shop_id = ? AND DATE(s.created_at) BETWEEN ? AND ? ${returnStatusFilter}
           ORDER BY s.created_at DESC`,
          [shopId, from, to]
        ).catch(() => [[]])
      : await pool.execute(
          `SELECT s.id, s.invoice_number, s.created_at, s.subtotal, s.total_tax, s.grand_total
           FROM sales s
           WHERE s.shop_id = ? ${returnStatusFilter}
           ORDER BY s.created_at DESC
           LIMIT 500`,
          [shopId]
        ).catch(() => [[]]);

    const combined: any[] = Array.isArray(salesRows) ? [...salesRows] : [];

    // Returns negative invoices
    await ensureTaxRatesTable();
    const [taxRows] = await pool.execute(
      'SELECT id, type, rate, inclusive, apply_before_discount FROM tax_rates WHERE shop_id = ? AND is_active = 1',
      [shopId]
    ).catch(() => [[]]);
    const taxMap = new Map<number, any>();
    for (const row of (taxRows as any[])) {
      taxMap.set(Number(row.id), {
        id: Number(row.id),
        type: row.type,
        rate: Number(row.rate),
        inclusive: Boolean(row.inclusive),
        apply_before_discount: Boolean(row.apply_before_discount),
      });
    }

    const hasTaxRateId = await hasColumn('products', 'tax_rate_id');
    const hasReturnSaleItemId = await hasColumn('return_items', 'sale_item_id');
    const selectTaxRate = hasTaxRateId
      ? ', COALESCE(si.tax_rate_id, p.tax_rate_id) as product_tax_rate_id'
      : ', NULL as product_tax_rate_id';

    const [returnInvoices] = hasRange
      ? await pool.execute(
          `SELECT r.id, r.return_number as invoice_number, r.created_at
           FROM returns r
           WHERE r.shop_id = ? AND DATE(r.created_at) BETWEEN ? AND ?
           ORDER BY r.created_at DESC
           LIMIT 500`,
          [shopId, from, to]
        ).catch(() => [[]])
      : await pool.execute(
          `SELECT r.id, r.return_number as invoice_number, r.created_at
           FROM returns r
           WHERE r.shop_id = ?
           ORDER BY r.created_at DESC
           LIMIT 500`,
          [shopId]
        ).catch(() => [[]]);

    const retInv = Array.isArray(returnInvoices) ? returnInvoices : [];
    const returnInvoiceIds = retInv.map((r: any) => Number(r.id)).filter(Boolean);
    if (returnInvoiceIds.length > 0) {
      const placeholders = returnInvoiceIds.map(() => '?').join(',');
      const [returnLines] = await pool.execute(
        `SELECT
            ri.return_id,
            ri.quantity,
            ri.unit_price
            ${selectTaxRate}
         FROM return_items ri
         ${hasReturnSaleItemId ? 'LEFT JOIN sale_items si ON si.id = ri.sale_item_id' : 'LEFT JOIN sale_items si ON 1=0'}
         LEFT JOIN products p ON p.id = ri.product_id
         WHERE ri.return_id IN (${placeholders})`,
        returnInvoiceIds
      ).catch(() => [[]]);

      const byReturn = new Map<number, { subtotal: number; total_tax: number; grand_total: number }>();
      for (const ln of (returnLines as any[])) {
        const rid = Number(ln.return_id);
        if (!byReturn.has(rid)) byReturn.set(rid, { subtotal: 0, total_tax: 0, grand_total: 0 });
        const agg = byReturn.get(rid)!;
        const taxRule = resolveTaxRule(taxMap as any, hasTaxRateId ? Number(ln.product_tax_rate_id ?? 0) : null, hasTaxRateId);
        const qty = Number(ln.quantity ?? 0) || 0;
        const unitPrice = Number(ln.unit_price ?? 0) || 0;
        const { lineTotalBeforeTax, taxAmount, lineTotalAfterTax } = computeLineTax(unitPrice, qty, taxRule as any, 0, (taxRule as any)?.apply_before_discount ?? true);
        agg.subtotal += Number(lineTotalBeforeTax) || 0;
        agg.total_tax += Number(taxAmount) || 0;
        agg.grand_total += Number(lineTotalAfterTax) || 0;
      }

      for (const inv of retInv) {
        const rid = Number(inv.id);
        const agg = byReturn.get(rid) || { subtotal: 0, total_tax: 0, grand_total: 0 };
        combined.push({
          id: rid,
          invoice_number: inv.invoice_number ?? '-',
          created_at: inv.created_at,
          subtotal: -(Number(agg.subtotal) || 0),
          total_tax: -(Number(agg.total_tax) || 0),
          grand_total: -(Number(agg.grand_total) || 0),
        });
      }
    }

    combined.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    const payload = { items: combined };
    setCachedPayload(reportsCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Accounting ----------
const DEFAULT_ACCOUNTS = [
  { code: '1000', name: 'Cash', name_ar: 'النقدية', type: 'asset' },
  { code: '1100', name: 'Bank', name_ar: 'البنك', type: 'asset' },
  { code: '1200', name: 'Accounts Receivable', name_ar: 'مدينون', type: 'asset' },
  { code: '1500', name: 'Inventory', name_ar: 'المخزون', type: 'asset' },
  { code: '2000', name: 'Accounts Payable', name_ar: 'دائنون', type: 'liability' },
  { code: '3000', name: 'Capital', name_ar: 'رأس المال', type: 'equity' },
  { code: '4000', name: 'Sales Revenue', name_ar: 'إيرادات المبيعات', type: 'revenue' },
  { code: '5000', name: 'Cost of Goods Sold', name_ar: 'تكلفة البضاعة المباعة', type: 'expense' },
  { code: '6000', name: 'Expenses', name_ar: 'مصروفات', type: 'expense' },
  { code: '6100', name: 'Salaries Expense', name_ar: 'مصروف رواتب', type: 'expense' },
  { code: '7000', name: 'Tax Payable', name_ar: 'ضريبة مستحقة', type: 'liability' },
];

async function ensureDefaultAccounts(conn: any, shopId: number): Promise<Map<string, number>> {
  const [existing] = await conn.execute('SELECT id, code FROM accounts WHERE shop_id = ?', [shopId]);
  const byCode = new Map<string, number>();
  for (const row of (existing as any[])) byCode.set(String(row.code), row.id);
  if (byCode.size >= DEFAULT_ACCOUNTS.length) return byCode;
  for (const a of DEFAULT_ACCOUNTS) {
    if (byCode.has(a.code)) continue;
    const [r] = await conn.execute(
      'INSERT INTO accounts (shop_id, code, name, type) VALUES (?, ?, ?, ?)',
      [shopId, a.code, a.name, a.type]
    );
    byCode.set(a.code, (r as any).insertId);
  }
  return byCode;
}

async function findProductForInvoiceImport(
  shopId: number,
  name: string,
  barcode: string | null | undefined
): Promise<{ id: number; barcode: string | null; qr_code: string | null } | null> {
  const bc = barcode && String(barcode).trim() ? String(barcode).replace(/\s/g, '').trim() : null;
  if (bc) {
    const hasSku = await hasColumn('products', 'sku');
    const skuClause = hasSku
      ? `OR (sku IS NOT NULL AND sku != '' AND REPLACE(TRIM(sku), ' ', '') = ?)`
      : '';
    const params = hasSku ? [shopId, bc, bc] : [shopId, bc];
    const [rows] = await pool.execute(
      `SELECT id, barcode, qr_code FROM products WHERE shop_id = ? AND is_deleted = 0 AND (
        (barcode IS NOT NULL AND barcode != '' AND REPLACE(TRIM(barcode), ' ', '') = ?)
        ${skuClause}
      ) LIMIT 1`,
      params
    );
    const a = rows as any[];
    if (a.length) return a[0];
  }
  const n = String(name || '').trim();
  if (!n) return null;
  const [rows2] = await pool.execute(
    `SELECT id, barcode, qr_code FROM products WHERE shop_id = ? AND is_deleted = 0 AND (LOWER(TRIM(name_en)) = LOWER(?) OR LOWER(TRIM(name_ar)) = LOWER(?)) LIMIT 1`,
    [shopId, n, n]
  );
  const arr = rows2 as any[];
  if (arr.length) return arr[0];
  if (n.length >= 3) {
    const like = `%${n}%`;
    const [rows3] = await pool.execute(
      `SELECT id, barcode, qr_code FROM products WHERE shop_id = ? AND is_deleted = 0 AND (
        LOWER(TRIM(name_ar)) LIKE LOWER(?) OR LOWER(TRIM(name_en)) LIKE LOWER(?)
      ) ORDER BY CHAR_LENGTH(COALESCE(name_ar, name_en)) DESC LIMIT 1`,
      [shopId, like, like]
    );
    const arr3 = rows3 as any[];
    if (arr3.length) return arr3[0];
  }
  return null;
}

async function ensureShopVat14TaxRateId(shopId: number): Promise<number | null> {
  await ensureTaxRatesTable();
  try {
    const [rows] = await pool.execute(
      `SELECT id FROM tax_rates WHERE shop_id = ? AND is_active = 1 AND ABS(rate - 14) < 0.01 ORDER BY id LIMIT 1`,
      [shopId]
    );
    const id = (rows as any[])[0]?.id;
    if (id) return Number(id);
    const [r] = await pool.execute(
      `INSERT INTO tax_rates (shop_id, name, type, rate, inclusive, apply_before_discount, is_active) VALUES (?, 'VAT 14%', 'percentage', 14, 0, 1, 1)`,
      [shopId]
    );
    return Number((r as any).insertId);
  } catch {
    return null;
  }
}

function pickInvoiceLineExtras(it: any): {
  expiryIso: string | null;
  taxPercent: number | null;
  taxAmount: number | null;
} {
  const exp = normalizeExpiryDateToIso(it?.expiryDate ?? it?.expiry_date ?? null);
  let taxPercent: number | null =
    it?.taxPercent != null ? Number(it.taxPercent) : it?.tax_percent != null ? Number(it.tax_percent) : null;
  if (taxPercent != null && taxPercent > 100 && taxPercent <= 10000) taxPercent = taxPercent / 100;
  if (taxPercent != null && (taxPercent > 100 || taxPercent < 0 || !Number.isFinite(taxPercent))) taxPercent = null;
  let taxAmount: number | null =
    it?.taxAmount != null ? Number(it.taxAmount) : it?.tax_amount != null ? Number(it.tax_amount) : null;
  if (taxAmount != null && !Number.isFinite(taxAmount)) taxAmount = null;
  return { expiryIso: exp, taxPercent, taxAmount };
}

async function mergeProductExpiryFromImport(shopId: number, productId: number, expiryIso: string | null) {
  if (!expiryIso || !(await hasColumn('products', 'expiry_date'))) return;
  const [r] = await pool.execute('SELECT expiry_date FROM products WHERE id = ? AND shop_id = ?', [productId, shopId]);
  const cur = (r as any[])[0]?.expiry_date;
  const curStr = cur ? String(cur).slice(0, 10) : null;
  if (!curStr || new Date(expiryIso) > new Date(curStr)) {
    await pool.execute('UPDATE products SET expiry_date = ? WHERE id = ? AND shop_id = ?', [expiryIso, productId, shopId]);
  }
}

async function mergeProductExpiryFromImportConn(
  conn: any,
  shopId: number,
  productId: number,
  expiryIso: string | null
) {
  if (!expiryIso || !(await hasColumn('products', 'expiry_date'))) return;
  const [r] = await conn.execute('SELECT expiry_date FROM products WHERE id = ? AND shop_id = ?', [productId, shopId]);
  const cur = (r as any[])[0]?.expiry_date;
  const curStr = cur ? String(cur).slice(0, 10) : null;
  if (!curStr || new Date(expiryIso) > new Date(curStr)) {
    await conn.execute('UPDATE products SET expiry_date = ? WHERE id = ? AND shop_id = ?', [expiryIso, productId, shopId]);
  }
}

function normalizeArabicLettersLoose(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSupplierNameForMatch(value: string): string {
  const base = normalizeArabicLettersLoose(value);
  return base
    .replace(/\b(شركة|شركه|co|co\.|company|comp|ltd|llc)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildInvoiceOcrWarnings(items: any[]): string[] {
  const out: string[] = [];
  for (const it of items || []) {
    const name = String(it?.itemName || it?.name || 'صنف').trim() || 'صنف';
    if (!String(it?.barcode || '').trim()) out.push(`الباركود ناقص للصنف ${name}`);
    if (!String(it?.expiryDate || it?.expiry_date || '').trim()) out.push(`تاريخ الصلاحية غير موجود للصنف ${name}`);
    const taxVal = it?.taxPercent ?? it?.taxAmount ?? it?.tax ?? null;
    if (taxVal == null || String(taxVal).trim() === '' || Number(taxVal) === 0) out.push(`الضريبة غير محددة للصنف ${name}`);
  }
  return out;
}

function buildInvoiceStructuredPayload(parsed: any): {
  supplier: { name: string; phone: string; address: string };
  invoice: { number: string; date: string };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    barcode: string;
    expiry_date: string;
    tax: number;
  }>;
  total_amount: number;
} {
  const p = parsed || {};
  const sourceItems = Array.isArray(p.items) ? p.items : [];
  const items = sourceItems.map((it: any) => {
    const quantity = Math.max(0, Math.floor(Number(it?.qty ?? it?.quantity ?? 0) || 0));
    const price = Number(it?.buyPrice ?? it?.price ?? 0) || 0;
    const total = Number(it?.total ?? quantity * price) || 0;
    const tax = Number(it?.taxPercent ?? it?.taxAmount ?? it?.tax ?? 0) || 0;
    return {
      name: String(it?.itemName ?? it?.name ?? '').trim(),
      quantity,
      price,
      total,
      barcode: String(it?.barcode ?? '').trim(),
      expiry_date: String(it?.expiryDate ?? it?.expiry_date ?? '').trim(),
      tax,
    };
  });
  const totalFromItems = items.reduce((sum, x) => sum + (Number.isFinite(x.total) ? x.total : 0), 0);
  return {
    supplier: {
      name: String(p?.meta?.supplierName ?? p?.structured?.supplier ?? p?.supplier?.name ?? '').trim(),
      phone: String(p?.supplier?.phone ?? p?.meta?.supplierPhone ?? '').trim(),
      address: String(p?.supplier?.address ?? p?.meta?.supplierAddress ?? '').trim(),
    },
    invoice: {
      number: String(p?.structured?.invoice_number ?? p?.meta?.invoiceNumber ?? p?.invoice?.number ?? '').trim(),
      date: String(p?.structured?.date ?? p?.meta?.invoiceDate ?? p?.invoice?.date ?? '').trim(),
    },
    items,
    total_amount: Number(p?.structured?.total_amount ?? p?.meta?.invoiceSubtotalBeforeTax ?? totalFromItems) || totalFromItems,
  };
}

async function getShopCurrencyCodeForShop(shopId: number): Promise<string> {
  try {
    const [rows] = await pool.execute('SELECT currency_code FROM shops WHERE id = ? LIMIT 1', [shopId]);
    const raw = (rows as any[])[0]?.currency_code;
    return normalizeFxCurrencyCode(raw) || 'EGP';
  } catch {
    return 'EGP';
  }
}

async function applyInvoiceImageImportItems(
  shopId: number,
  req: any,
  items: any[],
  options: {
    recordPurchaseInvoice: boolean;
    branchId: number | null;
    supplierId: number | null;
    meta: {
      supplierName?: string | null;
      supplierPhone?: string | null;
      supplierAddress?: string | null;
      invoiceNumber?: string | null;
      invoiceDate?: string | null;
      branchName?: string | null;
    } | null | undefined;
  }
): Promise<{
  inserted: number;
  updated: number;
  failedCount: number;
  row_errors: Array<{ row: number; reason: string }>;
  warnings: string[];
  purchase_invoice_id: number | null;
}> {
  await ensureSuppliersTable().catch(() => {});
  const warnings: string[] = [];
  const row_errors: Array<{ row: number; reason: string }> = [];
  let supplierId = options.supplierId != null && Number(options.supplierId) > 0 ? Number(options.supplierId) : null;
  const meta = options.meta || {};
  if (!supplierId && meta.supplierName) {
    const sn = String(meta.supplierName).trim();
    const snNorm = normalizeSupplierNameForMatch(sn);
    if (sn) {
      const [sr] = await pool
        .execute(
          `SELECT id FROM suppliers WHERE shop_id = ? AND (
            name = ? OR LOWER(TRIM(name)) = LOWER(?) OR name LIKE ?
          ) ORDER BY id DESC LIMIT 1`,
          [shopId, sn, sn, `%${sn}%`]
        )
        .catch(() => [[]]);
      let sid = (sr as any[])[0]?.id;
      if (!sid) {
        const [sAll] = await pool
          .execute('SELECT id, name FROM suppliers WHERE shop_id = ? ORDER BY id DESC LIMIT 2000', [shopId])
          .catch(() => [[]]);
        const hit = (sAll as any[]).find((r) => {
          const n = normalizeSupplierNameForMatch(String(r?.name || ''));
          return n && snNorm && (n === snNorm || n.includes(snNorm) || snNorm.includes(n));
        });
        sid = hit?.id;
      }
      if (sid) supplierId = Number(sid);
    }
  }
  if (meta.supplierName && String(meta.supplierName).trim() && !supplierId) {
    const sn = String(meta.supplierName).trim();
    const snNorm = normalizeSupplierNameForMatch(sn);
    const [exactRows] = await pool
      .execute(`SELECT id FROM suppliers WHERE shop_id = ? AND LOWER(TRIM(name)) = LOWER(?) LIMIT 1`, [shopId, sn])
      .catch(() => [[]]);
    const exactId = (exactRows as any[])[0]?.id;
    if (exactId) {
      supplierId = Number(exactId);
    }
    if (!supplierId && snNorm) {
      const [sAll2] = await pool
        .execute('SELECT id, name FROM suppliers WHERE shop_id = ? ORDER BY id DESC LIMIT 2000', [shopId])
        .catch(() => [[]]);
      const hit2 = (sAll2 as any[]).find((r) => {
        const n = normalizeSupplierNameForMatch(String(r?.name || ''));
        return n && snNorm && (n === snNorm || n.includes(snNorm) || snNorm.includes(n));
      });
      if (hit2?.id) supplierId = Number(hit2.id);
    }
    const supplierPhone = meta.supplierPhone ? String(meta.supplierPhone).trim() : '';
    const supplierAddress = meta.supplierAddress ? String(meta.supplierAddress).trim() : '';
    try {
      if (supplierId) {
        /* matched existing — skip insert */
      } else {
      const [ins] = await pool.execute(
        'INSERT INTO suppliers (shop_id, name, phone, email, address, balance, branch_id) VALUES (?, ?, ?, NULL, ?, 0, NULL)',
        [shopId, sn, supplierPhone || null, supplierAddress || null]
      );
      supplierId = Number((ins as any).insertId);
      warnings.push(`تم إنشاء مورد جديد تلقائياً وإضافته لقائمة الموردين: ${sn}`);
      }
    } catch (createErr: any) {
      if (createErr?.code === 'ER_DUP_ENTRY') {
        const [sr2] = await pool
          .execute(`SELECT id FROM suppliers WHERE shop_id = ? AND LOWER(TRIM(name)) = LOWER(?) LIMIT 1`, [shopId, sn])
          .catch(() => [[]]);
        const sid2 = (sr2 as any[])[0]?.id;
        if (sid2) supplierId = Number(sid2);
      }
      if (!supplierId) {
        warnings.push(
          'لم يُعثر على مورد مطابق بالاسم وتعذّر إنشاء مورد جديد — سجّل المورد من المشتريات أو اختره يدوياً.'
        );
      }
    }
  }

  let branchId = options.branchId != null && Number(options.branchId) > 0 ? Number(options.branchId) : null;
  if (branchId && !(await branchBelongsToShop(shopId, branchId))) branchId = null;
  if (!branchId && meta.branchName) {
    const bn = String(meta.branchName).trim();
    if (bn) {
      const [br] = await pool
        .execute(
          `SELECT id FROM branches WHERE shop_id = ? AND (name = ? OR name_ar = ? OR name LIKE ? OR name_ar LIKE ?) ORDER BY id ASC LIMIT 1`,
          [shopId, bn, bn, `%${bn}%`, `%${bn}%`]
        )
        .catch(() => [[]]);
      const bid = (br as any[])[0]?.id;
      if (bid) branchId = Number(bid);
    }
  }
  if (!branchId) {
    branchId = await resolveOptionalBranchId(req, shopId);
  }
  const useBranch = (await shopUsesBranchInventory(shopId)) && branchId != null && branchId > 0;

  const hasQr = await hasColumn('products', 'qr_code');
  const seenImportKeys = new Set<string>();
  const matchedLines: Array<{
    product_id: number;
    quantity: number;
    cost_price: number;
    sell_price: number;
    expiry_iso: string | null;
    tax_percent: number | null;
    tax_amount: number | null;
    barcode_from_invoice: string | null;
  }> = [];

  let inserted = 0;
  let updated = 0;

  if (options.recordPurchaseInvoice) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i] || {};
      const name = String(it.itemName || it.name || '').trim();
      if (!name) {
        row_errors.push({ row: i + 1, reason: 'Item name required' });
        continue;
      }
      const qty = Math.max(0, Math.floor(Number(it.qty) || 0));
      if (qty <= 0) {
        row_errors.push({ row: i + 1, reason: 'Invalid quantity' });
        continue;
      }
      const pair = normalizeBuySellForPoLine(it.buyPrice != null ? Number(it.buyPrice) : 0, it.sellPrice != null ? Number(it.sellPrice) : 0);
      const buyPrice = pair.buy;
      const sellLine = pair.sell;
      const barcode = String(it.barcode || '').replace(/\s/g, '').trim() || null;
      if (!barcode) warnings.push(`الباركود ناقص للصنف ${name}`);
      const existing = await findProductForInvoiceImport(shopId, name, barcode);
      const dedupeKey = `${normalizeText(name)}|${String(barcode || '').toLowerCase()}`;
      if (seenImportKeys.has(dedupeKey)) {
        warnings.push(`تكرار محتمل للصنف "${name}" داخل نفس الفاتورة؛ تم دمج الكمية أثناء الحفظ.`);
      } else {
        seenImportKeys.add(dedupeKey);
      }
      if (!existing) {
        row_errors.push({ row: i + 1, reason: `لا يوجد منتج مطابق: ${name}` });
        continue;
      }
      if (hasQr && (!existing.qr_code || !String(existing.qr_code).trim())) {
        warnings.push(`الصنف "${name}": لا يوجد QR مسجّل — أضفه من تعديل المنتج.`);
      }
      if (!existing.barcode || !String(existing.barcode).trim()) {
        warnings.push(`الصنف "${name}": لا يوجد باركود مسجّل — أضفه من تعديل المنتج إن لزم.`);
      }
      const extras = pickInvoiceLineExtras(it);
      if (!extras.expiryIso) warnings.push(`تاريخ الصلاحية غير موجود للصنف ${name}`);
      if ((extras.taxPercent == null || extras.taxPercent === 0) && (extras.taxAmount == null || extras.taxAmount === 0)) {
        warnings.push(`الضريبة غير محددة للصنف ${name}`);
      }
      matchedLines.push({
        product_id: existing.id,
        quantity: qty,
        cost_price: buyPrice,
        sell_price: sellLine,
        expiry_iso: extras.expiryIso,
        tax_percent: extras.taxPercent,
        tax_amount: extras.taxAmount,
        barcode_from_invoice: barcode,
      });
    }
    if (matchedLines.length === 0) {
      return { inserted: 0, updated: 0, failedCount: row_errors.length, row_errors, warnings, purchase_invoice_id: null };
    }
    await ensurePurchaseTables();
    const total = matchedLines.reduce((s, l) => s + l.quantity * l.cost_price, 0);
    const conn = await pool.getConnection();
    let purchase_invoice_id: number | null = null;
    try {
      await conn.beginTransaction();
      const [r] = await conn.execute(
        'INSERT INTO purchase_invoices (shop_id, supplier_id, order_id, branch_id, total_amount, status) VALUES (?, ?, ?, ?, ?, ?)',
        [shopId, supplierId, null, branchId, total, 'paid']
      );
      const invoiceId = (r as any).insertId;
      purchase_invoice_id = invoiceId;
      const hasPiExp = await hasColumn('purchase_items', 'expiry_date');
      const hasPiTp = await hasColumn('purchase_items', 'tax_percent');
      const hasPiTa = await hasColumn('purchase_items', 'tax_amount');
      const hasProdTaxRateId = await hasColumn('products', 'tax_rate_id');
      for (const line of matchedLines) {
        const q = line.quantity;
        const cost = line.cost_price;
        if (q <= 0) continue;
        const lineTotal = q * cost;
        const cols = ['purchase_invoice_id', 'product_id', 'quantity', 'unit_price', 'total_price'];
        const vals: any[] = [invoiceId, line.product_id, q, cost, lineTotal];
        if (hasPiExp) {
          cols.push('expiry_date');
          vals.push(line.expiry_iso || null);
        }
        if (hasPiTp) {
          cols.push('tax_percent');
          vals.push(line.tax_percent);
        }
        if (hasPiTa) {
          cols.push('tax_amount');
          vals.push(line.tax_amount);
        }
        await conn.execute(
          `INSERT INTO purchase_items (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          vals
        );
        await conn.execute(
          'UPDATE products SET stock_quantity = stock_quantity + ?, buy_price = ?, sell_price = CASE WHEN ? > 0 THEN ? ELSE sell_price END WHERE id = ? AND shop_id = ?',
          [q, cost, line.sell_price, line.sell_price, line.product_id, shopId]
        );
        if (line.barcode_from_invoice) {
          await conn.execute('UPDATE products SET barcode = ? WHERE id = ? AND shop_id = ?', [
            line.barcode_from_invoice,
            line.product_id,
            shopId,
          ]);
          await syncProductBarcode(line.product_id, line.barcode_from_invoice, shopId);
        }
        await mergeProductExpiryFromImportConn(conn, shopId, line.product_id, line.expiry_iso);
        if (hasProdTaxRateId && (line.tax_percent != null || line.tax_amount != null)) {
          const tid = await ensureShopVat14TaxRateId(shopId);
          if (tid) {
            await conn.execute('UPDATE products SET tax_rate_id = ? WHERE id = ? AND shop_id = ?', [
              tid,
              line.product_id,
              shopId,
            ]);
          }
        }
        if (branchId != null) {
          await ensureBranchInventoryTable();
          await conn.execute(
            `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + ?, updated_at = NOW()`,
            [shopId, branchId, line.product_id, q, q]
          );
          if (await hasTable('stock_movements')) {
            await conn.execute(
              'INSERT INTO stock_movements (shop_id, product_id, branch_id, type, quantity, reference) VALUES (?, ?, ?, ?, ?, ?)',
              [shopId, line.product_id, branchId, 'IN', q, `purchase_invoice:${invoiceId}`]
            );
          }
        }
        if (await hasTable('inventory_movements')) {
          await conn.execute(
            'INSERT INTO inventory_movements (shop_id, product_id, type, quantity, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
            [shopId, line.product_id, 'purchase', q, 'purchase_invoice', invoiceId]
          );
        }
      }
      const hasSuppliers = await hasTable('suppliers');
      if (hasSuppliers && supplierId) {
        await conn.execute('UPDATE suppliers SET balance = balance + ? WHERE id = ? AND shop_id = ?', [total, supplierId, shopId]);
      }
      const hasJournal = await hasTable('journal_entries');
      if (hasJournal && total > 0) {
        const accts = await ensureDefaultAccounts(conn, shopId);
        const invId = accts.get('1500') || accts.get('1000');
        const apId = accts.get('2000');
        const today = new Date().toISOString().slice(0, 10);
        const ref = `PI-${invoiceId}`;
        const desc = `Purchase invoice #${invoiceId} (import)`;
        const hasDateCol = await hasColumn('journal_entries', 'date');
        const dateCol = hasDateCol ? 'date' : 'entry_date';
        await conn.execute(
          `INSERT INTO journal_entries (shop_id, ${dateCol}, reference, description) VALUES (?, ?, ?, ?)`,
          [shopId, today, ref, desc]
        );
        const [jeR] = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const jeId = (jeR as any[])[0]?.id;
        if (jeId && invId) {
          await conn.execute('INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)', [jeId, invId, total]);
        }
        if (jeId && apId) {
          await conn.execute('INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)', [jeId, apId, total]);
        }
      }
      await conn.commit();
      updated = matchedLines.length;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    return {
      inserted: 0,
      updated,
      failedCount: row_errors.length,
      row_errors,
      warnings,
      purchase_invoice_id,
    };
  }

  const hasGalleryCol = await hasColumn('products', 'gallery_urls_json');
  const hasCartonCol = await hasColumn('products', 'carton_packs_count');
  const hasExpiryCol = await hasColumn('products', 'expiry_date');
  const hasProdTaxRateIdCol = await hasColumn('products', 'tax_rate_id');

  for (let i = 0; i < items.length; i++) {
    const it = items[i] || {};
    const name = String(it.itemName || it.name || '').trim();
    if (!name) {
      row_errors.push({ row: i + 1, reason: 'Item name required' });
      continue;
    }
    const qty = Math.max(0, Math.floor(Number(it.qty) || 0));
    if (qty <= 0) {
      row_errors.push({ row: i + 1, reason: 'Invalid quantity' });
      continue;
    }
    const poPrices = normalizeBuySellForPoLine(it.buyPrice != null ? Number(it.buyPrice) : 0, it.sellPrice != null ? Number(it.sellPrice) : 0);
    const buyPrice = poPrices.buy;
    const sellPrice =
      poPrices.sell > 0 ? poPrices.sell : buyPrice > 0 ? Number((buyPrice * 1.2).toFixed(2)) : 0;
    const barcode = String(it.barcode || '').replace(/\s/g, '').trim() || null;
    const extras = pickInvoiceLineExtras(it);
      if (!barcode) warnings.push(`الباركود ناقص للصنف ${name}`);
      if (!extras.expiryIso) warnings.push(`تاريخ الصلاحية غير موجود للصنف ${name}`);
      if ((extras.taxPercent == null || extras.taxPercent === 0) && (extras.taxAmount == null || extras.taxAmount === 0)) {
        warnings.push(`الضريبة غير محددة للصنف ${name}`);
      }
      const dedupeKey = `${normalizeText(name)}|${String(barcode || '').toLowerCase()}`;
      if (seenImportKeys.has(dedupeKey)) {
        warnings.push(`تكرار محتمل للصنف "${name}" داخل نفس الفاتورة؛ تم دمج الكمية أثناء الحفظ.`);
      } else {
        seenImportKeys.add(dedupeKey);
      }

    const existing = await findProductForInvoiceImport(shopId, name, barcode);
    if (existing) {
      if (hasQr && (!existing.qr_code || !String(existing.qr_code).trim())) {
        warnings.push(`الصنف "${name}": لا يوجد QR مسجّل — أضفه من تعديل المنتج.`);
      }
      if (!existing.barcode || !String(existing.barcode).trim()) {
        warnings.push(`الصنف "${name}": لا يوجد باركود مسجّل — أضفه من تعديل المنتج إن لزم.`);
      }
    }

    try {
      if (existing) {
        if (useBranch) {
          await ensureBranchInventoryTable();
          await pool.execute(
            `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + ?, updated_at = NOW()`,
            [shopId, branchId, existing.id, qty, qty]
          );
          await pool.execute(
            `UPDATE products p SET p.stock_quantity = (
              SELECT COALESCE(SUM(bi.quantity), 0) FROM branch_inventory bi WHERE bi.shop_id = p.shop_id AND bi.product_id = p.id
            ), p.buy_price = CASE WHEN ? > 0 THEN ? ELSE p.buy_price END, p.sell_price = CASE WHEN ? > 0 THEN ? ELSE p.sell_price END
            WHERE p.id = ? AND p.shop_id = ?`,
            [buyPrice, buyPrice, sellPrice, sellPrice, existing.id, shopId]
          );
        } else {
          await pool.execute(
            `UPDATE products SET stock_quantity = stock_quantity + ?, buy_price = CASE WHEN ? > 0 THEN ? ELSE buy_price END, sell_price = CASE WHEN ? > 0 THEN ? ELSE sell_price END WHERE id = ? AND shop_id = ?`,
            [qty, buyPrice, buyPrice, sellPrice, sellPrice, existing.id, shopId]
          );
        }
        if (barcode) await syncProductBarcode(existing.id, barcode, shopId);
        await mergeProductExpiryFromImport(shopId, existing.id, extras.expiryIso);
        if (hasProdTaxRateIdCol && (extras.taxPercent != null || extras.taxAmount != null)) {
          const tid = await ensureShopVat14TaxRateId(shopId);
          if (tid) {
            await pool.execute('UPDATE products SET tax_rate_id = ? WHERE id = ? AND shop_id = ?', [
              tid,
              existing.id,
              shopId,
            ]);
          }
        }
        updated += 1;
      } else {
        let insertCols = 'name_en, name_ar, sku, barcode, buy_price, sell_price, stock_quantity, min_stock_level, shop_id, is_incomplete';
        const insertParams: any[] = [name, name, barcode || null, barcode || null, buyPrice, sellPrice, qty, 5, shopId, 0];
        if (hasGalleryCol) {
          insertCols += ', gallery_urls_json';
          insertParams.push(null);
        }
        if (hasCartonCol) {
          insertCols += ', carton_packs_count, pack_units_count';
          insertParams.push(null, null);
        }
        if (hasExpiryCol && extras.expiryIso) {
          insertCols += ', expiry_date';
          insertParams.push(extras.expiryIso);
        }
        if (hasProdTaxRateIdCol && (extras.taxPercent != null || extras.taxAmount != null)) {
          const tid = await ensureShopVat14TaxRateId(shopId);
          if (tid) {
            insertCols += ', tax_rate_id';
            insertParams.push(tid);
          }
        }
        const [result] = await pool.execute(
          `INSERT INTO products (${insertCols}) VALUES (${insertParams.map(() => '?').join(', ')})`,
          insertParams
        );
        const productId = (result as any).insertId;
        if (barcode) await syncProductBarcode(productId, barcode, shopId);
        if (useBranch && branchId) {
          await ensureBranchInventoryTable();
          await pool.execute(
            `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + ?, updated_at = NOW()`,
            [shopId, branchId, productId, qty, qty]
          );
          await pool.execute(
            `UPDATE products p SET p.stock_quantity = (
              SELECT COALESCE(SUM(bi.quantity), 0) FROM branch_inventory bi WHERE bi.shop_id = p.shop_id AND bi.product_id = p.id
            ) WHERE p.id = ? AND p.shop_id = ?`,
            [productId, shopId]
          );
        }
        warnings.push(`تم إنشاء منتج جديد "${name}" — راجع الباركود/QR من تعديل المنتج.`);
        inserted += 1;
      }
    } catch (err: any) {
      row_errors.push({ row: i + 1, reason: err?.message || 'Failed to save' });
    }
  }

  return {
    inserted,
    updated,
    failedCount: row_errors.length,
    row_errors,
    warnings,
    purchase_invoice_id: null,
  };
}

app.get('/api/accounting/accounts', authenticateToken, capAccountingRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const hasActive = await hasColumn('accounts', 'is_active');
    const cols = hasActive ? 'id, shop_id, code, name, type, parent_id, is_active, created_at' : 'id, shop_id, code, name, type, parent_id, created_at';
    const [rows] = await pool.execute(
      `SELECT ${cols} FROM accounts WHERE shop_id = ? ORDER BY code`,
      [Number(shopId)]
    );
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/accounting/accounts', authenticateToken, capAccountingWrite, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const { code, name, type, parent_id } = req.body;
    if (!code || !name || !type) return res.status(400).json({ error: 'code, name, type required' });
    const [result] = await pool.execute(
      'INSERT INTO accounts (shop_id, code, name, type, parent_id) VALUES (?, ?, ?, ?, ?)',
      [shopId, String(code).trim(), String(name).trim(), type, parent_id || null]
    );
    res.status(201).json({ id: (result as any).insertId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/accounting/journal-entries', authenticateToken, capAccountingRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensureAccountingTables();
    const dateCol = (await hasColumn('journal_entries', 'date')) ? 'date' : 'entry_date';
    const from = String(req.query?.from || '').trim();
    const to = String(req.query?.to || '').trim();
    let sql = `SELECT id, shop_id, ${dateCol} as date, reference, description,
         COALESCE(source_type, '') as source_type,
         COALESCE(source_id, 0) as source_id,
         created_at FROM journal_entries WHERE shop_id = ?`;
    const params: (number | string)[] = [Number(shopId)];
    if (from && to) {
      sql += ` AND ${dateCol} BETWEEN ? AND ?`;
      params.push(from, to);
    }
    sql += ` ORDER BY ${dateCol} DESC, id DESC LIMIT 500`;
    const [rows] = await pool.execute(sql, params);
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/accounting/ledger', authenticateToken, capAccountingRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';
    let sql = `SELECT je.id, je.date, je.reference, je.description, a.code, a.name as account_name, jl.debit, jl.credit
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN accounts a ON a.id = jl.account_id
      WHERE je.shop_id = ?`;
    const params: any[] = [shopId];
    if (from && to) {
      sql += ' AND je.date BETWEEN ? AND ?';
      params.push(from, to);
    }
    sql += ' ORDER BY je.date, je.id, jl.id';
    const [rows] = await pool.execute(sql, params);
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/accounting/trial-balance', authenticateToken, capAccountingRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const asOf = (req.query.as_of as string) || new Date().toISOString().slice(0, 10);
    const [rows] = await pool.execute(
      `SELECT a.id, a.code, a.name, a.type,
        COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) as balance,
        SUM(jl.debit) as total_debit, SUM(jl.credit) as total_credit
       FROM accounts a
       LEFT JOIN journal_lines jl ON jl.account_id = a.id
       LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.date <= ?
       WHERE a.shop_id = ? AND a.is_active = 1
       GROUP BY a.id, a.code, a.name, a.type
       HAVING balance <> 0
       ORDER BY a.code`,
      [asOf, shopId]
    );
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/accounting/profit-loss', authenticateToken, capAccountingRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';
    const [revenue] = await pool.execute(
      `SELECT COALESCE(SUM(jl.credit) - SUM(jl.debit), 0) as total FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       JOIN accounts a ON a.id = jl.account_id AND a.type = 'revenue'
       WHERE je.shop_id = ? AND je.date BETWEEN ? AND ?`,
      [shopId, from || '1970-01-01', to || '9999-12-31']
    );
    const [expense] = await pool.execute(
      `SELECT COALESCE(SUM(jl.debit) - SUM(jl.credit), 0) as total FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       JOIN accounts a ON a.id = jl.account_id AND a.type = 'expense'
       WHERE je.shop_id = ? AND je.date BETWEEN ? AND ?`,
      [shopId, from || '1970-01-01', to || '9999-12-31']
    );
    const rev = (revenue as any[])[0]?.total ?? 0;
    const exp = (expense as any[])[0]?.total ?? 0;
    res.json({ revenue: rev, expenses: exp, profit: rev - exp, from, to });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/accounting/balance-sheet', authenticateToken, capAccountingRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const asOf = (req.query.as_of as string) || new Date().toISOString().slice(0, 10);
    const [rows] = await pool.execute(
      `SELECT a.type, a.code, a.name, COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) as balance
       FROM accounts a
       LEFT JOIN journal_lines jl ON jl.account_id = a.id
       LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.date <= ?
       WHERE a.shop_id = ? AND a.is_active = 1
       GROUP BY a.id, a.type, a.code, a.name
       HAVING balance <> 0
       ORDER BY a.type, a.code`,
      [asOf, shopId]
    );
    res.json({ asOf, items: rows || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- Admin accounting (mirror of /api/accounting for admin UI) ----------
app.get('/api/admin/accounts', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensureAccountingTables();
    const hasActive = await hasColumn('accounts', 'is_active');
    const cols = hasActive ? 'id, shop_id, code, name, type, parent_id, is_active, created_at' : 'id, shop_id, code, name, type, parent_id, created_at';
    const [rows] = await pool.execute(
      `SELECT ${cols} FROM accounts WHERE shop_id = ? ORDER BY code`,
      [Number(shopId)]
    );
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/accounts', authenticateToken, requireRole('super_admin', 'shop_owner', 'hr_manager'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensureAccountingTables();
    const { code, name, type, parent_id } = req.body;
    if (!code || !name || !type) return res.status(400).json({ error: 'code, name, type required' });
    const [result] = await pool.execute(
      'INSERT INTO accounts (shop_id, code, name, type, parent_id) VALUES (?, ?, ?, ?, ?)',
      [Number(shopId), String(code).trim(), String(name).trim(), String(type).trim(), parent_id != null ? Number(parent_id) : null]
    );
    res.status(201).json({ id: (result as any).insertId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/journal', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensureAccountingTables();
    await ensureJournalColumns();
    const dateCol = (await hasColumn('journal_entries', 'date')) ? 'date' : 'entry_date';
    const from = String(req.query?.from || '').trim();
    const to = String(req.query?.to || '').trim();
    let sql = `SELECT je.id, je.shop_id, je.${dateCol} as date, je.reference, je.description,
         COALESCE(je.source_type, '') as source_type,
         COALESCE(je.source_id, 0) as source_id,
         je.created_at,
         (SELECT COALESCE(SUM(COALESCE(jl.debit, 0)), 0) FROM journal_lines jl WHERE jl.journal_entry_id = je.id) AS total_debit,
         (SELECT COALESCE(SUM(COALESCE(jl.credit, 0)), 0) FROM journal_lines jl WHERE jl.journal_entry_id = je.id) AS total_credit
       FROM journal_entries je WHERE je.shop_id = ?`;
    const params: (number | string)[] = [Number(shopId)];
    if (from && to) {
      sql += ` AND ${dateCol} BETWEEN ? AND ?`;
      params.push(from, to);
    }
    sql += ` ORDER BY ${dateCol} DESC, id DESC LIMIT 500`;
    const [rows] = await pool.execute(sql, params);
    const list = (rows as any[]).map((r) => ({
      ...r,
      total_debit: r.total_debit != null ? Number(r.total_debit) : 0,
      total_credit: r.total_credit != null ? Number(r.total_credit) : 0,
    }));
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** GET single journal entry by id + shop_id only. Return 404 only when no row found. */
app.get('/api/admin/journal/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const rawId = String(req.params?.id ?? '').trim();
    const id = parseInt(rawId.replace(/[^\d]/g, '') || '0', 10) || parseInt(rawId, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'Invalid id' });
    await ensureAccountingTables();
    await ensureJournalColumns();
    const dateCol = (await hasColumn('journal_entries', 'date')) ? 'date' : 'entry_date';
    const [jeRows] = await pool.execute(
      `SELECT id, shop_id, ${dateCol} as date, reference, description, source_type, source_id, created_at
       FROM journal_entries WHERE id = ? AND shop_id = ?`,
      [id, shopId]
    );
    if ((jeRows as any[]).length === 0) return res.status(404).json({ error: 'Journal entry not found' });
    const [lineRows] = await pool.execute(
      `SELECT account_id,
              COALESCE(debit, 0) AS debit,
              COALESCE(credit, 0) AS credit
       FROM journal_lines WHERE journal_entry_id = ? ORDER BY id ASC`,
      [id]
    );
    const lines = (lineRows as any[]).map((l) => ({
      account_id: Number(l.account_id),
      debit: Number(l.debit ?? 0),
      credit: Number(l.credit ?? 0),
    }));
    res.json({ entry: (jeRows as any[])[0], lines });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/journal/:id', authenticateToken, requireRole('super_admin', 'shop_owner', 'hr_manager'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { date, description, lines } = req.body || {};
    if (!date || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'date and lines (array of { account_id, debit, credit }) required' });
    }
    await ensureAccountingTables();
    await ensureJournalColumns();
    const dateCol = (await hasColumn('journal_entries', 'date')) ? 'date' : 'entry_date';
    const [exist] = await pool.execute(
      'SELECT id, source_type FROM journal_entries WHERE id = ? AND shop_id = ?',
      [id, shopId]
    );
    if ((exist as any[]).length === 0) return res.status(404).json({ error: 'Journal entry not found' });
    const src = String((exist as any[])[0]?.source_type || '').trim();
    if (src && src !== 'manual') {
      return res.status(403).json({ error: 'Only manually created entries can be edited' });
    }
    const normalized: { accountId: number; debit: number; credit: number }[] = [];
    for (const line of lines) {
      const accountId = Number(line.account_id);
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      if (!accountId || (!debit && !credit)) continue;
      normalized.push({ accountId, debit, credit });
    }
    if (normalized.length === 0) {
      return res.status(400).json({ error: 'At least one line with account and debit or credit required' });
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(`UPDATE journal_entries SET ${dateCol} = ?, description = ?, reference = NULL WHERE id = ? AND shop_id = ?`, [
        String(date).slice(0, 10),
        String(description || '').trim(),
        id,
        shopId,
      ]);
      await conn.execute('DELETE FROM journal_lines WHERE journal_entry_id = ?', [id]);
      for (const { accountId, debit, credit } of normalized) {
        await conn.execute(
          'INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)',
          [id, accountId, debit, credit]
        );
      }
      await conn.commit();
      res.json({ ok: true, id });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Journal update failed' });
  }
});

app.post('/api/admin/journal', authenticateToken, requireRole('super_admin', 'shop_owner', 'hr_manager'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    await ensureAccountingTables();
    const { date, description, lines, source_type, source_id } = req.body;
    if (!date || !Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'date and lines (array of { account_id, debit, credit }) required' });
    const normalized: { accountId: number; debit: number; credit: number }[] = [];
    for (const line of lines) {
      const accountId = Number(line.account_id);
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      if (!accountId || (!debit && !credit)) continue;
      normalized.push({ accountId, debit, credit });
    }
    if (normalized.length === 0) {
      return res.status(400).json({ error: 'At least one line with account and debit or credit required' });
    }
    const dateCol = (await hasColumn('journal_entries', 'date')) ? 'date' : 'entry_date';
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.execute(
        `INSERT INTO journal_entries (shop_id, ${dateCol}, reference, description, source_type, source_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [Number(shopId), String(date).slice(0, 10), null, String(description || '').trim(), source_type ?? null, source_id ?? null]
      );
      const entryId = (ins as any).insertId;
      if (!entryId) throw new Error('Failed to create journal entry');
      for (const { accountId, debit, credit } of normalized) {
        await conn.execute(
          'INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)',
          [entryId, accountId, debit, credit]
        );
      }
      await conn.commit();
      res.status(201).json({ id: entryId });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Journal create failed' });
  }
});

app.get('/api/admin/reports/balance-sheet', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('reports:balance-sheet', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(reportsCache, cacheKey);
    if (cached !== null) return res.json(cached);
    await ensureAccountingTables();
    const asOf = String(req.query?.as_of || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const dateCol = (await hasColumn('journal_entries', 'date')) ? 'date' : 'entry_date';
    const hasActive = await hasColumn('accounts', 'is_active');
    const whereActive = hasActive ? ' AND a.is_active = 1' : '';
    const [rows] = await pool.execute(
      `SELECT a.type, a.code, a.name, COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) as balance
       FROM accounts a
       LEFT JOIN journal_lines jl ON jl.account_id = a.id
       LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.${dateCol} <= ?
       WHERE a.shop_id = ?${whereActive}
       GROUP BY a.id, a.type, a.code, a.name
       HAVING balance <> 0
       ORDER BY a.type, a.code`,
      [asOf, Number(shopId)]
    );
    const payload = { asOf, items: rows || [] };
    setCachedPayload(reportsCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Balance sheet failed' });
  }
});

app.get('/api/admin/reports/profit-loss', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('reports:profit-loss', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(reportsCache, cacheKey);
    if (cached !== null) return res.json(cached);
    await ensureAccountingTables();
    const dateCol = (await hasColumn('journal_entries', 'date')) ? 'date' : 'entry_date';
    const from = String(req.query?.from || '1970-01-01').slice(0, 10);
    const to = String(req.query?.to || '9999-12-31').slice(0, 10);
    const [revenue] = await pool.execute(
      `SELECT COALESCE(SUM(jl.credit) - SUM(jl.debit), 0) as total FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       JOIN accounts a ON a.id = jl.account_id AND a.type = 'revenue'
       WHERE je.shop_id = ? AND je.${dateCol} BETWEEN ? AND ?`,
      [Number(shopId), from, to]
    );
    const [expense] = await pool.execute(
      `SELECT COALESCE(SUM(jl.debit) - SUM(jl.credit), 0) as total FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.journal_entry_id
       JOIN accounts a ON a.id = jl.account_id AND a.type = 'expense'
       WHERE je.shop_id = ? AND je.${dateCol} BETWEEN ? AND ?`,
      [Number(shopId), from, to]
    );
    const rev = (revenue as any[])[0]?.total ?? 0;
    const exp = (expense as any[])[0]?.total ?? 0;
    const payload = { revenue: rev, expenses: exp, profit: rev - exp, from, to };
    setCachedPayload(reportsCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Profit & loss failed' });
  }
});

app.get('/api/products/:id/barcodes', authenticateToken, capInventoryWrite, async (req: any, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (!productId) return res.status(400).json({ error: 'Invalid product id' });
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const hasShopId = await hasColumn('product_barcodes', 'shop_id');
    const hasUnitId = await hasColumn('product_barcodes', 'unit_id');
    const cols = hasUnitId ? 'id, barcode_value, unit_id, is_active' : 'id, barcode_value';
    const [rows] = hasShopId
      ? await pool.execute(`SELECT ${cols} FROM product_barcodes pb WHERE pb.product_id = ? AND pb.shop_id = ?`, [productId, shopId])
      : await pool.execute(`SELECT ${cols} FROM product_barcodes pb JOIN products p ON p.id = pb.product_id WHERE pb.product_id = ? AND p.shop_id = ?`, [productId, shopId]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products/:id/barcodes', authenticateToken, capInventoryWrite, async (req: any, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (!productId) return res.status(400).json({ error: 'Invalid product id' });
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const { barcodeValue, unitId } = req.body;
    const val = String(barcodeValue || '').trim();
    if (!val) return res.status(400).json({ error: 'barcodeValue is required' });
    const [prod] = await pool.execute('SELECT id FROM products WHERE id = ? AND shop_id = ?', [productId, shopId]);
    if ((prod as any[]).length === 0) return res.status(404).json({ error: 'Product not found' });
    const hasShopId = await hasColumn('product_barcodes', 'shop_id');
    const hasUnitId = await hasColumn('product_barcodes', 'unit_id');
    if (hasShopId && hasUnitId) {
      await pool.execute(
        'INSERT INTO product_barcodes (product_id, barcode_value, shop_id, unit_id, is_active) VALUES (?, ?, ?, ?, 1)',
        [productId, val, shopId, unitId ?? null]
      );
    } else if (hasShopId) {
      await pool.execute(
        'INSERT INTO product_barcodes (product_id, barcode_value, shop_id) VALUES (?, ?, ?)',
        [productId, val, shopId]
      );
    } else {
      await pool.execute('INSERT INTO product_barcodes (product_id, barcode_value) VALUES (?, ?)', [productId, val]);
    }
    res.status(201).json({ success: true });
  } catch (e: any) {
    if (e?.code?.includes?.('ER_DUP')) return res.status(400).json({ error: 'Barcode already exists for this shop' });
    res.status(500).json({ error: e?.message || 'Failed to add barcode' });
  }
});

app.delete('/api/products/:id/barcodes/:barcodeValue', authenticateToken, requireRole('super_admin', 'shop_owner', 'warehouse'), async (req: any, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const barcodeValue = String(req.params.barcodeValue || '').trim();
    if (!productId || !barcodeValue) return res.status(400).json({ error: 'Invalid id or barcode' });
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const hasShopId = await hasColumn('product_barcodes', 'shop_id');
    if (hasShopId) {
      const [r] = await pool.execute('DELETE FROM product_barcodes WHERE product_id = ? AND barcode_value = ? AND shop_id = ?', [productId, barcodeValue, shopId]);
      if ((r as any).affectedRows === 0) return res.status(404).json({ error: 'Barcode not found' });
    } else {
      const [r] = await pool.execute('DELETE FROM product_barcodes WHERE product_id = ? AND barcode_value = ?', [productId, barcodeValue]);
      if ((r as any).affectedRows === 0) return res.status(404).json({ error: 'Barcode not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

app.post('/api/uploads/product-image', authenticateToken, requireRole('super_admin', 'shop_owner', 'warehouse'), (req: any, res: Response) => {
  const shopId = getShopIdOrFail(req, res);
  if (shopId === null) return;

  const bucketName = process.env.GCS_PRODUCT_IMAGES_BUCKET || process.env.CLOUD_STORAGE_BUCKET;
  if (!bucketName) {
    return res.status(503).json({ ok: false, error: 'Image upload not configured. Set GCS_PRODUCT_IMAGES_BUCKET.' });
  }

  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ ok: false, error: 'Content-Type must be multipart/form-data' });
  }

  const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_IMAGE_SIZE } });
  let fileBuffer: Buffer | null = null;
  let fileMime = '';
  let fileName = '';

  busboy.on('file', (fieldName: string, file: NodeJS.ReadableStream, info: { filename?: string; mimeType?: string }) => {
    if (fieldName !== 'file' && fieldName !== 'image') {
      file.resume();
      return;
    }
    const chunks: Buffer[] = [];
    file.on('data', (chunk: Buffer) => chunks.push(chunk));
    file.on('end', () => {
      fileBuffer = Buffer.concat(chunks);
      fileMime = info.mimeType || 'image/jpeg';
      fileName = info.filename || 'image.jpg';
    });
  });

  busboy.on('finish', async () => {
    try {
      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(400).json({ ok: false, error: 'No file received. Send field "file" or "image".' });
      }
      if (fileBuffer.length > MAX_IMAGE_SIZE) {
        return res.status(400).json({ ok: false, error: 'File too large. Max 5 MB.' });
      }
      if (!ALLOWED_IMAGE_TYPES.includes(fileMime)) {
        return res.status(400).json({ ok: false, error: 'Invalid file type. Use JPG, PNG, or WebP.' });
      }

      const ext = fileName.toLowerCase().endsWith('.png') ? 'png' : fileName.toLowerCase().endsWith('.webp') ? 'webp' : 'jpg';
      const objectName = `products/${shopId}/${crypto.randomUUID()}.${ext}`;

      const storage = new Storage();
      const bucket = storage.bucket(bucketName);
      const blob = bucket.file(objectName);

      await blob.save(fileBuffer, {
        contentType: fileMime,
        metadata: { cacheControl: 'public, max-age=31536000' },
      });
      await blob.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
      res.json({ ok: true, url: publicUrl });
    } catch (err: any) {
      console.error('[UPLOAD] product-image error:', err);
      res.status(500).json({ ok: false, error: err?.message || 'Upload failed' });
    }
  });

  busboy.on('error', (err: Error) => {
    res.status(400).json({ ok: false, error: err.message });
  });

  req.pipe(busboy);
});

const handleProductsImportUpload = async (
  req: any,
  res: Response,
  opts?: { forceImportMode?: boolean }
) => {
  try {
    const rawModeFromQuery = String((req as any)?.query?.mode || '').trim();
    const queryModeRaw = opts?.forceImportMode ? 'import' : rawModeFromQuery;
    const modeFromQuery = queryModeRaw.toLowerCase() === 'analyze' ? 'analyze' : 'import';
    console.log('[EXCEL] Import upload received, mode:', modeFromQuery, 'query:', { mode: req.query?.mode, sheet: req.query?.sheet, headerRow: req.query?.headerRow });

    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    // Supports a PowerQuery-like flow:
    // - GET/POST ?mode=analyze : read headers + guess mapping + validate (no DB writes)
    // - POST ?mode=import     : import with provided mapping + policies
    const modeLocked = opts?.forceImportMode ? true : Boolean(queryModeRaw);
    let mode: 'analyze' | 'import' = queryModeRaw.toLowerCase() === 'analyze' ? 'analyze' : 'import';

    const limitCheck = await enforceProductLimit(shopId, 0);
    if (!limitCheck.allowed) {
      const remaining = limitCheck.remaining ?? 0;
      if (mode === 'import') {
        return res.status(403).json({
          message: `الحد الأقصى للمنتجات في باقتك ${limitCheck.maxProducts}. لديك ${limitCheck.existingCount} منتج حالياً ويمكنك إضافة ${remaining} منتج فقط. يرجى الترقية للباقة الفضية أو الذهبية.`,
          code: 'PRODUCT_LIMIT_REACHED',
        });
      }
    }
    const maxProducts = limitCheck.maxProducts ?? null;
    const existingCount = limitCheck.existingCount ?? 0;

    const [existing] = await pool.execute(
      'SELECT id, name_en, name_ar, sku, barcode, qr_code FROM products WHERE shop_id = ?',
      [shopId]
    );
    const existingProducts = existing as any[];
    const skuSet = new Set(existingProducts.map((p) => normalizeText(p.sku)).filter(Boolean));
    const barcodeSet = new Set(existingProducts.map((p) => normalizeText(p.barcode)).filter(Boolean));
    const qrSet = new Set(existingProducts.map((p) => normalizeText(p.qr_code)).filter(Boolean));
    const nameSet = new Set(
      existingProducts
        .flatMap((p) => [normalizeText(p.name_en), normalizeText(p.name_ar)])
        .filter(Boolean)
    );

    const [categories] = await pool.execute(
      'SELECT id, name_en, name_ar FROM categories WHERE shop_id = ? OR shop_id IS NULL',
      [shopId]
    );
    const categoryRows = categories as any[];
    const categoryMap = new Map<string, number>();
    categoryRows.forEach((cat) => {
      categoryMap.set(normalizeText(cat.name_en), cat.id);
      categoryMap.set(normalizeText(cat.name_ar), cat.id);
    });

    const profile: any = {
      totalRows: 0,
      columns: {},
    };
    const skipped: Array<{ row: number; reason: string }> = [];
    const rowErrors: Array<{ row: number; reason: string }> = [];
    const warnings: string[] = [];
    let importedCount = 0;
    let updatedCount = 0;
    let draftCountTotal = 0;
    let currentImportBatchId: number | null = null;
    let hasImportBatchCol = false;
    const allowedImportFields = new Set(Object.keys(fieldMatchers));
    const englishToInternal: Record<string, string> = {
      ProductName: 'name',
      ProductNameAR: 'nameAr',
      SellPrice: 'sellPrice',
      BuyPrice: 'buyPrice',
      Stock: 'stockQuantity',
      SKU: 'sku',
      Barcode: 'barcode',
      QR: 'qrCode',
      Brand: 'brand',
      Category: 'category',
      ImageURL: 'imageUrl',
      MinStock: 'minStockLevel',
      CartonPacksCount: 'cartonPacksCount',
      PackUnitsCount: 'packUnitsCount',
      PieceBuyPrice: 'pieceBuyPrice',
      PieceSellPrice: 'pieceSellPrice',
      PackBuyPrice: 'packBuyPrice',
      PackSellPrice: 'packSellPrice',
      CartonBuyPrice: 'cartonBuyPrice',
      CartonSellPrice: 'cartonSellPrice',
      DescriptionShort: 'descriptionShort',
      DescriptionLong: 'descriptionLong',
      WarrantyText: 'warrantyText',
      ReturnPolicyText: 'returnPolicyText',
      Specs: 'specs',
      GalleryUrls: 'galleryUrls',
    };
    const internalToEnglish: Record<string, string> = {
      name: 'ProductName',
      nameAr: 'ProductNameAR',
      sellPrice: 'SellPrice',
      buyPrice: 'BuyPrice',
      stockQuantity: 'Stock',
      sku: 'SKU',
      barcode: 'Barcode',
      qrCode: 'QR',
      brand: 'Brand',
      category: 'Category',
      imageUrl: 'ImageURL',
      minStockLevel: 'MinStock',
      cartonPacksCount: 'CartonPacksCount',
      packUnitsCount: 'PackUnitsCount',
      pieceBuyPrice: 'PieceBuyPrice',
      pieceSellPrice: 'PieceSellPrice',
      packBuyPrice: 'PackBuyPrice',
      packSellPrice: 'PackSellPrice',
      cartonBuyPrice: 'CartonBuyPrice',
      cartonSellPrice: 'CartonSellPrice',
      descriptionShort: 'DescriptionShort',
      descriptionLong: 'DescriptionLong',
      warrantyText: 'WarrantyText',
      returnPolicyText: 'ReturnPolicyText',
      specs: 'Specs',
      galleryUrls: 'GalleryUrls',
    };

    type MissingPricePolicy = 'skip' | 'default' | 'zero';
    let missingPricePolicy: MissingPricePolicy = 'skip';
    let defaultSellPrice: number | null = null;
    let clientColumnMap: Record<string, string> | null = null;
    let mappingValidation: ImportMappingValidation = { ok: true, missingFields: [] };
    let analyzeError: string | null = null;
    const samples: Record<string, string[]> = {};
    const analysis = {
      validRows: 0,
      readyRows: 0,
      emptyNameCount: 0,
      emptyPriceCount: 0,
      duplicateSkuCount: 0,
      duplicateBarcodeCount: 0,
      duplicateNameCount: 0,
      productLimitReachedCount: 0,
    };
    const issueSamples: Record<string, Array<{ row: number; value?: string }>> = {
      emptyNameRows: [],
      emptyPriceRows: [],
    };

    const safeParseClientColumnMap = (raw: string) => {
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        const out: Record<string, string> = {};
        Object.entries(parsed).forEach(([key, value]) => {
          const k = String(key || '').trim();
          let f = String(value || '').trim();
          if (!k || !f) return;
          if (f.startsWith('custom:') || f.startsWith('custom_')) {
            out[k] = f.startsWith('custom:') ? `custom_${f.slice(7)}` : f;
            return;
          }
          const internal = englishToInternal[f] || f;
          if (allowedImportFields.has(internal)) {
            out[k] = internal;
            return;
          }
          out[k] = f.startsWith('custom_') ? f : `custom_${f}`;
        });
        return out;
      } catch {
        return null;
      }
    };

    const updateProfile = (headers: string[], row: Record<string, any>) => {
      profile.totalRows += 1;
      headers.forEach((header) => {
        if (!profile.columns[header]) {
          profile.columns[header] = {
            emptyCount: 0,
            nonEmptyCount: 0,
            numericCount: 0,
            textCount: 0,
            duplicateCount: 0,
            uniqueCount: 0,
            uniqueValues: new Map<string, number>(),
          };
        }
        const cell = row[header];
        const cellText = cell === null || cell === undefined ? '' : String(cell).trim();
        const meta = profile.columns[header];
        if (!cellText) {
          meta.emptyCount += 1;
          return;
        }
        meta.nonEmptyCount += 1;
        const numeric = normalizeNumber(cellText);
        if (numeric !== null) meta.numericCount += 1;
        else meta.textCount += 1;

        const normalized = cellText.toLowerCase();
        if (meta.uniqueValues.has(normalized)) {
          meta.uniqueValues.set(normalized, (meta.uniqueValues.get(normalized) || 0) + 1);
          meta.duplicateCount += 1;
        } else if (meta.uniqueValues.size < 2000) {
          meta.uniqueValues.set(normalized, 1);
          meta.uniqueCount += 1;
        }
      });
    };

    const collectSamples = (headers: string[], row: Record<string, any>) => {
      headers.forEach((header) => {
        if (!samples[header]) samples[header] = [];
        if (samples[header].length >= 3) return;
        const cell = row[header];
        const cellText = cell === null || cell === undefined ? '' : String(cell).trim();
        if (!cellText) return;
        samples[header].push(cellText.slice(0, 80));
      });
    };

    const parseSpecs = (raw: string | null | undefined): string | null => {
      if (!raw || !String(raw).trim()) return null;
      const s = String(raw).trim();
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return JSON.stringify(parsed);
        if (typeof parsed === 'object' && parsed !== null) return JSON.stringify(parsed);
      } catch {}
      const lines = s.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
      const pairs: Array<{ key: string; value: string }> = [];
      for (const line of lines) {
        const m = line.match(/^([^:=]+)[:=]\s*(.*)$/);
        if (m) pairs.push({ key: m[1].trim(), value: m[2].trim() });
      }
      return pairs.length > 0 ? JSON.stringify(pairs) : null;
    };

    const mapAndInsert = async (
      row: Record<string, any>,
      headers: string[],
      columnMap: Record<string, string>,
      rowIndex: number
    ) => {
      const isAnalyze = mode === 'analyze';
      const logPrefix = isAnalyze ? `[ANALYZE] Row ${rowIndex}` : `[IMPORT] Row ${rowIndex}`;

      const skipRow = (reason: string) => {
        if (isAnalyze) {
          if (reason === 'Empty row') {
            analysis.emptyNameCount += 1;
          } else if (reason === 'Product limit reached') {
            analysis.productLimitReachedCount += 1;
          }
          return;
        }
        skipped.push({ row: rowIndex, reason });
        console.log(`${logPrefix} skipped: ${reason}`);
      };

      if (maxProducts !== null && existingCount + importedCount + updatedCount >= maxProducts) {
        skipRow('Product limit reached');
        return;
      }

      // LENIENT: Normalize all row keys for flexible lookup (Name, name, الاسم all work)
      const normKey = (k: string) => String(k || '').trim().toLowerCase().replace(/\s+/g, '');
      const normKeyForMatch = (k: string) => normKey(k).replace(/nome/g, 'name');
      const rowNorm: Record<string, any> = {};
      Object.entries(row).forEach(([k, v]) => {
        const n = normKey(k);
        rowNorm[n] = v;
        const n2 = normKeyForMatch(k);
        if (n2 !== n) rowNorm[n2] = v;
      });
      const getRowVal = (header: string) => {
        if (row[header] !== undefined && String(row[header] ?? '').trim() !== '') return row[header];
        const n = normKey(header);
        if (rowNorm[n] !== undefined) return rowNorm[n];
        const n2 = normKeyForMatch(header);
        return rowNorm[n2];
      };

      // columnMap: keys may be EXCEL_HEADER or FIELD. When empty, infer from row keys via fieldMatchers.
      const mapped: any = {};
      if (Object.keys(columnMap).length > 0) {
        Object.entries(columnMap).forEach(([k, v]) => {
          const val = getRowVal(k) ?? getRowVal(v);
          const targetField = allowedImportFields.has(k) ? k : v;
          mapped[targetField] = val;
        });
      } else {
        Object.keys(rowNorm).forEach((rowKey) => {
          const val = rowNorm[rowKey];
          if (val === undefined || val === null || String(val).trim() === '') return;
          const match = Object.keys(fieldMatchers).find((field) =>
            fieldMatchers[field].some((key) => {
              const nKey = normKeyForMatch(key);
              return normKey(rowKey).includes(normKey(key)) || normKey(rowKey).includes(nKey) || nKey.includes(normKey(rowKey));
            })
          );
          if (match && allowedImportFields.has(match)) mapped[match] = val;
        });
      }

      if (rowIndex === 2) {
        console.log('[EXCEL] first raw row keys:', Object.keys(row));
        console.log('[EXCEL] normalized keys sample:', Object.keys(rowNorm).slice(0, 5));
        console.log('[EXCEL] first normalized product:', mapped);
      }

      // LENIENT: keep row if ANY identifier exists (name || nameAr || barcode || sku). No validation blocks import.
      const nameVal = String(mapped.name ?? '').trim();
      const nameArVal = String(mapped.nameAr ?? '').trim();
      const barcodeVal = String(mapped.barcode ?? mapped.qrCode ?? '').trim();
      const skuVal = String(mapped.sku ?? '').trim();
      const hasAnyIdentifier = Boolean(nameVal || nameArVal || barcodeVal || skuVal);
      const allValuesEmpty = Object.values(row).every((v) => v === undefined || v === null || String(v ?? '').trim() === '');
      if (!hasAnyIdentifier && allValuesEmpty) {
        skipRow('Empty row (no name/barcode/sku)');
        return;
      }

      let skuRaw = String(mapped.sku ?? '').trim();
      let barcodeRaw = String(mapped.barcode ?? '').trim();
      const qrRaw = String(mapped.qrCode ?? '').trim();
      const imageUrlRaw = String(mapped.imageUrl ?? '').trim();
      const galleryUrlsRaw = mapped.galleryUrls;
      if (!barcodeRaw && qrRaw) barcodeRaw = qrRaw;
      if (!skuRaw && (barcodeRaw || qrRaw)) skuRaw = barcodeRaw || qrRaw;
      if (!skuRaw && mode === 'import') {
        skuRaw = `IMP-${Date.now()}-${rowIndex}`;
      }

      const isValidUrl = (u: string) => /^https?:\/\/.+/i.test(String(u || '').trim());
      const urlsFromImage = (imageUrlRaw || '').split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      const urlsFromGallery = Array.isArray(galleryUrlsRaw)
        ? (galleryUrlsRaw as string[]).map((u) => String(u || '').trim()).filter(Boolean)
        : typeof galleryUrlsRaw === 'string'
          ? (galleryUrlsRaw as string).split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
          : [];
      const allUrls = [...new Set([...urlsFromImage, ...urlsFromGallery].filter(isValidUrl))];
      const primaryImage = allUrls[0] || (imageUrlRaw && imageUrlRaw.trim()) || null;
      const galleryJson = allUrls.length > 0 ? JSON.stringify(allUrls) : null;

      const nameFromMap = normalizeText(mapped.name || mapped.nameAr);
      const fallbackName =
        nameFromMap ||
        (skuRaw || barcodeRaw ? `Draft ${skuRaw || barcodeRaw}` : `Unnamed Product #${rowIndex}`);
      const nameEn =
        (mapped.name && String(mapped.name).trim())
          ? String(mapped.name).trim()
          : (mapped.nameAr && String(mapped.nameAr).trim())
            ? String(mapped.nameAr).trim()
            : fallbackName;
      const nameAr =
        (mapped.nameAr && String(mapped.nameAr).trim())
          ? String(mapped.nameAr).trim()
          : nameEn;

      const buyPriceRaw = normalizeNumber(mapped.buyPrice ?? mapped.cost);
      const sellPriceRaw = normalizeNumber(mapped.sellPrice ?? mapped.price ?? mapped.sell);
      const hasSell = sellPriceRaw !== null && sellPriceRaw > 0;
      const hasBuy = buyPriceRaw !== null && buyPriceRaw > 0;

      let sellPrice = 0;
      if (hasSell) {
        const n = Number(sellPriceRaw);
        sellPrice = Number.isFinite(n) ? n : 0;
      } else if (hasBuy) {
        const n = Number(buyPriceRaw);
        sellPrice = Number.isFinite(n) ? Number((n * 1.2).toFixed(2)) : 0;
      } else if (
        mode === 'import' &&
        missingPricePolicy === 'default' &&
        defaultSellPrice != null &&
        Number(defaultSellPrice) > 0
      ) {
        sellPrice = Number(defaultSellPrice);
      }
      const normalizedBuyPrice = buyPriceRaw != null && Number.isFinite(Number(buyPriceRaw)) ? Number(buyPriceRaw) : 0;
      const stockQuantity = Math.max(
        0,
        Math.floor(normalizeNumber(mapped.stockQuantity ?? mapped.quantity ?? 0) || 0)
      );
      const minStockLevel = Math.max(
        0,
        Math.floor(normalizeNumber(mapped.minStockLevel ?? 5) || 5)
      );

      let categoryId: number | null = null;
      if (mapped.category) {
        const normalizedCategory = normalizeText(mapped.category);
        if (normalizedCategory) {
          if (categoryMap.has(normalizedCategory)) {
            categoryId = categoryMap.get(normalizedCategory) || null;
          } else if (mode === 'import') {
            const [result] = await pool.execute(
              'INSERT INTO categories (name_en, name_ar, shop_id) VALUES (?, ?, ?)',
              [mapped.category, mapped.category, shopId]
            );
            const insertResult = result as any;
            categoryId = insertResult.insertId;
            if (categoryId !== null) {
              categoryMap.set(normalizedCategory, categoryId);
            }
          }
        }
      }

      const missingFieldsList: string[] = [];
      if (!nameFromMap) missingFieldsList.push(internalToEnglish.name || 'ProductName');
      if (!hasSell) missingFieldsList.push(internalToEnglish.sellPrice || 'SellPrice');
      if (buyPriceRaw == null || buyPriceRaw === 0)
        missingFieldsList.push(internalToEnglish.buyPrice || 'BuyPrice');
      const isIncomplete = missingFieldsList.length > 0 ? 1 : 0;

      const extraFieldsObj: Record<string, string | number> = {};
      Object.entries(mapped).forEach(([field, val]) => {
        if (field.startsWith('custom_') && val !== undefined && val !== null) {
          const s = String(val).trim();
          if (s !== '') extraFieldsObj[field] = typeof val === 'number' ? val : s;
        }
      });
      const extraFieldsJson =
        Object.keys(extraFieldsObj).length > 0 ? JSON.stringify(extraFieldsObj) : null;
      const missingFieldsJson =
        missingFieldsList.length > 0 ? JSON.stringify(missingFieldsList) : null;

      const descriptionShort = mapped.descriptionShort ? String(mapped.descriptionShort).trim() || null : null;
      const descriptionLong = mapped.descriptionLong ? String(mapped.descriptionLong).trim() || null : null;
      const warrantyText = mapped.warrantyText ? String(mapped.warrantyText).trim() || null : null;
      const returnPolicyText = mapped.returnPolicyText ? String(mapped.returnPolicyText).trim() || null : null;
      const specsJson = parseSpecs(mapped.specs);

      const xVal = normalizeNumber(mapped.cartonPacksCount);
      const yVal = normalizeNumber(mapped.packUnitsCount);
      const unitPrices = {
        piece: { sell: normalizeNumber(mapped.pieceSellPrice), buy: normalizeNumber(mapped.pieceBuyPrice) },
        pack: { sell: normalizeNumber(mapped.packSellPrice), buy: normalizeNumber(mapped.packBuyPrice) },
        carton: { sell: normalizeNumber(mapped.cartonSellPrice), buy: normalizeNumber(mapped.cartonBuyPrice) },
      };

      if (mode === 'import') {
        try {
          let existingProduct: any = null;
          if (skuRaw || barcodeRaw) {
            const [rows] = await pool.execute(
              `SELECT id FROM products WHERE shop_id = ? AND is_deleted = 0 AND (
                (sku IS NOT NULL AND sku != '' AND sku = ?) OR
                (barcode IS NOT NULL AND barcode != '' AND barcode = ?)
              ) LIMIT 1`,
              [shopId, skuRaw || null, barcodeRaw || null]
            );
            const arr = rows as any[];
            if (arr.length > 0) existingProduct = arr[0];
          }

          const hasGalleryCol = await hasColumn('products', 'gallery_urls_json');
          const hasCartonCol = await hasColumn('products', 'carton_packs_count');
          const hasDetailCols = await hasColumn('products', 'description_short');

          if (existingProduct) {
            const updateSet: string[] = [
              'name_en = ?', 'name_ar = ?', 'sku = ?', 'barcode = ?', 'qr_code = ?',
              'brand = ?', 'category_id = ?', 'buy_price = ?', 'sell_price = ?',
              'stock_quantity = ?', 'min_stock_level = ?', 'image_url = ?',
              'is_incomplete = ?', 'extra_fields = ?', 'missing_fields = ?',
            ];
            const updateParams: any[] = [
              nameEn, nameAr, skuRaw || null, barcodeRaw || null, qrRaw || null,
              mapped.brand || null, categoryId, normalizedBuyPrice, sellPrice,
              stockQuantity, minStockLevel, primaryImage,
              isIncomplete, extraFieldsJson, missingFieldsJson,
            ];
            if (hasGalleryCol) {
              updateSet.push('gallery_urls_json = ?');
              updateParams.push(galleryJson);
            }
            if (hasCartonCol) {
              updateSet.push('carton_packs_count = ?', 'pack_units_count = ?');
              updateParams.push(Number.isFinite(Number(xVal)) ? xVal : null, Number.isFinite(Number(yVal)) ? yVal : null);
            }
            if (hasDetailCols) {
              updateSet.push('description_short = ?', 'description_long = ?', 'specs_json = ?', 'warranty_text = ?', 'return_policy_text = ?');
              updateParams.push(descriptionShort, descriptionLong, specsJson, warrantyText, returnPolicyText);
            }
            updateParams.push(existingProduct.id, shopId);
            await pool.execute(
              `UPDATE products SET ${updateSet.join(', ')} WHERE id = ? AND shop_id = ?`,
              updateParams
            );
            await upsertProductUnits(existingProduct.id, Number.isFinite(Number(xVal)) ? Number(xVal) : null, Number.isFinite(Number(yVal)) ? Number(yVal) : null, unitPrices);
            if (barcodeRaw) await syncProductBarcode(existingProduct.id, barcodeRaw, shopId);
            updatedCount += 1;
            const wasDraft = isIncomplete ? 1 : 0;
            draftCountTotal += wasDraft;
          } else {
            const baseCols = 'name_en, name_ar, sku, barcode, qr_code, brand, category_id, buy_price, sell_price, stock_quantity, min_stock_level, image_url, shop_id, is_incomplete, extra_fields, missing_fields';
            let fullInsertCols = baseCols;
            const fullParams: any[] = [nameEn, nameAr, skuRaw || null, barcodeRaw || null, qrRaw || null, mapped.brand || null, categoryId, normalizedBuyPrice, sellPrice, stockQuantity, minStockLevel, primaryImage, shopId, isIncomplete, extraFieldsJson, missingFieldsJson];
            if (hasGalleryCol) {
              fullInsertCols += ', gallery_urls_json';
              fullParams.push(galleryJson);
            }
            if (hasCartonCol) {
              fullInsertCols += ', carton_packs_count, pack_units_count';
              fullParams.push(Number.isFinite(Number(xVal)) ? xVal : null, Number.isFinite(Number(yVal)) ? yVal : null);
            }
            if (hasDetailCols) {
              fullInsertCols += ', description_short, description_long, specs_json, warranty_text, return_policy_text';
              fullParams.push(descriptionShort, descriptionLong, specsJson, warrantyText, returnPolicyText);
            }
            if (currentImportBatchId != null) {
              fullInsertCols += ', import_batch_id';
              fullParams.push(currentImportBatchId);
            }
            const [result] = await pool.execute(
              `INSERT INTO products (${fullInsertCols}) VALUES (${fullParams.map(() => '?').join(', ')})`,
              fullParams
            );
            const productId = (result as any).insertId;
            await upsertProductUnits(productId, Number.isFinite(Number(xVal)) ? Number(xVal) : null, Number.isFinite(Number(yVal)) ? Number(yVal) : null, unitPrices);
            if (barcodeRaw) await syncProductBarcode(productId, barcodeRaw, shopId);
            importedCount += 1;
            draftCountTotal += isIncomplete ? 1 : 0;
          }
          console.log(`${logPrefix} ${existingProduct ? 'updated' : 'imported'}: name="${String(nameEn).slice(0, 60)}"`);
        } catch (err: any) {
          rowErrors.push({ row: rowIndex, reason: err?.message || 'Failed to save' });
          console.error(`${logPrefix} error:`, err);
        }
      } else {
        analysis.validRows += 1;
      }
    };

    const EXCEL_MAX_FILE_SIZE = 15 * 1024 * 1024;
    console.log('[EXCEL] Request content-type:', req.headers['content-type']);
    const busboy = Busboy({ headers: req.headers, limits: { fileSize: EXCEL_MAX_FILE_SIZE } });
    let fileFound = false;
    let processDone = false;
    let fileProcessingResolve: (() => void) | null = null;
    let fileProcessingPromise: Promise<void> = Promise.resolve();
    let columnMap: Record<string, string> = {};
    let headers: string[] = [];
    let unmappedColumns: string[] = [];
    let mappingInvalid = false;
    let mappingGuide: any = null;
    let previewRowsForResponse: Record<string, string | null>[] = [];

    busboy.on('field', (fieldName: string, value: string) => {
      const v = String(value || '').trim();
      if (!v) return;
      if (fieldName === 'mode') {
        if (modeLocked) return;
        if (v.toLowerCase() === 'analyze') mode = 'analyze';
        if (v.toLowerCase() === 'import') mode = 'import';
        return;
      }
      if (fieldName === 'columnMap' || fieldName === 'mapping') {
        const parsed = safeParseClientColumnMap(v);
        if (parsed) clientColumnMap = parsed;
        return;
      }
      if (fieldName === 'missingPricePolicy') {
        const p = v.toLowerCase();
        if (p === 'skip' || p === 'default' || p === 'zero') {
          missingPricePolicy = p;
        }
        return;
      }
      if (fieldName === 'defaultSellPrice') {
        const n = normalizeNumber(v);
        defaultSellPrice = n !== null ? Number(n) : null;
      }
    });

    const finalizeProfile = () => {
      const finalizedColumns = Object.fromEntries(
        Object.entries(profile.columns).map(([key, meta]: any) => [
          key,
          {
            emptyRatio: meta.emptyCount / Math.max(profile.totalRows, 1),
            numericRatio: meta.numericCount / Math.max(meta.nonEmptyCount, 1),
            duplicateRatio: meta.duplicateCount / Math.max(meta.nonEmptyCount, 1),
          },
        ])
      );
      return {
        totalRows: profile.totalRows,
        columns: finalizedColumns,
      };
    };

    const finish = async () => {
      if (processDone) return;
      processDone = true;
      const totalRows = Number(profile?.totalRows ?? 0);
      const colsCount = headers?.length ?? 0;
      if (mode === 'analyze' && totalRows === 0 && colsCount === 0 && !analyzeError) {
        analyzeError = 'No rows or columns detected. File may be empty, wrong sheet, or unsupported format.';
      }
      const payload = {
        ok: true,
        imported_count: importedCount,
        updated_count: updatedCount,
        inserted: importedCount,
        updated: updatedCount,
        draftCount: draftCountTotal,
        skipped_rows: skipped,
        skipped: skipped,
        skippedCount: skipped.length,
        row_errors: rowErrors,
        failedCount: rowErrors.length,
        warnings,
        profile: finalizeProfile(),
        unmappedColumns,
        detectedHeaders: headers,
        currentMapping: columnMap,
        headerToCanonical: columnMap,
        previewRows: previewRowsForResponse,
        totalRowsDetected: totalRows,
        rowsCount: totalRows,
        parsedRowsCount: totalRows,
        normalizedRowsCount: totalRows,
        validRowsCount: totalRows - skipped.length,
        skippedRowsCount: skipped.length,
      };

      if (mode === 'analyze') {
        const defaultGuide =
          !mappingValidation.ok || analyzeError
            ? buildProductImportMappingGuide(
                headers,
                columnMap,
                analyzeError || 'Map fields for best results'
              )
            : null;
        return res.json({
          ok: !analyzeError,
          error: analyzeError,
          mode,
          limit: limitCheck,
          mappingValidation,
          analysis: {
            totalRows,
            ...analysis,
          },
          issueSamples,
          samples,
          mappingGuide: mappingGuide || defaultGuide,
          ...payload,
        });
      }

      if (mappingInvalid) {
        return res.status(400).json({
          error:
            'Unrecognized inventory file format. Map at least one column and try again.',
          mappingGuide:
            mappingGuide ||
            buildProductImportMappingGuide(
              headers,
              columnMap,
              'Map fields for best results'
            ),
          ...payload,
        });
      }

      if (analyzeError) {
        return res.status(400).json({
          ok: false,
          error: analyzeError,
          ...payload,
        });
      }

      return res.json(payload);
    };

    const streamToBuffer = (stream: NodeJS.ReadableStream): Promise<Buffer> =>
      new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });

    busboy.on('file', async (fieldName: string, file: NodeJS.ReadableStream, info: any) => {
      console.log('[EXCEL] Received file field:', fieldName, 'filename:', info.filename, 'clientColumnMap keys:', Object.keys(clientColumnMap || {}).length);
      if (fieldName !== 'file') {
        file.resume();
        return;
      }
      if (fileFound) {
        file.resume();
        return;
      }
      fileFound = true;
      fileProcessingPromise = new Promise<void>((r) => { fileProcessingResolve = r; });
      const filename = info.filename || '';
      const lower = filename.toLowerCase();
      const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : '';
      const isCsv = ext === '.csv';
      const isExcel = ext === '.xlsx' || ext === '.xlsm' || ext === '.xls';
      if (!isCsv && !isExcel) {
        analyzeError = 'Unsupported file type. Use .xlsx, .xlsm, or .csv';
        file.resume();
        await finish();
        fileProcessingResolve?.();
        return;
      }

      const setHeaderRowAndMap = async (headerRow: string[]) => {
        const heuristicMap = heuristicColumnMap(headerRow);
        const aiMap = await aiColumnMap(headerRow);
        const autoMap = mergeColumnMaps(heuristicMap, aiMap);
        columnMap = clientColumnMap && Object.keys(clientColumnMap).length > 0 ? clientColumnMap : autoMap;
        unmappedColumns = headerRow.filter((header) => !columnMap[header]);
        mappingInvalid = false;
        if (mode === 'import') {
          console.log('[EXCEL] Import columnMap keys:', Object.keys(columnMap).length, 'sample:', Object.entries(columnMap).slice(0, 3));
        }
        const validation = validateProductImportMapping(columnMap);
        mappingValidation = validation;
        mappingInvalid = false;
        if (mode === 'analyze' && !validation.ok) {
          mappingGuide = buildProductImportMappingGuide(
            headerRow,
            columnMap,
            'Map fields for best results'
          );
        }
        return true;
      };

      try {
        if (lower.endsWith('.csv')) {
          const buffer = await streamToBuffer(file);
          const rows: Record<string, string>[] = [];
          await new Promise<void>((resolveParse, rejectParse) => {
            const parser = csvParser({ headers: false });
            const src = Readable.from(buffer);
            src.pipe(parser)
              .on('data', (row: Record<string, string>) => rows.push(row))
              .on('end', () => resolveParse())
              .on('error', rejectParse);
          });
          const orderedValues = (row: Record<string, string>) => {
            const keys = Object.keys(row)
              .filter((k) => /^\d+$/.test(k))
              .map(Number)
              .sort((a, b) => a - b);
            return keys.map((k) => String((row as any)[String(k)] ?? '').trim());
          };
          const nonEmptyCount = (row: Record<string, string>) =>
            Object.values(row).filter((v) => String(v ?? '').trim() !== '').length;
          const rowHasNonEmpty = (row: Record<string, string>) => nonEmptyCount(row) > 0;
          let headerRowIndex = -1;
          for (let i = 0; i < rows.length; i++) {
            if (nonEmptyCount(rows[i]) >= 2) {
              headerRowIndex = i;
              break;
            }
          }
          if (headerRowIndex === -1) {
            analyzeError = 'Excel file has no data rows';
            await finish();
            return;
          }
          const rawCsvHeaders = orderedValues(rows[headerRowIndex]).map((h) => String(h || '').trim());
          const maxColCsv = Math.max(rawCsvHeaders.length, ...rows.slice(headerRowIndex + 1).map((r) => orderedValues(r).length), 0);
          const seenCsv = new Map<string, number>();
          headers = [];
          for (let i = 0; i < maxColCsv; i++) {
            let label = String(rawCsvHeaders[i] ?? '').trim();
            if (!label) label = `column_${i + 1}`;
            const count = (seenCsv.get(label) ?? 0) + 1;
            seenCsv.set(label, count);
            headers.push(count > 1 ? `${label}_${count}` : label);
          }
          const dataRows = rows.slice(headerRowIndex + 1).filter(rowHasNonEmpty);
          if (dataRows.length === 0) {
            analyzeError = 'Excel file has no data rows';
            await finish();
            return;
          }
          const ok = await setHeaderRowAndMap(headers);
          if (!ok) {
            await finish();
            return;
          }
          if (mode === 'import' && dataRows.length > 0) {
            hasImportBatchCol = await hasColumn('products', 'import_batch_id');
            if (hasImportBatchCol) {
              const userId = (req as any).user?.id ?? 0;
              const [batchResult] = await pool.execute(
                'INSERT INTO import_batches (user_id, shop_id, file_name, status) VALUES (?, ?, ?, ?)',
                [userId, shopId, filename || 'import.csv', 'committed']
              );
              currentImportBatchId = (batchResult as any).insertId;
            }
          }
          let rowIndex = 1;
          for (const row of dataRows) {
            if (processDone) break;
            rowIndex += 1;
            const values = orderedValues(row);
            const rowObj: Record<string, any> = {};
            headers.forEach((h, i) => {
              rowObj[h] = values[i] !== undefined ? values[i] : '';
            });
            updateProfile(headers, rowObj);
            collectSamples(headers, rowObj);
            await mapAndInsert(rowObj, headers, columnMap, rowIndex);
          }
          if (currentImportBatchId != null) {
            await pool.execute(
              'UPDATE import_batches SET imported_count = ?, failed_count = ? WHERE id = ?',
              [importedCount, rowErrors.length, currentImportBatchId]
            );
          }
          await finish();
          return;
        }

        const buffer = await streamToBuffer(file);
        console.log('[EXCEL] File size:', buffer.length, 'bytes, first 20 bytes:', buffer.slice(0, 20).toString('hex'));
        if (buffer.length === 0) {
          analyzeError = 'File is empty. Ensure the file field contains the Excel file.';
          await finish();
          return;
        }
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const sheetNames = wb.SheetNames || [];
        console.log('[EXCEL] Sheet names:', sheetNames);
        if (sheetNames.length === 0) {
          analyzeError = 'Excel file has no worksheets';
          await finish();
          return;
        }
        const sheetIndexParam = Math.max(0, Math.min(parseInt(String((req as any)?.query?.sheet || '0'), 10) || 0, sheetNames.length - 1));
        const headerRowRaw = String((req as any)?.query?.headerRow ?? '').trim();
        const headerRowParam = headerRowRaw !== '' && /^\d+$/.test(headerRowRaw)
          ? Math.max(0, parseInt(headerRowRaw, 10))
          : 0;

        let sheetName = sheetNames[sheetIndexParam] || sheetNames[0];
        let sheet = wb.Sheets[sheetName];
        let rawRows = sheet ? XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) : [];
        let excelRows: string[][] = rawRows.map((row) =>
          (Array.isArray(row) ? row : [row]).map((c) => String(c ?? '').trim())
        );

        const nonEmptyCountArr = (arr: string[]) => arr.filter((c) => String(c).trim() !== '').length;
        const rowHasNonEmptyArr = (arr: string[]) => nonEmptyCountArr(arr) > 0;

        if (excelRows.length === 0) {
          for (let si = 0; si < sheetNames.length; si++) {
            const s = wb.Sheets[sheetNames[si]];
            if (!s) continue;
            const rr = XLSX.utils.sheet_to_json<string[]>(s, { header: 1, defval: '' });
            const er = rr.map((row: any) =>
              (Array.isArray(row) ? row : [row]).map((c: any) => String(c ?? '').trim())
            );
            if (er.some((r: string[]) => rowHasNonEmptyArr(r))) {
              sheetName = sheetNames[si];
              sheet = s;
              rawRows = rr;
              excelRows = er;
              console.log('[EXCEL] Fallback: using sheet', si, sheetName, 'with', excelRows.length, 'rows');
              break;
            }
          }
        }

        const usedRange = (sheet as any)?.['!ref'] ?? 'unknown';
        console.log('[EXCEL] Used sheet:', sheetName, 'sheetIndex:', sheetIndexParam, '!ref:', usedRange);
        console.log('[EXCEL] Raw rows (before filter):', excelRows.length);
        console.log('[EXCEL] First 5 raw rows:', excelRows.slice(0, 5).map((r) => r.slice(0, 5)));
        console.log('[EXCEL] headerRow from query:', headerRowRaw, '=> headerRowParam (0-based):', headerRowParam);

        let headerRowIndex = -1;
        if (headerRowParam >= 0 && headerRowParam < excelRows.length && nonEmptyCountArr(excelRows[headerRowParam]) >= 2) {
          headerRowIndex = headerRowParam;
          console.log('[EXCEL] Using headerRow from query:', headerRowIndex);
        }
        if (headerRowIndex < 0) {
          for (let i = 0; i < excelRows.length; i++) {
            if (nonEmptyCountArr(excelRows[i]) >= 2) {
              headerRowIndex = i;
              console.log('[EXCEL] Auto-detected header row at index:', i);
              break;
            }
          }
        }
        if (headerRowIndex === -1) {
          analyzeError = `No rows detected. sheetNames=${JSON.stringify(sheetNames)} usedRange=${usedRange} headerRowReceived=${headerRowRaw}`;
          console.error('[EXCEL]', analyzeError);
          await finish();
          return;
        }
        const maxCol = Math.max(...excelRows.map((r) => r.length), 0);
        const rawHeaderRow = excelRows[headerRowIndex].slice(0, maxCol);
        while (rawHeaderRow.length < maxCol) rawHeaderRow.push('');
        const seen = new Map<string, number>();
        headers = rawHeaderRow.map((h, i) => {
          let label = String(h ?? '').trim();
          if (!label) label = `column_${i + 1}`;
          const count = (seen.get(label) ?? 0) + 1;
          seen.set(label, count);
          return count > 1 ? `${label}_${count}` : label;
        });
        const dataRows = excelRows.slice(headerRowIndex + 1).filter((r) => rowHasNonEmptyArr(r));
        console.log('[EXCEL] dataRows after slice+filter:', dataRows.length, '(headerRowIndex=', headerRowIndex, ')');
        console.log('[EXCEL] rows[0] (first raw data row):', dataRows.length ? dataRows[0] : 'N/A');
        if (dataRows.length === 0) {
          analyzeError = `No data rows after header. sheet=${sheetName} headerRowIndex=${headerRowIndex} totalRows=${excelRows.length}`;
          console.error('[EXCEL]', analyzeError);
          await finish();
          return;
        }
        previewRowsForResponse = dataRows.slice(0, 20).map((values) => {
          const obj: Record<string, string | null> = {};
          headers.forEach((h, i) => {
            obj[h] = values[i] !== undefined && String(values[i]).trim() !== '' ? String(values[i]).trim() : null;
          });
          return obj;
        });
        const ok = await setHeaderRowAndMap(headers);
        if (!ok) {
          await finish();
          return;
        }
        if (mode === 'import' && dataRows.length > 0) {
          hasImportBatchCol = await hasColumn('products', 'import_batch_id');
          if (hasImportBatchCol) {
            const userId = (req as any).user?.id ?? 0;
            const [batchResult] = await pool.execute(
              'INSERT INTO import_batches (user_id, shop_id, file_name, status) VALUES (?, ?, ?, ?)',
              [userId, shopId, filename || 'excel-import.xlsx', 'committed']
            );
            currentImportBatchId = (batchResult as any).insertId;
            console.log('[EXCEL] Created import_batch:', currentImportBatchId);
          }
        }
        console.log('[EXCEL] counts before insert: parsedRows=', dataRows.length, 'headers=', headers.length);
        let rowIndex = 1;
        for (const values of dataRows) {
          if (processDone) break;
          rowIndex += 1;
          const rowData: Record<string, any> = {};
          headers.forEach((header, index) => {
            rowData[header] = values[index] !== undefined ? values[index] : '';
          });
          updateProfile(headers, rowData);
          collectSamples(headers, rowData);
          await mapAndInsert(rowData, headers, columnMap, rowIndex);
        }
        if (currentImportBatchId != null) {
          await pool.execute(
            'UPDATE import_batches SET imported_count = ?, failed_count = ? WHERE id = ?',
            [importedCount, rowErrors.length, currentImportBatchId]
          );
        }
        await finish();
      } catch (err: any) {
        analyzeError = err?.message || 'Failed to parse file';
        await finish();
      } finally {
        fileProcessingResolve?.();
      }
    });

    busboy.on('finish', async () => {
      if (!fileFound) {
        console.log('[EXCEL] No file received in request');
        return res.status(400).json({
          ok: false,
          error: 'No file received. Ensure FormData includes field "file" with the Excel file.',
        });
      }
      await fileProcessingPromise;
      if (!processDone) {
        await finish();
      }
    });

    req.pipe(busboy);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/products/import/last — last import batch summary for shop (never 404)
app.get(
  '/api/products/import/last',
  authenticateToken,
  requirePackageFeature('excel'),
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  async (req: any, res: Response) => {
    try {
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const [rows] = await pool.execute(
        'SELECT id, file_name, imported_count, failed_count, created_at FROM import_batches WHERE shop_id = ? AND rolled_back_at IS NULL ORDER BY created_at DESC LIMIT 1',
        [shopId]
      );
      const row = (rows as any[])[0];
      if (!row) {
        return res.json({ ok: true, batchId: null, message: 'No previous import' });
      }
      return res.json({
        ok: true,
        batchId: row.id,
        fileName: row.file_name,
        createdAt: row.created_at,
        importedCount: row.imported_count ?? 0,
        failedCount: row.failed_count ?? 0,
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Failed' });
    }
  }
);

// POST /api/products/import/rollback — undo last import (never 404 when no batch)
app.post(
  '/api/products/import/rollback',
  authenticateToken,
  requirePackageFeature('excel'),
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  async (req: any, res: Response) => {
    try {
      const body = typeof req.body === 'object' ? req.body : {};
      if (body.confirm !== true) {
        return res.status(400).json({
          ok: false,
          error: 'يرجى التأكيد: أرسل { confirm: true } لتنفيذ التراجع',
        });
      }
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      let batchId = body.batchId ? parseInt(String(body.batchId), 10) : null;
      if (!batchId || !Number.isInteger(batchId)) {
        const [rows] = await pool.execute(
          'SELECT id FROM import_batches WHERE shop_id = ? AND rolled_back_at IS NULL ORDER BY created_at DESC LIMIT 1',
          [shopId]
        );
        const row = (rows as any[])[0];
        if (!row) {
          return res.json({ ok: true, rolled_back: false, message: 'No previous import to rollback' });
        }
        batchId = row.id;
      }
      const [batchRows] = await pool.execute(
        'SELECT id FROM import_batches WHERE id = ? AND shop_id = ? AND rolled_back_at IS NULL',
        [batchId, shopId]
      );
      if (!(batchRows as any[]).length) {
        return res.json({ ok: true, rolled_back: false, message: 'Batch not found or already rolled back' });
      }
      const hasImportBatchCol = await hasColumn('products', 'import_batch_id');
      let deletedCount = 0;
      if (hasImportBatchCol) {
        const [result] = await pool.execute(
          'UPDATE products SET is_deleted = 1 WHERE shop_id = ? AND import_batch_id = ? AND (is_deleted = 0 OR is_deleted IS NULL)',
          [shopId, batchId]
        );
        deletedCount = (result as any).affectedRows ?? 0;
      } else {
        return res.json({ ok: true, rolled_back: false, message: 'Rollback not supported: import_batch_id column missing' });
      }
      await pool.execute('UPDATE import_batches SET rolled_back_at = NOW() WHERE id = ?', [batchId]);
      console.log('[ROLLBACK]', { shopId, batchId, deletedCount });
      return res.json({ ok: true, rolled_back: true, batchId, deletedCount });
    } catch (err: any) {
      console.error('[ROLLBACK] error', err);
      return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
    }
  }
);

app.get(
  '/api/products/import/template',
  authenticateToken,
  requirePackageFeature('excel'),
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  async (_req: Request, res: Response) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const productsSheet = workbook.addWorksheet('Products', { views: [{ state: 'frozen', ySplit: 1 }] });
      const headers = [
        'name', 'nameAr', 'brand', 'sku', 'barcode', 'qrCode', 'buyPrice', 'sellPrice', 'stockQuantity', 'minStockLevel',
        'cartonPacksCount', 'packUnitsCount', 'pieceBuyPrice', 'pieceSellPrice', 'packBuyPrice', 'packSellPrice', 'cartonBuyPrice', 'cartonSellPrice',
        'imageUrl', 'galleryUrls', 'descriptionShort', 'descriptionLong', 'warrantyText', 'returnPolicyText', 'specs',
      ];
      productsSheet.addRow(headers);
      productsSheet.getRow(1).font = { bold: true };

      const readmeSheet = workbook.addWorksheet('README');
      readmeSheet.addRow(['Products Import Template - Column Guide']);
      readmeSheet.addRow([]);
      readmeSheet.addRow(['REQUIRED COLUMNS']);
      readmeSheet.addRow(['name', 'Product name (required)']);
      readmeSheet.addRow([]);
      readmeSheet.addRow(['OPTIONAL COLUMNS']);
      readmeSheet.addRow(['nameAr', 'Arabic name']);
      readmeSheet.addRow(['brand', 'Brand']);
      readmeSheet.addRow(['sku', 'SKU (unique per shop)']);
      readmeSheet.addRow(['barcode', 'Barcode (unique per shop)']);
      readmeSheet.addRow(['qrCode', 'QR code']);
      readmeSheet.addRow(['buyPrice', 'Buy/cost price']);
      readmeSheet.addRow(['sellPrice', 'Sell price']);
      readmeSheet.addRow(['stockQuantity', 'Stock quantity']);
      readmeSheet.addRow(['minStockLevel', 'Minimum stock level (default 5)']);
      readmeSheet.addRow(['cartonPacksCount (X)', 'Packs per carton, e.g. 12']);
      readmeSheet.addRow(['packUnitsCount (Y)', 'Units per pack, e.g. 6']);
      readmeSheet.addRow(['pieceBuyPrice', 'Buy price per piece']);
      readmeSheet.addRow(['pieceSellPrice', 'Sell price per piece']);
      readmeSheet.addRow(['packBuyPrice', 'Buy price per pack']);
      readmeSheet.addRow(['packSellPrice', 'Sell price per pack']);
      readmeSheet.addRow(['cartonBuyPrice', 'Buy price per carton']);
      readmeSheet.addRow(['cartonSellPrice', 'Sell price per carton']);
      readmeSheet.addRow(['imageUrl', 'Primary image URL (newline or comma for multiple)']);
      readmeSheet.addRow(['galleryUrls', 'Additional image URLs (newline or comma separated)']);
      readmeSheet.addRow(['descriptionShort', 'Short description']);
      readmeSheet.addRow(['descriptionLong', 'Long description']);
      readmeSheet.addRow(['warrantyText', 'Warranty text']);
      readmeSheet.addRow(['returnPolicyText', 'Return policy text']);
      readmeSheet.addRow(['specs', 'Specifications: key:value per line, or key=value, or JSON array']);
      readmeSheet.addRow([]);
      readmeSheet.addRow(['IMAGE URL FORMAT: One URL per line, or comma-separated']);
      readmeSheet.addRow(['SPECS FORMAT: One "key:value" or "key=value" per line, or JSON array of objects']);

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="products-template.xlsx"');
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to generate template' });
    }
  }
);

app.get(
  '/api/import/exchange-rate',
  authenticateToken,
  requirePackageFeature('excel'),
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  async (req: any, res: Response) => {
    try {
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const qFrom = normalizeFxCurrencyCode(String(req.query?.from ?? ''));
      const qToParam = String(req.query?.to ?? '').trim();
      const qTo = qToParam ? normalizeFxCurrencyCode(qToParam) : await getShopCurrencyCodeForShop(shopId);
      if (!qFrom || !qTo) {
        return res.status(400).json({ ok: false, error: 'Invalid or unsupported currency. Use ISO codes like SAR, USD, EGP.' });
      }
      const rate = await fetchCrossRate(qFrom, qTo);
      if (rate == null) {
        return res.status(502).json({ ok: false, error: 'Exchange rate service unavailable for this pair.' });
      }
      return res.json({ ok: true, from: qFrom, to: qTo, rate });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message || 'FX error' });
    }
  }
);

app.post(
  '/api/import/invoice-image',
  authenticateToken,
  requirePackageFeature('excel'),
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  async (req: any, res: Response) => {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const contentType = String(req.headers['content-type'] || '').toLowerCase();

    if (contentType.includes('multipart/form-data')) {
      const busboy = Busboy({ headers: req.headers, limits: {} });
      let fileBuffer: Buffer | null = null;
      let mimeType = 'image/jpeg';
      const formFields: Record<string, string> = {};

      busboy.on('file', (fieldName: string, file: NodeJS.ReadableStream, info: any) => {
        if (fieldName !== 'file') {
          file.resume();
          return;
        }
        mimeType = info.mimeType || 'image/jpeg';
        const chunks: Buffer[] = [];
        file.on('data', (chunk: Buffer) => chunks.push(chunk));
        file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
      });
      busboy.on('field', (name: string, value: string) => {
        formFields[name] = value;
      });

      await new Promise<void>((resolve, reject) => {
        busboy.on('finish', () => resolve());
        busboy.on('error', reject);
        req.pipe(busboy);
      });

      if (!fileBuffer || fileBuffer.length === 0) {
        return res.status(400).json({ ok: false, error: 'No file received' });
      }

      try {
        const hasGemini = Boolean(resolveGeminiApiKey());
        if (hasGemini && (req as any).user?.role !== 'super_admin') {
          const rawUid = (req as any).user?.id ?? (req as any).user?.userId ?? null;
          const userId =
            rawUid != null && Number.isFinite(Number(rawUid)) && Number(rawUid) > 0 ? Number(rawUid) : null;
          const ocrPre = await usageLimits.checkOcrAllowedForUser(shopId, userId);
          if (!ocrPre.ok) {
            const errMsg = (ocrPre as { ok: false; error: string }).error;
            return res.status(429).json({ ok: false, error: errMsg, message: errMsg });
          }
        }
        const { parseInvoiceImage } = await import('./services/invoiceParser');
        const result = await parseInvoiceImage(fileBuffer, mimeType, { shopId });
        if (result.geminiInvoked && (req as any).user?.role !== 'super_admin') {
          const rawUid = (req as any).user?.id ?? (req as any).user?.userId ?? null;
          const userId =
            rawUid != null && Number.isFinite(Number(rawUid)) && Number(rawUid) > 0 ? Number(rawUid) : null;
          await usageLimits.recordOcrUseForUser(shopId, userId);
        }
        const structured = buildInvoiceStructuredPayload({
          ...result,
          supplier: {
            name: result?.meta?.supplierName || '',
            phone: '',
            address: '',
          },
          invoice: {
            number: '',
            date: '',
          },
        });
        const extractedWarnings = buildInvoiceOcrWarnings(result.items || []);
        const allWarnings: string[] = [...(result.warnings || []), ...extractedWarnings];
        const shopCurrency = await getShopCurrencyCodeForShop(shopId);
        const documentCurrency =
          normalizeFxCurrencyCode(result?.meta?.currencyCode) || shopCurrency;
        let fxRateForResponse: number | null = null;
        let itemsForResponse = Array.isArray(result.items) ? [...result.items] : [];

        const autoApplyRaw = String(formFields.auto_apply ?? formFields.autoApply ?? '').trim().toLowerCase();
        let autoApply = autoApplyRaw === '1' || autoApplyRaw === 'true' || autoApplyRaw === 'yes';
        let autoApplied = false;
        let importResult:
          | {
              inserted: number;
              updated: number;
              failedCount: number;
              row_errors: Array<{ row: number; reason: string }>;
              warnings: string[];
              purchase_invoice_id: number | null;
            }
          | null = null;

        let itemsForApply = itemsForResponse;
        if (
          documentCurrency &&
          shopCurrency &&
          documentCurrency !== shopCurrency &&
          itemsForApply.length > 0
        ) {
          const rate = await fetchCrossRate(documentCurrency, shopCurrency);
          if (rate != null) {
            fxRateForResponse = rate;
            if (autoApply) {
              itemsForApply = multiplyInvoiceImportItems(itemsForResponse, rate);
              itemsForResponse = itemsForApply;
              if (result.meta) {
                const scaled = scaleInvoiceMetaMoney(result.meta, rate);
                (result as any).meta = {
                  ...result.meta,
                  ...scaled,
                  fx_converted_from: documentCurrency,
                  fx_to: shopCurrency,
                  fx_rate: rate,
                };
              }
              allWarnings.push(
                `تم تحويل المبالغ من ${documentCurrency} إلى ${shopCurrency} قبل الاستيراد (سعر صرف تقريبي يومي).`
              );
            }
          } else if (autoApply) {
            autoApply = false;
            allWarnings.push(
              `تعذر جلب سعر الصرف من ${documentCurrency} إلى ${shopCurrency}. تم إيقاف الاستيراد التلقائي — راجع المعاينة وغيّر العملة أو أكّد يدوياً.`
            );
          } else {
            allWarnings.push(
              `لم يُحضر سعر الصرف من ${documentCurrency} إلى ${shopCurrency}؛ الأسعار تظل بعملة المستند حتى تتاح الخدمة.`
            );
          }
        }

        if (autoApply && Array.isArray(itemsForApply) && itemsForApply.length > 0) {
          const recordPurchaseInvoice =
            String(formFields.record_purchase_invoice ?? formFields.recordPurchaseInvoice ?? '')
              .trim()
              .toLowerCase() === 'true';
          const branchRaw = String(formFields.branch_id ?? formFields.branchId ?? '').trim();
          const supplierRaw = String(formFields.supplier_id ?? formFields.supplierId ?? '').trim();
          const branchId = branchRaw && Number.isFinite(Number(branchRaw)) && Number(branchRaw) > 0 ? Number(branchRaw) : null;
          const supplierId = supplierRaw && Number.isFinite(Number(supplierRaw)) && Number(supplierRaw) > 0 ? Number(supplierRaw) : null;
          importResult = await applyInvoiceImageImportItems(shopId, req, itemsForApply, {
            recordPurchaseInvoice,
            branchId,
            supplierId,
            meta: {
              supplierName: structured.supplier.name || result?.meta?.supplierName || null,
              supplierPhone: structured.supplier.phone || null,
              supplierAddress: structured.supplier.address || null,
              invoiceNumber: structured.invoice.number || null,
              invoiceDate: structured.invoice.date || null,
              branchName: result?.meta?.branchName || null,
            },
          });
          autoApplied = true;
        }

        const status: 'success' | 'partial' | 'failed' =
          (result.items?.length || 0) > 0
            ? (result.message ? 'partial' : 'success')
            : (result.message ? 'failed' : 'partial');

        return res.json({
          ok: true,
          status,
          data: structured,
          items: itemsForResponse,
          meta: result.meta,
          shop_currency: shopCurrency,
          document_currency: documentCurrency,
          fx_rate: fxRateForResponse,
          warnings: allWarnings,
          message: result.message,
          auto_applied: autoApplied,
          import_result: importResult,
        });
      } catch (parseErr: any) {
        console.error('[import/invoice-image] OCR module error:', parseErr?.message || parseErr);
        return res.json({
          ok: true,
          status: 'failed' as const,
          data: {
            supplier: { name: '', phone: '', address: '' },
            invoice: { number: '', date: '' },
            items: [],
            total_amount: 0,
          },
          items: [],
          warnings: [String(parseErr?.message || 'Invoice OCR failed')],
          error: 'Invoice OCR failed',
          message:
            'الصورة غير واضحة، حاول تصوير أوضح',
        });
      }
    }

    if (contentType.includes('application/json') && req.body?.items) {
      const items = Array.isArray(req.body.items) ? req.body.items : [];
      if (items.length === 0) {
        return res.json({
          ok: true,
          inserted: 0,
          updated: 0,
          failedCount: 0,
          row_errors: [],
          warnings: [],
          purchase_invoice_id: null,
        });
      }

      const recordPurchaseInvoice = Boolean(req.body.record_purchase_invoice);
      const branchRaw = req.body.branch_id ?? req.body.branchId;
      const supplierRaw = req.body.supplier_id ?? req.body.supplierId;
      const branchId =
        branchRaw != null && String(branchRaw).trim() !== '' && Number.isFinite(Number(branchRaw)) && Number(branchRaw) > 0
          ? Number(branchRaw)
          : null;
      const supplierId =
        supplierRaw != null && String(supplierRaw).trim() !== '' && Number.isFinite(Number(supplierRaw)) && Number(supplierRaw) > 0
          ? Number(supplierRaw)
          : null;
      const meta = req.body.meta && typeof req.body.meta === 'object' ? req.body.meta : null;

      const limitCheck = await enforceProductLimit(shopId, recordPurchaseInvoice ? 0 : items.length);
      if (!limitCheck.allowed) {
        return res.status(403).json({
          ok: false,
          error: `Product limit reached. You can add ${limitCheck.remaining ?? 0} more products.`,
        });
      }

      try {
        const out = await applyInvoiceImageImportItems(shopId, req, items, {
          recordPurchaseInvoice,
          branchId,
          supplierId,
          meta,
        });
        return res.json({
          ok: true,
          inserted: out.inserted,
          updated: out.updated,
          failedCount: out.failedCount,
          row_errors: out.row_errors,
          warnings: out.warnings,
          purchase_invoice_id: out.purchase_invoice_id,
        });
      } catch (err: any) {
        return res.status(500).json({ ok: false, error: err?.message || 'Import failed' });
      }
    }

    return res.status(400).json({
      ok: false,
      error: 'Send multipart/form-data with file for OCR, or application/json with { items: [...] } to confirm import.',
    });
  }
);

app.post(
  '/api/products/import',
  authenticateToken,
  requirePackageFeature('excel'),
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  async (req: any, res: Response) => {
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (contentType.includes('multipart/form-data')) {
      return handleProductsImportUpload(req, res);
    }

    try {
      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [];
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error:
            'No items received. If uploading a file, send multipart/form-data without setting Content-Type manually.',
        });
      }

      const limitCheck = await enforceProductLimit(shopId, items.length);
      if (!limitCheck.allowed) {
        const remaining = limitCheck.remaining ?? 0;
        return res.status(403).json({
          message: `الحد الأقصى للمنتجات في باقتك ${limitCheck.maxProducts}. لديك ${limitCheck.existingCount} منتج حالياً ويمكنك إضافة ${remaining} منتج فقط. يرجى الترقية للباقة الفضية أو الذهبية.`,
          code: 'PRODUCT_LIMIT_REACHED',
        });
      }

      const [existing] = await pool.execute(
        'SELECT id, name_en, name_ar, sku, barcode, qr_code FROM products WHERE shop_id = ?',
        [shopId]
      );
      const existingProducts = existing as any[];
      const skuSet = new Set(existingProducts.map((p) => normalizeText(p.sku)).filter(Boolean));
      const barcodeSet = new Set(
        existingProducts.map((p) => normalizeText(p.barcode)).filter(Boolean)
      );
      const qrSet = new Set(
        existingProducts.map((p) => normalizeText(p.qr_code)).filter(Boolean)
      );
      const nameSet = new Set(
        existingProducts
          .flatMap((p) => [normalizeText(p.name_en), normalizeText(p.name_ar)])
          .filter(Boolean)
      );

      const imported: any[] = [];
      const skipped: Array<{ row: number; reason: string }> = [];
      let draftCount = 0;

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index] || {};
        const nameRaw = normalizeText(item.name || item.nameEn || item.nameAr);
        let sku = normalizeText(item.sku);
        let barcode = normalizeText(item.barcode);
        let qrCode = normalizeText(item.qrCode);

        const allRowValuesEmpty =
          !nameRaw &&
          !sku &&
          !barcode &&
          !qrCode &&
          !normalizeText(item.brand) &&
          !normalizeText(item.category) &&
          !normalizeText(item.imageUrl) &&
          !normalizeText(item.sellPrice) &&
          !normalizeText(item.buyPrice) &&
          !normalizeText(item.stockQuantity);
        if (allRowValuesEmpty) {
          skipped.push({ row: index + 1, reason: 'Empty row' });
          continue;
        }

        if (sku && skuSet.has(sku)) {
          sku = '';
        }
        if (barcode && barcodeSet.has(barcode)) {
          barcode = '';
        }
        if (qrCode && qrSet.has(qrCode)) {
          qrCode = '';
        }

        let nameValue =
          item.nameEn ||
          item.nameAr ||
          item.name ||
          nameRaw ||
          (sku || barcode ? `Draft ${sku || barcode}` : `Unnamed Item #${index + 1}`);
        let nameForDedup = normalizeText(nameValue);
        if (nameForDedup && nameSet.has(nameForDedup)) {
          nameValue =
            sku || barcode
              ? `Draft ${sku || barcode}`
              : `Unnamed Item #${index + 1}`;
          nameForDedup = normalizeText(nameValue);
        }

        const sellPriceRaw = parseFloat(item.sellPrice || item.price || '0');
        const buyPrice = parseFloat(item.buyPrice || item.cost || '0') || 0;
        const sellPrice =
          sellPriceRaw > 0
            ? sellPriceRaw
            : buyPrice > 0
            ? Number((buyPrice * 1.2).toFixed(2))
            : 0;
        const stockQuantity = parseInt(item.stockQuantity || item.quantity || '0', 10) || 0;
        const minStockLevel = parseInt(item.minStockLevel || item.minStock || '5', 10) || 5;

        const missingFieldsList: string[] = [];
        if (!nameRaw) missingFieldsList.push('ProductName');
        if (sellPrice <= 0 && buyPrice <= 0) missingFieldsList.push('SellPrice');
        if (buyPrice <= 0) missingFieldsList.push('BuyPrice');
        const isIncomplete = missingFieldsList.length > 0 ? 1 : 0;
        if (isIncomplete) draftCount += 1;
        const missingFieldsJson =
          missingFieldsList.length > 0 ? JSON.stringify(missingFieldsList) : null;
        const extraFields =
          item.extra_fields && typeof item.extra_fields === 'object' ? item.extra_fields : {};
        const extraFieldsJson =
          Object.keys(extraFields).length > 0 ? JSON.stringify(extraFields) : null;

        const nameArValue = item.nameAr || item.nameEn || item.name || nameValue;

        const [result] = await pool.execute(
          `INSERT INTO products 
         (name_en, name_ar, sku, barcode, qr_code, brand, category_id, buy_price, sell_price, stock_quantity, min_stock_level, image_url, shop_id, is_incomplete, extra_fields, missing_fields)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nameValue,
            nameArValue,
            sku || null,
            barcode || null,
            qrCode || null,
            item.brand || null,
            item.categoryId || null,
            buyPrice,
            sellPrice,
            stockQuantity,
            minStockLevel,
            item.imageUrl || null,
            shopId,
            isIncomplete,
            extraFieldsJson,
            missingFieldsJson,
          ]
        );

        const insertResult = result as any;
        imported.push({ id: insertResult.insertId, name: nameValue });
        if (nameForDedup) nameSet.add(nameForDedup);
        if (sku) skuSet.add(sku);
        if (barcode) barcodeSet.add(barcode);
        if (qrCode) qrSet.add(qrCode);
      }

      res.status(201).json({ importedCount: imported.length, draftCount, skipped, imported });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.get('/api/products/low-stock', authenticateToken, capLowStockRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    let query = `
      SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.stock_quantity > 0
        AND p.stock_quantity <= p.min_stock_level
        AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
    `;
    const params: any[] = [];
    query += ' AND p.shop_id = ?';
    params.push(shopId);
    
    query += ' ORDER BY p.stock_quantity ASC';
    
    const [products] = await pool.execute(query, params);
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/near-expiry', authenticateToken, capLowStockRead, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query?.limit || '12'), 10) || 12));
    try {
      const [rows] = await pool.execute(
        `SELECT p.id, p.name_en, p.name_ar, p.sku, p.stock_quantity, p.min_stock_level, p.expiry_date,
                DATEDIFF(p.expiry_date, CURDATE()) AS days_to_expiry
         FROM products p
         WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
           AND p.stock_quantity > 0
           AND p.expiry_date IS NOT NULL
           AND p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
           AND p.expiry_date >= CURDATE()
         ORDER BY p.expiry_date ASC
         LIMIT ${limit}`,
        [shopId]
      );
      res.json(rows);
    } catch (e: any) {
      if (String(e?.message || '').includes('expiry_date') || String(e?.message || '').includes('production_date')) {
        return res.json([]);
      }
      throw e;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== CATEGORIES ==========
app.get('/api/categories', authenticateToken, async (req: any, res: Response) => {
  try {
    const r = getShopId(req);
    if (r.forbidden) return res.status(403).json({ error: 'shopId must match your shop' });
    if (r.shopId == null && req.user?.role === 'super_admin') {
      const [categories] = await pool.execute('SELECT * FROM categories');
      return res.json(categories);
    }
    if (r.shopId == null) return res.status(400).json({ error: 'shopId is required' });
    const shopId = r.shopId;

    const [categories] = await pool.execute(
      'SELECT * FROM categories WHERE shop_id = ? OR shop_id IS NULL ORDER BY id ASC',
      [shopId]
    );
    return res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SALES/POS ==========
app.post(
  '/api/sales',
  authenticateToken,
  requirePackageFeature('pos'),
  requireRole('super_admin', 'shop_owner', 'cashier'),
  async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const result = await createSaleAndItems(req, undefined, shopId);
    res.status(201).json(result);
  } catch (error: any) {
    if (error?.message === 'shopId is required') {
      return res.status(400).json({ error: 'shopId is required' });
    }
    if (error?.message === 'Sale items required') {
      return res.status(400).json({ error: 'Sale items required' });
    }
    res.status(500).json({ error: error.message });
  }
  }
);

app.post(
  '/api/invoices',
  authenticateToken,
  requirePackageFeature('pos'),
  requireRole('super_admin', 'shop_owner', 'cashier'),
  async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const result = await createSaleAndItems(req, undefined, shopId);
    res.status(201).json(result);
  } catch (error: any) {
    if (error?.message === 'shopId is required') {
      return res.status(400).json({ error: 'shopId is required' });
    }
    if (error?.message === 'Sale items required') {
      return res.status(400).json({ error: 'Sale items required' });
    }
    if (error?.code === 'BRANCH_REQUIRED') {
      return res.status(400).json({ error: error.message || 'Configure at least one branch for this shop.' });
    }
    res.status(500).json({ error: error.message });
  }
  }
);

app.post(
  '/api/pos/preview-totals',
  authenticateToken,
  requirePackageFeature('pos'),
  requireRole('super_admin', 'shop_owner', 'cashier'),
  async (req: any, res: Response) => {
    try {
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const totals = await previewPosCartTotals(req, shopId);
      res.json(totals);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Preview failed' });
    }
  }
);

// Increment invoice print counter (sales row)
const incrementInvoicePrintCount = async (req: any, saleId: number) => {
  const r = getShopId(req);
  if (r.forbidden) throw new Error('shopId must match your shop');
  const shopId = r.shopId;
  if (!shopId) {
    throw new Error('shopId is required');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [updateResult] = await connection.execute(
      `UPDATE sales
       SET print_count = COALESCE(print_count, 0) + 1
       WHERE id = ? AND shop_id = ?`,
      [saleId, shopId]
    );
    const updateInfo = updateResult as any;
    if (!updateInfo?.affectedRows) {
      throw new Error('Invoice not found');
    }

    const [rows] = await connection.execute(
      'SELECT id, invoice_number, print_count, branch_id FROM sales WHERE id = ? AND shop_id = ?',
      [saleId, shopId]
    );
    const invoiceRow = (rows as any[])[0];

    await logAudit({
      shopId,
      userId: req.user?.id || null,
      action: 'invoice_printed',
      entityType: 'sale',
      entityId: saleId,
      details: JSON.stringify({
        invoiceNumber: invoiceRow?.invoice_number || null,
        printCount: invoiceRow?.print_count ?? null,
      }),
      ipAddress: req.ip,
    });

    await insertNotification(
      {
        shopId,
        source: 'pos',
        type: 'pos_invoice_printed',
        data: {
          invoiceId: saleId,
          saleId,
          invoiceNumber: invoiceRow?.invoice_number ?? null,
          printCount: Number(invoiceRow?.print_count || 0),
        },
      },
      connection
    );

    await connection.commit();
    await insertPrintLog(req, shopId, 'sale_invoice', saleId, invoiceRow?.branch_id ?? null);
    return {
      saleId: invoiceRow?.id,
      invoiceNumber: invoiceRow?.invoice_number,
      printCount: Number(invoiceRow?.print_count || 0),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

app.post('/api/invoices/:id/print', authenticateToken, requireRole('super_admin', 'shop_owner', 'cashier'), async (req: any, res: Response) => {
  try {
    const saleId = parseInt(req.params.id, 10);
    if (!saleId) {
      return res.status(400).json({ error: 'Invalid invoice id' });
    }
    const result = await incrementInvoicePrintCount(req, saleId);
    res.json(result);
  } catch (error: any) {
    if (error?.message === 'shopId must match your shop') {
      return res.status(403).json({ error: 'shopId must match your shop' });
    }
    if (error?.message === 'shopId is required') {
      return res.status(400).json({ error: 'shopId is required' });
    }
    if (error?.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Alias: sales/:id/print (same as invoices/:id/print)
app.post('/api/sales/:id/print', authenticateToken, requireRole('super_admin', 'shop_owner', 'cashier'), async (req: any, res: Response) => {
  try {
    const saleId = parseInt(req.params.id, 10);
    if (!saleId) {
      return res.status(400).json({ error: 'Invalid sale id' });
    }
    const result = await incrementInvoicePrintCount(req, saleId);
    res.json(result);
  } catch (error: any) {
    if (error?.message === 'shopId must match your shop') {
      return res.status(403).json({ error: 'shopId must match your shop' });
    }
    if (error?.message === 'shopId is required') {
      return res.status(400).json({ error: 'shopId is required' });
    }
    if (error?.message === 'Invoice not found') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sales', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 500) : 50;
    const sourceFilter = String(req.query.source || '').toLowerCase();
    const searchParam = String(req.query.search || '').trim();

    // List endpoint: shop profile from /shops/profile; join branches for POS branch label on invoices list.
    let query = `
      SELECT s.*, u.username as cashier_name,
             b.name AS branch_name, b.name_ar AS branch_name_ar, b.name_en AS branch_name_en
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN branches b ON b.id = s.branch_id AND b.shop_id = s.shop_id
      WHERE s.shop_id = ?
    `;
    const params: any[] = [shopId];

    if (sourceFilter === 'pos') {
      query += " AND (s.source = 'pos' OR s.source IS NULL)";
    }

    if (searchParam) {
      const likeVal = `%${searchParam}%`;
      const idNum = parseInt(searchParam, 10);
      query += ' AND (s.customer_name LIKE ? OR s.customer_phone LIKE ? OR s.invoice_number LIKE ? OR s.id = ?)';
      params.push(likeVal, likeVal, likeVal, Number.isFinite(idNum) ? idNum : 0);
    }

    query += ` ORDER BY s.created_at DESC LIMIT ${limit}`;
    const [sales] = await pool.execute(query, params);
    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function buildOnlineInvoiceLookupResponse(pool: any, shopId: number, orderId: number) {
  const [orders] = await pool.execute(
    `SELECT o.*, oi.invoice_number AS oi_inv_num, oi.printed_count
     FROM online_orders o
     LEFT JOIN online_invoices oi ON oi.order_id = o.id
     WHERE o.id = ? AND o.shop_id = ? LIMIT 1`,
    [orderId, shopId]
  );
  const order = (orders as any[])[0];
  if (!order) return null;
  const [oiRows] = await pool.execute(
    `SELECT oi.*,
            COALESCE(p.name_ar, oi.name_snapshot, '') AS name_ar,
            COALESCE(p.name_en, oi.name_snapshot, '') AS name_en
     FROM online_order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    [orderId]
  );
  const [retAgg] = await pool.execute(
    `SELECT ri.sale_item_id, COALESCE(SUM(ri.quantity), 0) AS rq
     FROM return_items ri
     INNER JOIN returns r ON r.id = ri.return_id
     WHERE r.online_order_id = ? AND ri.sale_item_id IS NOT NULL
     GROUP BY ri.sale_item_id`,
    [orderId]
  );
  const retMap = new Map((retAgg as any[]).map((x) => [Number(x.sale_item_id), Number(x.rq)]));
  const itemsWithReturnable = (oiRows as any[]).map((i) => {
    const sold = Number(i.quantity) || 0;
    const already = retMap.get(Number(i.id)) || 0;
    const up = parseFloat(i.sell_price_snapshot) || 0;
    return {
      ...i,
      unit_price: up,
      quantity_returnable: Math.max(0, sold - already),
    };
  });
  const ref =
    order.oi_inv_num != null && String(order.oi_inv_num).trim() !== ''
      ? order.oi_inv_num
      : order.public_code || order.id;
  const sale = {
    id: orderId,
    invoice_number: `ON-${ref}`,
    customer_name: order.customer_name,
    customer_phone: order.phone,
    total_amount: parseFloat(order.total) || 0,
    created_at: order.created_at,
    source: 'online',
    online_order_id: orderId,
    payment_method: order.payment_method,
  };
  return { source: 'online' as const, sale, items: itemsWithReturnable };
}

const handleSalesByInvoiceLookup = async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const raw = String(req.query.number || req.query.invoice || '').trim();
    if (!raw) return res.status(400).json({ error: 'number or invoice query param required' });

    const onlinePrefixed = /^ON-?/i.test(raw);
    const onlineToken = onlinePrefixed ? raw.replace(/^ON-?/i, '').trim() : raw.trim();

    const tryOnline = async (token: string) => {
      if (!token) return null;
      const idNum = parseInt(token, 10);
      const [ordRows] = await pool.execute(
        `SELECT o.id
         FROM online_orders o
         LEFT JOIN online_invoices oi ON oi.order_id = o.id
         WHERE o.shop_id = ?
           AND (o.public_code = ? OR o.id = ? OR CAST(COALESCE(oi.invoice_number, 0) AS CHAR) = ?)
         LIMIT 1`,
        [shopId, token, Number.isFinite(idNum) && idNum > 0 ? idNum : -1, token]
      );
      const oid = (ordRows as any[])[0]?.id;
      if (!oid) return null;
      return buildOnlineInvoiceLookupResponse(pool, shopId, Number(oid));
    };

    if (onlinePrefixed) {
      const built = await tryOnline(onlineToken);
      if (built) return res.json(built);
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const idNum = parseInt(raw, 10);
    let sql = 'SELECT s.*, u.username as cashier_name FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE s.shop_id = ?';
    const params: any[] = [shopId];
    if (Number.isFinite(idNum) && idNum > 0) {
      sql += ' AND (s.id = ? OR s.invoice_number LIKE ?)';
      params.push(idNum, `%${raw}%`);
    } else {
      sql += ' AND s.invoice_number LIKE ?';
      params.push(`%${raw}%`);
    }
    sql += ' ORDER BY s.id DESC LIMIT 5';
    const [sales] = await pool.execute(sql, params);
    const arr = sales as any[];
    if (arr.length > 0) {
      const sale = arr[0];
      const [items] = await pool.execute(
        `SELECT si.*,
                COALESCE(p.name_ar, si.product_name_ar, 'منتج محذوف') AS name_ar,
                COALESCE(p.name_en, si.product_name_en, 'Deleted product') AS name_en,
                COALESCE(p.barcode, si.product_barcode) AS barcode
         FROM sale_items si
         LEFT JOIN products p ON si.product_id = p.id
         WHERE si.sale_id = ?`,
        [sale.id]
      );
      const hasQtyReturned = await hasColumn('sale_items', 'quantity_returned');
      const itemsWithReturnable = (items as any[]).map((i) => ({
        ...i,
        quantity_returnable: hasQtyReturned ? Math.max(0, (i.quantity || 0) - (i.quantity_returned || 0)) : i.quantity,
      }));
      return res.json({ source: 'pos' as const, sale, items: itemsWithReturnable });
    }

    const fallbackOnline = await tryOnline(raw);
    if (fallbackOnline) return res.json(fallbackOnline);
    return res.status(404).json({ error: 'Invoice not found' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

app.get('/api/sales/by-invoice', authenticateToken, handleSalesByInvoiceLookup);
app.get('/api/sales/by-invoice-number', authenticateToken, handleSalesByInvoiceLookup);

app.get('/api/invoices', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 500) : 50;

    const query = `
      SELECT s.*, u.username as cashier_name,
             sh.business_name, sh.owner_name, sh.activity_type, sh.address, sh.contact_email, sh.contact_phone, sh.logo_url
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN shops sh ON s.shop_id = sh.id
      WHERE s.shop_id = ?
      ORDER BY s.created_at DESC
      LIMIT ${limit}
    `;
    const params = [shopId];
    const [sales] = await pool.execute(query, params);
    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sales/:id/items', authenticateToken, async (req: any, res: Response) => {
  try {
    const saleId = parseInt(req.params.id, 10);
    if (!saleId) {
      return res.status(400).json({ error: 'Invalid sale id' });
    }
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const [sales] = await pool.execute('SELECT * FROM sales WHERE id = ? AND shop_id = ?', [saleId, shopId]);
    const saleArray = sales as any[];
    if (saleArray.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const [items] = await pool.execute(
      `SELECT si.*,
              COALESCE(p.name_en, si.product_name_en, 'Deleted product') AS name_en,
              COALESCE(p.name_ar, si.product_name_ar, 'منتج محذوف') AS name_ar,
              COALESCE(p.barcode, si.product_barcode) AS barcode,
              COALESCE(p.sku, si.product_sku) AS sku,
              pu.name_ar AS unit_name_ar,
              pu.name_en AS unit_name_en
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id
       LEFT JOIN product_units pu ON si.unit_id = pu.id
       WHERE si.sale_id = ?`,
      [saleId]
    );
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sales/:id/returns', authenticateToken, async (req: any, res: Response) => {
  try {
    const saleId = parseInt(req.params.id, 10);
    if (!saleId) return res.status(400).json({ error: 'Invalid sale id' });
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const [rows] = await pool.execute(
      `SELECT r.*, u.username as created_by
       FROM returns r
       LEFT JOIN users u ON r.created_by_user_id = u.id
       WHERE r.sale_id = ? AND r.shop_id = ?
       ORDER BY r.created_at DESC`,
      [saleId, shopId]
    );
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== RETURNS (المرتجع) ==========
const returnsRoles = ['super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'];
app.get('/api/returns', authenticateToken, requireRole(...returnsRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 500);
    const invoice = String(req.query.invoice || '').trim();
    const period = String(req.query.period || '').toLowerCase();
    let periodFilter = '';
    if (period === 'daily' || period === 'today') {
      periodFilter = ' AND DATE(r.created_at) = CURDATE()';
    } else if (period === 'weekly' || period === 'week') {
      periodFilter = ' AND r.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'monthly' || period === 'month') {
      periodFilter = ' AND r.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    } else if (period === 'yearly' || period === 'year') {
      periodFilter = ' AND r.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
    }
    let sql = `SELECT r.id, r.return_number, r.sale_id, r.online_order_id, r.total_amount, r.reason, r.created_at, r.print_count,
      r.created_by_user_id, r.branch_id,
      u.username as created_by, s.invoice_number as original_invoice_number, s.id as original_invoice_id,
      s.customer_name, s.customer_phone, s.total_amount as sale_total,
      b.name as branch_name, b.name_ar as branch_name_ar, b.name_en as branch_name_en,
      (SELECT COUNT(*) FROM return_items ri WHERE ri.return_id = r.id) as items_count
      FROM returns r
      LEFT JOIN users u ON r.created_by_user_id = u.id
      LEFT JOIN sales s ON r.sale_id = s.id
      LEFT JOIN branches b ON b.id = r.branch_id AND b.shop_id = r.shop_id
      WHERE r.shop_id = ?`;
    const params: any[] = [shopId];
    if (invoice) {
      sql += ' AND s.invoice_number LIKE ?';
      params.push(`%${invoice}%`);
    }
    sql += periodFilter;
    sql += ` ORDER BY r.created_at DESC LIMIT ${limit}`;
    console.log('[RETURNS-LIST-SQL] sql=%s params=%j', sql.slice(0, 300), params);
    let rowsArray: any[];
    try {
      const [rows] = await pool.execute(sql, params);
      rowsArray = Array.isArray(rows) ? rows : [];
    } catch (qerr: any) {
      console.error('[RETURNS-LIST] query error shopId=%s period=%s err=%s sql=%s', shopId, period, qerr?.message, sql.slice(0, 200));
      throw qerr;
    }
    const list = rowsArray.map((r: any) => ({
      id: r.id,
      return_number: r.return_number,
      sale_id: r.sale_id,
      online_order_id: r.online_order_id,
      total_amount: r.total_amount,
      reason: r.reason,
      created_at: r.created_at,
      print_count: r.print_count,
      created_by: r.created_by,
      invoice_number: r.original_invoice_number ?? r.invoice_number,
      customer_name: r.customer_name,
      customer_phone: r.customer_phone,
      items_count: r.items_count ?? 0,
      type: r.sale_total != null && r.total_amount >= (parseFloat(r.sale_total) || 0) - 0.01 ? 'full' : 'partial',
    }));
    console.log('[RETURNS-LIST] shopId=%s period=%s count=%s', shopId, period || 'all', list.length);
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/returns/:id', authenticateToken, requireRole(...returnsRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    const [retRows] = await pool.execute(
      `SELECT r.*, u.username as created_by, s.invoice_number, s.customer_name, s.customer_phone, s.total_amount as sale_total,
        b.name as branch_name, b.name_ar as branch_name_ar, b.name_en as branch_name_en
       FROM returns r
       LEFT JOIN users u ON r.created_by_user_id = u.id
       LEFT JOIN sales s ON r.sale_id = s.id
       LEFT JOIN branches b ON b.id = r.branch_id AND b.shop_id = r.shop_id
       WHERE r.id = ? AND r.shop_id = ?`,
      [id, shopId]
    );
    if ((retRows as any[]).length === 0) return res.status(404).json({ error: 'Return not found' });
    const ret = (retRows as any[])[0];
    const [items] = await pool.execute(
      `SELECT ri.*, p.name_ar, p.name_en FROM return_items ri LEFT JOIN products p ON ri.product_id = p.id WHERE ri.return_id = ?`,
      [id]
    );
    res.json({ return: ret, items: items || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/returns/:id/print', authenticateToken, requireRole(...returnsRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    const hasPrintCount = await hasColumn('returns', 'print_count');
    const hasRetBr = await hasColumn('returns', 'branch_id');
    const [brRows] = await pool.execute(
      hasRetBr ? 'SELECT print_count, branch_id FROM returns WHERE id = ? AND shop_id = ?' : 'SELECT print_count FROM returns WHERE id = ? AND shop_id = ?',
      hasRetBr ? [id, shopId] : [id, shopId]
    );
    if ((brRows as any[]).length === 0) return res.status(404).json({ error: 'Return not found' });
    const retBr = hasRetBr ? (brRows as any[])[0]?.branch_id : null;
    if (!hasPrintCount) {
      await insertPrintLog(req, shopId, 'sales_return', id, retBr);
      return res.json({ printCount: 0, lastPrintedAt: null });
    }
    const [up] = await pool.execute(
      'UPDATE returns SET print_count = COALESCE(print_count, 0) + 1 WHERE id = ? AND shop_id = ?',
      [id, shopId]
    );
    if ((up as any).affectedRows === 0) return res.status(404).json({ error: 'Return not found' });
    const [rows] = await pool.execute('SELECT print_count FROM returns WHERE id = ?', [id]);
    const printCount = Number((rows as any[])[0]?.print_count ?? 0);
    await insertPrintLog(req, shopId, 'sales_return', id, retBr);
    res.json({ printCount, lastPrintedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const RETURNS_DEADLOCK_RETRY_BACKOFF_MS = [100, 250, 500];
function isDeadlockError(err: any): boolean {
  if (!err) return false;
  const code = err?.code || err?.errno;
  const msg = String(err?.message || err?.sqlMessage || '').toLowerCase();
  return code === 'ER_LOCK_DEADLOCK' || code === 1213 || msg.includes('deadlock');
}

app.post('/api/returns', authenticateToken, requireRole(...returnsRoles), async (req: any, res: Response) => {
  const shopId = getShopIdOrFail(req, res);
  if (shopId === null) return;
  const { sale_id, online_order_id, items, reason } = req.body || {};
  const saleIdNum = sale_id != null ? parseInt(String(sale_id), 10) : 0;
  const onlineOid = online_order_id != null ? parseInt(String(online_order_id), 10) : 0;
  if ((!saleIdNum && !onlineOid) || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'sale_id or online_order_id, and items, required' });
  }

  if (onlineOid > 0) {
    const itemsCount = items.length;
    console.log('[RETURNS] online shopId=%s onlineOrderId=%s itemsCount=%s', shopId, onlineOid, itemsCount);
    const hasOnlineOrderIdCol = await hasColumn('returns', 'online_order_id');
    if (!hasOnlineOrderIdCol) {
      return res.status(500).json({ error: 'returns.online_order_id not available' });
    }
    const connection = await pool.getConnection();
    try {
      const [orders] = await connection.execute('SELECT * FROM online_orders WHERE id = ? AND shop_id = ?', [onlineOid, shopId]);
      if ((orders as any[]).length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Order not found' });
      }
      const order = (orders as any[])[0];
      const [ooiRows] = await connection.execute('SELECT * FROM online_order_items WHERE order_id = ?', [onlineOid]);
      const ooiArr = ooiRows as any[];
      await connection.query('START TRANSACTION');
      const [lastRet] = await connection.execute('SELECT return_number FROM returns WHERE shop_id = ? ORDER BY id DESC LIMIT 1', [shopId]);
      const lastNum = (lastRet as any[])[0]?.return_number || '0';
      const returnNumber = `RET-${String(parseInt(String(lastNum).replace(/\D/g, ''), 10) + 1)}`;
      const hasReturnBranchCol = await hasColumn('returns', 'branch_id');
      const branchId = order.branch_id ? parseInt(order.branch_id, 10) : null;
      const userId = req.user?.id ?? null;
      const [ins] = hasReturnBranchCol
        ? await connection.execute(
            'INSERT INTO returns (shop_id, sale_id, online_order_id, return_number, total_amount, reason, created_by_user_id, branch_id) VALUES (?, NULL, ?, ?, ?, ?, ?, ?)',
            [shopId, onlineOid, returnNumber, 0, reason || null, userId, branchId]
          )
        : await connection.execute(
            'INSERT INTO returns (shop_id, sale_id, online_order_id, return_number, total_amount, reason, created_by_user_id) VALUES (?, NULL, ?, ?, ?, ?, ?)',
            [shopId, onlineOid, returnNumber, 0, reason || null, userId]
          );
      const returnId = (ins as any).insertId;
      const [retAgg] = await connection.execute(
        `SELECT ri.sale_item_id, COALESCE(SUM(ri.quantity), 0) AS rq
         FROM return_items ri
         INNER JOIN returns r ON r.id = ri.return_id
         WHERE r.online_order_id = ? AND ri.sale_item_id IS NOT NULL
         GROUP BY ri.sale_item_id`,
        [onlineOid]
      );
      const retMap = new Map((retAgg as any[]).map((x) => [Number(x.sale_item_id), Number(x.rq)]));
      let totalAmount = 0;
      const hasSaleItemId = await hasColumn('return_items', 'sale_item_id');
      const [biRows] = await pool.execute('SELECT 1 FROM branch_inventory WHERE shop_id = ? LIMIT 1', [shopId]).catch(() => [[]]);
      const hasBranchInventory = (biRows as any[]).length > 0;

      for (const it of items) {
        const saleItemId = it.sale_item_id ? parseInt(String(it.sale_item_id), 10) : null;
        const qty = Math.max(1, parseInt(String(it.quantity), 10) || 1);
        const ooi = saleItemId ? ooiArr.find((x: any) => Number(x.id) === saleItemId) : null;
        if (!ooi) {
          await connection.query('ROLLBACK');
          connection.release();
          return res.status(400).json({ error: 'Invalid order line' });
        }
        const sold = Number(ooi.quantity) || 0;
        const already = retMap.get(Number(ooi.id)) || 0;
        const maxRet = Math.max(0, sold - already);
        if (qty > maxRet) {
          await connection.query('ROLLBACK');
          connection.release();
          return res.status(400).json({ error: `Cannot return more than ${maxRet} for this line` });
        }
        const up = parseFloat(ooi.sell_price_snapshot) || parseFloat(String(it.unit_price)) || 0;
        const tot = qty * up;
        totalAmount += tot;
        if (hasSaleItemId) {
          await connection.execute(
            'INSERT INTO return_items (return_id, product_id, sale_item_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)',
            [returnId, ooi.product_id, ooi.id, qty, up, tot]
          );
        } else {
          await connection.execute(
            'INSERT INTO return_items (return_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
            [returnId, ooi.product_id, qty, up, tot]
          );
        }
        const stockQty = it.quantity_base_units != null ? parseInt(String(it.quantity_base_units), 10) : qty;
        await connection.execute(
          'UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) + ? WHERE id = ? AND shop_id = ?',
          [stockQty, ooi.product_id, shopId]
        );
        if (hasBranchInventory && branchId) {
          await connection.execute(
            `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
            [shopId, branchId, ooi.product_id, stockQty, stockQty]
          );
        }
      }
      await connection.execute('UPDATE returns SET total_amount = ? WHERE id = ?', [totalAmount, returnId]);
      await connection.query('COMMIT');
      const [newRet] = await connection.execute('SELECT * FROM returns WHERE id = ?', [returnId]);
      connection.release();
      return res.status(201).json({ ok: true, return: (newRet as any[])[0] });
    } catch (error: any) {
      await connection.query('ROLLBACK').catch(() => {});
      connection.release();
      return res.status(500).json({ error: error.message });
    }
  }

  const itemsCount = items.length;
  console.log('[RETURNS] request shopId=%s saleId=%s itemsCount=%s', shopId, saleIdNum, itemsCount);

  if (!saleIdNum) {
    return res.status(400).json({ error: 'sale_id required for POS returns' });
  }

  let lastError: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    const connection = await pool.getConnection();
    const logErr = (err: any, step: string) => {
      console.error(`[RETURNS] step=${step} err.code=${err?.code} err.errno=${err?.errno} err.sqlState=${err?.sqlState} err.sqlMessage=${err?.sqlMessage} err.message=${err?.message}`);
    };
    try {
      console.log('[RETURNS] step=select_sale');
      const [saleRows] = await connection.execute('SELECT id, total_amount, branch_id FROM sales WHERE id = ? AND shop_id = ?', [saleIdNum, shopId]);
      if ((saleRows as any[]).length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Sale not found' });
      }
      const sale = (saleRows as any[])[0];
      const saleTotal = parseFloat(sale.total_amount) || 0;
      const saleBranchId = sale.branch_id ? parseInt(sale.branch_id, 10) : null;
      console.log('[RETURNS] step=hasColumn_checks');
      const hasReturnStatus = await hasColumn('sales', 'return_status');
      const hasReturnedAmount = await hasColumn('sales', 'returned_amount');
      const hasQuantityReturned = await hasColumn('sale_items', 'quantity_returned');
      const hasLineTotalAfterTax = await hasColumn('sale_items', 'line_total_after_tax');
      const hasSaleItemTaxAmount = await hasColumn('sale_items', 'tax_amount');
      const hasSaleItemId = await hasColumn('return_items', 'sale_item_id');
      const hasBranchId = await hasColumn('sale_items', 'branch_id');
      const hasReturnBranchCol = await hasColumn('returns', 'branch_id');
      const [biRows] = await pool.execute('SELECT 1 FROM branch_inventory WHERE shop_id = ? LIMIT 1', [shopId]).catch(() => [[]]);
      const hasBranchInventory = (biRows as any[]).length > 0;
      const returnBranchId =
        saleBranchId && Number(saleBranchId) > 0
          ? Number(saleBranchId)
          : (await resolveOptionalBranchId(req, shopId)) ?? null;
      console.log('[RETURNS] step=begin_transaction');
      await connection.query('START TRANSACTION');
      console.log('[RETURNS] step=select_last_return');
      const [lastRet] = await connection.execute('SELECT return_number FROM returns WHERE shop_id = ? ORDER BY id DESC LIMIT 1', [shopId]);
      const lastNum = (lastRet as any[])[0]?.return_number || '0';
      const returnNumber = `RET-${String(parseInt(lastNum.replace(/\D/g, ''), 10) + 1)}`;
      let totalAmount = 0;
      const userId = req.user?.id ?? null;
      console.log('[RETURNS] step=insert_return');
      const [ins] = hasReturnBranchCol
        ? await connection.execute(
            'INSERT INTO returns (shop_id, sale_id, return_number, total_amount, reason, created_by_user_id, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [shopId, saleIdNum, returnNumber, 0, reason || null, userId, returnBranchId]
          )
        : await connection.execute(
            'INSERT INTO returns (shop_id, sale_id, return_number, total_amount, reason, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [shopId, saleIdNum, returnNumber, 0, reason || null, userId]
          );
      const returnId = (ins as any).insertId;
      const saleItemsCols = ['id', 'product_id', 'quantity', 'quantity_base_units', 'unit_price']
        .concat(hasQuantityReturned ? ['quantity_returned'] : [])
        .concat(hasLineTotalAfterTax ? ['line_total_after_tax'] : [])
        .concat(hasSaleItemTaxAmount ? ['tax_amount'] : [])
        .concat(hasBranchId ? ['branch_id'] : []);
      console.log('[RETURNS] step=select_sale_items');
      const [saleItemsRows] = await connection.execute(
        `SELECT ${saleItemsCols.join(', ')} FROM sale_items WHERE sale_id = ?`,
        [saleIdNum]
      );
      const saleItemsArr = saleItemsRows as any[];

      type EnrichedItem = { it: any; productId: number; branchId: number; si: any; qty: number; saleItemId: number | null; qtyBase: number; up: number; tot: number; stockQty: number };
      const enriched: EnrichedItem[] = [];
      for (const it of items) {
        const productId = parseInt(it.product_id, 10);
        const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
        const saleItemId = it.sale_item_id ? parseInt(it.sale_item_id, 10) : null;
        const si = saleItemId ? saleItemsArr.find((s: any) => s.id === saleItemId) : saleItemsArr.find((s: any) => s.product_id === productId);
        if (si && hasQuantityReturned) {
          const soldQty = parseInt(si.quantity, 10) || 0;
          const alreadyRet = parseInt(si.quantity_returned, 10) || 0;
          const maxRet = Math.max(0, soldQty - alreadyRet);
          if (qty > maxRet) {
            await connection.query('ROLLBACK');
            connection.release();
            return res.status(400).json({ error: `Cannot return more than ${maxRet} for product ${productId} (sold: ${soldQty}, already returned: ${alreadyRet})` });
          }
        }
        const qtyBase = it.quantity_base_units != null ? parseInt(it.quantity_base_units, 10) : (si?.quantity_base_units != null && si?.quantity ? Math.round((qty / si.quantity) * si.quantity_base_units) : qty);
        const up = parseFloat(si?.unit_price ?? it.unit_price) || 0;
        const soldQty = Number(si?.quantity || 0);
        const lineAfterTax = hasLineTotalAfterTax ? Number(si?.line_total_after_tax || 0) : 0;
        const lineTax = hasSaleItemTaxAmount ? Number(si?.tax_amount || 0) : 0;
        const unitPriceAfterTax =
          soldQty > 0 && lineAfterTax > 0
            ? lineAfterTax / soldQty
            : soldQty > 0 && lineTax !== 0
              ? up + (lineTax / soldQty)
              : up;
        const tot = qty * up;
        // Return header total should match invoice math (after tax), not base product price.
        totalAmount += qty * unitPriceAfterTax;
        const branchId = (si?.branch_id ? parseInt(si.branch_id, 10) : null) || saleBranchId || 0;
        const stockQty = qtyBase > 0 ? qtyBase : qty;
        enriched.push({ it, productId, branchId, si: si || null, qty, saleItemId, qtyBase, up, tot, stockQty });
      }
      enriched.sort((a, b) => {
        if (a.productId !== b.productId) return a.productId - b.productId;
        return a.branchId - b.branchId;
      });

      console.log('[RETURNS] step=insert_items');
      for (const { it, productId, saleItemId, qty, up, tot } of enriched) {
        if (hasSaleItemId && saleItemId) {
          await connection.execute(
            'INSERT INTO return_items (return_id, product_id, sale_item_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)',
            [returnId, productId, saleItemId, qty, up, tot]
          );
        } else {
          await connection.execute(
            'INSERT INTO return_items (return_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
            [returnId, productId, qty, up, tot]
          );
        }
      }

      console.log('[RETURNS] step=update_products_stock');
      for (const { productId, stockQty } of enriched) {
        await connection.execute(
          'UPDATE products SET stock_quantity = COALESCE(stock_quantity, 0) + ? WHERE id = ? AND shop_id = ?',
          [stockQty, productId, shopId]
        );
      }

      console.log('[RETURNS] step=update_branch_inventory');
      for (const { productId, branchId, stockQty } of enriched) {
        if (hasBranchInventory && branchId) {
          await connection.execute(
            `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
            [shopId, branchId, productId, stockQty, stockQty]
          );
        }
      }

      for (const { saleItemId, qty } of enriched) {
        if (hasQuantityReturned && saleItemId) {
          await connection.execute(
            'UPDATE sale_items SET quantity_returned = COALESCE(quantity_returned, 0) + ? WHERE id = ? AND sale_id = ?',
            [qty, saleItemId, saleIdNum]
          );
        }
      }

      await connection.execute('UPDATE returns SET total_amount = ? WHERE id = ?', [totalAmount, returnId]);
      console.log('[RETURNS] step=update_sales_return_status');
      if (hasReturnedAmount && hasReturnStatus) {
        const [curr] = await connection.execute('SELECT returned_amount FROM sales WHERE id = ?', [saleIdNum]);
        const currReturned = parseFloat((curr as any[])[0]?.returned_amount) || 0;
        const newReturned = currReturned + totalAmount;
        const isFull = newReturned >= saleTotal - 0.01;
        await connection.execute(
          "UPDATE sales SET returned_amount = ?, return_status = ? WHERE id = ?",
          [newReturned, isFull ? 'full' : 'partial', saleIdNum]
        );
      }
      console.log('[RETURNS] step=commit');
      await connection.query('COMMIT');
      console.log('[RETURNS] step=select_new_return');
      const [newRet] = await connection.execute('SELECT * FROM returns WHERE id = ?', [returnId]);
      connection.release();
      return res.status(201).json({ ok: true, return: (newRet as any[])[0] });
    } catch (error: any) {
      lastError = error;
      logErr(error, 'catch');
      await connection.query('ROLLBACK').catch(() => {});
      connection.release();
      if (!isDeadlockError(error) || attempt >= 2) {
        console.error('[RETURNS] final err.code=%s err.errno=%s err.sqlState=%s err.sqlMessage=%s err.message=%s', error?.code, error?.errno, error?.sqlState, error?.sqlMessage, error?.message);
        return res.status(500).json({ error: error.message });
      }
      const delay = RETURNS_DEADLOCK_RETRY_BACKOFF_MS[attempt];
      console.log('[RETURNS] deadlock attempt=%s retry_in=%sms', attempt + 1, delay);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return res.status(500).json({ error: lastError?.message || 'Unknown error' });
});

// ========== ON-ACCOUNT (على الحساب) — Sales-based unpaid invoices ==========
const onAccountRoles = ['super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'];
app.get('/api/on-account', authenticateToken, requireRole(...onAccountRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const search = String(req.query.search || '').trim();
    const hasPaymentStatus = await hasColumn('sales', 'payment_status');
    if (!hasPaymentStatus) return res.json([]);
    let sql = `SELECT 
      COALESCE(s.customer_name, s.customer_phone, 'عميل بدون اسم') as customer_name,
      s.customer_phone,
      SUM(s.total_amount) as total_due,
      COUNT(s.id) as invoice_count,
      MAX(s.id) as latest_sale_id
    FROM sales s
    WHERE s.shop_id = ? AND s.payment_status = 'unpaid' AND (s.payment_method = 'on_account' OR s.payment_method IS NULL)
    `;
    const params: any[] = [shopId];
    if (search) {
      sql += ` AND (s.customer_name LIKE ? OR s.customer_phone LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like);
    }
    sql += ` GROUP BY COALESCE(s.customer_name, s.customer_phone, 'عميل بدون اسم'), s.customer_phone ORDER BY total_due DESC`;
    const [rows] = await pool.execute(sql, params).catch(() => [[]]);
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/on-account/sales/:sale_id', authenticateToken, requireRole(...onAccountRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const saleId = parseInt(req.params.sale_id, 10);
    const [saleRows] = await pool.execute(
      `SELECT s.*, u.username as created_by_username FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.shop_id = ?`,
      [saleId, shopId]
    );
    if ((saleRows as any[]).length === 0) return res.status(404).json({ error: 'Sale not found' });
    const sale = (saleRows as any[])[0];
    const [items] = await pool.execute(
      `SELECT si.*,
              COALESCE(p.name_ar, si.product_name_ar, 'منتج محذوف') AS name_ar,
              COALESCE(p.name_en, si.product_name_en, 'Deleted product') AS name_en
       FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [saleId]
    );
    res.json({ sale, items: items || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/on-account/customer/:key', authenticateToken, requireRole(...onAccountRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const key = String(req.params.key || '').trim();
    const hasPaymentStatus = await hasColumn('sales', 'payment_status');
    if (!hasPaymentStatus) return res.json({ sales: [], totalDue: 0 });
    let sql = `SELECT s.*, u.username as created_by_username FROM sales s LEFT JOIN users u ON s.user_id = u.id 
      WHERE s.shop_id = ? AND s.payment_status = 'unpaid' AND (s.payment_method = 'on_account' OR s.payment_method IS NULL)`;
    const params: any[] = [shopId];
    const keyNum = parseInt(key, 10);
    if (!isNaN(keyNum)) {
      sql += ` AND s.id = ?`;
      params.push(keyNum);
    } else if (key) {
      sql += ` AND (s.customer_phone = ? OR s.customer_name LIKE ?)`;
      params.push(key, `%${key}%`);
    }
    sql += ` ORDER BY s.created_at DESC`;
    const [sales] = await pool.execute(sql, params);
    const salesArr = sales as any[];
    let totalDue = 0;
    const salesWithItems: any[] = [];
    for (const s of salesArr) {
      totalDue += parseFloat(s.total_amount) || 0;
      const [items] = await pool.execute(
        `SELECT si.*,
                COALESCE(p.name_ar, si.product_name_ar, 'منتج محذوف') AS name_ar,
                COALESCE(p.name_en, si.product_name_en, 'Deleted product') AS name_en
         FROM sale_items si
         LEFT JOIN products p ON si.product_id = p.id
         WHERE si.sale_id = ?`,
        [s.id]
      );
      salesWithItems.push({ ...s, items: items || [] });
    }
    res.json({ sales: salesWithItems, totalDue });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/on-account/:sale_id/pay', authenticateToken, requireRole(...onAccountRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const saleId = parseInt(req.params.sale_id, 10);
    const { amount, payment_method } = req.body || {};
    const [saleRows] = await pool.execute(
      'SELECT * FROM sales WHERE id = ? AND shop_id = ?',
      [saleId, shopId]
    );
    if ((saleRows as any[]).length === 0) return res.status(404).json({ error: 'Sale not found' });
    const sale = (saleRows as any[])[0];
    const hasPaymentStatus = await hasColumn('sales', 'payment_status');
    if (!hasPaymentStatus) return res.status(400).json({ error: 'payment_status column not available' });
    if (sale.payment_status === 'paid') return res.status(400).json({ error: 'Sale already paid' });
    const totalAmount = parseFloat(sale.total_amount) || 0;
    const payAmount = amount != null ? parseFloat(amount) : totalAmount;
    if (payAmount <= 0) return res.status(400).json({ error: 'amount required' });
    const pm = payment_method || 'cash';
    const userId = req.user?.id ?? null;
    const [spCheck] = await pool.execute("SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'sale_payments'");
    if ((spCheck as any[]).length > 0) {
      await pool.execute(
        'INSERT INTO sale_payments (sale_id, shop_id, amount, payment_method, created_by_user_id) VALUES (?, ?, ?, ?, ?)',
        [saleId, shopId, payAmount, pm, userId]
      );
    }
    await pool.execute(
      "UPDATE sales SET payment_status = 'paid', paid_at = NOW(), paid_by_user_id = ? WHERE id = ?",
      [userId, saleId]
    );
    await pool.execute(
      `INSERT INTO vault_transactions (shop_id, user_id, type, amount, reason, related_sale_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [shopId, userId, 'in', payAmount, 'on_account_payment', saleId]
    );
    const [updated] = await pool.execute(
      `SELECT s.*, u.username as paid_by_username FROM sales s LEFT JOIN users u ON s.paid_by_user_id = u.id WHERE s.id = ?`,
      [saleId]
    );
    res.json({ ok: true, sale: (updated as any[])[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ON-ACCOUNT / DEBTS (على الحساب) ==========
const debtRoles = ['super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'];
app.get('/api/customer-debts', authenticateToken, requireRole(...debtRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const search = String(req.query.search || '').trim();
    const statusFilter = String(req.query.status || 'unpaid').toLowerCase();
    let sql = `SELECT d.*, 
      (d.total_due - COALESCE((SELECT SUM(amount) FROM customer_debt_payments WHERE debt_id = d.id), 0)) as remaining
      FROM customer_debts d WHERE d.shop_id = ?`;
    const params: any[] = [shopId];
    const hasStatus = await hasColumn('customer_debts', 'status');
    if (hasStatus && statusFilter === 'unpaid') {
      sql += " AND (d.status IS NULL OR d.status = '' OR d.status = 'unpaid')";
    } else if (hasStatus && statusFilter === 'paid') {
      sql += " AND (d.status = 'paid' OR d.status = 'converted')";
    }
    if (search) {
      sql += ' AND (d.customer_name LIKE ? OR d.customer_phone LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like);
    }
    if (statusFilter === 'unpaid') {
      sql += ' HAVING remaining > 0.01';
    }
    sql += ' ORDER BY d.updated_at DESC';
    const [rows] = await pool.execute(sql, params).catch(() => [[]]);
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/customer-debts/:id', authenticateToken, requireRole(...debtRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    const [debtRows] = await pool.execute('SELECT * FROM customer_debts WHERE id = ? AND shop_id = ?', [id, shopId]);
    if ((debtRows as any[]).length === 0) return res.status(404).json({ error: 'Debt not found' });
    const debt = (debtRows as any[])[0];
    const [items] = await pool.execute(
      `SELECT di.*, p.name_ar, p.name_en FROM customer_debt_items di LEFT JOIN products p ON di.product_id = p.id WHERE di.debt_id = ?`,
      [id]
    );
    const [payments] = await pool.execute('SELECT * FROM customer_debt_payments WHERE debt_id = ? ORDER BY created_at DESC', [id]);
    const totalPaid = (payments as any[]).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    const remaining = Math.max(0, (parseFloat(debt.total_due) || 0) - totalPaid);
    res.json({ debt, items: items || [], totalPaid, remaining });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customer-debts/from-cart', authenticateToken, requireRole(...debtRoles), async (req: any, res: Response) => {
  try {
    await ensureTaxRatesTable();
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const { items, customerName, customerPhone, customerAddress } = req.body || {};
    const cName = String(customerName || '').trim();
    const cPhone = String(customerPhone || '').trim();
    if (!cName || !cPhone) return res.status(400).json({ error: 'customer_name and customer_phone required for on-account' });
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'items required' });

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const userId = req.user?.id ?? null;
      const hasDiscountCols = await hasColumn('products', 'discount_type');
      const hasTaxRateId = await hasColumn('products', 'tax_rate_id');
      let prodSelect = 'SELECT id, name_ar, name_en, sell_price, stock_quantity';
      if (hasDiscountCols) prodSelect += ', discount_type, discount_value, discount_active';
      if (hasTaxRateId) prodSelect += ', tax_rate_id';
      prodSelect += ' FROM products WHERE id = ? AND shop_id = ?';

      const [taxRows] = await connection.execute(
        'SELECT id, type, rate, inclusive, apply_before_discount FROM tax_rates WHERE shop_id = ? AND is_active = 1',
        [shopId]
      ).catch(() => [[]]);
      const taxMap = new Map<number, TaxRuleRow>();
      for (const row of (taxRows as any[])) {
        taxMap.set(row.id, {
          id: row.id,
          type: row.type || 'percentage',
          rate: Number(row.rate) || 0,
          inclusive: Boolean(row.inclusive),
          apply_before_discount: row.apply_before_discount !== 0,
        });
      }
      // If no active tax found, use first tax for shop (so "on account" applies same tax as cash)
      if (taxMap.size === 0) {
        const [fallbackRows] = await connection.execute(
          'SELECT id, type, rate, inclusive, apply_before_discount FROM tax_rates WHERE shop_id = ? ORDER BY id LIMIT 1',
          [shopId]
        ).catch(() => [[]]);
        for (const row of (fallbackRows as any[])) {
          taxMap.set(row.id, {
            id: row.id,
            type: row.type || 'percentage',
            rate: Number(row.rate) || 0,
            inclusive: Boolean(row.inclusive),
            apply_before_discount: row.apply_before_discount !== 0,
          });
          break;
        }
      }

      type DebtResolvedItem = {
        productId: number;
        name_ar: string;
        name_en: string;
        quantity: number;
        quantityBase: number;
        unitId: number | null;
        taxRateId: number | null;
        unitPriceBeforeTax: number;
        taxRatePct: number;
        taxAmount: number;
        lineTotalBeforeTax: number;
        lineTotalAfterTax: number;
      };
      const resolvedItems: DebtResolvedItem[] = [];
      let subtotal = 0;
      let totalTax = 0;
      let totalAmount = 0;

      for (const item of items) {
        const productId = Number(item.productId);
        const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
        const factorToBase = Number(item.factorToBase) || 1;
        const quantityBase = quantity * factorToBase;
        if (!Number.isFinite(productId) || productId <= 0) continue;

        const [prodRows] = await connection.execute(prodSelect, [productId, shopId]);
        const prod = (prodRows as any[])[0];
        if (!prod) {
          await connection.rollback();
          throw new Error(`Product ${productId} not found`);
        }
        const stock = Number(prod.stock_quantity ?? 0);
        if (stock < quantityBase) {
          await connection.rollback();
          throw new Error(`Insufficient stock for product ${productId}: requested ${quantityBase}, available ${stock}`);
        }

        const sellPrice = Number(prod.sell_price || 0);
        const sellPriceRounded = Math.round(sellPrice * 100) / 100;
        let unitPrice = sellPriceRounded;
        let unitPriceBeforeDiscount = sellPriceRounded;
        let unitDiscount = 0;
        if (hasDiscountCols && prod.discount_active && prod.discount_type !== 'none') {
          const { unitPriceAfterDiscount, unitDiscount: ud } = computeProductUnitPrice(
            sellPrice,
            prod.discount_active,
            String(prod.discount_type || 'none'),
            prod.discount_value
          );
          unitPrice = unitPriceAfterDiscount;
          unitPriceBeforeDiscount = sellPriceRounded;
          unitDiscount = ud;
        }
        const lineDiscountTotal = unitDiscount * quantity;
        const taxRule = resolveTaxRule(taxMap, prod.tax_rate_id, !!hasTaxRateId);
        const applyTaxBeforeDiscount = taxRule ? taxRule.apply_before_discount : true;
        const unitForTax = applyTaxBeforeDiscount ? unitPriceBeforeDiscount : unitPrice;
        const { lineTotalBeforeTax, taxAmount, lineTotalAfterTax, taxRatePct } = computeLineTax(
          unitForTax,
          quantity,
          taxRule,
          lineDiscountTotal,
          applyTaxBeforeDiscount
        );
        const debtTaxRateIdVal = hasTaxRateId && prod.tax_rate_id ? prod.tax_rate_id : null;

        resolvedItems.push({
          productId,
          name_ar: prod.name_ar || '',
          name_en: prod.name_en || '',
          quantity,
          quantityBase,
          unitId: item.unitId ?? null,
          taxRateId: debtTaxRateIdVal,
          unitPriceBeforeTax: quantity > 0 ? Math.round((lineTotalBeforeTax / quantity) * 100) / 100 : 0,
          taxRatePct,
          taxAmount,
          lineTotalBeforeTax,
          lineTotalAfterTax,
        });
        subtotal += lineTotalBeforeTax;
        totalTax += taxAmount;
        totalAmount += lineTotalAfterTax;
      }

      if (resolvedItems.length === 0) {
        await connection.rollback();
        throw new Error('No valid items');
      }

      const [lastDebt] = await connection.execute(
        "SELECT id FROM customer_debts WHERE shop_id = ? ORDER BY id DESC LIMIT 1",
        [shopId]
      );
      const debtNumber = `DEBT-${new Date().getFullYear()}-${String(((lastDebt as any[])[0]?.id || 0) + 1).padStart(4, '0')}`;

      // total_due = totalAmount (sum of line_total_after_tax) so customer balance is always after tax
      const hasStatus = await hasColumn('customer_debts', 'status');
      const insertCols = hasStatus
        ? 'shop_id, customer_name, customer_phone, total_due, notes, created_by_user_id, status'
        : 'shop_id, customer_name, customer_phone, total_due, notes, created_by_user_id';
      const insertVals = hasStatus ? 'VALUES (?, ?, ?, ?, ?, ?, ?)' : 'VALUES (?, ?, ?, ?, ?, ?)';
      const insertParams: any[] = [shopId, cName, cPhone || null, totalAmount, null, userId];
      if (hasStatus) insertParams.push('unpaid');

      const [ins] = await connection.execute(
        `INSERT INTO customer_debts (${insertCols}) ${insertVals}`,
        insertParams
      );
      const debtId = (ins as any).insertId;

      const hasQtyBase = await hasColumn('customer_debt_items', 'quantity_base_units');
      for (const it of resolvedItems) {
        const unitPriceBeforeTax = it.quantity > 0 ? it.lineTotalBeforeTax / it.quantity : 0;
        if (hasQtyBase) {
          await connection.execute(
            'INSERT INTO customer_debt_items (debt_id, product_id, quantity, unit_price, total, quantity_base_units) VALUES (?, ?, ?, ?, ?, ?)',
            [debtId, it.productId, it.quantity, unitPriceBeforeTax, it.lineTotalAfterTax, it.quantityBase]
          );
        } else {
          await connection.execute(
            'INSERT INTO customer_debt_items (debt_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)',
            [debtId, it.productId, it.quantity, unitPriceBeforeTax, it.lineTotalAfterTax]
          );
        }
        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND shop_id = ?',
          [it.quantityBase, it.productId, shopId]
        );
      }

      await connection.commit();
      const [newDebt] = await pool.execute('SELECT * FROM customer_debts WHERE id = ?', [debtId]);
      const responseItems = resolvedItems.map((it) => ({
        productId: it.productId,
        name_ar: it.name_ar,
        name_en: it.name_en,
        quantity: it.quantity,
        unit_price_before_tax: it.unitPriceBeforeTax,
        tax_rate_id: it.taxRateId,
        tax_rate: it.taxRatePct,
        tax_amount: it.taxAmount,
        line_total_before_tax: it.lineTotalBeforeTax,
        line_total_after_tax: it.lineTotalAfterTax,
      }));
      res.status(201).json({
        ok: true,
        debt: { ...(newDebt as any[])[0], debt_number: debtNumber },
        debtNumber,
        totalAmount,
        subtotal,
        totalTax,
        grandTotal: totalAmount,
        items: responseItems,
      });
    } catch (err: any) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customer-debts', authenticateToken, requireRole(...debtRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const { customer_name, customer_phone, total_due, notes, items } = req.body || {};
    if (!customer_name || total_due == null) return res.status(400).json({ error: 'customer_name and total_due required' });
    const amount = parseFloat(total_due) || 0;
    const userId = req.user?.id ?? null;
    const [ins] = await pool.execute(
      'INSERT INTO customer_debts (shop_id, customer_name, customer_phone, total_due, notes, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [shopId, String(customer_name).trim(), customer_phone || null, amount, notes || null, userId]
    );
    const debtId = (ins as any).insertId;
    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        const qty = parseInt(it.quantity, 10) || 1;
        const up = parseFloat(it.unit_price) || 0;
        await pool.execute(
          'INSERT INTO customer_debt_items (debt_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)',
          [debtId, it.product_id || null, it.description || null, qty, up, qty * up]
        );
      }
    }
    const [newDebt] = await pool.execute('SELECT * FROM customer_debts WHERE id = ?', [debtId]);
    res.status(201).json({ ok: true, debt: (newDebt as any[])[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customer-debts/:id/pay', authenticateToken, requireRole(...debtRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const debtId = parseInt(req.params.id, 10);
    const { amount } = req.body || {};
    const payAmountRaw = parseFloat(amount) || 0;
    if (payAmountRaw <= 0) return res.status(400).json({ error: 'amount required' });
    const [debtRows] = await pool.execute('SELECT * FROM customer_debts WHERE id = ? AND shop_id = ?', [debtId, shopId]);
    if ((debtRows as any[]).length === 0) return res.status(404).json({ error: 'Debt not found' });
    const debt = (debtRows as any[])[0];
    const hasStatusCol = await hasColumn('customer_debts', 'status');
    if (hasStatusCol && (debt.status === 'converted' || debt.status === 'paid')) {
      return res.status(400).json({ error: 'Debt already paid or converted' });
    }
    const totalDue = parseFloat(debt.total_due) || 0;
    const [paymentsRows] = await pool.execute('SELECT COALESCE(SUM(amount), 0) as total FROM customer_debt_payments WHERE debt_id = ?', [debtId]);
    const alreadyPaid = parseFloat((paymentsRows as any[])[0]?.total) || 0;
    const remainingBefore = Math.max(0, Math.round((totalDue - alreadyPaid) * 100) / 100);
    const appliedPay = Math.min(Math.max(payAmountRaw, 0), remainingBefore);
    if (appliedPay <= 0) {
      return res.status(400).json({ error: 'No remaining balance to pay' });
    }
    const paymentCapped = payAmountRaw > appliedPay + 0.0001;
    const userId = req.user?.id ?? null;

    await pool.execute(
      'INSERT INTO customer_debt_payments (debt_id, amount, created_by_user_id) VALUES (?, ?, ?)',
      [debtId, appliedPay, userId]
    );

    const newDue = Math.max(0, Math.round((remainingBefore - appliedPay) * 100) / 100);

    if (newDue > 0.01) {
      try {
        await pool.execute(
          `INSERT INTO vault_transactions (shop_id, user_id, type, amount, reason, related_sale_id) VALUES (?, ?, ?, ?, ?, ?)`,
          [shopId, userId, 'in', appliedPay, 'debt_partial_payment', null]
        );
      } catch (_) {
        /* vault optional */
      }
    }

    if (newDue <= 0.01) {
      const debtSaleBranchId = await resolveOptionalBranchId(req, shopId);
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      try {
        const invoiceNumber = await generateInvoiceNumber(shopId);
        const [items] = await connection.execute(
          `SELECT di.*,
                  p.name_ar AS join_name_ar,
                  p.name_en AS join_name_en,
                  CASE WHEN p.id IS NOT NULL THEN di.product_id ELSE NULL END AS sale_product_id
           FROM customer_debt_items di
           LEFT JOIN products p ON p.id = di.product_id AND p.shop_id = ?
           WHERE di.debt_id = ?`,
          [shopId, debtId]
        );
        const saleItems = items as any[];
        const totalAmount = saleItems.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);

        const hasSalesBr = await hasColumn('sales', 'branch_id');
        const [saleIns] = hasSalesBr
          ? await connection.execute(
              `INSERT INTO sales (shop_id, user_id, invoice_number, customer_name, customer_phone, customer_address, total_amount, payment_method, branch_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'cash', ?)`,
              [shopId, userId, invoiceNumber, debt.customer_name, debt.customer_phone, null, totalAmount, debtSaleBranchId]
            )
          : await connection.execute(
              `INSERT INTO sales (shop_id, user_id, invoice_number, customer_name, customer_phone, customer_address, total_amount, payment_method)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'cash')`,
              [shopId, userId, invoiceNumber, debt.customer_name, debt.customer_phone, null, totalAmount]
            );
        const saleId = (saleIns as any).insertId;

        const hasSaleItemDiscount = await hasColumn('sale_items', 'unit_price_before_discount');
        const hasSaleItemNames = await hasColumn('sale_items', 'product_name_ar');
        for (const it of saleItems) {
          const qty = parseInt(it.quantity, 10) || 1;
          const qtyBase = it.quantity_base_units != null ? parseInt(it.quantity_base_units, 10) : qty;
          const up = parseFloat(it.unit_price) || 0;
          const tot = qty * up;
          const rawPid = it.sale_product_id;
          const salePid =
            rawPid != null && rawPid !== '' && Number.isFinite(Number(rawPid)) && Number(rawPid) > 0 ? Number(rawPid) : null;
          const nmAr = String(it.join_name_ar || it.description || '').trim() || 'منتج محذوف';
          const nmEn = String(it.join_name_en || it.description || '').trim() || 'Deleted product';

          if (hasSaleItemDiscount && hasSaleItemNames) {
            await connection.execute(
              'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price, unit_id, quantity_base_units, unit_price_before_discount, unit_discount, discount_type, discount_value, discount_applied, product_name_ar, product_name_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, 0, ?, ?)',
              [saleId, salePid, qty, up, tot, it.unit_id || null, qtyBase, up, nmAr, nmEn]
            );
          } else if (hasSaleItemDiscount) {
            await connection.execute(
              'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price, unit_id, quantity_base_units, unit_price_before_discount, unit_discount, discount_type, discount_value, discount_applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, 0)',
              [saleId, salePid, qty, up, tot, it.unit_id || null, qtyBase, up]
            );
          } else if (hasSaleItemNames) {
            await connection.execute(
              'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price, unit_id, quantity_base_units, product_name_ar, product_name_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [saleId, salePid, qty, up, tot, it.unit_id || null, qtyBase, nmAr, nmEn]
            );
          } else {
            await connection.execute(
              'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price, unit_id, quantity_base_units) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [saleId, salePid, qty, up, tot, it.unit_id || null, qtyBase]
            );
          }
        }

        await connection.execute(
          'INSERT INTO vault_transactions (shop_id, user_id, type, amount, reason, related_sale_id) VALUES (?, ?, ?, ?, ?, ?)',
          [shopId, userId, 'in', totalAmount, 'debt_converted', saleId]
        );

        const totalPaidNow = alreadyPaid + appliedPay;
        const hasConvertedCols = await hasColumn('customer_debts', 'converted_sale_id');
        const hasPaidAmount = await hasColumn('customer_debts', 'paid_amount');
        const hasPaidByUser = await hasColumn('customer_debts', 'paid_by_user_id');
        if (hasConvertedCols) {
          let updateSql = "UPDATE customer_debts SET status = 'converted', converted_sale_id = ?, converted_at = NOW(), paid_at = NOW()";
          const updateParams: any[] = [saleId];
          if (hasPaidAmount) {
            updateSql += ', paid_amount = ?';
            updateParams.push(totalPaidNow);
          }
          if (hasPaidByUser) {
            updateSql += ', paid_by_user_id = ?';
            updateParams.push(userId);
          }
          updateSql += ' WHERE id = ?';
          updateParams.push(debtId);
          await connection.execute(updateSql, updateParams);
        } else {
          await connection.execute('UPDATE customer_debts SET total_due = 0 WHERE id = ?', [debtId]);
        }
        console.log('[ONACCOUNT] status change: id=%s paid_amount=%s paid_at=%s shopId=%s', debtId, totalPaidNow, new Date().toISOString(), shopId);

        await connection.commit();
        const [updated] = await pool.execute('SELECT * FROM customer_debts WHERE id = ?', [debtId]);
        const [saleRow] = await pool.execute('SELECT * FROM sales WHERE id = ?', [saleId]);
        res.json({
          ok: true,
          debt: (updated as any[])[0],
          converted: true,
          partial: false,
          remainingAfter: 0,
          appliedAmount: appliedPay,
          paymentCapped,
          sale: (saleRow as any[])[0],
          saleId,
          invoiceNumber,
        });
      } catch (err: any) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    } else {
      const [updated] = await pool.execute('SELECT * FROM customer_debts WHERE id = ?', [debtId]);
      res.json({
        ok: true,
        debt: (updated as any[])[0],
        converted: false,
        partial: true,
        remainingAfter: newDue,
        appliedAmount: appliedPay,
        paymentCapped,
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== EXPENSES (مصاريف) ==========
app.get('/api/expenses', authenticateToken, requireRole(...returnsRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const category = String(req.query.category || '').trim();
    let sql = 'SELECT * FROM expenses WHERE shop_id = ?';
    const params: any[] = [shopId];
    if (from) { sql += ' AND expense_date >= ?'; params.push(from); }
    if (to) { sql += ' AND expense_date <= ?'; params.push(to); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    sql += ' ORDER BY expense_date DESC';
    const [rows] = await pool.execute(sql, params).catch(() => [[]]);
    const total = (rows as any[]).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    res.json({ items: rows || [], total });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

function normalizeExpenseDate(val: any): string {
  if (val == null || val === '') return new Date().toISOString().slice(0, 10);
  const s = String(val);
  return s.includes('T') ? s.slice(0, 10) : s.slice(0, 10);
}

app.post('/api/expenses', authenticateToken, requireRole(...returnsRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const { category, amount, description, expense_date } = req.body || {};
    if (!category || amount == null) return res.status(400).json({ error: 'category and amount required' });
    const amt = parseFloat(amount) || 0;
    const date = normalizeExpenseDate(expense_date);
    const userId = req.user?.id ?? null;
    const [ins] = await pool.execute(
      'INSERT INTO expenses (shop_id, category, amount, description, expense_date, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [shopId, String(category).trim(), amt, description || null, date, userId]
    );
    const id = (ins as any).insertId;
    const [newExp] = await pool.execute('SELECT * FROM expenses WHERE id = ?', [id]);
    const exp = (newExp as any[])[0];
    console.log('[EXPENSES] create/update: id=%s amount=%s date=%s shopId=%s', id, amt, date, shopId);
    res.status(201).json({ ok: true, expense: exp });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/expenses/:id', authenticateToken, requireRole(...returnsRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const userId = req.user?.id;
    const id = parseInt(req.params.id, 10);
    const { category, amount, description, expense_date } = req.body || {};
    const [rows] = await pool.execute('SELECT * FROM expenses WHERE id = ? AND shop_id = ?', [id, shopId]);
    if ((rows as any[]).length === 0) return res.status(404).json({ error: 'Expense not found' });
    const updates: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (amount !== undefined) { updates.push('amount = ?'); params.push(parseFloat(amount)); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (expense_date !== undefined) { updates.push('expense_date = ?'); params.push(normalizeExpenseDate(expense_date)); }
    const hasUpdatedBy = await hasColumn('expenses', 'updated_by_user_id');
    if (hasUpdatedBy && userId != null) { updates.push('updated_by_user_id = ?'); params.push(userId); }
    params.push(id);
    await pool.execute(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`, params);
    const [updated] = await pool.execute('SELECT * FROM expenses WHERE id = ?', [id]);
    const exp = (updated as any[])[0];
    const amt = exp?.amount ?? amount;
    const date = exp?.expense_date ?? expense_date;
    console.log('[EXPENSES] create/update: id=%s amount=%s date=%s shopId=%s', id, amt, date, shopId);
    res.json({ ok: true, expense: exp });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/expenses/:id', authenticateToken, requireRole(...returnsRoles), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute('SELECT * FROM expenses WHERE id = ? AND shop_id = ?', [id, shopId]);
    if ((rows as any[]).length === 0) return res.status(404).json({ error: 'Expense not found' });
    await pool.execute('DELETE FROM expenses WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== VAULT (الخزنة) ==========
app.get('/api/vault/summary', authenticateToken, requireRole('super_admin', 'shop_owner', 'cashier'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const [rows] = await pool.execute(
      `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0) as total_out
      FROM vault_transactions
      WHERE shop_id = ?
      `,
      [shopId]
    );
    const totals = (rows as any[])[0] || { total_in: 0, total_out: 0 };
    const balance = Number(totals.total_in || 0) - Number(totals.total_out || 0);
    res.json({
      totalIn: Number(totals.total_in || 0),
      totalOut: Number(totals.total_out || 0),
      balance,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/vault/transactions', authenticateToken, requireRole('super_admin', 'shop_owner', 'cashier'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 500);

    const [rows] = await pool.execute(
      `
      SELECT vt.*, u.username as created_by
      FROM vault_transactions vt
      LEFT JOIN users u ON vt.user_id = u.id
      WHERE vt.shop_id = ?
      ORDER BY vt.created_at DESC
      LIMIT ?
      `,
      [shopId, limit]
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vault/transactions', authenticateToken, requireRole('super_admin', 'shop_owner', 'cashier'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const { type, amount, reason, notes, relatedSaleId } = req.body;
    if (!['in', 'out'].includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const [result] = await pool.execute(
      `INSERT INTO vault_transactions (shop_id, user_id, type, amount, reason, notes, related_sale_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        shopId,
        req.user?.id || null,
        type,
        numericAmount,
        reason || null,
        notes || null,
        relatedSaleId || null,
      ]
    );
    const insertResult = result as any;

    await logAudit({
      shopId,
      userId: req.user?.id || null,
      action: 'vault_transaction_created',
      entityType: 'vault_transaction',
      entityId: insertResult.insertId,
      details: JSON.stringify({ type, amount: numericAmount, reason }),
      ipAddress: req.ip,
    });

    res.status(201).json({ id: insertResult.insertId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== AUDIT LOGS (المراجع) ==========
app.get('/api/audit-logs', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 500);

    const [rows] = await pool.execute(
      `
      SELECT al.*, u.username as actor
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.shop_id = ?
      ORDER BY al.created_at DESC
      LIMIT ?
      `,
      [shopId, limit]
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/audit-logs', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;

    const { action, entityType, entityId, details } = req.body;
    if (!action || !entityType) {
      return res.status(400).json({ error: 'action and entityType are required' });
    }

    const [result] = await pool.execute(
      `INSERT INTO audit_logs (shop_id, user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        shopId,
        req.user?.id || null,
        action,
        entityType,
        entityId || null,
        details ? String(details) : null,
        req.ip,
      ]
    );
    const insertResult = result as any;

    res.status(201).json({ id: insertResult.insertId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const setNoCacheHeaders = (res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
};

// ========== DASHBOARD STATISTICS ==========
const getDateRangeForPeriod = (period: string) => {
  const tz = 'Asia/Riyadh';
  const toDate = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: tz });
  const now = new Date();
  const today = toDate(now);
  let from = '1970-01-01';
  let to = '9999-12-31';
  if (period === 'today' || period === 'daily') {
    from = today;
    to = today;
  } else if (period === 'week' || period === 'weekly') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    from = toDate(d);
    to = today;
  } else if (period === 'month' || period === 'monthly') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    from = toDate(d);
    to = today;
  } else if (period === 'year' || period === 'yearly') {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    from = toDate(d);
    to = today;
  }
  return { from, to };
};

// ========== DASHBOARD API (required by app/dashboard/page.tsx) ==========
// GET /api/dashboard/stats  → { monthlyRevenue, totalProducts, lowStockCount }
// GET /api/dashboard/summary → { sales_total, net_drawer, orders_count, ... } (period, from, to, tzOffsetMinutes)
// GET /api/dashboard/sales-chart → [{ date, revenue, transactions }]
// Both /api/dashboard/* and /dashboard/* are registered for proxy compatibility.
app.get(['/api/dashboard/summary', '/dashboard/summary'], authenticateToken, requirePackageFeature('dashboard'), async (req: any, res: Response) => {
  setNoCacheHeaders(res);
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('dashboard:summary', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(dashboardCache, cacheKey);
    if (cached !== null) return res.json(cached);
    const period = String(req.query.period || 'month').toLowerCase();
    const clientFrom = String(req.query.from || '').trim();
    const clientTo = String(req.query.to || '').trim();
    const tzOffsetMinutes = req.query.tzOffsetMinutes != null ? parseInt(String(req.query.tzOffsetMinutes), 10) : undefined;
    const tzOk = typeof tzOffsetMinutes === 'number' && !isNaN(tzOffsetMinutes) && tzOffsetMinutes >= -720 && tzOffsetMinutes <= 720;
    const { fromStart, toEnd, fromDateOnly, toDateOnly } =
      clientFrom && clientTo
        ? parseDateRangeForDb(clientFrom, clientTo, tzOk ? tzOffsetMinutes : undefined)
        : (() => {
            const { from, to } = getDateRangeForPeriod(period);
            return parseDateRangeForDb(from, to, tzOk ? tzOffsetMinutes : undefined);
          })();
    const hasSource = await hasColumn('sales', 'source');
    const salesSourceFilter = hasSource ? "AND (source = 'pos' OR source IS NULL)" : '';
    const hasReturnedAmount = await hasColumn('sales', 'returned_amount');
    /** POS نقد الدرج: بعد خصم المرتجع المسجّل على الفاتورة (مثل تقارير صافي الدرج). */
    const posNetExpr = hasReturnedAmount
      ? 'COALESCE(SUM(total_amount - COALESCE(returned_amount, 0)), 0)'
      : 'COALESCE(SUM(total_amount), 0)';
    const [pos] = await pool.execute(
      `SELECT COALESCE(SUM(total_amount), 0) as gross_total, ${posNetExpr} as pos_net_for_drawer, COUNT(*) as orders_count
       FROM sales WHERE shop_id = ? ${salesSourceFilter} AND created_at >= ? AND created_at <= ?
       AND (payment_status IS NULL OR payment_status = '' OR payment_status = 'paid')`,
      hasSource ? [shopId, fromStart, toEnd] : [shopId, fromStart, toEnd]
    ).catch(() => [[{ gross_total: 0, pos_net_for_drawer: 0, orders_count: 0 }]]);
    const [online] = await pool.execute(
      `SELECT COALESCE(SUM(total), 0) as online_total, COUNT(*) as online_count FROM online_orders WHERE shop_id = ? AND ${ONLINE_ORDERS_ANALYTICS_WHERE} AND created_at >= ? AND created_at <= ?`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ online_total: 0, online_count: 0 }]]);
    const [returns] = await pool.execute(
      'SELECT COALESCE(SUM(total_amount), 0) as returns_total FROM returns WHERE shop_id = ? AND created_at >= ? AND created_at <= ?',
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ returns_total: 0 }]]);
    const [collections] = await pool.execute(
      `SELECT COALESCE(SUM(p.amount), 0) as collections_total
       FROM customer_debt_payments p
       INNER JOIN customer_debts d ON d.id = p.debt_id AND d.shop_id = ?
       WHERE p.created_at >= ? AND p.created_at <= ?`,
      [shopId, fromStart, toEnd]
    ).catch(() => [[{ collections_total: 0 }]]);
    const [expenses] = await pool.execute(
      'SELECT COALESCE(SUM(amount), 0) as expenses_total FROM expenses WHERE shop_id = ? AND expense_date >= ? AND expense_date <= ?',
      [shopId, fromDateOnly, toDateOnly]
    ).catch(() => [[{ expenses_total: 0 }]]);
    const posRow = (pos as any[])[0] || {};
    const onlineRow = (online as any[])[0] || {};
    const retRow = (returns as any[])[0] || {};
    const collRow = (collections as any[])[0] || {};
    const expRow = (expenses as any[])[0] || {};
    const grossSales = Number(posRow.gross_total ?? 0) + Number(onlineRow.online_total ?? 0);
    const posNetForDrawer = Number((posRow as any).pos_net_for_drawer ?? posRow.gross_total ?? 0);
    const returnsTotal = Number(retRow.returns_total ?? 0);
    /** تحصيلات فعلية من جدول الدفعات فقط (لا يُحسب مستحقات لم تُدفع بعد). */
    const collectionsTotal = Number(collRow.collections_total ?? 0);
    const expensesTotal = Number(expRow.expenses_total ?? 0);
    const netSales = grossSales - returnsTotal;
    /** صافي الدرج = نقد نقاط البيع (بعد مرتجع الفاتورة) + تحصيلات على الحساب المدفوعة − مرتجعات − مصروفات. بدون مبيعات أونلاين (ليست نقدًا في الدرج). */
    const netDrawer = posNetForDrawer + collectionsTotal - returnsTotal - expensesTotal;
    console.log(
      '[DASHBOARD] shopId=%s period=%s grossSales=%s posNetDrawer=%s collections=%s returns=%s expenses=%s net_drawer=%s',
      shopId,
      period,
      grossSales,
      posNetForDrawer,
      collectionsTotal,
      returnsTotal,
      expensesTotal,
      netDrawer
    );
    let period_cogs_total = 0;
    let top_selling_products: Array<{ productId: number; nameEn: string | null; nameAr: string | null; qtySold: number }> = [];
    try {
      const [cogsRows] = await pool.execute(
        `SELECT COALESCE(SUM(si.quantity * COALESCE(p.buy_price, 0)), 0) AS cogs
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
         INNER JOIN products p ON p.id = si.product_id AND p.shop_id = s.shop_id
         WHERE s.shop_id = ? AND s.created_at >= ? AND s.created_at <= ?
           AND (s.payment_status IS NULL OR s.payment_status = '' OR s.payment_status = 'paid')`,
        [shopId, fromStart, toEnd]
      );
      period_cogs_total = Number((cogsRows as any[])[0]?.cogs ?? 0);
    } catch {
      period_cogs_total = 0;
    }
    try {
      const [topRows] = await pool.execute(
        `SELECT si.product_id AS productId, p.name_en AS nameEn, p.name_ar AS nameAr, COALESCE(SUM(si.quantity), 0) AS qtySold
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
         INNER JOIN products p ON p.id = si.product_id
         WHERE s.shop_id = ? AND s.created_at >= ? AND s.created_at <= ?
           AND (s.payment_status IS NULL OR s.payment_status = '' OR s.payment_status = 'paid')
         GROUP BY si.product_id, p.name_en, p.name_ar
         ORDER BY qtySold DESC
         LIMIT 8`,
        [shopId, fromStart, toEnd]
      );
      top_selling_products = (topRows as any[]).map((r) => ({
        productId: Number(r.productId ?? r.product_id),
        nameEn: r.nameEn ?? r.name_en ?? null,
        nameAr: r.nameAr ?? r.name_ar ?? null,
        qtySold: Number(r.qtySold ?? r.qty_sold ?? 0),
      }));
    } catch {
      top_selling_products = [];
    }

    const payload = {
      sales_total: grossSales,
      returns_total: returnsTotal,
      collections_total: collectionsTotal,
      expenses_total: expensesTotal,
      net_sales: netSales,
      net_drawer: netDrawer,
      orders_count: Number(posRow.orders_count ?? 0) + Number(onlineRow.online_count ?? 0),
      /** POS invoices only (excludes online orders) — same filter as pos_row query */
      pos_orders_count: Number(posRow.orders_count ?? 0),
      pos_total: Number(posRow.gross_total ?? 0),
      online_total: Number(onlineRow.online_total ?? 0),
      period_cogs_total,
      top_selling_products,
      period,
    };
    setCachedPayload(dashboardCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get(['/api/dashboard/stats', '/dashboard/stats'], authenticateToken, requirePackageFeature('dashboard'), async (req: any, res: Response) => {
  setNoCacheHeaders(res);
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const cacheKey = getCacheKey('dashboard:stats', req, shopId, req.user?.id);
    const cached = getCachedPayload<any>(dashboardCache, cacheKey);
    if (cached !== null) return res.json(cached);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    whereClause += ' AND s.shop_id = ?';
    params.push(shopId);
    
    // Monthly revenue (exclude unpaid and returned)
    const [revenue] = await pool.execute(`
      SELECT COALESCE(SUM(s.total_amount - COALESCE(s.returned_amount, 0)), 0) as monthly_revenue 
      FROM sales s 
      ${whereClause}
      AND MONTH(s.created_at) = MONTH(CURRENT_DATE())
      AND YEAR(s.created_at) = YEAR(CURRENT_DATE())
      AND (s.payment_status IS NULL OR s.payment_status = '' OR s.payment_status = 'paid')
      AND (s.return_status IS NULL OR s.return_status = '' OR s.return_status != 'full')
    `, params);
    
    // Total products
    let productQuery = 'SELECT COUNT(*) as total_products FROM products WHERE shop_id = ? AND stock_quantity > 0';
    const productParams: any[] = [shopId];
    const hasDeletedAt = await hasColumn('products', 'is_deleted');
    if (hasDeletedAt) {
      productQuery += ' AND (is_deleted = 0 OR is_deleted IS NULL)';
    }
    const [products] = await pool.execute(productQuery, productParams);
    
    // Low stock count
    let lowStockQuery = 'SELECT COUNT(*) as low_stock_count FROM products WHERE stock_quantity <= min_stock_level';
    const lowStockParams: any[] = [];
    if (shopId) {
      lowStockQuery += ' AND shop_id = ?';
      lowStockParams.push(shopId);
    }
    const [lowStock] = await pool.execute(lowStockQuery, lowStockParams);
    
    const payload = {
      monthlyRevenue: (revenue as any[])[0]?.monthly_revenue || 0,
      totalProducts: (products as any[])[0]?.total_products || 0,
      lowStockCount: (lowStock as any[])[0]?.low_stock_count || 0
    };
    setCachedPayload(dashboardCache, cacheKey, payload);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** Build full daily time series (fill missing days with 0) for dashboard charts. */
function normalizeDateOnly(value: any): string {
  if (!value) return '';
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function fillDailySeries<T extends { date: string }>(
  rows: T[],
  days: number,
  keys: (keyof T)[],
  dateKey: keyof T = 'date' as keyof T
): T[] {
  const map = new Map<string, T>();
  for (const r of rows) {
    const d = normalizeDateOnly((r as any)[dateKey]);
    if (d) map.set(d, { ...r });
  }
  const out: T[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const row = map.get(dateStr);
    const base: any = { [dateKey]: dateStr };
    for (const k of keys) {
      if (k !== dateKey) {
        const v = row ? (row as any)[k] : 0;
        base[k] = typeof v === 'number' ? v : Number(v) || 0;
      }
    }
    out.push(base as T);
  }
  return out;
}

/** Fill each calendar day from–to (inclusive) for dashboard charts aligned with KPI date range. */
function fillDailySeriesInRange<T extends { date: string }>(
  rows: T[],
  fromDateOnly: string,
  toDateOnly: string,
  keys: (keyof T)[],
  dateKey: keyof T = 'date' as keyof T
): T[] {
  const map = new Map<string, T>();
  for (const r of rows) {
    const d = normalizeDateOnly((r as any)[dateKey]);
    if (d) map.set(d, { ...r });
  }
  const out: T[] = [];
  const start = new Date(fromDateOnly.slice(0, 10) + 'T12:00:00.000Z');
  const end = new Date(toDateOnly.slice(0, 10) + 'T12:00:00.000Z');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return [];
  }
  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
    const row = map.get(dateStr);
    const base: any = { [dateKey]: dateStr };
    for (const k of keys) {
      if (k !== dateKey) {
        const v = row ? (row as any)[k] : 0;
        base[k] = typeof v === 'number' ? v : Number(v) || 0;
      }
    }
    out.push(base as T);
  }
  return out;
}

app.get(['/api/dashboard/sales-chart', '/dashboard/sales-chart'], authenticateToken, requirePackageFeature('dashboard'), async (req: any, res: Response) => {
  setNoCacheHeaders(res);
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    // Simplified & reliable (no cache, no timezone gymnastics):
    // mirror the query that POS-operations timeseries uses (proven to work),
    // merge online_orders the same way, return real daily rows only.
    const qFrom = String(req.query.startDate || req.query.from || '').trim();
    const qTo = String(req.query.endDate || req.query.to || '').trim();
    const tzRaw = req.query.tzOffsetMinutes;
    const tzParsed = tzRaw != null && String(tzRaw).trim() !== '' ? parseInt(String(tzRaw), 10) : NaN;
    const tzOffsetMinutes = !isNaN(tzParsed) ? tzParsed : undefined;
    const tzOk = typeof tzOffsetMinutes === 'number' && !isNaN(tzOffsetMinutes) && tzOffsetMinutes >= -720 && tzOffsetMinutes <= 720;

    let fromDateOnly: string;
    let toDateOnly: string;
    if (qFrom && qTo) {
      const pr = parseDateRangeForDb(qFrom, qTo, tzOk ? tzOffsetMinutes : undefined);
      fromDateOnly = pr.fromDateOnly;
      toDateOnly = pr.toDateOnly;
    } else {
      const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 90);
      const now = new Date();
      const from = new Date(now);
      from.setDate(from.getDate() - (days - 1));
      fromDateOnly = from.toISOString().slice(0, 10);
      toDateOnly = now.toISOString().slice(0, 10);
    }

    const hasReturnedAmount = await hasColumn('sales', 'returned_amount');
    const netSalesExprPos = hasReturnedAmount
      ? 'COALESCE(SUM(total_amount - COALESCE(returned_amount, 0)), 0)'
      : 'COALESCE(SUM(total_amount), 0)';

    const [posRowsRaw] = await pool
      .execute(
        `SELECT DATE(created_at) as date,
                COALESCE(SUM(total_amount), 0) as sales,
                ${netSalesExprPos} as net_sales,
                COUNT(*) as order_count
         FROM sales
         WHERE shop_id = ?
           AND DATE(created_at) >= ?
           AND DATE(created_at) <= ?
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [shopId, fromDateOnly, toDateOnly]
      )
      .catch(() => [[]] as any);

    const onlineAnalyticsWhere = onlineOrdersAnalyticsWhere('o');
    const [onlineRowsRaw] = await pool
      .execute(
        `SELECT DATE(o.created_at) as date,
                COALESCE(SUM(o.total), 0) as sales,
                COALESCE(SUM(o.total), 0) as net_sales,
                COUNT(*) as order_count
         FROM online_orders o
         WHERE o.shop_id = ? AND ${onlineAnalyticsWhere}
           AND DATE(o.created_at) >= ?
           AND DATE(o.created_at) <= ?
         GROUP BY DATE(o.created_at)
         ORDER BY date ASC`,
        [shopId, fromDateOnly, toDateOnly]
      )
      .catch(() => [[]] as any);

    type DailyBucket = {
      date: string; sales: number; net_sales: number; order_count: number;
      revenue: number; transactions: number;
    };
    const merged = new Map<string, DailyBucket>();
    const pushRow = (r: any) => {
      const dk = normalizeDateOnly(r?.date);
      if (!dk) return;
      const sales = Number(r?.sales ?? 0) || 0;
      const net = Number(r?.net_sales ?? sales) || 0;
      const oc = Number(r?.order_count ?? 0) || 0;
      const prev = merged.get(dk);
      if (prev) {
        prev.sales += sales;
        prev.net_sales += net;
        prev.order_count += oc;
        prev.revenue += net;
        prev.transactions += oc;
      } else {
        merged.set(dk, {
          date: dk,
          sales,
          net_sales: net,
          order_count: oc,
          revenue: net,
          transactions: oc,
        });
      }
    };
    for (const r of ((posRowsRaw as any[]) || [])) pushRow(r);
    for (const r of ((onlineRowsRaw as any[]) || [])) pushRow(r);

    const payload = Array.from(merged.values()).sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0
    );
    console.log('[dashboard/sales-chart] result', {
      shopId,
      fromDateOnly,
      toDateOnly,
      posCount: Array.isArray(posRowsRaw) ? (posRowsRaw as any[]).length : 0,
      onlineCount: Array.isArray(onlineRowsRaw) ? (onlineRowsRaw as any[]).length : 0,
      payloadCount: payload.length,
    });
    res.json(payload);
  } catch (error: any) {
    console.error('[dashboard/sales-chart] error', error?.message || error);
    res.json([]);
  }
});

// ========== STOREFRONT ORDERS (Public) ==========
const handleStorefrontOrderCreate = async (req: Request, res: Response) => {
  const body = (req as any).body || {};
  const requestLang = body?.lang === 'en' ? 'en' : 'ar';
  const t = (ar: string, en: string) => (requestLang === 'ar' ? ar : en);
  try {
    const {
      shopId: rawShopId,
      domain,
      customerName,
      phone,
      governorate,
      city,
      address,
      detailedAddress,
      notes,
      paymentMethod,
      items,
      couponCode,
    } = body;
    const addr = address || detailedAddress;
    let shopId = Number(rawShopId || 0);
    if (!Number.isFinite(shopId) || shopId <= 0) {
      const dom = String(
        domain || req.headers?.['x-shop-domain'] || req.headers?.['x-forwarded-host'] || req.headers?.host || ''
      )
        .trim()
        .toLowerCase();
      if (dom) {
        const [rows] = await pool.execute(
          'SELECT shop_id FROM domains WHERE domain = ? AND is_active = 1 AND status = ? LIMIT 1',
          [dom, 'active']
        );
        shopId = Number((rows as any[])[0]?.shop_id || 0);
      }
    }
    if (!Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: t('معرف المتجر مطلوب', 'shopId is required') });
    }
    if (!customerName || String(customerName).trim().length === 0) {
      return res.status(400).json({ error: t('الاسم مطلوب', 'Customer name is required') });
    }
    const phoneStr = String(phone || '').trim();
    if (!phoneStr || !/^[\d\s\-\+\(\)]{8,20}$/.test(phoneStr)) {
      return res.status(400).json({ error: t('رقم هاتف صحيح مطلوب', 'Valid phone is required') });
    }
    if (!governorate || String(governorate).trim().length === 0) {
      return res.status(400).json({ error: t('المحافظة مطلوبة', 'Governorate is required') });
    }
    if (!city || String(city).trim().length === 0) {
      return res.status(400).json({ error: t('المدينة مطلوبة', 'City is required') });
    }
    if (!addr || String(addr).trim().length === 0) {
      return res.status(400).json({ error: t('العنوان مطلوب', 'Address is required') });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: t('السلة فارغة', 'Cart items required') });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [shopRows] = await conn.execute(
        'SELECT id, package, plan_type, currency_code FROM shops WHERE id = ?',
        [shopId]
      );
      const shop = (shopRows as any[])[0];
      if (!shop) {
        await conn.rollback();
        return res.status(404).json({ error: t('المتجر غير موجود', 'Shop not found') });
      }
      const plan = normalizePlan(shop.plan_type || shop.package || 'bronze');
      const allowOnline = Boolean(getPlanDefinition(plan).features.onlineStore);
      if (!allowOnline) {
        await conn.rollback();
        return res.status(403).json({ error: t('المتجر الأونلاين غير مفعل', 'Storefront is not enabled') });
      }

      await ensureTaxRatesTable();
      let subtotalBeforeTax = 0;
      let totalTax = 0;
      let total = 0;
      const orderItems: Array<{
        productId: number;
        nameSnapshot: string;
        skuSnapshot: string | null;
        barcodeSnapshot: string | null;
        sellPriceSnapshot: number;
        quantity: number;
        taxAmount: number;
        lineTotalBeforeTax: number;
        lineTotalAfterTax: number;
      }> = [];

      const hasDiscountCols = await hasColumn('products', 'discount_type');
      const hasTaxRateId = await hasColumn('products', 'tax_rate_id');
      let prodSelect = hasDiscountCols
        ? 'SELECT id, name_en, name_ar, sku, barcode, sell_price, stock_quantity, discount_type, discount_value, discount_active'
        : 'SELECT id, name_en, name_ar, sku, barcode, sell_price, stock_quantity';
      if (hasTaxRateId) prodSelect += ', tax_rate_id';
      prodSelect += ' FROM products WHERE id = ? AND shop_id = ?';

      const [taxRows] = await conn.execute(
        'SELECT id, type, rate, inclusive, apply_before_discount FROM tax_rates WHERE shop_id = ? AND is_active = 1',
        [shopId]
      ).catch(() => [[]]);
      const taxMap = new Map<number, TaxRuleRow>();
      for (const row of (taxRows as any[])) {
        taxMap.set(row.id, {
          id: row.id,
          type: row.type || 'percentage',
          rate: Number(row.rate) || 0,
          inclusive: Boolean(row.inclusive),
          apply_before_discount: row.apply_before_discount !== 0,
        });
      }

      for (const it of items) {
        const productId = Number(it?.productId || it?.id || 0);
        const quantity = Math.max(1, Math.floor(Number(it?.quantity || 1)));
        if (!Number.isFinite(productId) || productId <= 0 || quantity <= 0) continue;

        const [prods] = await conn.execute(prodSelect, [productId, shopId]);
        const prod = (prods as any[])[0];
        if (!prod) continue;
        let unitPrice = Number(prod.sell_price || 0);
        if (hasDiscountCols && prod.discount_active) {
          unitPrice = applyProductDiscount(
            unitPrice,
            (prod.discount_type || 'none') as 'none' | 'percent' | 'fixed',
            prod.discount_value,
            prod.discount_active
          );
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;
        const stock = Number(prod.stock_quantity ?? 0);
        if (Number.isFinite(stock) && stock < quantity) {
          await conn.rollback();
          await insertNotification(
            {
              shopId,
              source: 'system',
              type: 'system_stock_insufficient',
              data: { productId, requested: quantity, available: stock },
            },
            conn
          );
          return res.status(400).json({
            error: t('المخزون غير كافٍ. المنتج غير متوفر بالكمية المطلوبة.', 'Insufficient stock for requested quantity.'),
          });
        }

        const taxRule = resolveTaxRule(taxMap, prod.tax_rate_id, !!hasTaxRateId);
        const { lineTotalBeforeTax, taxAmount, lineTotalAfterTax } = computeLineTax(
          unitPrice,
          quantity,
          taxRule,
          0,
          true
        );

        orderItems.push({
          productId,
          nameSnapshot: String(it?.nameSnapshot || prod.name_ar || prod.name_en || 'Product').substring(0, 255),
          skuSnapshot: prod.sku ? String(prod.sku).substring(0, 128) : null,
          barcodeSnapshot: prod.barcode ? String(prod.barcode).substring(0, 128) : null,
          sellPriceSnapshot: unitPrice,
          quantity,
          taxAmount,
          lineTotalBeforeTax,
          lineTotalAfterTax,
        });
        subtotalBeforeTax += lineTotalBeforeTax;
        totalTax += taxAmount;
        total += lineTotalAfterTax;
      }

      if (orderItems.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: t('لا توجد منتجات صالحة', 'No valid items') });
      }

      let totalBeforeDiscount = total;
      let discountTotal: number | null = null;
      let couponId: number | null = null;
      let couponCodeSaved: string | null = null;

      if (couponCode && String(couponCode).trim().length > 0) {
        const codeStr = String(couponCode).trim();
        const [couponRows] = await conn.execute(
          'SELECT * FROM coupons WHERE shop_id = ? AND LOWER(code) = LOWER(?)',
          [shopId, codeStr]
        );
        const coupon = (couponRows as any[])[0];
        if (coupon && coupon.is_active) {
          const now = new Date();
          const validStart = !coupon.starts_at || new Date(coupon.starts_at) <= now;
          const validExpiry = !coupon.expires_at || new Date(coupon.expires_at) >= now;
          const validUsage = coupon.usage_limit == null || Number(coupon.usage_count) < Number(coupon.usage_limit);
          const validMin = coupon.min_order_total == null || total >= Number(coupon.min_order_total);
          if (validStart && validExpiry && validUsage && validMin) {
            discountTotal = calculateCouponDiscount(total, coupon.type, Number(coupon.value));
            total = Math.max(0, total - discountTotal);
            couponId = coupon.id;
            couponCodeSaved = coupon.code;
          }
        }
      }

      const paymentMethodRaw = String(paymentMethod || '').trim();
      const paymentMethodCode = normalizePaymentMethod(paymentMethodRaw || 'COD');
      let publicCode = generatePublicCode();
      let tries = 0;
      while (tries < 5) {
        const [dup] = await conn.execute('SELECT id FROM online_orders WHERE public_code = ?', [publicCode]);
        if ((dup as any[]).length === 0) break;
        publicCode = generatePublicCode();
        tries += 1;
      }
      const currency = shop.currency_code || 'EGP';
      const hasCouponCols = await hasColumn('online_orders', 'coupon_id');
      const hasTotalTaxCol = await hasColumn('online_orders', 'total_tax');
      let insertCols = hasCouponCols
        ? 'shop_id, status, order_status, customer_name, phone, governorate, city, address, notes, payment_method, subtotal, total, currency, source, public_code, coupon_id, coupon_code, discount_total, total_before_discount'
        : 'shop_id, status, order_status, customer_name, phone, governorate, city, address, notes, payment_method, subtotal, total, currency, source, public_code';
      if (hasTotalTaxCol) insertCols += ', total_tax';
      let insertVals = hasCouponCols
        ? '?, \'pending\', \'NEW\', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'online\', ?, ?, ?, ?, ?'
        : '?, \'pending\', \'NEW\', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'online\', ?';
      if (hasTotalTaxCol) insertVals += ', ?';
      const insertParams: any[] = [
        shopId,
        String(customerName).trim(),
        phoneStr,
        String(governorate).trim(),
        String(city).trim(),
        String(addr).trim(),
        notes ? String(notes).trim() : null,
        paymentMethodRaw || paymentMethodCode,
        subtotalBeforeTax,
        total,
        currency,
        publicCode,
      ];
      if (hasCouponCols) {
        insertParams.push(couponId, couponCodeSaved, discountTotal, totalBeforeDiscount);
      }
      if (hasTotalTaxCol) insertParams.push(totalTax);
      const [ordResult] = await conn.execute(
        `INSERT INTO online_orders (${insertCols}) VALUES (${insertVals})`,
        insertParams
      );
      const orderId = (ordResult as any).insertId;

      if (couponId != null) {
        await conn.execute(
          'UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ? AND shop_id = ?',
          [couponId, shopId]
        );
      }

      const hasItemTaxCols = await hasColumn('online_order_items', 'tax_amount');
      for (const it of orderItems) {
        if (hasItemTaxCols) {
          await conn.execute(
            `INSERT INTO online_order_items (order_id, product_id, name_snapshot, sku_snapshot, barcode_snapshot, sell_price_snapshot, quantity, tax_amount, line_total_before_tax, line_total_after_tax)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              it.productId,
              it.nameSnapshot,
              it.skuSnapshot,
              it.barcodeSnapshot,
              it.sellPriceSnapshot,
              it.quantity,
              it.taxAmount,
              it.lineTotalBeforeTax,
              it.lineTotalAfterTax,
            ]
          );
        } else {
          await conn.execute(
            `INSERT INTO online_order_items (order_id, product_id, name_snapshot, sku_snapshot, barcode_snapshot, sell_price_snapshot, quantity)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              it.productId,
              it.nameSnapshot,
              it.skuSnapshot,
              it.barcodeSnapshot,
              it.sellPriceSnapshot,
              it.quantity,
            ]
          );
        }
      }

      await conn.execute(
        `INSERT INTO payments (shop_id, order_id, method, amount, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [shopId, orderId, paymentMethodCode, total]
      );

      await insertNotification(
        {
          shopId,
          source: 'online',
          type: 'online_order_created',
          data: {
            orderId,
            customerName: String(customerName).trim(),
            total,
            itemsCount: orderItems.length,
            publicCode,
          },
        },
        conn
      );

      await conn.commit();
      return res.status(201).json({
        ok: true,
        orderId,
        orderNumber: publicCode,
        publicCode,
        status: 'pending',
        total,
        currency,
        message: t('تم تسجيل الطلب', 'Order created'),
      });
    } catch (error: any) {
      await conn.rollback();
      return res.status(500).json({ error: error?.message || t('حدث خطأ أثناء إنشاء الطلب', 'Failed to create order') });
    } finally {
      conn.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error?.message || t('حدث خطأ', 'Server error') });
  }
};

app.post('/api/storefront/orders', handleStorefrontOrderCreate);
app.post('/api/public/storefront/orders', handleStorefrontOrderCreate);

const handleStorefrontOrderTrack = async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || '').trim().toUpperCase();
    const phone = String(req.query.phone || '').trim().replace(/\D/g, '');
    if (!code || code.length < 4) {
      return res.status(400).json({ ok: false, error: 'Tracking code required', ar: 'كود التتبع مطلوب' });
    }
    if (!phone || phone.length < 8) {
      return res.status(400).json({ ok: false, error: 'Phone required', ar: 'رقم الهاتف مطلوب' });
    }
    const phoneNorm = phone.replace(/\D/g, '');
    const [orders] = await pool.execute(
      `SELECT o.*, s.id as shop_id, s.name as shop_name, s.business_name as shop_business_name
       FROM online_orders o
       JOIN shops s ON s.id = o.shop_id
       WHERE o.public_code = ? AND (
         REPLACE(REPLACE(REPLACE(REPLACE(o.phone,' ',''),'-',''),'+',''),'(','') LIKE CONCAT('%',?,'%')
       )
       LIMIT 1`,
      [code, phoneNorm]
    );
    const order = (orders as any[])[0];
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Order not found', ar: 'لم يتم العثور على الطلب' });
    }
    const [items] = await pool.execute('SELECT * FROM online_order_items WHERE order_id = ?', [order.id]);
    // Get primary domain for this shop (if any)
    let shopDomain: string | null = null;
    const [domRows] = await pool.execute(
      'SELECT domain FROM domains WHERE shop_id = ? AND is_active = 1 AND status = ? LIMIT 1',
      [order.shop_id, 'active']
    );
    if ((domRows as any[]).length > 0) {
      shopDomain = (domRows as any[])[0].domain;
    }
    const orderPayload = {
      orderId: order.id,
      publicCode: order.public_code,
      status: order.status,
      customerName: order.customer_name,
      phone: order.phone,
      address: `${order.governorate}, ${order.city}, ${order.address}`,
      total: Number(order.total),
      currency: order.currency || 'EGP',
      createdAt: order.created_at,
      items: (items as any[]).map((i) => ({
        name: i.name_snapshot,
        sku: i.sku_snapshot,
        price: Number(i.sell_price_snapshot),
        quantity: i.quantity,
        subtotal: Number(i.sell_price_snapshot) * Number(i.quantity),
      })),
    };
    const shopPayload = {
      id: order.shop_id,
      slug: `${order.shop_id}-shop`,
      domain: shopDomain,
      name: order.shop_business_name || order.shop_name || `Shop ${order.shop_id}`,
    };
    res.json({ ok: true, order: orderPayload, shop: shopPayload });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
};

app.get('/api/storefront/orders/track', handleStorefrontOrderTrack);
app.get('/api/public/storefront/orders/track', handleStorefrontOrderTrack);

app.get('/api/storefront/orders/:id', async (req: Request, res: Response) => {
  try {
    const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orderId = parseInt(String(idParam || ''), 10);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid order id', ar: 'رقم الطلب غير صحيح' });
    }
    const code = String(req.query.code || '').trim().toUpperCase();
    const phone = String(req.query.phone || '').trim().replace(/\D/g, '');
    if (!code || code.length < 4 || !phone || phone.length < 8) {
      return res.status(400).json({ ok: false, error: 'Tracking code and phone required', ar: 'كود التتبع ورقم الهاتف مطلوبان' });
    }
    const phoneNorm = phone.replace(/\D/g, '');
    const [orders] = await pool.execute(
      `SELECT o.*, s.id as shop_id, s.name as shop_name, s.business_name as shop_business_name
       FROM online_orders o
       JOIN shops s ON s.id = o.shop_id
       WHERE o.id = ? AND o.public_code = ? AND (
         REPLACE(REPLACE(REPLACE(REPLACE(o.phone,' ',''),'-',''),'+',''),'(','') LIKE CONCAT('%',?,'%')
       )
       LIMIT 1`,
      [orderId, code, phoneNorm]
    );
    const order = (orders as any[])[0];
    if (!order) {
      return res.status(404).json({ ok: false, error: 'Order not found', ar: 'لم يتم العثور على الطلب' });
    }
    const [items] = await pool.execute('SELECT * FROM online_order_items WHERE order_id = ?', [order.id]);
    let shopDomain: string | null = null;
    const [domRows] = await pool.execute(
      'SELECT domain FROM domains WHERE shop_id = ? AND is_active = 1 AND status = ? LIMIT 1',
      [order.shop_id, 'active']
    );
    if ((domRows as any[]).length > 0) {
      shopDomain = (domRows as any[])[0].domain;
    }
    const orderPayload = {
      orderId: order.id,
      publicCode: order.public_code,
      status: order.status,
      customerName: order.customer_name,
      phone: order.phone,
      address: `${order.governorate}, ${order.city}, ${order.address}`,
      total: Number(order.total),
      currency: order.currency || 'EGP',
      createdAt: order.created_at,
      items: (items as any[]).map((i) => ({
        name: i.name_snapshot,
        sku: i.sku_snapshot,
        price: Number(i.sell_price_snapshot),
        quantity: i.quantity,
        subtotal: Number(i.sell_price_snapshot) * Number(i.quantity),
      })),
    };
    const shopPayload = {
      id: order.shop_id,
      slug: `${order.shop_id}-shop`,
      domain: shopDomain,
      name: order.shop_business_name || order.shop_name || `Shop ${order.shop_id}`,
    };
    res.json({ ok: true, order: orderPayload, shop: shopPayload });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/storefront/branches', async (req: Request, res: Response) => {
  try {
    const rawShopId = String(req.query.shopId || '').trim();
    let shopId = parseInt(rawShopId, 10);
    if (!Number.isFinite(shopId) || shopId <= 0) {
      const dom = String(req.query.domain || req.headers?.['x-shop-domain'] || req.headers?.host || '')
        .trim()
        .toLowerCase();
      if (dom) {
        const [rows] = await pool.execute(
          'SELECT shop_id FROM domains WHERE domain = ? AND is_active = 1 AND status = ? LIMIT 1',
          [dom, 'active']
        );
        shopId = Number((rows as any[])[0]?.shop_id || 0);
      }
    }
    if (!Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: 'shopId is required' });
    }
    const [rows] = await pool.execute(
      'SELECT id, shop_id, name, name_ar, name_en, code FROM branches WHERE shop_id = ? ORDER BY id ASC',
      [shopId]
    );
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/storefront/shop', async (req: Request, res: Response) => {
  try {
    const lang = String(req.query.lang || '').toLowerCase() === 'en' ? 'en' : 'ar';
    let shopId = parseInt(String(req.query.shopId || ''), 10);
    if (!Number.isFinite(shopId) || shopId <= 0) {
      const dom = String(req.query.domain || req.headers?.['x-shop-domain'] || req.headers?.host || '')
        .trim()
        .toLowerCase();
      if (dom) {
        const [rows] = await pool.execute(
          'SELECT shop_id FROM domains WHERE domain = ? AND is_active = 1 AND status = ? LIMIT 1',
          [dom, 'active']
        );
        shopId = Number((rows as any[])[0]?.shop_id || 0);
      }
    }
    if (!Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: 'shopId is required' });
    }
    const [shops] = await pool.execute(
      `SELECT id, name, business_name, owner_name, activity_type, package, plan_type, country_name, currency_code
       FROM shops WHERE id = ?`,
      [shopId]
    );
    const shop = (shops as any[])[0];
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    const plan = normalizePlan(shop.plan_type || shop.package || 'bronze');
    const planFeatures = getPlanDefinition(plan).features;
    res.json({
      ok: true,
      storeName: shop.business_name || shop.name,
      ownerName: shop.owner_name || null,
      activityType: shop.activity_type || null,
      language: lang,
      planFeatures,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/storefront/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// ========== PUBLIC STOREFRONT (Gold package only) ==========
// Resolve shop by the HTTP Host header (custom domains)
app.get('/api/public/storefront/preview/:shopSlug', async (req: Request, res: Response) => {
  try {
    const raw = String((req as any).params?.shopSlug || '').trim();
    const normalized = raw.trim().replace(/\s+/g, '-');
    const idPart = normalized.split('-')[0];
    const shopId = parseInt(idPart, 10);
    if (!Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: 'Invalid shop slug' });
    }

    const [shops] = await pool.execute('SELECT * FROM shops WHERE id = ?', [shopId]);
    const shopArray = shops as any[];
    if (shopArray.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    await ensureBranchInventoryTable();
    await ensureShopHasDefaultBranch(shopId);
    await migrateStockToBranchInventory(shopId);

    const [categories] = await pool.execute(
      'SELECT * FROM categories WHERE shop_id = ? OR shop_id IS NULL ORDER BY id ASC',
      [shopId]
    );

    const [productsRaw] = await pool.execute(
      `
      SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar,
             CASE WHEN COUNT(bi.product_id) = 0 THEN COALESCE(p.stock_quantity, 0)
                  ELSE COALESCE(SUM(bi.quantity), 0)
             END as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN branch_inventory bi ON bi.shop_id = p.shop_id AND bi.product_id = p.id
      WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
      GROUP BY p.id
      ORDER BY p.created_at DESC
      `,
      [shopId]
    );
    const productsArr = productsRaw as any[];
    const hasDiscountCols = await hasColumn('products', 'discount_type');
    const products = hasDiscountCols
      ? productsArr.map((p) => {
          const basePrice = Number(p.sell_price || 0);
          const effective = p.discount_active
            ? applyProductDiscount(
                basePrice,
                (p.discount_type || 'none') as 'none' | 'percent' | 'fixed',
                p.discount_value,
                p.discount_active
              )
            : basePrice;
          const available = Number(p.available_stock ?? p.stock_quantity ?? 0) || 0;
          return { ...p, sell_price: effective, original_sell_price: basePrice, stock_quantity: available, available_stock: available };
        })
      : productsArr.map((p) => {
          const available = Number(p.available_stock ?? p.stock_quantity ?? 0) || 0;
          return { ...p, stock_quantity: available, available_stock: available };
        });

    return res.json({
      preview: true,
      shop: shopArray[0],
      categories,
      products,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/public/storefront', resolveShopByDomainHost, async (req: any, res: Response) => {
  try {
    const shopId = Number(req.shopId || 0);
    if (!Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: 'shopId is required' });
    }

    // Enforce Gold package for storefront publishing
    const [shops] = await pool.execute('SELECT * FROM shops WHERE id = ? AND package = "gold"', [shopId]);
    const shopArray = shops as any[];
    if (shopArray.length === 0) {
      return res.status(404).json({ error: 'Storefront not available' });
    }

    await ensureBranchInventoryTable();
    await ensureShopHasDefaultBranch(shopId);
    await migrateStockToBranchInventory(shopId);

    const [categories] = await pool.execute(
      'SELECT * FROM categories WHERE shop_id = ? OR shop_id IS NULL ORDER BY id ASC',
      [shopId]
    );

    const [productsRaw] = await pool.execute(
      `
      SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar,
             CASE WHEN COUNT(bi.product_id) = 0 THEN COALESCE(p.stock_quantity, 0)
                  ELSE COALESCE(SUM(bi.quantity), 0)
             END as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN branch_inventory bi ON bi.shop_id = p.shop_id AND bi.product_id = p.id
      WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
      GROUP BY p.id
      ORDER BY p.created_at DESC
      `,
      [shopId]
    );
    const productsArr = productsRaw as any[];
    const hasDiscountCols = await hasColumn('products', 'discount_type');
    const products = hasDiscountCols
      ? productsArr.map((p) => {
          const basePrice = Number(p.sell_price || 0);
          const effective = p.discount_active
            ? applyProductDiscount(
                basePrice,
                (p.discount_type || 'none') as 'none' | 'percent' | 'fixed',
                p.discount_value,
                p.discount_active
              )
            : basePrice;
          const available = Number(p.available_stock ?? p.stock_quantity ?? 0) || 0;
          return { ...p, sell_price: effective, original_sell_price: basePrice, stock_quantity: available, available_stock: available };
        })
      : productsArr.map((p) => {
          const available = Number(p.available_stock ?? p.stock_quantity ?? 0) || 0;
          return { ...p, stock_quantity: available, available_stock: available };
        });

    return res.json({
      domain: req.resolvedDomain || null,
      shop: shopArray[0],
      categories,
      products,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/public/storefront/:shopId', async (req: Request, res: Response) => {
  try {
    const { shopId } = req.params;
    
    // Check if shop has Gold package
    const [shops] = await pool.execute('SELECT * FROM shops WHERE id = ? AND package = "gold"', [shopId]);
    const shopArray = shops as any[];
    
    if (shopArray.length === 0) {
      return res.status(404).json({ error: 'Storefront not available' });
    }
    
    await ensureBranchInventoryTable();
    await ensureShopHasDefaultBranch(Number(shopId));
    await migrateStockToBranchInventory(Number(shopId));

    const [productsRaw] = await pool.execute(`
      SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar,
             CASE WHEN COUNT(bi.product_id) = 0 THEN COALESCE(p.stock_quantity, 0)
                  ELSE COALESCE(SUM(bi.quantity), 0)
             END as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN branch_inventory bi ON bi.shop_id = p.shop_id AND bi.product_id = p.id
      WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
      GROUP BY p.id
      HAVING available_stock > 0
      ORDER BY p.created_at DESC
    `, [shopId]);
    const products = productsRaw as any[];
    const hasDiscountCols = await hasColumn('products', 'discount_type');
    const productsWithPrice = hasDiscountCols
      ? products.map((p) => {
          const basePrice = Number(p.sell_price || 0);
          const effective = p.discount_active
            ? applyProductDiscount(
                basePrice,
                (p.discount_type || 'none') as 'none' | 'percent' | 'fixed',
                p.discount_value,
                p.discount_active
              )
            : basePrice;
          const available = Number(p.available_stock ?? p.stock_quantity ?? 0) || 0;
          return { ...p, sell_price: effective, original_sell_price: basePrice, stock_quantity: available, available_stock: available };
        })
      : products.map((p) => {
          const available = Number(p.available_stock ?? p.stock_quantity ?? 0) || 0;
          return { ...p, stock_quantity: available, available_stock: available };
        });

    res.json({
      shop: shopArray[0],
      products: productsWithPrice
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/public/storefront/:shopId/product/:productId', async (req: Request, res: Response) => {
  try {
    const shopId = Number(req.params.shopId);
    const productId = Number(req.params.productId);
    if (!Number.isFinite(shopId) || !Number.isFinite(productId)) {
      return res.status(400).json({ error: 'Invalid shopId or productId' });
    }

    const [shops] = await pool.execute('SELECT * FROM shops WHERE id = ? AND package = "gold"', [shopId]);
    const shopArray = shops as any[];
    if (shopArray.length === 0) {
      return res.status(404).json({ error: 'Storefront not available' });
    }

    await ensureBranchInventoryTable();
    await ensureShopHasDefaultBranch(shopId);
    await migrateStockToBranchInventory(shopId);

    const [rows] = await pool.execute(
      `
      SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar,
             CASE WHEN COUNT(bi.product_id) = 0 THEN COALESCE(p.stock_quantity, 0)
                  ELSE COALESCE(SUM(bi.quantity), 0)
             END as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN branch_inventory bi ON bi.shop_id = p.shop_id AND bi.product_id = p.id
      WHERE p.shop_id = ? AND p.id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
      GROUP BY p.id
      LIMIT 1
      `,
      [shopId, productId]
    );
    const product = (rows as any[])[0];
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const hasDiscountCols = await hasColumn('products', 'discount_type');
    const basePrice = Number(product.sell_price || 0);
    const effective =
      hasDiscountCols && product.discount_active
        ? applyProductDiscount(
            basePrice,
            (product.discount_type || 'none') as 'none' | 'percent' | 'fixed',
            product.discount_value,
            product.discount_active
          )
        : basePrice;
    const available = Number(product.available_stock ?? product.stock_quantity ?? 0) || 0;
    const productOut = {
      ...product,
      sell_price: effective,
      original_sell_price: basePrice,
      stock_quantity: available,
      available_stock: available,
    };

    return res.json({ shop: shopArray[0], product: productOut });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ========== DEBUG: manual branch + quantity (no automatic fixes) ==========
app.post('/api/debug/create-branch', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const code = `DEBUG_${shopId}`;
    await pool.execute(
      "INSERT INTO branches (shop_id, name, name_ar, code) VALUES (?, 'DEBUG BRANCH', 'DEBUG BRANCH', ?)",
      [shopId, code]
    );
    const [rows] = await pool.execute(
      'SELECT * FROM branches WHERE shop_id = ? AND code = ? ORDER BY id DESC LIMIT 1',
      [shopId, code]
    );
    const row = Array.isArray(rows) && (rows as any[]).length > 0 ? (rows as any[])[0] : null;
    console.log('DEBUG: branch inserted for shop_id', shopId);
    res.json({ inserted: row });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/debug/set-quantity', authenticateToken, async (req: any, res: Response) => {
  try {
    const { shop_id, product_id, branch_id, quantity } = req.body;
    const shopId = Number(shop_id);
    const productId = Number(product_id);
    const branchId = Number(branch_id);
    const qty = Number(quantity);
    if (!shopId || !productId || !branchId || Number.isNaN(qty)) {
      return res.status(400).json({ error: 'shop_id, product_id, branch_id, quantity required' });
    }
    await pool.execute(
      `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)`,
      [shopId, branchId, productId, qty]
    );
    const [rows] = await pool.execute(
      'SELECT * FROM branch_inventory WHERE shop_id = ? AND product_id = ? AND branch_id = ? LIMIT 1',
      [shopId, productId, branchId]
    );
    const row = Array.isArray(rows) && (rows as any[]).length > 0 ? (rows as any[])[0] : null;
    console.log('DEBUG: quantity saved =', qty);
    res.json({ saved: row });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

mountHrRoutes(app, {
  pool,
  authenticateToken,
  getShopIdOrFail,
  hasTable,
  hasColumn,
  ensureAccountingTables,
});

// Backup API: manual trigger (super_admin only)
app.post('/api/admin/backup/run', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const force = (req.body?.force === true || req.query?.force === 'true');
    if (!isBackupEnabled() && !force) {
      return res.status(400).json({ ok: false, error: 'Backup is disabled. Set BACKUP_ENABLED=true or use force=true' });
    }
    const result = await runBackup(force);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ ok: false, message: err?.message || 'Backup failed' });
  }
});

// Backup download: Excel per shop (super_admin: ?shopId=X)
app.get('/api/admin/backup/download', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const shopId = req.query.shopId != null ? Number(req.query.shopId) : null;
    if (!shopId || !Number.isFinite(shopId)) {
      return res.status(400).json({ error: 'shopId is required (query param)' });
    }
    console.log('[BACKUP DOWNLOAD] Starting for shop', shopId);
    const { buffer, fileName } = await generateShopBackupForDownload(pool, shopId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
    console.log('[BACKUP DOWNLOAD] OK');
  } catch (err: any) {
    console.error('[BACKUP DOWNLOAD] Error:', err?.message);
    if (!res.headersSent) res.status(500).json({ error: err?.message || 'Backup download failed' });
  }
});

// Backup download: Excel for current shop (shop_owner, branch_manager, etc.)
app.get('/api/store-admin/backup/download', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'warehouse'), async (req: Request, res: Response) => {
  const shopId = getShopIdOrFail(req, res);
  if (shopId === null) return;
  try {
    console.log('[BACKUP DOWNLOAD] Store-admin for shop', shopId);
    const { buffer, fileName } = await generateShopBackupForDownload(pool, shopId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
    console.log('[BACKUP DOWNLOAD] OK');
  } catch (err: any) {
    console.error('[BACKUP DOWNLOAD] Error:', err?.message);
    if (!res.headersSent) res.status(500).json({ error: err?.message || 'Backup download failed' });
  }
});

// Multer: 20MB limit, .sql only
const backupUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(process.cwd(), 'tmp');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, `restore-upload-${Date.now()}-${file.originalname || 'backup.sql'}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    if (!name.endsWith('.sql')) return cb(new Error('Only .sql files allowed'));
    cb(null, true);
  },
});

const backupExcelUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(process.cwd(), 'tmp');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, `restore-excel-${Date.now()}-${file.originalname || 'backup.xlsx'}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = (file.originalname || '').toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) return cb(new Error('Only .xlsx or .xls files allowed'));
    cb(null, true);
  },
});

// Backup restore: upload .sql, create pre-restore backup, then restore (super_admin only)
app.post('/api/admin/backup/restore', authenticateToken, requireRole('super_admin'), (req: Request, res: Response, next: NextFunction) => {
  backupUpload.single('file')(req, res, (err: any) => {
    if (err) {
      console.error('[BACKUP RESTORE] ERROR:', err?.message);
      return res.status(400).json({ success: false, error: err?.message || 'Invalid file (max 20MB, .sql only)' });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  const file = (req as any).file;
  let uploadedPath: string | null = null;
  try {
    if (!file || !file.path) {
      console.error('[BACKUP RESTORE] ERROR: No file uploaded');
      return res.status(400).json({ success: false, error: 'No file uploaded. Use multipart/form-data with field "file".' });
    }
    uploadedPath = file.path;
    console.log('[BACKUP RESTORE] START');
    await createPreRestoreBackup();
    await restoreBackup(uploadedPath);
    console.log('[BACKUP RESTORE] DONE');
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[BACKUP RESTORE] ERROR:', err?.message);
    return res.status(500).json({ success: false, error: err?.message || 'Restore failed' });
  } finally {
    try { if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath); } catch (_) {}
  }
});

app.post('/api/store-admin/backup/restore-excel', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager'), (req: Request, res: Response, next: NextFunction) => {
  backupExcelUpload.single('file')(req, res, (err: any) => {
    if (err) return res.status(400).json({ success: false, error: err?.message || 'Invalid file (max 20MB, .xlsx only)' });
    next();
  });
}, async (req: Request, res: Response) => {
  const shopId = getShopIdOrFail(req, res);
  if (shopId === null) return;
  const file = (req as any).file;
  let uploadedPath: string | null = null;
  try {
    if (!file || !file.path) return res.status(400).json({ success: false, error: 'No file uploaded' });
    uploadedPath = file.path;
    console.log('[BACKUP RESTORE EXCEL] START shop', shopId);
    const { restored } = await restoreFromExcel(pool, shopId, uploadedPath);
    console.log('[BACKUP RESTORE EXCEL] DONE restored=', restored);
    return res.json({ success: true, restored });
  } catch (err: any) {
    console.error('[BACKUP RESTORE EXCEL] ERROR:', err?.message);
    return res.status(500).json({ success: false, error: err?.message || 'Restore failed' });
  } finally {
    try { if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath); } catch (_) {}
  }
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`listening ${port}`);
  console.log('[Routes] POST /api/storefront/orders, GET /api/storefront/health registered');
  if (isBackupEnabled()) {
    cron.schedule('0 3 * * *', async () => {
      try {
        console.log('[Backup] Cron: running auto backup (per-shop Excel + full DB → GCS)');
        const r = await runAutoBackup(pool, false);
        console.log('[Backup] Cron:', r.ok ? 'OK' : r.message);
      } catch (e: any) {
        console.error('[Backup] Cron error:', e?.message);
      }
    });
  }
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Catch-all: return JSON 404 for unmatched /api/* (no HTML "Cannot GET ...")
app.use((req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) return next();
  if (req.path.startsWith('/api')) {
    console.warn('[API] 404 Not Found', { method: req.method, path: req.path, url: req.originalUrl });
    return res.status(404).json({ error: 'Not found', path: req.path });
  }
  next();
});

app.use((err: any, _req: Request, res: Response, _next: any) => {
  // Handle invalid JSON body (Express json parser)
  if (err instanceof SyntaxError && (err as any)?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  console.error('❌ Unhandled API error:', err?.message || err);
  res.status(500).json({ error: 'Internal server error' });
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
});

try {
  console.log((app as any)?._router?.stack || []);
} catch {}

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
});
