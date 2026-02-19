import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Readable } from 'stream';
import { pool, testConnection, initializeDatabase } from './db';
import type { RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dns from 'node:dns/promises';
import nodemailer from 'nodemailer';
import Busboy from 'busboy';
import multer from 'multer';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import csvParser from 'csv-parser';

const upload = multer({ storage: multer.memoryStorage() });
import { GoogleGenAI } from '@google/genai';
import { domainToASCII } from 'url';
import { loadSystemKnowledge } from './loadKnowledge';
import { getLocalHelp } from './localHelp';
import { getPlanFeaturesForBackend, PLANS } from './shared/plans';
import { AR, EN } from './i18n';

import { sanitizeDeep } from './encodingGuard';
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Load .env from backend/ or repo root (never depend on dist/.env when running dist/api.js)
const backendDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(backendDir, '.env') });
dotenv.config({ path: path.resolve(backendDir, '..', '.env') });

const app = express();

app.use((req, res, next) => {
  const origJson = res.json.bind(res);
  res.json = (body: any) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return origJson(sanitizeDeep(body));
  };
  next();
});
// ===== GLOBAL_CORS_PREFLIGHT (added) =====
const ALLOWED_ORIGINS = new Set([
  'https://crowncs.org',
  'https://www.crowncs.org',
  'http://localhost:3000',
]);

app.use((req: any, res: any, next: any) => {
  const origin = req.headers.origin as string | undefined;

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Shop-Id, X-Branch-Id, Accept-Language, X-Requested-With'
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});
// ===== /GLOBAL_CORS_PREFLIGHT =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// (cleaned)
app.use((req, res, next) => {
  if (req.method !== 'OPTIONS') return next();

  const origin = (req.headers.origin as string | undefined) || '';
  const normalize = (u: string) => u.toLowerCase().trim().replace(/\/+$/, '');

  const raw = process.env.CORS_ORIGIN || '';
  const fromEnv = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(normalize);
  const allowed = fromEnv.length > 0 ? fromEnv : ['https://crowncs.org', 'https://www.crowncs.org', 'http://localhost:3000'].map(normalize);

  const o = normalize(origin);

  if (origin && allowed.includes(o)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  const reqHeaders = (req.headers['access-control-request-headers'] as string | undefined);
  res.setHeader('Access-Control-Allow-Headers', reqHeaders || 'Content-Type, Authorization, X-Shop-Id');

  return res.status(204).end();
});

// Dev-only request logger to confirm active routes and hits
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log('[REQ]', req.method, req.url);
    next();
  });
}

function normalizeOrigin(url: string): string {
  if (!url || typeof url !== 'string') return '';
  return url.toLowerCase().trim().replace(/\/+$/, '');
}

const defaultOrigins = ['https://crowncs.org', 'https://www.crowncs.org', 'http://localhost:3000'].map(normalizeOrigin);
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
  .map(normalizeOrigin);
const origins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins;

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const normalized = normalizeOrigin(origin);
    if (!normalized) return cb(null, true);
    if (origins.includes(normalized)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Shop-Id', 'X-Branch-Id', 'Accept-Language', 'X-Requested-With'],
};

app.use(cors(corsOptions));

app.get('/api/plans', (req: Request, res: Response) => {
  const lang = (req.query.lang === 'en' ? 'en' : 'ar') as 'ar' | 'en';
  const plans = PLANS.map((p) => ({
    ...p,
    pricingForLang: p.pricing[lang],
    currency: lang === 'ar' ? 'EGP' : 'USD',
    currencySymbol: lang === 'ar' ? 'ج.م' : '$',
  }));
  res.json(plans);
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/health/db', async (_req: Request, res: Response) => {
  try {
    await pool.execute('SELECT 1 as ok');
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: error?.message ?? 'Database check failed' });
  }
});

// TEMPORARY: remove after setup
app.get('/api/setup-admin', async (_req: Request, res: Response) => {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [existingUsers] = await connection.execute('SELECT id FROM users WHERE email = ?', ['admin@crown.com']);
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
        'INSERT INTO users (email, password, is_admin, is_super_admin, is_active, role, created_at, shop_id) VALUES (?, ?, 1, 1, 1, ?, NOW(), ?)',
        ['admin@crown.com', hashedPassword, 'super_admin', shopInsert.insertId]
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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'crown-services-secret-key-2026';
const PORT = Number(process.env.PORT || 8080);

// Masked Gemini key log (no full key ever printed)
if (process.env.NODE_ENV !== 'production') {
  const len = GEMINI_API_KEY ? GEMINI_API_KEY.length : 0;
  console.log('Gemini key loaded:', GEMINI_API_KEY ? `yes (len=${len})` : 'no');
}
const genAI = (() => {
  if (!GEMINI_API_KEY) return null;
  try {
    // Use stable (v1) endpoints to avoid v1beta model issues.
    return new GoogleGenAI({ apiKey: GEMINI_API_KEY, apiVersion: 'v1' });
  } catch (error) {
    console.error('ERROR: Gemini SDK init error:', error);
    return null;
  }
})();
// NOTE: Available models for the stable v1 endpoint can vary by API.
// We default to a fast model that is currently available in `models.list()`.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

type AiStatus = { ok: boolean; mode: 'cloud' | 'offline'; reason?: string };
let aiStatusCache: { value: AiStatus; ts: number } | null = null;

const SUPER_ADMIN_EMAIL = 'admin@crown.com';
const SUPER_ADMIN_PASSWORD = 'password123';

const ensureSuperAdmin = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // (cleaned)
    const [userRows] = await connection.execute(
      'SELECT id, password FROM users WHERE email = ? OR username = ?',
      [SUPER_ADMIN_EMAIL, SUPER_ADMIN_EMAIL]
    );
    const existing = (userRows as any[])[0];

    if (!existing) {
      const hashed = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
      await connection.execute(
        `INSERT INTO users (username, email, password, role, created_at)
         VALUES (?, ?, ?, 'super_admin', NOW())`,
        [SUPER_ADMIN_EMAIL, SUPER_ADMIN_EMAIL, hashed]
      );
      console.log('حدث خطأ. حاول مرة أخرى.');
    } else {
      const forceReset = process.env.FORCE_SUPER_ADMIN_RESET === 'true';
      if (forceReset) {
        const hashed = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
        await connection.execute(
          'UPDATE users SET role = ?, password = ? WHERE id = ?',
          ['super_admin', hashed, existing.id]
        );
      } else {
        await connection.execute('UPDATE users SET role = ? WHERE id = ?', ['super_admin', existing.id]);
      }
      console.log('حدث خطأ. حاول مرة أخرى.');
    }

    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error('ERROR: Failed to ensure super admin:', (error as any).message);
  } finally {
    if (connection) connection.release();
  }
};

// Initialize database on startup
testConnection().then(async () => {
  try {
    await initializeDatabase();
    try {
      await pool.execute('ALTER TABLE shops MODIFY COLUMN logo_url LONGTEXT');
    } catch (migrationError) {
      console.error('ERROR: logo_url migration error:', (migrationError as any)?.message || migrationError);
    }
    await ensureSuperAdmin();
  } catch (error) {
    console.error(error);
  }
});

// Middleware for authentication: /api/auth/* public except /api/auth/me; /api/health, /api/public, /api/storefront, /api/setup public
const authenticateToken = async (req: any, res: Response, next: any) => {
  if (req.path.startsWith('/api/auth/') && req.path !== '/api/auth/me') {
    return next();
  }
  if (req.path === '/api/health' || req.path.startsWith('/api/health/') ||
      req.path.startsWith('/api/public') || req.path.startsWith('/api/storefront') ||
      req.path === '/api/setup' || req.path.startsWith('/api/setup')) {
    return next();
  }

  const authHeader =
    (req.headers.authorization as string | undefined) ||
    (req.header?.('Authorization') as string | undefined) ||
    '';

  const tokenFromHeader = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  const tokenFromCookie =
    (req.cookies?.token as string | undefined) ||
    (req.cookies?.access_token as string | undefined);

  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [decoded.userId]);
    const userArray = users as any[];
    
    if (userArray.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userArray[0];
    if (!user.shop_id && decoded.shopId) {
      user.shop_id = decoded.shopId;
    }

    if (user.shop_id) {
      const [shops] = await pool.execute('SELECT package FROM shops WHERE id = ?', [user.shop_id]);
      const shopArray = shops as any[];
      if (shopArray.length > 0) {
        user.package = shopArray[0].package;
      }
    }

    // Update last_seen_at for authenticated users (excluding public endpoints handled above)
    try {
      await pool.execute('UPDATE users SET last_seen_at = NOW() WHERE id = ?', [user.id]);
      (user as any).last_seen_at = new Date();
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[auth] failed to update last_seen_at:', err?.message || err);
      }
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

function getOne(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return typeof v[0] === 'string' ? v[0] : undefined;
  return undefined;
}

function mustOne(v: unknown, fallback = ''): string {
  return getOne(v) ?? fallback;
}

const resolveShopId = (req: any) => {
  const headerShop = req.headers['x-shop-id'];
  const headerShopId = Array.isArray(headerShop) ? headerShop[0] : headerShop;
  const headerParsed = headerShopId ? Number(headerShopId) : NaN;

  const q = req.query?.shopId ?? req.query?.shop_id;
  const b = req.body?.shopId ?? req.body?.shop_id;

  const queryParsed = q != null && q !== '' ? Number(q) : NaN;
  const bodyParsed = b != null && b !== '' ? Number(b) : NaN;

  const explicit =
    (Number.isFinite(queryParsed) && queryParsed > 0 ? queryParsed : null) ??
    (Number.isFinite(bodyParsed) && bodyParsed > 0 ? bodyParsed : null) ??
    (Number.isFinite(headerParsed) && headerParsed > 0 ? headerParsed : null);

  const fromUser = req.user?.shop_id ?? req.user?.shopId ?? null;

  if (req.user?.role === 'super_admin') {
    return explicit ?? fromUser ?? null;
  }

  return fromUser ?? explicit ?? null;
};

/** Resolve active branch: x-branch-id header or body.branchId. Returns null if not sent; caller may use shop default. */
const resolveBranchId = (req: any): number | null => {
  const raw =
    req.headers['x-branch-id'] ?? req.body?.branchId ?? req.query?.branchId;
  const id = Array.isArray(raw) ? Number(raw[0]) : Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
};

/**
 * Resolve or auto-create a shop for the current user.
 * - If user already has shop_id and shop exists -> returns it.
 * - If not, creates a new shop, links it to the user and ensures a base subscription.
 * - In dev, super_admin gets gold lifetime by default.
 */
const resolveOrCreateShopForUser = async (user: any): Promise<number> => {
  if (!user?.id) {
    throw new Error('USER_REQUIRED');
  }

  let existingShopId: number | null =
    (user.shop_id as number | undefined) ??
    (user.shopId as number | undefined) ??
    null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (existingShopId) {
      const [rows] = await conn.execute('SELECT id FROM shops WHERE id = ?', [existingShopId]);
      if ((rows as any[]).length > 0) {
        await conn.commit();
        return existingShopId;
      }
    }

    const planName: string = user.role === 'super_admin' ? 'gold' : 'bronze';
    const displayName =
      user.role === 'super_admin'
        ? 'Crown Admin Shop'
        : String(user.email || user.username || 'Crown Shop');

    const [insertShop] = await conn.execute(
      `INSERT INTO shops (
        name,
        business_name,
        owner_name,
        activity_type,
        address,
        contact_email,
        contact_phone,
        country_name,
        currency_code,
        currency_symbol,
        plan_type,
        is_active,
        logo_url,
        owner_id,
        package
      ) VALUES (?, NULL, ?, NULL, NULL, ?, NULL, NULL, NULL, NULL, ?, 1, NULL, ?, ?)`,
      [
        displayName,
        displayName,
        user.email || null,
        planName,
        user.id,
        planName,
      ]
    );
    const newShopId = Number((insertShop as any).insertId || 0);

    await conn.execute('UPDATE users SET shop_id = ?, package = ? WHERE id = ?', [
      newShopId,
      planName,
      user.id,
    ]);

    await conn.commit();

    // Ensure a base subscription (best-effort, ignore failures)
    try {
      await subscriptionStackActivation(
        newShopId,
        planName,
        process.env.NODE_ENV !== 'production' ? 'lifetime' : 'yearly',
        'AUTO_INIT',
        user.id
      );
    } catch {
      // non-fatal in dev/prod; shop itself is created and linked
    }

    return newShopId;
  } catch (error) {
    await conn.rollback().catch(() => {});
    throw error;
  } finally {
    conn.release();
  }
};

/** For branch_manager: return assigned branch ids. For multi_branch_manager: null (all branches). Others: null. */
const getBranchManagerBranchIds = async (req: any): Promise<number[] | null> => {
  if (req.user?.role !== 'branch_manager' || !req.user?.id) return null;
  const [rows] = await pool.execute('SELECT branch_id FROM user_branch_assignments WHERE user_id = ?', [req.user.id]);
  const ids = (rows as any[]).map((r) => Number(r.branch_id)).filter((n) => Number.isFinite(n) && n > 0);
  return ids.length > 0 ? ids : null;
};

/** Plan for shop from shop_subscriptions (fallback shops.package). */
async function getShopPlan(shopId: number): Promise<string> {
  const [rows] = await pool.execute('SELECT plan FROM shop_subscriptions WHERE shop_id = ?', [shopId]);
  if ((rows as any[]).length > 0) return String((rows as any[])[0].plan || 'bronze');
  const [shopRows] = await pool.execute('SELECT package FROM shops WHERE id = ?', [shopId]);
  return (shopRows as any[]).length > 0 ? String((shopRows as any[])[0].package || 'bronze') : 'bronze';
}

/** Whether a feature is enabled for the shop (from shop_features). */
async function isFeatureEnabled(shopId: number, featureKey: string): Promise<boolean> {
  const [rows] = await pool.execute(
    'SELECT enabled FROM shop_features WHERE shop_id = ? AND feature_key = ? AND (expires_at IS NULL OR expires_at > NOW())',
    [shopId, featureKey]
  );
  return (rows as any[]).length > 0 && Number((rows as any[])[0].enabled) === 1;
}

/** Max branches limit for shop (from shop_features.max_limit for multi_branch). */
async function getMaxBranches(shopId: number): Promise<number | null> {
  const [rows] = await pool.execute(
    'SELECT max_limit FROM shop_features WHERE shop_id = ? AND feature_key = ? AND enabled = 1 AND (expires_at IS NULL OR expires_at > NOW())',
    [shopId, 'multi_branch']
  );
  if ((rows as any[]).length === 0) return null;
  const v = (rows as any[])[0].max_limit;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
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

// Helper: require super_admin explicitly (for system-level APIs)
const requireSuperAdmin = requireRole('super_admin');

// POST /api/products/bulk-delete (must be before POST /api/products)
app.post('/api/products/bulk-delete', authenticateToken, requireRole('super_admin', 'shop_owner', 'warehouse'), async (req: any, res: Response) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map(Number).filter((id: number) => Number.isInteger(id) && id > 0)
      : [];

    if (!ids.length) {
      return res.status(400).json({ ok: false, error: 'حدث خطأ. حاول مرة أخرى.' });
    }

    const shopId = req.user?.shopId ?? req.user?.shop_id ?? resolveShopId(req);
    if (!shopId) {
      return res.status(400).json({ ok: false, error: 'shopId is required' });
    }

    // Server-side validation: only delete products belonging to current shop
    const placeholders = ids.map(() => '?').join(',');
    const [ownershipRows] = await pool.execute(
      `SELECT COUNT(*) as c FROM products WHERE id IN (${placeholders}) AND shop_id = ?`,
      [...ids, shopId]
    );
    const ownedCount = (ownershipRows as any[])[0]?.c ?? 0;
    if (ownedCount < ids.length) {
      return res.status(403).json({ ok: false, error: 'حدث خطأ. حاول مرة أخرى.' });
    }

    const [result] = await pool.execute(
      `UPDATE products SET is_deleted = 1 WHERE id IN (${placeholders}) AND shop_id = ?`,
      [...ids, shopId]
    );
    const deletedCount = (result as any).affectedRows ?? 0;

    console.log('BULK DELETE', { userId: req.user?.id, shopId, count: deletedCount, timestamp: new Date().toISOString() });

    return res.json({ ok: true, deletedCount });
  } catch (err: any) {
    console.error('bulk-delete error', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

// Debug: list available Gemini models for this API key (super admin only)
app.get('/api/models', authenticateToken, requireRole('super_admin'), async (req: any, res: Response) => {
  try {
    if (!GEMINI_API_KEY || !genAI) {
      return res.status(400).json({ error: 'AI API key is missing' });
    }

    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 200) : 50;

    const pager = await genAI.models.list();
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
    console.error('ERROR: /api/models error:', { name: error?.name, status: error?.status, message: error?.message });
    res.status(500).json({ error: 'Failed to list models' });
  }
});

// Lightweight AI health / status endpoint (with 60s cache)
app.get('/api/ai/status', authenticateToken, requirePackageFeature('ai'), async (req: any, res: Response) => {
  try {
    if (!GEMINI_API_KEY || !genAI) {
      const status: AiStatus = { ok: false, mode: 'offline', reason: 'AI_DISABLED' };
      aiStatusCache = { value: status, ts: Date.now() };
      return res.json(status);
    }

    const now = Date.now();
    if (aiStatusCache && now - aiStatusCache.ts < 60_000) {
      return res.json(aiStatusCache.value);
    }

    let status: AiStatus;
    try {
      // Use models.list as a very light validation of the client/key.
      const pager = genAI.models.list();
      let hasAny = false;
      for await (const _model of pager as any) {
        hasAny = true;
        break;
      }
      status = hasAny
        ? { ok: true, mode: 'cloud' }
        : { ok: false, mode: 'offline', reason: 'NO_MODELS' };
    } catch (error: any) {
      const isKeyError =
        error?.status === 400 ||
        error?.status === 401 ||
        error?.status === 403 ||
        (typeof error?.message === 'string' && /api[_-]?key|unauthorized|invalid/i.test(error.message));
      status = isKeyError
        ? { ok: false, mode: 'offline', reason: 'API_KEY_INVALID' }
        : { ok: false, mode: 'offline', reason: 'PROVIDER_ERROR' };
    }

    aiStatusCache = { value: status, ts: now };
    res.json(status);
  } catch (error: any) {
    const fallback: AiStatus = { ok: false, mode: 'offline', reason: 'STATUS_ERROR' };
    aiStatusCache = { value: fallback, ts: Date.now() };
    res.json(fallback);
  }
});

// Middleware for package-based access control
function requirePackageFeature(feature: 'qr' | 'pos' | 'dashboard' | 'excel' | 'ai' | 'storefront') {
  return (req: any, res: Response, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    const plan = String(req.user.package || 'bronze').toLowerCase();
    const config = getTierConfig(plan);

    const allowed =
      feature === 'pos'
        ? true
        : feature === 'dashboard'
        ? true
        : feature === 'excel'
        ? Boolean(config.excelImport)
        : feature === 'ai'
        ? ['gold', 'branches'].includes(plan)
        : feature === 'qr'
        ? Boolean(config.qrCode || config.barcode)
        : feature === 'storefront'
        ? ['gold', 'branches'].includes(plan)
        : false;

    if (!allowed) {
      return res.status(403).json({ error: 'Plan does not allow this feature' });
    }

    return next();
  };
}

const tierFeatures = {
  bronze: { maxProducts: 500, barcode: true, qrCode: false, pharmacyExpiry: false, reports: true, voiceAssistant: false, excelImport: false },
  silver: { maxProducts: 3000, barcode: true, qrCode: true, pharmacyExpiry: true, reports: true, voiceAssistant: false, excelImport: true },
  gold: { maxProducts: 20000, barcode: true, qrCode: true, pharmacyExpiry: true, reports: true, voiceAssistant: true, excelImport: true },
  branches: { maxProducts: null, barcode: true, qrCode: true, pharmacyExpiry: true, reports: true, voiceAssistant: true, excelImport: true },
} as const;

type TierName = keyof typeof tierFeatures;
function getTierConfig(tier: string): (typeof tierFeatures)[TierName] {
  const key = (tier in tierFeatures ? tier : 'bronze') as TierName;
  return tierFeatures[key];
}

function getPlanFeatures(plan: string) {
  return getPlanFeaturesForBackend(plan);
}

const getShopTier = async (shopId: number) => {
  const [shops] = await pool.execute('SELECT package FROM shops WHERE id = ?', [shopId]);
  const shopArray = shops as any[];
  return String(shopArray[0]?.package || 'bronze').toLowerCase();
};

/** Compute effective plan + features for a user (role + subscriptions). */
const getEffectivePlanForUser = async (user: any): Promise<{ planId: string; features: any }> => {
  // Super admin: always treated as gold (full features)
  if (user?.role === 'super_admin') {
    const gold = PLANS.find((p) => p.id === 'gold')!;
    return { planId: gold.id, features: gold.features };
  }

  const shopId: number | null =
    (user?.shop_id as number | undefined) ??
    (user?.shopId as number | undefined) ??
    null;

  if (!shopId) {
    const bronze = PLANS.find((p) => p.id === 'bronze')!;
    return { planId: bronze.id, features: bronze.features };
  }

  try {
    const [rows] = await pool.execute(
      'SELECT plan_name, expires_at FROM subscriptions WHERE shop_id = ? LIMIT 1',
      [shopId]
    );
    const sub = (rows as any[])[0];
    let planName = String(sub?.plan_name || 'bronze').toLowerCase();
    const expiresAt = sub?.expires_at ? new Date(sub.expires_at) : null;
    if (expiresAt && expiresAt.getTime() < Date.now()) {
      planName = 'bronze';
    }
    const cfg = PLANS.find((p) => p.id === planName) || PLANS.find((p) => p.id === 'bronze')!;
    return { planId: cfg.id, features: cfg.features };
  } catch {
    const bronze = PLANS.find((p) => p.id === 'bronze')!;
    return { planId: bronze.id, features: bronze.features };
  }
};

const enforceProductLimit = async (shopId: number, incomingCount: number) => {
  const tier = await getShopTier(shopId);
  const config = getTierConfig(tier);
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

const detectUserLanguage = (text: string): 'ar' | 'en' => {
  const sample = String(text || '');
  // Arabic ranges: Arabic, Arabic Supplement, Arabic Extended-A/B
  const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(sample);
  return hasArabic ? 'ar' : 'en';
};

const getTtsLocaleForLang = (lang: 'ar' | 'en') => {
  return lang === 'ar' ? 'ar-EG' : 'en-US';
};

/** Strip Markdown from assistant reply so users never see ** or ### etc.; also remove bullets that cause "حدث خطأ. حاول مرة أخرى." in TTS. */
function sanitizeReply(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let s = text
    .replace(/\*\*|__/g, '')
    .replace(/~~/g, '')
    .replace(/`/g, '')
    .replace(/\*+/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/```/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[أ¢â‚¬آ¢]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

const normalizeNumber = (value?: string | number | null) => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, '').replace(/[^\d.\-]/g, '');
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
    'حدث خطأ. حاول مرة أخرى.',
    'حدث خطأ. حاول مرة أخرى.',
    'حدث خطأ. حاول مرة أخرى.',
    'حدث خطأ. حاول مرة أخرى.',
    'حدث خطأ. حاول مرة أخرى.',
  ],
  nameAr: ['name_ar', 'name ar', 'arabic', 'arabicname', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.'],
  brand: ['brand', 'Brand', 'manufacturer', 'company', 'mark', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.'],
  sku: ['sku', 'itemcode', 'code', 'partnumber', 'part', 'reference', 'ref', 'حدث خطأ. حاول مرة أخرى.'],
  barcode: ['barcode', 'bar code', 'ean', 'upc', 'gtin', 'حدث خطأ. حاول مرة أخرى.', 'qr code', 'qr_code', 'qrcode', 'QR_Code'],
  qrCode: ['qr', 'qrcode', 'qr code'],
  category: ['category', 'group', 'type', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.'],
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
    'حدث خطأ. حاول مرة أخرى.',
    'حدث خطأ. حاول مرة أخرى.',
    'حدث خطأ. حاول مرة أخرى.',
    'حدث خطأ. حاول مرة أخرى.',
  ],
  sellPrice: [
    'sell',
    'sell price',
    'sellprice',
    'saleprice',
    'selling price',
    'price',
    'unitprice',
    'حدث خطأ. حاول مرة أخرى.',
    'حدث خطأ. حاول مرة أخرى.',
    'حدث خطأ. حاول مرة أخرى.',
    'حدث خطأ. حاول مرة أخرى.',
  ],
  stockQuantity: ['qty', 'quantity', 'stock', 'Stock', 'available', 'onhand', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.'],
  minStockLevel: ['min', 'minimum', 'reorder', 'minstock', 'min stock', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.'],
  imageUrl: ['image url', 'image_url', 'imageurl', 'img', 'photo', 'picture', 'Image_URL'],
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
      { field: 'name', note: 'حدث خطأ. حاول مرة أخرى.', acceptedHeaders: fieldMatchers.name },
      { field: 'sellPrice', note: 'حدث خطأ. حاول مرة أخرى.', acceptedHeaders: [...fieldMatchers.sellPrice, ...fieldMatchers.buyPrice] },
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
    },
    tip: 'Map columns for best results. Empty fields are imported as drafts.',
  };
};

// (cleaned)
const PRODUCT_IMPORT_CANONICAL_KEYS = [
  'partName',
  'nameAr',
  'brand',
  'category',
  'sellPrice',
  'buyPrice',
  'stockQty',
  'sku',
  'barcode',
  'qrCode',
  'imageUrl',
  'minStockLevel',
] as const;
type CanonicalKey = (typeof PRODUCT_IMPORT_CANONICAL_KEYS)[number];

const PRODUCT_IMPORT_ALIASES: Record<CanonicalKey, string[]> = {
  partName: ['part_name', 'part name', 'product name', 'name', 'productname', 'item', 'title', 'description', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.'],
  nameAr: ['name_ar', 'name ar', 'arabic name', 'namear', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.'],
  brand: ['brand', 'brand_name', 'manufacturer', 'company', 'mark', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.'],
  category: ['category', 'group', 'type', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.'],
  sellPrice: ['sellprice', 'sell_price', 'price', 'sale', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.'],
  buyPrice: ['buyprice', 'buy_price', 'cost', 'purchase', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.'],
  stockQty: ['stock', 'stockqty', 'stock_qty', 'quantity', 'qty', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.'],
  sku: ['sku', 'sku_code', 'code', 'partnumber', 'حدث خطأ. حاول مرة أخرى.'],
  barcode: ['barcode', 'bar_code', 'ean', 'upc', 'حدث خطأ. حاول مرة أخرى.'],
  qrCode: ['qr_code', 'qrcode', 'qr code'],
  imageUrl: ['image_url', 'imageurl', 'image url', 'image', 'photo', 'picture', 'url'],
  minStockLevel: ['minstock', 'min_stock', 'minimum', 'حدث خطأ. حاول مرة أخرى.', 'حدث خطأ. حاول مرة أخرى.'],
};

function normalizeHeaderForImport(value: string): string {
  let s = String(value ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[_\-]/g, ' ');
  return s;
}

function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  const dp: number[][] = Array(an + 1)
    .fill(null)
    .map(() => Array(bn + 1).fill(0));
  for (let i = 0; i <= an; i++) dp[i][0] = i;
  for (let j = 0; j <= bn; j++) dp[0][j] = j;
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[an][bn];
}

function inferColumnMapping(
  detectedHeaders: string[],
  normalizedHeaders: string[]
): Record<CanonicalKey, string | null> {
  const inferred: Record<string, string | null> = {};
  const used = new Set<string>();

  for (const key of PRODUCT_IMPORT_CANONICAL_KEYS) {
    const aliases = PRODUCT_IMPORT_ALIASES[key].map((a) => normalizeHeaderForImport(a));
    let bestHeader: string | null = null;
    let bestScore = -1;

    for (let i = 0; i < detectedHeaders.length; i++) {
      const orig = detectedHeaders[i];
      const norm = normalizedHeaders[i] ?? normalizeHeaderForImport(orig);
      if (used.has(orig)) continue;

      if (aliases.some((a) => a === norm || norm === a)) {
        bestHeader = orig;
        bestScore = 100;
        break;
      }
      if (aliases.some((a) => norm.includes(a) || a.includes(norm))) {
        const score = 80;
        if (score > bestScore) {
          bestScore = score;
          bestHeader = orig;
        }
      }
      const dist = levenshteinDistance(norm, aliases[0]);
      const maxLen = Math.max(norm.length, aliases[0].length) || 1;
      const sim = 1 - dist / maxLen;
      if (sim > 0.6 && sim > bestScore / 100) {
        bestScore = Math.round(sim * 100);
        bestHeader = orig;
      }
    }
    if (bestHeader && bestScore >= 60) {
      inferred[key] = bestHeader;
      used.add(bestHeader);
    } else {
      inferred[key] = null;
    }
  }
  return inferred as Record<CanonicalKey, string | null>;
}

const API_TO_CANONICAL: Record<string, CanonicalKey> = {
  name: 'partName', nameAr: 'nameAr', brand: 'brand', category: 'category',
  sellPrice: 'sellPrice', buyPrice: 'buyPrice', stockQuantity: 'stockQty',
  sku: 'sku', barcode: 'barcode', qrCode: 'qrCode', imageUrl: 'imageUrl', minStockLevel: 'minStockLevel',
};

function clientMappingToInferred(clientMap: Record<string, string>, detectedHeaders: string[]): Record<CanonicalKey, string | null> {
  const inferred: Record<string, string | null> = {};
  for (const key of PRODUCT_IMPORT_CANONICAL_KEYS) inferred[key] = null;
  for (const [header, apiField] of Object.entries(clientMap)) {
    if (!apiField || apiField === 'ignore' || apiField === '') continue;
    const canonicalKey = API_TO_CANONICAL[apiField] || (apiField as CanonicalKey);
    if (PRODUCT_IMPORT_CANONICAL_KEYS.includes(canonicalKey as CanonicalKey) && detectedHeaders.includes(header)) {
      inferred[canonicalKey] = header;
    }
  }
  return inferred as Record<CanonicalKey, string | null>;
}

function toCanonicalRow(
  row: Record<string, string | undefined>,
  inferredMap: Record<CanonicalKey, string | null>,
  _detectedHeaders: string[]
): Record<CanonicalKey, string | null> {
  const out: Record<string, string | null> = {};
  for (const key of PRODUCT_IMPORT_CANONICAL_KEYS) {
    const header = inferredMap[key];
    if (!header) {
      out[key] = null;
      continue;
    }
    const val = row[header];
    const s = val === undefined || val === null ? '' : String(val).trim();
    out[key] = s === '' ? null : s;
  }
  return out as Record<CanonicalKey, string | null>;
}

type ParseResult = {
  detectedHeaders: string[];
  normalizedHeaders: string[];
  dataRows: Record<string, string>[];
  sheetNames?: string[];
  error?: string;
};

async function parseExcelOrCsv(buffer: Buffer, filename: string, opts?: { sheetIndex?: number; headerRowIndex?: number }): Promise<ParseResult> {
  const sheetIndex = opts?.sheetIndex ?? 0;
  const headerRowIndex = opts?.headerRowIndex ?? 0;
  const lower = filename.toLowerCase();
  const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : '';

  if (ext === '.csv') {
    if (sheetIndex > 0) {
      return { detectedHeaders: [], normalizedHeaders: [], dataRows: [], error: 'CSV has only one sheet.' };
    }
    const rows: Record<string, string>[] = [];
    await new Promise<void>((resolve, reject) => {
      const parser = csvParser({ headers: false });
      const src = Readable.from(buffer);
      src.pipe(parser)
        .on('data', (row: Record<string, string>) => rows.push(row))
        .on('end', () => resolve())
        .on('error', reject);
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
    let headerIdx = Math.min(headerRowIndex, rows.length - 1);
    for (let i = headerIdx; i < rows.length; i++) {
      if (nonEmptyCount(rows[i]) >= 2) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx >= rows.length || nonEmptyCount(rows[headerIdx]) < 2) {
      return { detectedHeaders: [], normalizedHeaders: [], dataRows: [], error: 'No header row found (need at least 2 non-empty cells).' };
    }
    const rawHeaders = orderedValues(rows[headerIdx]);
    const detectedHeaders = rawHeaders.map((h) => String(h || '').trim());
    const normalizedHeaders = detectedHeaders.map(normalizeHeaderForImport);
    const dataRows = rows.slice(headerIdx + 1).filter((r) => nonEmptyCount(r) > 0).map((r) => {
      const vals = orderedValues(r);
      const obj: Record<string, string> = {};
      detectedHeaders.forEach((h, i) => {
        obj[h] = vals[i] !== undefined ? vals[i] : '';
      });
      return obj;
    });
    return { detectedHeaders, normalizedHeaders, dataRows };
  }

  if (ext === '.xlsx' || ext === '.xlsm') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheetNames = workbook.worksheets.map((ws) => ws.name);
    const sheet = workbook.worksheets[sheetIndex] || workbook.worksheets[0];
    if (!sheet) {
      return { detectedHeaders: [], normalizedHeaders: [], dataRows: [], sheetNames, error: 'No worksheet in file.' };
    }
    const excelRows: string[][] = [];
    sheet.eachRow((row, _n) => {
      const raw = (row.values as any[]) || [];
      const vals: string[] = [];
      for (let i = 1; i < raw.length; i++) vals.push(String(raw[i] ?? '').trim());
      excelRows.push(vals);
    });
    const nonEmptyCountArr = (arr: string[]) => arr.filter((c) => String(c).trim() !== '').length;
    let headerIdx = Math.min(headerRowIndex, excelRows.length - 1);
    for (let i = headerIdx; i < excelRows.length; i++) {
      if (nonEmptyCountArr(excelRows[i]) >= 2) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx >= excelRows.length || nonEmptyCountArr(excelRows[headerIdx]) < 2) {
      return { detectedHeaders: [], normalizedHeaders: [], dataRows: [], sheetNames, error: 'No header row found (need at least 2 non-empty cells).' };
    }
    const maxCol = Math.max(...excelRows.map((r) => r.length), 0);
    const detectedHeaders = excelRows[headerIdx].slice(0, maxCol);
    while (detectedHeaders.length < maxCol) detectedHeaders.push('');
    const normalizedHeaders = detectedHeaders.map(normalizeHeaderForImport);
    const dataRows = excelRows.slice(headerIdx + 1).filter((r) => nonEmptyCountArr(r) > 0).map((vals) => {
      const obj: Record<string, string> = {};
      detectedHeaders.forEach((h, i) => {
        obj[h] = vals[i] !== undefined ? vals[i] : '';
      });
      return obj;
    });
    return { detectedHeaders, normalizedHeaders, dataRows, sheetNames };
  }

  return { detectedHeaders: [], normalizedHeaders: [], dataRows: [], error: 'Unsupported file type. Use .xlsx, .xlsm, or .csv.' };
}

const AR_ERRORS: Record<string, string> = {
  name_required: 'حدث خطأ. حاول مرة أخرى.',
  sell_price_invalid: 'حدث خطأ. حاول مرة أخرى.',
  buy_price_invalid: 'حدث خطأ. حاول مرة أخرى.',
  stock_invalid: 'حدث خطأ. حاول مرة أخرى.',
  sku_duplicate: 'حدث خطأ. حاول مرة أخرى.',
  barcode_duplicate: 'حدث خطأ. حاول مرة أخرى.',
};

function validateCanonicalRow(
  canonical: Record<CanonicalKey, string | null>,
  rowIndex: number,
  skuSet: Set<string>,
  barcodeSet: Set<string>
): string[] {
  const errs: string[] = [];
  const partName = (canonical.partName ?? '').trim();
  const nameAr = (canonical.nameAr ?? '').trim();
  if (!partName && !nameAr) errs.push(`حدث خطأ. حاول مرة أخرى.`);
  const sellRaw = (canonical.sellPrice ?? '').trim();
  const buyRaw = (canonical.buyPrice ?? '').trim();
  if (sellRaw) {
    const n = normalizeNumber(sellRaw);
    if (n === null || n < 0) errs.push(`حدث خطأ. حاول مرة أخرى.`);
  }
  if (buyRaw) {
    const n = normalizeNumber(buyRaw);
    if (n === null || n < 0) errs.push(`حدث خطأ. حاول مرة أخرى.`);
  }
  const sq = (canonical.stockQty ?? '').trim();
  if (sq) {
    const n = normalizeNumber(sq);
    if (n === null || Math.floor(Number(n)) < 0) errs.push(`حدث خطأ. حاول مرة أخرى.`);
  }
  const sku = (canonical.sku ?? '').trim();
  if (sku && skuSet.has(normalizeText(sku))) errs.push(`حدث خطأ. حاول مرة أخرى.`);
  const barcode = (canonical.barcode ?? '').trim() || (canonical.qrCode ?? '').trim();
  if (barcode && barcodeSet.has(normalizeText(barcode))) errs.push(`حدث خطأ. حاول مرة أخرى.`);
  return errs;
}

function canonicalRowToDbInsert(
  canonical: Record<CanonicalKey, string | null>,
  shopId: number,
  categoryMap: Map<string, number>,
  warnings: string[]
): [any[], boolean] {
  const partName = canonical.partName ?? '';
  const nameAr = canonical.nameAr ?? '';
  const nameEn = (partName || nameAr || '').trim() || `Draft #${Date.now()}`;
  const nameArVal = (nameAr || nameEn).trim();
  let sellPriceNum: number | null = null;
  let buyPriceNum: number | null = null;
  const sellRaw = (canonical.sellPrice ?? '').trim();
  const buyRaw = (canonical.buyPrice ?? '').trim();
  if (sellRaw) {
    const n = normalizeNumber(sellRaw);
    if (n !== null) sellPriceNum = Number(n);
    else warnings.push(`Invalid sellPrice: ${sellRaw.slice(0, 30)}`);
  }
  if (buyRaw) {
    const n = normalizeNumber(buyRaw);
    if (n !== null) buyPriceNum = Number(n);
    else warnings.push(`Invalid buyPrice: ${buyRaw.slice(0, 30)}`);
  }
  const sellPrice = sellPriceNum ?? (buyPriceNum != null ? Number((buyPriceNum * 1.2).toFixed(2)) : 0);
  const buyPrice = buyPriceNum ?? 0;
  let stockQty = 0;
  const sq = (canonical.stockQty ?? '').trim();
  if (sq) {
    const n = normalizeNumber(sq);
    if (n !== null) stockQty = Math.max(0, Math.floor(Number(n)));
    else warnings.push(`Invalid stockQty: ${sq.slice(0, 20)}`);
  }
  let minStock = 5;
  const ms = (canonical.minStockLevel ?? '').trim();
  if (ms) {
    const n = normalizeNumber(ms);
    if (n !== null) minStock = Math.max(0, Math.floor(Number(n)));
  }
  const sku = (canonical.sku ?? '').trim() || null;
  let barcode = (canonical.barcode ?? '').trim() || null;
  const qr = (canonical.qrCode ?? '').trim() || null;
  if (!barcode && qr) barcode = qr;
  const imageUrl = (canonical.imageUrl ?? '').trim() || null;
  const brand = (canonical.brand ?? '').trim() || null;
  let categoryId: number | null = null;
  const catRaw = (canonical.category ?? '').trim();
  if (catRaw) {
    const norm = normalizeText(catRaw);
    if (norm && categoryMap.has(norm)) categoryId = categoryMap.get(norm) ?? null;
  }
  const missingList: string[] = [];
  if (!(partName || nameAr)) missingList.push('ProductName');
  if (sellPrice <= 0) missingList.push('SellPrice');
  const isIncomplete = missingList.length > 0 ? 1 : 0;
  const missingFieldsJson = missingList.length > 0 ? JSON.stringify(missingList) : null;
  const extraFieldsJson = null;
  const row = [
    nameEn,
    nameArVal,
    sku,
    barcode,
    qr,
    brand,
    categoryId,
    buyPrice,
    sellPrice,
    stockQty,
    minStock,
    imageUrl,
    shopId,
    isIncomplete,
    extraFieldsJson,
    missingFieldsJson,
  ];
  return [row, isIncomplete === 1];
}

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
  if (!GEMINI_API_KEY || !genAI) return null;
  try {
    const result = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: `You are a data mapping assistant. Map messy column headers to known product fields.
Known fields: name, nameAr, brand, sku, barcode, qrCode, category, buyPrice, sellPrice, stockQuantity, minStockLevel, imageUrl.
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

  const plan = String(shopArray[0].package || 'bronze').toLowerCase();
  const planConfig = getPlanFeatures(plan);
  const additionalLimit = (planConfig as any).additionalUsersLimit ?? planConfig.userLimit ?? 4;

  const [counts] = await pool.execute(
    "SELECT COUNT(*) as total FROM users WHERE shop_id = ? AND role != 'shop_owner'",
    [shopId]
  );
  const additionalUsersCount = Number((counts as any[])[0]?.total || 0);
  if (additionalUsersCount >= additionalLimit) {
    const err = new Error('PLAN_USER_LIMIT_REACHED') as any;
    err.message_ar = 'حدث خطأ. حاول مرة أخرى.';
    err.message_en = "You have reached your plan's user limit. Upgrade your plan or remove a user.";
    throw err;
  }

  if (plan === 'bronze' && requestedRole === 'warehouse') {
    throw new Error('Bronze plan does not allow warehouse users');
  }
  if ((requestedRole === 'branch_manager' || requestedRole === 'multi_branch_manager') && plan !== 'branches') {
    throw new Error('Branch Manager and Multi-Branch Manager roles require Branches plan');
  }
};

const generateInvoiceNumber = async (shopId?: number) => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const params: any[] = [];
  let where = `WHERE shop_id = ? AND invoice_number LIKE ?`;
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

const createSaleAndItems = async (req: any, paymentMethodOverride?: string) => {
  const { items, paymentMethod, customerName, customerPhone, customerAddress, idempotencyKey } = req.body;
  const shopId = resolveShopId(req);
  if (!shopId) throw new Error('shopId is required');
  if (!items || items.length === 0) throw new Error('Sale items required');

  if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.length > 0) {
    const [existing] = await pool.execute(
      'SELECT sale_id FROM idempotency_keys WHERE idempotency_key = ? AND shop_id = ?',
      [idempotencyKey, shopId]
    );
    const rows = existing as any[];
    if (rows.length > 0) {
      const saleId = Number(rows[0].sale_id);
      const [sales] = await pool.execute(
        `SELECT s.*, GROUP_CONCAT(CONCAT(si.quantity, 'x ', p.name_en, ' @ ', si.unit_price) SEPARATOR ', ') as items_summary
         FROM sales s LEFT JOIN sale_items si ON s.id = si.sale_id LEFT JOIN products p ON si.product_id = p.id
         WHERE s.id = ? GROUP BY s.id`,
        [saleId]
      );
      const saleRow = (sales as any[])[0];
      if (saleRow) {
        return { saleId, sale: saleRow, invoiceNumber: saleRow.invoice_number };
      }
    }
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    let totalAmount = 0;
    for (const item of items) totalAmount += item.quantity * item.unitPrice;

    let branchId = resolveBranchId(req);
    if (req.user?.role === 'branch_manager') {
      const [uba] = await connection.execute('SELECT branch_id FROM user_branch_assignments WHERE user_id = ?', [req.user.id]);
      const allowedBranchIds = (uba as any[]).map((r) => Number(r.branch_id)).filter((n) => Number.isFinite(n) && n > 0);
      if (allowedBranchIds.length === 0) throw new Error('Branch Manager has no assigned branch');
      if (branchId) {
        if (!allowedBranchIds.includes(branchId)) throw new Error('Branch Manager can only sell at assigned branch');
      } else {
        branchId = allowedBranchIds[0];
      }
    } else if (!branchId) {
      const [def] = await connection.execute('SELECT default_branch_id FROM shops WHERE id = ?', [shopId]);
      branchId = (def as any[])[0]?.default_branch_id ?? null;
    }
    const invoiceNumber = await generateInvoiceNumber(shopId);
    const [saleResult] = await connection.execute(
      `INSERT INTO sales 
       (shop_id, user_id, branch_id, invoice_number, customer_name, customer_phone, customer_address, total_amount, payment_method, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pos')`,
      [
        shopId,
        req.user.id,
        branchId,
        invoiceNumber,
        customerName || null,
        customerPhone || null,
        customerAddress || null,
        totalAmount,
        (() => {
          const pm = String(paymentMethodOverride || paymentMethod || 'cash').toLowerCase();
          if (['cash', 'card', 'other', 'invoice'].includes(pm)) return pm;
          if (pm.includes('card')) return 'card';
          return 'cash';
        })(),
      ]
    );
    const saleInsert = saleResult as any;
    const saleId = saleInsert.insertId;

    for (const item of items) {
      const available = await getAvailableStock(connection, shopId, item.productId);
      if (available < item.quantity) {
        const [prods] = await connection.execute('SELECT name_en, name_ar FROM products WHERE id = ? AND shop_id = ?', [item.productId, shopId]);
        const p = (prods as any[])[0];
        throw new Error(`Insufficient stock for ${p?.name_en || p?.name_ar || 'product'}. Available: ${available}, needed: ${item.quantity}`);
      }
      await connection.execute(
        'INSERT INTO sale_items (sale_id, product_id, branch_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?)',
        [saleId, item.productId, branchId, item.quantity, item.unitPrice, item.quantity * item.unitPrice]
      );
      await connection.execute('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [
        item.quantity,
        item.productId,
      ]);
    }

    await connection.execute(
      `INSERT INTO vault_transactions (shop_id, user_id, type, amount, reason, related_sale_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        shopId,
        req.user.id,
        'in',
        totalAmount,
        paymentMethodOverride || paymentMethod || 'sale',
        saleId,
      ]
    );

    await connection.execute(
      `INSERT INTO audit_logs (shop_id, user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        shopId,
        req.user.id,
        'New Sale',
        'sale',
        saleId,
        JSON.stringify({ invoiceNumber, totalAmount, paymentMethod: paymentMethodOverride || paymentMethod || 'cash' }),
        req.ip || null,
      ]
    );

    const itemsCount = items.length;
    const titleAr = 'عملية بيع جديدة (POS)';
    const titleEn = 'New POS sale'حدث خطأ. حاول مرة أخرى.'pos', 'pos_sale_created', ?, ?, ?, ?, 0, ?)`,
      [shopId, titleAr, titleEn, bodyAr, bodyEn, JSON.stringify({ invoiceId: saleId, saleId, total: totalAmount, itemsCount })]
    );
    if (process.env.NODE_ENV !== 'production') console.log('[notifications] INSERT pos_sale_created shopId=', shopId, 'saleId=', saleId);

    if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.length > 0) {
      await connection.execute(
        'INSERT IGNORE INTO idempotency_keys (idempotency_key, sale_id, shop_id) VALUES (?, ?, ?)',
        [idempotencyKey, saleId, shopId]
      );
    }

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

    return { saleId, sale: (sales as any[])[0], invoiceNumber };
  } catch (error) {
    await connection.rollback();
    throw error;
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

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      'INSERT INTO users (username, password, role, package, shop_id) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, requestedRole, pkg || 'bronze', shopId || null]
    );

    const insertResult = result as any;
    res.status(201).json({ 
      id: insertResult.insertId, 
      username, 
      role: requestedRole,
      package: pkg || 'bronze'
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

/** Resolve user by identifier for login: email (or username case-insensitive), employee_id (numeric), or username. shopId required for non-email. */
async function findUserByIdentifier(identifier: string, resolvedShopId: number | null | undefined): Promise<any | null> {
  const raw = String(identifier || '').trim();
  if (!raw) return null;
  let rows: any[] = [];
  if (raw.includes('@')) {
    const shopFilter = resolvedShopId != null ? ' AND (shop_id = ? OR shop_id IS NULL)' : '';
    const shopArgs = resolvedShopId != null ? [resolvedShopId] : [];
    const [r] = await pool.execute(
      `SELECT * FROM users WHERE (LOWER(COALESCE(email,'')) = LOWER(?) OR LOWER(username) = LOWER(?))${shopFilter}`حدث خطأ. حاول مرة أخرى.`INSERT INTO shops (name, business_name, owner_name, owner_id, package, plan_type, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`حدث خطأ. حاول مرة أخرى.`INSERT INTO shops (name, business_name, owner_name, activity_type, address, contact_email, contact_phone, owner_id, package, plan_type, trial_ends_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`حدث خطأ. حاول مرة أخرى.`${appUrl}/reset-password/${token}`;
    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Reset your Crown ERP password',
      text: `Use this secure link to reset your password: ${resetLink}`,
      html: `<p>Use this secure link to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`حدث خطأ. حاول مرة أخرى.`
      SELECT p.name_en, p.name_ar, p.stock_quantity, p.sell_price, p.brand
      FROM products p
      WHERE p.shop_id = ?
      ORDER BY p.stock_quantity DESC
      LIMIT 200
      `,
      [shopId]
    );

    const [todayStatsRows] = await pool.execute(
      `
      SELECT 
        COALESCE(SUM(s.total_amount), 0) as today_revenue,
        COUNT(DISTINCT s.id) as today_sales
      FROM sales s
      WHERE s.shop_id = ?
      AND DATE(s.created_at) = CURRENT_DATE()
      `,
      [shopId]
    );

    const [todayOnlineRows] = await pool.execute(
      `
      SELECT COALESCE(SUM(o.total), 0) as amount, COUNT(o.id) as cnt
      FROM online_orders o
      WHERE o.shop_id = ? AND o.status IN ('confirmed', 'completed') AND DATE(o.created_at) = CURRENT_DATE()
      `,
      [shopId]
    );

    // Past 7 days sales/invoices (read-only analytics context)
    const [last7DaysRows] = await pool.execute(
      `
      SELECT
        DATE(s.created_at) as sale_date,
        COALESCE(SUM(s.total_amount), 0) as revenue,
        COUNT(DISTINCT s.id) as invoices
      FROM sales s
      WHERE s.shop_id = ?
        AND s.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      GROUP BY DATE(s.created_at)
      ORDER BY sale_date ASC
      `,
      [shopId]
    );

    const [yesterdayRows] = await pool.execute(
      `
      SELECT
        COALESCE(SUM(s.total_amount), 0) as revenue,
        COUNT(DISTINCT s.id) as invoices
      FROM sales s
      WHERE s.shop_id = ?
        AND DATE(s.created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
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
      'SELECT business_name, activity_type FROM shops WHERE id = ?'حدث خطأ. حاول مرة أخرى.''حدث خطأ. حاول مرة أخرى.'\n');

    const inventoryContextEn = (inventoryRows as any[])
      .map((item) => {
        const name = item.name_en || item.name_ar;
        const brand = item.brand ? `, brand ${item.brand}` : '';
        return `- ${name}: ${item.stock_quantity} in stock, price ${item.sell_price} EGP${brand}`;
      })
      .join('\n'حدث خطأ. حاول مرة أخرى.'?s? sales|sales today|how much today|operations count|confirmed orders|invoices today/i.test(msg);
    const isNumericIntent = numericIntentAr || numericIntentEn;

    if (isNumericIntent) {
      const quickAr =
          lang === 'ar'
            ? `مبيعات اليوم: ${totalTodayAmount} ج.م (${todaySales} فواتير POS + ${todayOnlineCount} طلبات أونلاين مؤكدة).
${
                totalTodayAmount === 0 ? 'لا توجد عمليات حتى الآن.' : 'تحب تفصيل POS مقابل أونلاين؟'
              }`
            : null;
      const quickEn =
        lang === 'en'
          ? `Today's sales: ${totalTodayAmount} EGP (${todaySales} POS invoices + ${todayOnlineCount} confirmed online orders).\n${totalTodayAmount === 0 ? 'No operations yet.' : 'Want POS vs online breakdown?'}`حدث خطأ. حاول مرة أخرى.`Current user role: ${effectiveRole}. Page: ${pathname || '/'}. Do NOT advise actions not allowed for this role.`حدث خطأ. حاول مرة أخرى.`;

    const systemPrompt = lang === 'ar' ? systemPromptAr : systemPromptEn;
    const userLine = lang === 'ar'حدث خطأ. حاول مرة أخرى.'user') parts.push(lang === 'ar'حدث خطأ. حاول مرة أخرى.'assistant') parts.push(lang === 'ar'حدث خطأ. حاول مرة أخرى.'\n\n');

    const result = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents,
    });
    const rawText = String((result as any)?.text || '').trim();
    const text = sanitizeReply(rawText);

    if (text) {
      return res.json({ ok: true, reply: text, message: text, lang, ttsLang });
    }

    console.error('ERROR: Gemini empty response');
    return res.status(200).json({
      ok: false,
      error: 'AI_UNAVAILABLE',
      reason: 'EMPTY_RESPONSE',
      message_en: 'AI is temporarily unavailable. Please try again later.',
      message_ar: 'حدث خطأ. حاول مرة أخرى.',
      lang,
      ttsLang,
    });
  } catch (error: any) {
    console.error('ERROR: Chat error:', { name: error?.name, message: error?.message, status: error?.status });
    const detectedLang: 'ar' | 'en' = lang === 'ar' ? 'ar' : 'en';
    const ttsLang = getTtsLocaleForLang(detectedLang);

    const isKeyError =
      error?.status === 400 ||
      error?.status === 401 ||
      (typeof error?.message === 'string' && /api[_-]?key|unauthorized|invalid/i.test(error.message));

    const ctx = typeof (error as any)?.liveContext === 'object' && (error as any).liveContext !== null ? (error as any).liveContext : {};
    const pathname = (ctx as any).pathname || '';
    const question = String((error as any)?.message || '');
    const answer = getLocalHelp(detectedLang, pathname, question);

    if (isKeyError) {
      return res.status(200).json({
        ok: false,
        mode: 'offline',
        error: 'AI_UNAVAILABLE',
        reason: 'API_KEY_INVALID',
        message_en: 'AI cloud unavailable (invalid or expired API key), using local help.',
        message_ar: 'حدث خطأ. حاول مرة أخرى.',
        answer,
        lang: detectedLang,
        ttsLang,
      });
    }

    return res.status(200).json({
      ok: false,
      mode: 'offline',
      error: 'AI_UNAVAILABLE',
      reason: 'PROVIDER_ERROR',
      message_en: 'AI cloud unavailable due to an internal error, using local help.',
      message_ar: 'حدث خطأ. حاول مرة أخرى.',
      answer,
      lang: detectedLang,
      ttsLang,
    });
  }
});

// ========== GEMINI DATA CHAT (Gold only) ==========
app.post('/api/ai/data-chat', authenticateToken, requirePackageFeature('ai'), async (req: any, res: Response) => {
  try {
    if (!GEMINI_API_KEY || !genAI) {
      return res.status(400).json({ error: 'AI API key is missing' });
    }
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'question is required' });
    }

    const shopId = resolveShopId(req);
    const params: any[] = [];
    let whereClause = 'WHERE 1=1';
    if (shopId) {
      whereClause += ' AND s.shop_id = ?';
      params.push(shopId);
    } else if (req.user.role !== 'super_admin') {
      return res.status(400).json({ error: 'shopId is required' });
    }

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
      WHERE p.stock_quantity <= p.min_stock_level
      ${shopId ? 'AND p.shop_id = ?' : ''}
      ORDER BY p.stock_quantity ASC
      LIMIT 10
      `,
      shopId ? [shopId] : []
    );

    const [inventorySummary] = await pool.execute(
      `
      SELECT COUNT(*) as total_products,
             COALESCE(SUM(p.stock_quantity), 0) as total_units,
             COALESCE(SUM(p.buy_price * p.stock_quantity), 0) as inventory_cost
      FROM products p
      ${shopId ? 'WHERE p.shop_id = ?' : ''}
      `,
      shopId ? [shopId] : []
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
      SELECT s.customer_name, SUM(s.total_amount) as total_spent, COUNT(s.id) as orders
      FROM sales s
      ${whereClause}
      AND s.customer_name IS NOT NULL AND s.customer_name <> ''
      GROUP BY s.customer_name
      ORDER BY total_spent DESC
      LIMIT 3
      `,
      params
    );

    let shopProfile = null;
    if (shopId) {
      const [shopRows] = await pool.execute(
        'SELECT business_name, owner_name, activity_type FROM shops WHERE id = ?'حدث خطأ. حاول مرة أخرى.'').trim();

    if (text) {
      res.json({ text, data: summary });
    } else {
      console.error('ERROR: Gemini empty response');
      return res.status(500).json({ error: 'AI provider response empty' });
    }
  } catch (error: any) {
    console.error('ERROR: Data chat error:', error);
    res.status(500).json({ error: 'AI data chat unavailable' });
  }
});

// High-level AI context for the assistant (bilingual system knowledge)
app.get('/api/ai/context', authenticateToken, async (req: any, res: Response) => {
  try {
    const langRaw = mustOne(req.query.language || req.query.lang || req.headers['x-language'], 'ar');
    const language = langRaw === 'en' ? 'en' : 'ar';

    let shopId = resolveShopId(req);
    if (!shopId) {
      shopId = await resolveOrCreateShopForUser(req.user);
    }

    let shop: any = null;
    if (shopId) {
      const [rows] = await pool.execute(
        `SELECT id, name, business_name, business_name_ar, business_name_en, activity_type, country_name, currency_code, currency_symbol 
         FROM shops WHERE id = ?`,
        [shopId]
      );
      shop = (rows as any[])[0] || null;
    }

    const effective = await getEffectivePlanForUser({ ...req.user, shop_id: shopId });
    const enabledFeatures = Object.entries(effective.features || {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);

    const routesSummary = {
      pos: language === 'ar' ? AR.PLAN_POS : EN.PLAN_POS,
      inventory:
          language === 'ar' ? AR.PLAN_INVENTORY : EN.PLAN_INVENTORY,
      invoices:
          language === 'ar' ? AR.PLAN_INVOICES : EN.PLAN_INVOICES,
      onlineOrders:
          language === 'ar' ? AR.PLAN_ONLINE_ORDERS : EN.PLAN_ONLINE_ORDERS,
      notifications:
          language === 'ar' ? AR.PLAN_NOTIFICATIONS : EN.PLAN_NOTIFICATIONS,
      importExport:
          language === 'ar' ? AR.PLAN_IMPORT_EXPORT : EN.PLAN_IMPORT_EXPORT,
      branches:
          language === 'ar' ? AR.PLAN_BRANCHES : EN.PLAN_BRANCHES,
      users:
          language === 'ar' ? AR.PLAN_USERS : EN.PLAN_USERS,
      licenses:
          language === 'ar' ? AR.PLAN_LICENSES : EN.PLAN_LICENSES,
      subscriptions:
          language === 'ar' ? AR.PLAN_SUBSCRIPTIONS : EN.PLAN_SUBSCRIPTIONS,
    };

    const systemPrompt = language === 'ar' ? AR.AI_PROMPT : EN.AI_PROMPT;

    const shopPayload = shop
      ? {
          ...shop,
          country: shop.country_name ?? null,
          currency: shop.currency_code ?? null,
        }
      : null;

    res.json({
      language,
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
      shop: shopPayload,
      plan: {
        id: effective.planId,
        enabledFeatures,
      },
      routes: routesSummary,
      systemPrompt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN SHOPS LIST (Super Admin - for shop switcher) ==========
app.get('/api/admin/shops', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute(`
      SELECT s.id, s.name, s.business_name, s.business_name_ar, s.business_name_en,
        (SELECT d.domain FROM domains d WHERE d.shop_id = s.id AND d.is_active = 1 AND d.status = 'active' LIMIT 1) as domain
      FROM shops s
      ORDER BY s.id ASC
    `);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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

// ========== SYSTEM ADMIN: GLOBAL STATS (Super Admin only) ==========
app.get('/api/system/stats', authenticateToken, requireSuperAdmin, async (_req: any, res: Response) => {
  try {
    // Total users
    let totalUsers = 0;
    try {
      const [userRows] = await pool.execute('SELECT COUNT(*) as c FROM users');
      totalUsers = Number((userRows as any[])[0]?.c ?? 0);
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[system/stats] users count error:', err?.message || err);
      }
    }

    // Total shops (optional if shops table exists)
    let totalShops: number | null = null;
    try {
      const [shopRows] = await pool.execute('SELECT COUNT(*) as c FROM shops');
      totalShops = Number((shopRows as any[])[0]?.c ?? 0);
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('doesn\'t exist') || msg.toLowerCase().includes('unknown table')) {
        totalShops = null;
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[system/stats] shops count error:', msg);
        }
      }
    }

    // Active/online users based on last_seen_at
    let active15m = 0;
    let active60m = 0;
    try {
      const [rows] = await pool.execute(
        `
        SELECT
          SUM(CASE WHEN last_seen_at IS NOT NULL AND last_seen_at >= (NOW() - INTERVAL 15 MINUTE) THEN 1 ELSE 0 END) as active15m,
          SUM(CASE WHEN last_seen_at IS NOT NULL AND last_seen_at >= (NOW() - INTERVAL 60 MINUTE) THEN 1 ELSE 0 END) as active60m
        FROM users
        `
      );
      const r = (rows as any[])[0] || {};
      active15m = Number(r.active15m ?? 0);
      active60m = Number(r.active60m ?? 0);
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[system/stats] last_seen_at metrics error:', err?.message || err);
      }
    }

    const onlineUsers = active15m;

    res.json({
      ok: true,
      totalUsers,
      totalShops,
      onlineUsers,
      active15m,
      active60m,
    });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[system/stats] error:', error?.message || error);
    }
    res.status(500).json({ ok: false, error: String(error?.message || 'Server error') });
  }
});

// ========== SYSTEM ADMIN: USERS LIST (Super Admin only) ==========
app.get('/api/system/users', authenticateToken, requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const limit = clampInt(req.query.limit, 1, 100, 20);
    const offset = clampInt(req.query.offset, 0, 1e9, 0);
    const qRaw = String(req.query.q || '').trim();
    const q = qRaw.slice(0, 200);

    let baseSql =
      'SELECT u.id, u.username, u.email, u.role, u.shop_id, u.branch_id, u.created_at, u.last_seen_at, ' +
      's.name as shop_name, s.business_name, s.slug as shop_slug, b.name as branch_name ' +
      'FROM users u ' +
      'LEFT JOIN shops s ON u.shop_id = s.id ' +
      'LEFT JOIN branches b ON u.branch_id = b.id';

    const params: (string | number)[] = [];
    if (q.length > 0) {
      const escaped = q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      const qp = `%${escaped}%`;
      baseSql +=
        ' WHERE (u.username LIKE ? OR COALESCE(u.email, \'\') LIKE ? OR ' +
        'COALESCE(s.name, \'\') LIKE ? OR COALESCE(s.business_name, \'\') LIKE ? OR COALESCE(s.slug, \'\') LIKE ?)';
      params.push(qp, qp, qp, qp, qp);
    }
    baseSql += ' ORDER BY u.created_at DESC LIMIT ' + String(limit + 1) + ' OFFSET ' + String(offset);

    let rows: any[] = [];
    try {
      const [result] = await pool.execute(baseSql, params);
      rows = result as any[];
    } catch (err: any) {
      // Fallback if shops/branches tables or optional columns are missing
      if (process.env.NODE_ENV !== 'production') {
        console.error('[system/users] primary query failed, falling back:', err?.message || err);
      }
      let fallbackSql =
        'SELECT u.id, u.username, u.email, u.role, u.shop_id, u.created_at, u.last_seen_at ' +
        'FROM users u';
      const fbParams: (string | number)[] = [];
      if (q.length > 0) {
        const escaped = q.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
        const qp = `%${escaped}%`;
        fallbackSql += ' WHERE (u.username LIKE ? OR COALESCE(u.email, \'\') LIKE ?)';
        fbParams.push(qp, qp);
      }
      fallbackSql += ' ORDER BY u.created_at DESC LIMIT ' + String(limit + 1) + ' OFFSET ' + String(offset);
      const [fallbackRows] = await pool.execute(fallbackSql, fbParams);
      rows = fallbackRows as any[];
    }

    const items = rows.slice(0, limit).map((u: any) => ({
      id: u.id,
      username: u.username,
      email: u.email ?? null,
      role: u.role,
      shop: u.shop_id
        ? {
            id: u.shop_id,
            name: u.shop_name ?? u.business_name ?? null,
            slug: u.shop_slug ?? null,
          }
        : null,
      branch: u.branch_id
        ? {
            id: u.branch_id,
            name: u.branch_name ?? null,
          }
        : null,
      last_seen_at: u.last_seen_at ?? null,
      created_at: u.created_at,
    }));

    const hasMore = rows.length > limit;
    const nextOffset = hasMore ? offset + limit : null;

    res.json({
      ok: true,
      items,
      nextOffset,
    });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[system/users] error:', error?.message || error);
    }
    res.status(500).json({ ok: false, error: String(error?.message || 'Server error'), items: [], nextOffset: null });
  }
});

// ========== SYSTEM ADMIN: RESET USER PASSWORD (Super Admin only) ==========
app.post('/api/system/users/:id/reset-password', authenticateToken, requireSuperAdmin, async (req: any, res: Response) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ ok: false, error: 'Invalid user id' });
    }

    const [rows] = await pool.execute('SELECT id, role, email FROM users WHERE id = ?', [userId]);
    const userArray = rows as any[];
    if (userArray.length === 0) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }
    const targetUser = userArray[0];

    // Optional safety: prevent resetting own super_admin account via this endpoint
    if (targetUser.role === 'super_admin' && req.user?.id === targetUser.id) {
      return res.status(403).json({
        ok: false,
        error: 'CANNOT_RESET_OWN_SUPER_ADMIN_PASSWORD',
      });
    }

    const body = req.body || {};
    let newPassword: string | null = typeof body.newPassword === 'string' ? String(body.newPassword).trim() : null;
    if (newPassword && newPassword.length < 8) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters' });
    }

    let generated = false;
    if (!newPassword) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
      let tmp = '';
      for (let i = 0; i < 12; i++) {
        const idx = Math.floor(Math.random() * chars.length);
        tmp += chars[idx];
      }
      newPassword = tmp;
      generated = true;
    }

    const hashed = await bcrypt.hash(newPassword!, 10);
    await pool.execute('UPDATE users SET password_hash = ?, password = ? WHERE id = ?', [hashed, hashed, userId]);

    res.json({
      ok: true,
      tempPassword: generated ? newPassword : undefined,
    });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[system/users/reset-password] error:', error?.message || error);
    }
    res.status(500).json({ ok: false, error: String(error?.message || 'Server error') });
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

// ========== SHOP PROFILE ==========
app.get('/api/shops/profile', authenticateToken, async (req: any, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SHOP_PROFILE] GET /api/shops/profile userId=', req.user?.id, 'role=', req.user?.role);
    }
    let shopId = resolveShopId(req);
    if (!shopId) {
      shopId = await resolveOrCreateShopForUser(req.user);
    }

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
    const body = req.body || {};

    // Normalize camelCase + snake_case + legacy keys from frontend
    const businessName =
      body.businessName ??
      body.business_name ??
      body.storeName ??
      body.store_name ??
      null;
    const businessNameAr =
      body.businessNameAr ??
      body.business_name_ar ??
      null;
    const businessNameEn =
      body.businessNameEn ??
      body.business_name_en ??
      null;
    const ownerName =
      body.ownerName ??
      body.owner_name ??
      body.fullName ??
      body.full_name ??
      null;
    const activityType =
      body.activityType ??
      body.activity_type ??
      null;
    const address = body.address ?? null;
    const contactEmail =
      body.contactEmail ??
      body.contact_email ??
      null;
    const contactPhone =
      body.contactPhone ??
      body.contact_phone ??
      body.phone ??
      null;
    const logoUrl =
      body.logoUrl ??
      body.logo_url ??
      null;
    const countryName =
      body.countryName ??
      body.country_name ??
      null;
    const currencyCode =
      body.currencyCode ??
      body.currency_code ??
      null;
    const currencySymbol =
      body.currencySymbol ??
      body.currency_symbol ??
      null;

    let shopId = resolveShopId(req);
    if (!shopId) {
      shopId = await resolveOrCreateShopForUser(req.user);
    }

    await pool.execute(
      `UPDATE shops 
       SET business_name = ?, business_name_ar = COALESCE(?, business_name_ar), business_name_en = COALESCE(?, business_name_en),
           owner_name = ?, activity_type = ?, address = ?, contact_email = ?, contact_phone = ?, logo_url = ?,
           country_name = ?, currency_code = ?, currency_symbol = ?
       WHERE id = ?`,
      [
        businessName,
        businessNameAr,
        businessNameEn,
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
app.post('/api/domains/add', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    let shopId: number | null = resolveShopId(req);
    if (!shopId && req.user?.role === 'super_admin') {
      shopId = await resolveOrCreateShopForUser(req.user);
    }
    if (!shopId || !Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: 'shopId is required' });
    }

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

app.post('/api/domains/verify', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    let shopId: number | null = resolveShopId(req);
    if (!shopId && req.user?.role === 'super_admin') {
      shopId = await resolveOrCreateShopForUser(req.user);
    }
    if (!shopId || !Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: 'shopId is required' });
    }

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

app.post('/api/domains/activate', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    let shopId: number | null = resolveShopId(req);
    if (!shopId && req.user?.role === 'super_admin') {
      shopId = await resolveOrCreateShopForUser(req.user);
    }
    if (!shopId || !Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: 'shopId is required' });
    }

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

app.post('/api/domains/deactivate', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    let shopId: number | null = resolveShopId(req);
    if (!shopId && req.user?.role === 'super_admin') {
      shopId = await resolveOrCreateShopForUser(req.user);
    }
    if (!shopId || !Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: 'shopId is required' });
    }

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

app.get('/api/domains', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    let shopId: number | null = resolveShopId(req);
    if (!shopId && req.user?.role === 'super_admin') {
      shopId = await resolveOrCreateShopForUser(req.user);
    }
    if (!shopId || !Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: 'shopId is required' });
    }

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
app.get('/api/users', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager'), async (req: any, res: Response) => {
  try {
    let shopId: number | null = resolveShopId(req) ?? (req.user.role === 'shop_owner' ? req.user.shop_id : null);
    if (!shopId && req.user?.role === 'super_admin') {
      shopId = await resolveOrCreateShopForUser(req.user);
    }
    if (!shopId) {
      if (req.user?.role === 'super_admin') {
        return res.status(400).json({ error: 'SHOP_ID_REQUIRED', message_ar: 'يرجى اختيار محل أولاً', message_en: 'Please select a shop first' });
      }
      return res.status(400).json({ error: 'shopId is required' });
    }
    if (req.user.role !== 'super_admin' && req.user.shop_id !== shopId) {
      return res.status(403).json({ error: 'FORBIDDEN', message_ar: 'غير مصرح', message_en: 'Forbidden' });
    }

    const [users] = await pool.execute(
      'SELECT id, username, employee_id, email, role, package, shop_id, created_at FROM users WHERE shop_id = ? ORDER BY created_at DESC',
      [shopId]
    );
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const CREATABLE_ROLES: Record<string, string[]> = {
  super_admin: ['shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier', 'warehouse'],
  shop_owner: ['branch_manager', 'multi_branch_manager', 'cashier', 'warehouse'],
  branch_manager: ['cashier', 'warehouse'],
  multi_branch_manager: ['branch_manager', 'cashier', 'warehouse'],
};

/** Parse identifier into username, email, employee_id for user creation. */
function parseUserIdentifier(identifier: string): { username: string; email: string | null; employee_id: string | null } {
  const raw = String(identifier || '').trim();
  if (!raw) return { username: '', email: null, employee_id: null };
  if (raw.includes('@')) {
    const lower = raw.toLowerCase();
    return { username: lower, email: raw, employee_id: null };
  }
  if (raw.includes('#')) {
    const parts = raw.split('#');
    const idPart = parts[parts.length - 1];
    if (/^\d+$/.test(idPart)) {
      return { username: 'emp_' + idPart, email: null, employee_id: idPart };
    }
  }
  if (/^\d+$/.test(raw)) {
    return { username: 'emp_' + raw, email: null, employee_id: raw };
  }
  return { username: raw, email: null, employee_id: null };
}

app.post('/api/users', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager'), async (req: any, res: Response) => {
  try {
    const { username: rawUsername, identifier, password, role, branchId } = req.body;
    const idInput = String(identifier ?? rawUsername ?? '').trim();
    if (!idInput || !password || !role) {
      return res.status(400).json({ error: 'identifier (or username), password, and role are required' });
    }

    const { username, email, employee_id } = parseUserIdentifier(idInput);
    if (!username) {
      return res.status(400).json({ error: 'Invalid identifier' });
    }

    const requestedRole = (role as string).toLowerCase();
    const creatorRole = (req.user?.role || '') as string;
    const allowed = CREATABLE_ROLES[creatorRole];
    if (!allowed || !allowed.includes(requestedRole)) {
      return res.status(400).json({ error: `Role ${requestedRole} cannot be created by ${creatorRole}` });
    }

    const shopId = resolveShopId(req) ?? (req.user.role === 'shop_owner' ? req.user.shop_id : null);
    if (!shopId) {
      if (req.user?.role === 'super_admin') {
        return res.status(400).json({
          error: 'SHOP_ID_REQUIRED',
          message_ar: 'يرجى اختيار محل أولاً',
          message_en: 'Please select a shop first',
        });
      }
      return res.status(400).json({ error: 'shopId is required' });
    }

    try {
      await enforcePlanLimits(shopId, requestedRole);
    } catch (planError: any) {
      if (planError.message === 'Shop not found') return res.status(404).json({ error: 'Shop not found' });
      if (planError.message === 'PLAN_USER_LIMIT_REACHED') {
        return res.status(403).json({
          error: 'PLAN_USER_LIMIT_REACHED',
          message_ar: planError.message_ar || 'حدث خطأ. حاول مرة أخرى.',
          message_en: planError.message_en || "You have reached your plan's user limit. Upgrade your plan or remove a user.",
        });
      }
      return res.status(403).json({ error: planError.message });
    }

    const [shopRows] = await pool.execute('SELECT package FROM shops WHERE id = ?', [shopId]);
    const shopArray = shopRows as any[];
    if (shopArray.length === 0) return res.status(404).json({ error: 'Shop not found' });
    const shopPackage = shopArray[0].package;

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, role, package, shop_id, email, employee_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, requestedRole, shopPackage || 'bronze', shopId, email || null, employee_id || null]
    );
    const insertResult = result as any;
    const userId = insertResult.insertId;

    let branchToAssign: number | null = null;
    if (creatorRole === 'branch_manager') {
      const [assignments] = await pool.execute('SELECT branch_id FROM user_branch_assignments WHERE user_id = ?', [req.user.id]);
      const ids = (assignments as any[]).map((r) => Number(r.branch_id)).filter((n) => Number.isFinite(n) && n > 0);
      if (ids.length > 0) branchToAssign = ids[0];
    } else if (branchId && Number(branchId) > 0) {
      branchToAssign = Number(branchId);
    } else if (requestedRole === 'branch_manager') {
      const [def] = await pool.execute('SELECT default_branch_id FROM shops WHERE id = ?', [shopId]);
      const defId = (def as any[])[0]?.default_branch_id;
      if (defId && Number(defId) > 0) branchToAssign = Number(defId);
    } else if (['cashier', 'warehouse'].includes(requestedRole)) {
      const [def] = await pool.execute('SELECT default_branch_id FROM shops WHERE id = ?', [shopId]);
      const defId = (def as any[])[0]?.default_branch_id;
      if (defId && Number(defId) > 0) branchToAssign = Number(defId);
    }

    if (branchToAssign) {
      const [br] = await pool.execute('SELECT id, shop_id FROM branches WHERE id = ? AND shop_id = ?', [branchToAssign, shopId]);
      if ((br as any[]).length) {
        await pool.execute(
          'INSERT INTO user_branch_assignments (user_id, branch_id, shop_id) VALUES (?, ?, ?)',
          [userId, branchToAssign, shopId]
        );
      }
    }
    res.status(201).json({ id: userId, username, email, employee_id, role: requestedRole });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username, email, or employee ID already exists' });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/invite', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager'), async (req: any, res: Response) => {
  try {
    const { role, employee_id, email, expiresHours } = req.body || {};
    const requestedRole = String(role ?? '').trim().toLowerCase();
    const allowedInviteRoles = ['shop_owner', 'branch_manager', 'multi_branch_manager', 'super_admin'];
    if (!allowedInviteRoles.includes(requestedRole)) {
      return res.status(400).json({ error: 'Invalid role for invite' });
    }

    const creatorRole = (req.user?.role || '') as string;
    const allowed = CREATABLE_ROLES[creatorRole];
    if (!allowed || !allowed.includes(requestedRole)) {
      return res.status(403).json({ error: `You cannot invite role ${requestedRole}` });
    }

    const shopId = resolveShopId(req) ?? (req.user.role === 'shop_owner' ? req.user.shop_id : null);
    if (!shopId && req.user?.role !== 'super_admin') {
      return res.status(400).json({ error: 'SHOP_ID_REQUIRED', message_ar: 'يرجى اختيار محل أولاً', message_en: 'Please select a shop first' });
    }
    if (req.user?.role === 'super_admin' && !shopId) {
      return res.status(400).json({ error: 'SHOP_ID_REQUIRED', message_ar: 'يرجى اختيار محل أولاً', message_en: 'Please select a shop first' });
    }
    const resolvedShopId = Number(shopId);
    if (!Number.isFinite(resolvedShopId) || resolvedShopId <= 0) {
      return res.status(400).json({ error: 'Valid shopId required' });
    }

    const empId = employee_id != null ? String(employee_id).trim() || null : null;
    const em = email != null ? String(email).trim() || null : null;
    if (!empId && !em) {
      return res.status(400).json({ error: 'Either employee_id or email required for invite' });
    }

    const hours = expiresHours != null ? Math.min(720, Math.max(1, Number(expiresHours))) : 24;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const inviteCode = crypto.randomBytes(32).toString('hex');

    await pool.execute(
      'INSERT INTO user_invites (shop_id, role, employee_id, email, invite_code, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [resolvedShopId, requestedRole, empId, em, inviteCode, expiresAt]
    );

    return res.status(201).json({ invite_code: inviteCode, shopId: resolvedShopId, role: requestedRole, expires_at: expiresAt.toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'Invalid user id' });
    if (req.user.id === userId) return res.status(400).json({ error: 'Cannot delete your own account' });

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    const userArray = rows as any[];
    if (userArray.length === 0) return res.status(404).json({ error: 'User not found' });

    const targetUser = userArray[0];
    if (targetUser.role === 'shop_owner') return res.status(403).json({ error: 'OWNER_CANNOT_BE_DELETED' });
    if (targetUser.role === 'super_admin') return res.status(403).json({ error: 'Only super_admin can delete super_admin' });

    const shopId = req.user.role === 'super_admin' ? targetUser.shop_id : req.user.shop_id;
    if (req.user.role !== 'super_admin' && targetUser.shop_id !== shopId) return res.status(403).json({ error: 'FORBIDDEN', message_ar: 'غير مصرح', message_en: 'Not allowed' });

    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:id/change-password', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager'), async (req: any, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { newPassword } = req.body;
    if (!userId || !newPassword || typeof newPassword !== 'string' || newPassword.length < 4) {
      return res.status(400).json({ error: 'Valid newPassword (min 4 chars) required' });
    }

    const [rows] = await pool.execute('SELECT id, role, shop_id FROM users WHERE id = ?', [userId]);
    const userArray = rows as any[];
    if (userArray.length === 0) return res.status(404).json({ error: 'User not found' });
    const targetUser = userArray[0];

    if (targetUser.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'FORBIDDEN', message_ar: 'حدث خطأ. حاول مرة أخرى.', message_en: 'Cannot change super_admin password' });
    }

    if (req.user.role === 'shop_owner' && targetUser.shop_id !== req.user.shop_id) {
      return res.status(403).json({ error: 'FORBIDDEN', message_ar: 'غير مصرح', message_en: 'Forbidden' });
    }

    if (req.user.role === 'branch_manager') {
      if (targetUser.shop_id !== req.user.shop_id) {
        return res.status(403).json({ error: 'FORBIDDEN', message_ar: 'غير مصرح', message_en: 'Forbidden' });
      }
      const [myAssignments] = await pool.execute('SELECT branch_id FROM user_branch_assignments WHERE user_id = ?', [req.user.id]);
      const myBranchIds = (myAssignments as any[]).map((r) => Number(r.branch_id));
      if (myBranchIds.length === 0) return res.status(403).json({ error: 'FORBIDDEN', message_ar: 'غير مصرح', message_en: 'Forbidden' });
      const [targetAssignments] = await pool.execute('SELECT branch_id FROM user_branch_assignments WHERE user_id = ?', [userId]);
      const targetBranchIds = (targetAssignments as any[]).map((r) => Number(r.branch_id));
      const overlap = myBranchIds.some((b) => targetBranchIds.includes(b));
      if (!overlap) {
        return res.status(403).json({ error: 'FORBIDDEN', message_ar: 'حدث خطأ. حاول مرة أخرى.', message_en: 'Can only change password for users in your branch' });
      }
    }

    if (req.user.role === 'multi_branch_manager' && targetUser.shop_id !== req.user.shop_id) {
      return res.status(403).json({ error: 'FORBIDDEN', message_ar: 'غير مصرح', message_en: 'Forbidden' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== LICENSES (Super Admin) ==========
app.get('/api/licenses', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const filter = getOne(req.query.filter) ?? 'all';
    let sql = 'SELECT id, license_key, plan, duration, status, used_by_user_id, used_at, created_at FROM licenses';
    const params: any[] = [];
    if (filter === 'activated') {
      sql += " WHERE status = 'active'";
    } else if (filter === 'not_activated') {
      sql += " WHERE status = 'unused'";
    }
    sql += ' ORDER BY created_at DESC';
    const [licenses] = await pool.execute(sql, params);
    res.json(licenses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/licenses/:id', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const idRaw = getOne(req.params?.id);
    const id = idRaw ? parseInt(idRaw, 10) : 0;
    if (!id || !Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    const [r] = await pool.execute('DELETE FROM licenses WHERE id = ?', [id]);
    const affected = (r as any).affectedRows || 0;
    if (affected === 0) return res.status(404).json({ error: 'Code not found' });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/licenses/bulk-delete', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
    const safeIds = ids.filter((x: any) => Number.isInteger(Number(x)) && Number(x) > 0).map(Number);
    if (safeIds.length === 0) return res.status(400).json({ error: 'Invalid ids' });
    const placeholders = safeIds.map(() => '?').join(',');
    await pool.execute(`DELETE FROM licenses WHERE id IN (${placeholders})`, safeIds);
    res.json({ success: true, deleted: safeIds.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/licenses/archive-activated', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const [r] = await pool.execute("DELETE FROM licenses WHERE status = 'active'");
    const deleted = (r as any).affectedRows || 0;
    res.json({ success: true, deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/licenses/generate', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { plan, duration, count } = req.body;
    const allowedPlans = ['bronze', 'silver', 'gold', 'branches'];
    const allowedDurations = ['monthly', 'quarterly', 'yearly', 'lifetime'];
    if (!allowedPlans.includes(plan) || !allowedDurations.includes(duration)) {
      return res.status(400).json({ error: 'Invalid plan or duration' });
    }

    const total = Math.min(parseInt(count || '1', 10), 100);
    const codes: string[] = [];

    for (let i = 0; i < total; i += 1) {
      codes.push(crypto.randomBytes(10).toString('hex').toUpperCase());
    }

    const values = codes.map((code) => [code, plan, duration]);
    await pool.query('INSERT INTO licenses (license_key, plan, duration) VALUES ?', [values]);

    res.status(201).json({ codes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** Duration map: monthly=1 month, quarterly=3 months, yearly=12 months, lifetime=no expiry */
const DURATION_DAYS: Record<string, number | null> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
  lifetime: null,
};

async function subscriptionStackActivation(
  shopId: number,
  planName: string,
  duration: string,
  code: string,
  _usedByUserId: number
): Promise<{ expiresAt: Date | null; planStatus: string }> {
  const conn = await pool.getConnection();
  try {
    const isLifetime = duration === 'lifetime' || DURATION_DAYS[duration] === null;
    const days = isLifetime ? null : (DURATION_DAYS[duration] ?? 30);

    const [subRows] = await conn.execute('SELECT id, expires_at FROM subscriptions WHERE shop_id = ?', [shopId]);
    const sub = (subRows as any[])[0];
    const now = new Date();
    const previousExpiresAt = sub?.expires_at ? new Date(sub.expires_at) : null;
    const isAlreadyLifetime = sub && sub.expires_at === null;

    let newExpiresAt: Date | null = null;
    if (isLifetime || isAlreadyLifetime) {
      newExpiresAt = null;
    } else if (days !== null && days > 0) {
      const startFrom = previousExpiresAt && previousExpiresAt > now ? previousExpiresAt : now;
      newExpiresAt = new Date(startFrom.getTime() + days * 24 * 60 * 60 * 1000);
    }

    const daysForRecord = isLifetime ? 0 : (days ?? 0);
    if (sub) {
      await conn.execute(
        'UPDATE subscriptions SET plan_name = ?, expires_at = ?, last_activated_at = NOW(), updated_at = NOW() WHERE shop_id = ?',
        [planName, newExpiresAt, shopId]
      );
    } else {
      await conn.execute(
        'INSERT INTO subscriptions (shop_id, plan_name, started_at, expires_at, last_activated_at) VALUES (?, ?, NOW(), ?, NOW()) ON DUPLICATE KEY UPDATE plan_name = ?, expires_at = ?, last_activated_at = NOW()',
        [shopId, planName, newExpiresAt, planName, newExpiresAt]
      );
    }
    await conn.execute(
      'INSERT INTO subscription_activations (shop_id, code, days, previous_expires_at, new_expires_at) VALUES (?, ?, ?, ?, ?)',
      [shopId, code, daysForRecord, previousExpiresAt, newExpiresAt]
    );
    await pool.execute(
      'UPDATE shops SET package = ?, plan_type = ?, is_active = 1, trial_ends_at = ? WHERE id = ?',
      [planName, planName, newExpiresAt, shopId]
    );
    await pool.execute('UPDATE users SET package = ? WHERE shop_id = ?', [planName, shopId]);

    const planStatus = newExpiresAt === null ? 'LIFETIME' : 'ACTIVE';
    return { expiresAt: newExpiresAt, planStatus };
  } finally {
    conn.release();
  }
}

app.post('/api/licenses/activate', authenticateToken, async (req: any, res: Response) => {
  try {
    const code = String(req.body?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'Activation code required' });

    let shopId: number | null = null;
    if (req.user?.role === 'super_admin') {
      shopId = Number(req.headers['x-shop-id'] || req.query?.shopId || req.body?.shopId || 0) || null;
    }
    if (!shopId) shopId = Number(req.user?.shop_id || req.user?.shopId || 0) || null;
    if (!shopId) shopId = await resolveOrCreateShopForUser(req.user);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [codeRows] = await conn.execute(
        'SELECT * FROM license_codes WHERE code = ? AND used_at IS NULL AND (expires_at IS NULL OR expires_at > NOW()) FOR UPDATE',
        [code]
      );
      const codeList = codeRows as any[];

      if (codeList.length > 0) {
        const row = codeList[0];
        const kind = String(row.kind || 'plan').toLowerCase();
        const planKey = row.plan_key ? String(row.plan_key).toLowerCase() : null;
        const featureKey = row.feature_key ? String(row.feature_key) : null;
        const maxBranches = row.max_branches != null ? Number(row.max_branches) : null;

        if (kind === 'plan' && planKey) {
          await conn.execute(
            'INSERT INTO shop_subscriptions (shop_id, plan, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE plan = ?, status = ?',
            [shopId, planKey, 'active', planKey, 'active']
          );
        }

        if (kind === 'feature' && featureKey === 'multi_branch') {
          const limitVal = maxBranches != null && Number.isFinite(maxBranches) ? maxBranches : 5;
          await conn.execute(
            `INSERT INTO shop_features (shop_id, feature_key, enabled, max_limit, activated_at)
             VALUES (?, 'multi_branch', 1, ?, NOW())
             ON DUPLICATE KEY UPDATE enabled = 1, max_limit = ?, activated_at = NOW()`,
            [shopId, limitVal, limitVal]
          );
        }

        await conn.execute(
          'UPDATE license_codes SET used_by_shop_id = ?, used_by_user_id = ?, used_at = NOW() WHERE id = ?',
          [shopId, req.user.id, row.id]
        );

        await conn.commit();

        const plan = await getShopPlan(Number(shopId));
        const multiBranchEnabled = await isFeatureEnabled(Number(shopId), 'multi_branch');
        const maxBranchesResult = await getMaxBranches(Number(shopId));

        return res.json({
          ok: true,
          success: true,
          plan,
          features: {
            multi_branch: { enabled: multiBranchEnabled, max_branches: maxBranchesResult ?? undefined },
          },
        });
      }
    } catch (err: any) {
      await conn.rollback().catch(() => {});
      throw err;
    } finally {
      conn.release();
    }

    const conn2 = await pool.getConnection();
    try {
      await conn2.beginTransaction();
      const [licenses] = await conn2.execute('SELECT * FROM licenses WHERE license_key = ? AND status = "unused" FOR UPDATE', [code]);
      const licenseArray = licenses as any[];
      if (licenseArray.length === 0) {
        await conn2.rollback();
        return res.status(400).json({ error: 'CODE_ALREADY_USED' });
      }
      const license = licenseArray[0];
      const duration = String(license.duration || 'monthly').toLowerCase();
      const { expiresAt, planStatus } = await subscriptionStackActivation(Number(shopId), 'gold', duration, String(code), req.user.id);
      await conn2.execute(
        'UPDATE licenses SET status = "active", used_by_user_id = ?, used_at = NOW(), expires_at = ? WHERE id = ?',
        [req.user.id, expiresAt, license.id]
      );
      await conn2.commit();
      const expiresIso = expiresAt ? expiresAt.toISOString() : null;
      return res.json({
        ok: true,
        plan: 'gold',
        duration,
        expires_at: expiresIso,
        status: planStatus,
        success: true,
        planStatus,
      });
    } catch (err: any) {
      await conn2.rollback().catch(() => {});
      throw err;
    } finally {
      conn2.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/me/features', authenticateToken, async (req: any, res: Response) => {
  try {
    let shopId = Number(resolveShopId(req) || req.user?.shop_id || req.user?.shopId || 0) || null;
    if (!shopId && req.user?.role === 'super_admin') shopId = await resolveOrCreateShopForUser(req.user);
    if (!shopId) return res.status(400).json({ error: 'Shop required' });
    const plan = await getShopPlan(shopId);
    const multiBranchEnabled = await isFeatureEnabled(shopId, 'multi_branch');
    const maxBranches = await getMaxBranches(shopId);
    return res.json({
      plan,
      features: {
        multi_branch: { enabled: multiBranchEnabled, max_branches: maxBranches ?? undefined },
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Internal error' });
  }
});

app.post('/api/activate', authenticateToken, async (req: any, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Activation code required' });

    let shopId = resolveShopId(req);
    if (!shopId) {
      shopId = await resolveOrCreateShopForUser(req.user);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [licenses] = await conn.execute('SELECT * FROM licenses WHERE license_key = ? AND status = "unused" FOR UPDATE', [code]);
      const licenseArray = licenses as any[];
      if (licenseArray.length === 0) {
        await conn.rollback();
        return res.status(400).json({ error: 'CODE_ALREADY_USED' });
      }

      const license = licenseArray[0];
      const duration = String(license.duration || 'monthly').toLowerCase();
      const planName = String(license.plan || 'gold').toLowerCase();

      const { expiresAt, planStatus } = await subscriptionStackActivation(Number(shopId), planName, duration, String(code), req.user.id);

      await conn.execute(
        'UPDATE licenses SET status = "active", used_by_user_id = ?, used_at = NOW(), expires_at = ? WHERE id = ?',
        [req.user.id, expiresAt, license.id]
      );

      await conn.commit();

      const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
      const expiresIso = expiresAt ? expiresAt.toISOString() : null;
      res.json({
        ok: true,
        plan: planName,
        duration,
        expires_at: expiresIso,
        status: planStatus,
        success: true,
        expiresAt: expiresIso,
        planStatus,
        daysLeft: planStatus === 'LIFETIME' ? null : daysLeft,
      });
    } catch (err: any) {
      await conn.rollback().catch(() => {});
      throw err;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== BRANCHES (multi-branch) ==========
app.get('/api/admin/branches', authenticateToken, requireRole('shop_owner', 'super_admin', 'branch_manager', 'multi_branch_manager'), async (req: any, res: Response) => {
  try {
    let shopId = Number(resolveShopId(req) || req.user?.shop_id || req.user?.shopId || 0) || null;
    if (!shopId) {
      try {
        shopId = await resolveOrCreateShopForUser(req.user);
      } catch (_) {}
    }
    if (!shopId) return res.status(400).json({ error: 'Shop required' });
    if (req.user?.role !== 'super_admin' && req.user?.shop_id !== shopId)
      return res.status(403).json({ error: 'Forbidden' });
    if (req.user?.role === 'branch_manager') {
      const [rows] = await pool.execute(
        'SELECT b.id, b.shop_id, b.name, b.name_ar, b.name_en, b.code, b.created_at FROM branches b INNER JOIN user_branch_assignments uba ON uba.branch_id = b.id WHERE uba.user_id = ? ORDER BY b.id',
        [req.user.id]
      );
      return res.json(rows);
    }
    const [rows] = await pool.execute(
      'SELECT id, shop_id, name, name_ar, name_en, code, created_at FROM branches WHERE shop_id = ? ORDER BY id',
      [shopId]
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/branches', authenticateToken, requireRole('shop_owner', 'super_admin'), async (req: any, res: Response) => {
  try {
    let shopId = Number(resolveShopId(req) || req.user?.shop_id || req.user?.shopId || 0) || null;
    if (!shopId) {
      try {
        shopId = await resolveOrCreateShopForUser(req.user);
      } catch (_) {}
    }
    if (!shopId) return res.status(400).json({ error: 'Shop required' });
    if (req.user?.role !== 'super_admin' && req.user?.shop_id !== shopId)
      return res.status(403).json({ error: 'Forbidden' });

    const multiBranchEnabled = await isFeatureEnabled(shopId, 'multi_branch');
    if (!multiBranchEnabled) return res.status(403).json({ error: 'multi_branch feature required', code: 'MULTI_BRANCH_REQUIRED' });

    const maxAllowed = await getMaxBranches(shopId);
    if (maxAllowed != null) {
      const [countRows] = await pool.execute('SELECT COUNT(*) AS c FROM branches WHERE shop_id = ?', [shopId]);
      const currentCount = Number((countRows as any[])[0]?.c ?? 0);
      if (currentCount >= maxAllowed) return res.status(400).json({ error: 'Branch limit reached', max_branches: maxAllowed });
    }

    const { name, code } = req.body || {};
    const c = String((code || '').trim() || 'branch').toLowerCase().replace(/\s+/g, '_');
    const n = String(name || '').trim() || 'Branch';
    const [result] = await pool.execute('INSERT INTO branches (shop_id, name, name_ar, name_en, code) VALUES (?, ?, ?, ?, ?)', [shopId, n, n, n, c]);
    const id = (result as any).insertId;
    const [rows] = await pool.execute('SELECT id, shop_id, name, name_ar, name_en, code, created_at FROM branches WHERE id = ?', [id]);
    const defaultBranchId = await pool.execute('SELECT default_branch_id FROM shops WHERE id = ?', [shopId])
      .then(([r]: any) => (r && r[0] ? r[0].default_branch_id : null));
    if (!defaultBranchId) await pool.execute('UPDATE shops SET default_branch_id = ? WHERE id = ?', [id, shopId]);
    res.status(201).json((rows as any[])[0]);
  } catch (e: any) {
    if (e?.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Branch code already exists' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/branches/:id', authenticateToken, requireRole('shop_owner', 'super_admin'), async (req: any, res: Response) => {
  try {
    const branchId = Number(req.params.id);
    if (!branchId) return res.status(400).json({ error: 'Branch id required' });
    const shopId = Number(resolveShopId(req) || 0);
    const [existing] = await pool.execute('SELECT shop_id FROM branches WHERE id = ?', [branchId]);
    if (!(existing as any[]).length) return res.status(404).json({ error: 'Branch not found' });
    if ((existing as any[])[0].shop_id !== shopId && req.user?.role !== 'super_admin')
      return res.status(403).json({ error: 'Forbidden' });
    const { name, code } = req.body || {};
    const { name_ar, name_en } = req.body || {};
    if (name !== undefined) {
      const nm = String(name).trim() || (existing as any[])[0].name;
      await pool.execute('UPDATE branches SET name = ? WHERE id = ?', [nm, branchId]);
    }
    if (name_ar !== undefined) await pool.execute('UPDATE branches SET name_ar = ? WHERE id = ?', [String(name_ar).trim() || null, branchId]);
    if (name_en !== undefined) await pool.execute('UPDATE branches SET name_en = ? WHERE id = ?', [String(name_en).trim() || null, branchId]);
    if (code !== undefined) await pool.execute('UPDATE branches SET code = ? WHERE id = ?', [String(code).trim().toLowerCase().replace(/\s+/g, '_'), branchId]);
    const [rows] = await pool.execute('SELECT id, shop_id, name, name_ar, name_en, code, created_at FROM branches WHERE id = ?', [branchId]);
    res.json((rows as any[])[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/branches/:id', authenticateToken, requireRole('shop_owner', 'super_admin'), async (req: any, res: Response) => {
  try {
    const branchId = Number(req.params.id);
    const shopId = Number(resolveShopId(req) || 0);
    const [existing] = await pool.execute('SELECT shop_id FROM branches WHERE id = ?', [branchId]);
    if (!(existing as any[]).length) return res.status(404).json({ error: 'Branch not found' });
    if ((existing as any[])[0].shop_id !== shopId && req.user?.role !== 'super_admin')
      return res.status(403).json({ error: 'Forbidden' });
    const [branches] = await pool.execute('SELECT id FROM branches WHERE shop_id = ?', [shopId]);
    if ((branches as any[]).length <= 1) return res.status(400).json({ error: 'Cannot delete the only branch' });
    await pool.execute('DELETE FROM branches WHERE id = ?', [branchId]);
    const [defaultRow] = await pool.execute('SELECT default_branch_id FROM shops WHERE id = ?', [shopId]);
    if ((defaultRow as any[])[0]?.default_branch_id === branchId) {
      const next = (branches as any[]).find((b: any) => b.id !== branchId);
      if (next) await pool.execute('UPDATE shops SET default_branch_id = ? WHERE id = ?', [next.id, shopId]);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/branches/current', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = Number(resolveShopId(req) || 0);
    if (!shopId) return res.status(400).json({ error: 'Shop required' });
    const [rows] = await pool.execute(
      'SELECT b.id, b.shop_id, b.name, b.name_ar, b.name_en, b.code FROM branches b INNER JOIN shops s ON s.default_branch_id = b.id WHERE s.id = ? LIMIT 1',
      [shopId]
    );
    if ((rows as any[]).length) return res.json((rows as any[])[0]);
    const [first] = await pool.execute('SELECT id, shop_id, name, name_ar, name_en, code FROM branches WHERE shop_id = ? ORDER BY id LIMIT 1', [shopId]);
    res.json((first as any[])[0] || null);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ========== SUBSCRIPTION (for settings) ==========
app.get('/api/subscription', authenticateToken, async (req: any, res: Response) => {
  try {
    let shopId: number | null = resolveShopId(req);
    if (!shopId && req.user?.role === 'super_admin') {
      shopId = await resolveOrCreateShopForUser(req.user);
    }
    if (!shopId) return res.status(400).json({ error: 'Shop required' });

    const [subRows] = await pool.execute(
      'SELECT plan_name, started_at, expires_at, last_activated_at FROM subscriptions WHERE shop_id = ? LIMIT 1',
      [shopId]
    );
    const sub = (subRows as any[])[0];
    const [actRows] = await pool.execute(
      'SELECT code, days, activated_at, previous_expires_at, new_expires_at FROM subscription_activations WHERE shop_id = ? ORDER BY activated_at DESC LIMIT 20',
      [shopId]
    );
    const activations = (actRows as any[]).map((r) => ({
      code: r.code,
      days: r.days,
      activated_at: r.activated_at,
      previous_expires_at: r.previous_expires_at,
      new_expires_at: r.new_expires_at,
    }));
    const expiresAt = sub?.expires_at ? new Date(sub.expires_at) : null;
    const isLifetime = !expiresAt;
    const planStatus = isLifetime ? 'LIFETIME' : 'ACTIVE';
    const daysLeft = isLifetime ? null : Math.max(0, Math.ceil((expiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
    const planName = String(sub?.plan_name || 'gold').toLowerCase();
    const planConfig = getPlanFeatures(planName);
    const additionalUsersLimit = (planConfig as any).additionalUsersLimit ?? 4;
    const userLimitTotal = (planConfig as any).userLimit ?? 5;
    const [allCountRows] = await pool.execute('SELECT COUNT(*) as total FROM users WHERE shop_id = ?', [shopId]);
    const [additionalCountRows] = await pool.execute("SELECT COUNT(*) as total FROM users WHERE shop_id = ? AND role != 'shop_owner'", [shopId]);
    const userCountTotal = Number((allCountRows as any[])[0]?.total || 0);
    const additionalUsersCount = Number((additionalCountRows as any[])[0]?.total || 0);
    const canAddUser = additionalUsersCount < additionalUsersLimit;
    res.json({
      // (cleaned)
      planId: planName,
      planName,
      planStatus,
      startedAt: sub?.started_at,
      expiresAt: sub?.expires_at,
      lastActivatedAt: sub?.last_activated_at,
      daysLeft: isLifetime ? null : daysLeft,
      activations,
      userLimitTotal,
      userLimit: userLimitTotal,
      additionalUsersLimit,
      userCountTotal,
      userCount: userCountTotal,
      additionalUsersCount,
      canAddUser,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ========== PRODUCTS/INVENTORY ==========
app.get('/api/products/lookup', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = Number(resolveShopId(req) || 0);
    if (!Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: 'shopId is required' });
    }

    const rawCode = Array.isArray(req.query.code) ? req.query.code[0] : req.query.code;
    const code = String(rawCode || '').trim();
    if (!code) {
      return res.status(400).json({ error: 'code is required' });
    }

    const [rows] = await pool.execute(
      `SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.shop_id = ?
         AND (p.barcode = ? OR p.sku = ? OR p.qr_code = ?)
       LIMIT 1`,
      [shopId, code, code, code]
    );
    const list = rows as any[];
    if (list.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(list[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = Number(resolveShopId(req) || 0);
    if (!Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: 'shopId is required' });
    }
    
    let query = `
      SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar,
        GREATEST(0, COALESCE(p.stock_quantity, 0) - COALESCE((
          SELECT SUM(r.qty) FROM stock_reservations r
          WHERE r.product_id = p.id AND r.shop_id = p.shop_id AND r.status = 'reserved'
        ), 0)) as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    query += ' AND p.shop_id = ?';
    params.push(shopId);
    query += ' AND (p.is_deleted = 0 OR p.is_deleted IS NULL)';
    query += ' ORDER BY p.created_at DESC';
    
    const [products] = await pool.execute(query, params);
    res.json(products || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', authenticateToken, requireRole('super_admin', 'shop_owner', 'warehouse'), async (req: any, res: Response) => {
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
      sku,
      barcode,
      qrCode,
    } = req.body;
    const shopId = resolveShopId(req);
    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required'حدث خطأ. حاول مرة أخرى.'PRODUCT_LIMIT_REACHED',
      });
    }

    if (!nameEn) {
      return res.status(400).json({ error: 'Product name is required' });
    }

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

    const [result] = await pool.execute(
      `INSERT INTO products 
       (name_en, name_ar, sku, barcode, qr_code, brand, category_id, buy_price, sell_price, stock_quantity, min_stock_level, image_url, shop_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
        imageUrl || null,
        shopId,
      ]
    );
    
    const insertResult = result as any;
    res.status(201).json({ id: insertResult.insertId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', authenticateToken, requireRole('super_admin', 'shop_owner', 'warehouse'), async (req: any, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (!productId) {
      return res.status(400).json({ error: 'Invalid product id' });
    }

    const shopId = resolveShopId(req);
    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required' });
    }

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
      extra_fields: extraFieldsBody,
      descriptionShort,
      descriptionLong,
      specs,
      warrantyText,
      returnPolicyText,
      galleryUrls,
    } = req.body;

    if (!nameEn) {
      return res.status(400).json({ error: 'Product name is required' });
    }

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
    const specsJson = Array.isArray(specs) ? JSON.stringify(specs) : (typeof specs === 'string' ? specs : null);
    const galleryUrlsJson = Array.isArray(galleryUrls) ? JSON.stringify(galleryUrls) : (typeof galleryUrls === 'string' ? galleryUrls : null);

    await pool.execute(
      `UPDATE products 
       SET name_en = ?, name_ar = ?, sku = ?, barcode = ?, qr_code = ?, brand = ?, buy_price = ?, sell_price = ?,
           stock_quantity = ?, min_stock_level = ?, image_url = ?, is_incomplete = ?, missing_fields = ?, extra_fields = ?,
           description_short = ?, description_long = ?, specs_json = ?, warranty_text = ?, return_policy_text = ?, gallery_urls_json = ?
       WHERE id = ? AND shop_id = ?`,
      [
        nameEn,
        nameAr || nameEn,
        sku || null,
        barcode || null,
        qrCode || null,
        brand || null,
        buyPrice || 0,
        computedSellPrice,
        stockQuantity || 0,
        minStockLevel || 5,
        imageUrl || null,
        isComplete ? 0 : 1,
        isComplete ? null : missingFieldsJson,
        extraFieldsJson,
        descriptionShort ?? null,
        descriptionLong ?? null,
        specsJson,
        warrantyText ?? null,
        returnPolicyText ?? null,
        galleryUrlsJson,
        productId,
        shopId,
      ]
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', authenticateToken, requireRole('super_admin', 'shop_owner', 'warehouse'), async (req: any, res: Response) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (!productId) {
      return res.status(400).json({ error: 'Invalid product id' });
    }
    const shopId = resolveShopId(req);
    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required' });
    }
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

const handleProductsImportUpload = async (
  req: any,
  res: Response,
  opts?: { forceImportMode?: boolean; buffer?: Buffer; filename?: string; mapping?: Record<string, string> | null; sheetIndex?: number; headerRowIndex?: number }
) => {
  try {
    const shopId = Number(resolveShopId(req) || 0);
    if (!Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: 'shopId is required' });
    }

    // Supports a PowerQuery-like flow:
    // - GET/POST ?mode=analyze : read headers + guess mapping + validate (no DB writes)
    // - POST ?mode=import     : import with provided mapping + policies
    const rawModeFromQuery = String((req as any)?.query?.mode || '').trim();
    const queryModeRaw = opts?.forceImportMode ? 'import' : rawModeFromQuery;
    const modeLocked = opts?.forceImportMode ? true : Boolean(queryModeRaw);
    let mode: 'analyze' | 'import' = queryModeRaw.toLowerCase() === 'analyze' ? 'analyze' : 'import';

    const limitCheck = await enforceProductLimit(shopId, 0);
    if (!limitCheck.allowed) {
      const remaining = limitCheck.remaining ?? 0;
      if (mode === 'import'حدث خطأ. حاول مرة أخرى.'PRODUCT_LIMIT_REACHED',
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
    let importedCount = 0;
    let draftCountTotal = 0;
    const batch: any[] = [];
    const batchSize = 200;
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

    const flushBatch = async (importBatchId?: number) => {
      if (mode !== 'import') return;
      if (batch.length === 0) return;
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const values = batch.flatMap((row) => [...row, importBatchId ?? null]);
      await pool.execute(
        `INSERT INTO products
         (name_en, name_ar, sku, barcode, qr_code, brand, category_id, buy_price, sell_price, stock_quantity, min_stock_level, image_url, shop_id, is_incomplete, extra_fields, missing_fields, import_batch_id)
         VALUES ${placeholders}`,
        values
      );
      draftCountTotal += batch.filter((row) => row[13] === 1).length;
      importedCount += batch.length;
      batch.length = 0;
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

      if (maxProducts !== null && existingCount + importedCount + batch.length >= maxProducts) {
        skipRow('Product limit reached');
        return;
      }

      const allRowValuesEmpty =
        Object.keys(row).length === 0 ||
        Object.values(row).every(
          (v) => v === undefined || v === null || String(v).trim() === ''
        );
      if (allRowValuesEmpty) {
        skipRow('Empty row');
        return;
      }

      // columnMap is HEADER -> FIELD. Resolve row values by columnMap only.
      const mapped: any = {};
      Object.entries(columnMap).forEach(([header, field]) => {
        let val = row[header];
        if (val === undefined && header) {
          const rowKey = Object.keys(row).find(
            (k) =>
              String(k).trim().toLowerCase() === String(header).trim().toLowerCase()
          );
          val = rowKey !== undefined ? row[rowKey] : undefined;
        }
        mapped[field] = val;
      });

      let skuRaw = String(mapped.sku ?? '').trim();
      let barcodeRaw = String(mapped.barcode ?? '').trim();
      const qrRaw = String(mapped.qrCode ?? '').trim();
      const imageUrlRaw = String(mapped.imageUrl ?? '').trim();
      if (!barcodeRaw && qrRaw) barcodeRaw = qrRaw;
      if (!skuRaw && (barcodeRaw || qrRaw)) skuRaw = barcodeRaw || qrRaw;

      const nameFromMap = normalizeText(mapped.name || mapped.nameAr);
      const fallbackName =
        nameFromMap ||
        (skuRaw || barcodeRaw ? `Draft ${skuRaw || barcodeRaw}` : `Unnamed Item #${rowIndex}`);
      const nameEn =
        mapped.name && String(mapped.name).trim()
          ? String(mapped.name).trim()
          : fallbackName;
      const nameAr =
        mapped.nameAr && String(mapped.nameAr).trim()
          ? String(mapped.nameAr).trim()
          : nameEn;

      const buyPriceRaw = normalizeNumber(mapped.buyPrice ?? mapped.cost);
      const sellPriceRaw = normalizeNumber(mapped.sellPrice ?? mapped.price ?? mapped.sell);
      const hasSell = sellPriceRaw !== null && sellPriceRaw > 0;
      const hasBuy = buyPriceRaw !== null && buyPriceRaw > 0;

      let sellPrice = 0;
      if (hasSell) {
        sellPrice = Number(sellPriceRaw);
      } else if (hasBuy) {
        sellPrice = Number((Number(buyPriceRaw) * 1.2).toFixed(2));
      }
      const normalizedBuyPrice = buyPriceRaw != null ? Number(buyPriceRaw) : 0;
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

      if (mode === 'import') {
        batch.push([
          nameEn,
          nameAr,
          skuRaw || null,
          barcodeRaw || null,
          null,
          mapped.brand || null,
          categoryId,
          normalizedBuyPrice,
          sellPrice,
          stockQuantity,
          minStockLevel,
          imageUrlRaw || null,
          shopId,
          isIncomplete,
          extraFieldsJson,
          missingFieldsJson,
        ]);

        console.log(
          `${logPrefix} queued: name="${String(nameEn).slice(0, 60)}" isIncomplete=${isIncomplete}`
        );

        if (batch.length >= batchSize) {
          await flushBatch();
        }
      } else {
        analysis.validRows += 1;
      }
    };

    if (opts?.buffer && opts?.filename && mode === 'import') {
      try {
        const parseResult = await parseExcelOrCsv(opts.buffer, opts.filename, { sheetIndex: opts?.sheetIndex ?? 0, headerRowIndex: opts?.headerRowIndex ?? 0 });
        if (parseResult.error) {
          return res.status(400).json({ ok: false, error: parseResult.error });
        }
        const { detectedHeaders, normalizedHeaders, dataRows } = parseResult;
        const inferredMap = opts?.mapping
          ? clientMappingToInferred(opts.mapping, detectedHeaders)
          : inferColumnMapping(detectedHeaders, normalizedHeaders);
        const importWarnings: string[] = [];
        const [batchIns] = await pool.execute(
          'INSERT INTO import_batches (user_id, shop_id, file_name, status) VALUES (?, ?, ?, ?)',
          [req.user?.id ?? 0, shopId, opts.filename ?? '', 'partial']
        );
        const batchId = (batchIns as any).insertId;
        const stagedRows: Array<{ rowIndex: number; rawData: Record<string, string>; mappedData: Record<string, string | null>; errors: string[] }> = [];
        for (let i = 0; i < dataRows.length; i++) {
          if (maxProducts != null && existingCount + importedCount + batch.length >= maxProducts) {
            skipped.push({ row: i + 2, reason: 'Product limit reached' });
            const canonical = toCanonicalRow(dataRows[i], inferredMap, detectedHeaders);
            stagedRows.push({
              rowIndex: i + 2,
              rawData: dataRows[i],
              mappedData: canonical,
              errors: [AR.GENERIC_ERROR],
            });
            continue;
          }
          const canonical = toCanonicalRow(dataRows[i], inferredMap, detectedHeaders);
          const valErrs = validateCanonicalRow(canonical, i, skuSet, barcodeSet);
          if (valErrs.length > 0) {
            skipped.push({ row: i + 2, reason: valErrs[0] });
            stagedRows.push({ rowIndex: i + 2, rawData: dataRows[i], mappedData: canonical, errors: valErrs });
            continue;
          }
          if (canonical.category) {
            const normCat = normalizeText(canonical.category);
            if (normCat && !categoryMap.has(normCat)) {
              const [ins] = await pool.execute('INSERT INTO categories (name_en, name_ar, shop_id) VALUES (?, ?, ?)', [canonical.category, canonical.category, shopId]);
              const id = (ins as any).insertId;
              if (id) categoryMap.set(normCat, id);
            }
          }
          const [dbRow] = canonicalRowToDbInsert(canonical, shopId, categoryMap, importWarnings);
          batch.push(dbRow);
          const skuVal = (canonical.sku ?? '').trim();
          if (skuVal) skuSet.add(normalizeText(skuVal));
          const barVal = (canonical.barcode ?? '').trim() || (canonical.qrCode ?? '').trim();
          if (barVal) barcodeSet.add(normalizeText(barVal));
          if (batch.length >= batchSize) await flushBatch(batchId);
        }
        await flushBatch(batchId);
        for (const sr of stagedRows) {
          await pool.execute(
            'INSERT INTO import_batch_rows (batch_id, row_index, raw_data, mapped_data, errors, status) VALUES (?, ?, ?, ?, ?, ?)',
            [batchId, sr.rowIndex, JSON.stringify(sr.rawData), JSON.stringify(sr.mappedData), JSON.stringify(sr.errors), 'invalid']
          );
        }
        const failedCount = stagedRows.length;
        await pool.execute(
          'UPDATE import_batches SET imported_count = ?, failed_count = ?, status = ? WHERE id = ?',
          [importedCount, failedCount, failedCount > 0 ? 'partial' : 'committed'حدث خطأ. حاول مرة أخرى.'Import failed' });
      }
    }

    const busboy = Busboy({ headers: req.headers, limits: {} });
    let fileFound = false;
    let processDone = false;
    let columnMap: Record<string, string> = {};
    let headers: string[] = [];
    let unmappedColumns: string[] = [];
    let mappingInvalid = false;
    let mappingGuide: any = null;

    busboy.on('field', (fieldName: string, value: string) => {
      const v = String(value || '').trim();
      if (!v) return;
      if (fieldName === 'mode') {
        if (modeLocked) return;
        if (v.toLowerCase() === 'analyze') mode = 'analyze';
        if (v.toLowerCase() === 'import') mode = 'import';
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
      if (mode === 'import') {
        await flushBatch();
      }
      const payload = {
        importedCount,
        draftCount: draftCountTotal,
        updatedCount: 0,
        errorsCount: 0,
        skippedCount: skipped.length,
        skipped,
        profile: finalizeProfile(),
        unmappedColumns,
        detectedHeaders: headers,
        currentMapping: columnMap,
      };

      if (mode === 'analyze') {
        const totalRows = Number((payload as any)?.profile?.totalRows || 0);
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

      return res.json(payload);
    };

    const streamToBuffer = (stream: NodeJS.ReadableStream): Promise<Buffer> =>
      new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });

    busboy.on('file', async (_fieldName: string, file: NodeJS.ReadableStream, info: any) => {
      if (fileFound) {
        file.resume();
        return;
      }
      fileFound = true;
      const filename = info.filename || '';
      const lower = filename.toLowerCase();
      const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.')) : '';
      const isCsv = ext === '.csv';
      const isExcel = ext === '.xlsx' || ext === '.xlsm';
      if (!isCsv && !isExcel) {
        file.resume();
        processDone = true;
        return res.json({ ok: false, error: 'Unsupported file type. Use .xlsx, .xlsm, or .csv' });
      }

      try {
        const buffer = await streamToBuffer(file);
        const parseResult = await parseExcelOrCsv(buffer, filename);
        if (parseResult.error) {
          console.log('[import] parse error:', parseResult.error);
          processDone = true;
          return res.json({ ok: false, error: parseResult.error });
        }
        const { detectedHeaders, normalizedHeaders, dataRows } = parseResult;
        const inferredMap = inferColumnMapping(detectedHeaders, normalizedHeaders);
        console.log('[import] mode=%s fileType=%s detectedHeaders=%j totalRowsDetected=%d inferredMap=%j', mode, ext, detectedHeaders, dataRows.length, inferredMap);

        if (mode === 'analyze') {
          const previewRows = dataRows.slice(0, 10).map((r) => toCanonicalRow(r, inferredMap, detectedHeaders));
          processDone = true;
          return res.json({
            ok: true,
            detectedHeaders,
            normalizedHeaders,
            inferredMap,
            totalRowsDetected: dataRows.length,
            previewRows,
            warnings: [],
          });
        }

        const importWarnings: string[] = [];
        for (let i = 0; i < dataRows.length; i++) {
          if (maxProducts != null && existingCount + importedCount + batch.length >= maxProducts) {
            skipped.push({ row: i + 2, reason: 'Product limit reached' });
            continue;
          }
          const canonical = toCanonicalRow(dataRows[i], inferredMap, detectedHeaders);
          if (canonical.category) {
            const normCat = normalizeText(canonical.category);
            if (normCat && !categoryMap.has(normCat)) {
              const [ins] = await pool.execute('INSERT INTO categories (name_en, name_ar, shop_id) VALUES (?, ?, ?)', [canonical.category, canonical.category, shopId]);
              const id = (ins as any).insertId;
              if (id) categoryMap.set(normCat, id);
            }
          }
          const [dbRow] = canonicalRowToDbInsert(canonical, shopId, categoryMap, importWarnings);
          batch.push(dbRow);
          if (batch.length >= batchSize) await flushBatch();
        }
        await flushBatch();
        console.log('[import] import done inserted=%d skipped=%d', importedCount, skipped.length);
        processDone = true;
        return res.json({
          ok: true,
          inserted: importedCount,
          updated: 0,
          skippedCount: skipped.length,
          skipped,
          warnings: importWarnings.slice(0, 50),
        });
      } catch (err: any) {
        console.log('[import] error:', err?.message);
        processDone = true;
        return res.json({ ok: false, error: err?.message || 'Failed to parse or import file' });
      }
    });

    busboy.on('finish', async () => {
      if (!fileFound) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      if (!processDone) {
        await finish();
      }
    });

    req.pipe(busboy);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const multerIfMultipart = (req: any, res: Response, next: (err?: any) => void) => {
  const ct = String(req.headers['content-type'] || '').toLowerCase();
  if (ct.includes('multipart/form-data')) {
    return upload.single('file')(req, res, (err: any) => {
      if (err) return res.status(400).json({ ok: false, error: err.message || 'File upload failed' });
      next();
    });
  }
  next();
};

app.post(
  '/api/products/import',
  authenticateToken,
  requirePackageFeature('excel'),
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  multerIfMultipart,
  async (req: any, res: Response) => {
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (contentType.includes('multipart/form-data')) {
      console.log('mode:', req.query.mode);
      console.log('file:', req.file?.originalname, req.file?.size, req.file?.mimetype);
      if (!req.file) {
        return res.status(400).json({ ok: false, error: "No file received (field name must be 'file')" });
      }
      const mode = String(req.query.mode || '').toLowerCase();
      const sheetIndex = Math.max(0, parseInt(String(req.query.sheet || '0'), 10));
      const headerRowIndex = Math.max(0, parseInt(String(req.query.headerRow || '0'), 10));
      if (mode === 'analyze') {
        try {
          const parseResult = await parseExcelOrCsv(req.file.buffer, req.file.originalname, { sheetIndex, headerRowIndex });
          if (parseResult.error) {
            return res.status(400).json({ ok: false, error: parseResult.error, rowsCount: 0, detectedHeaders: [] });
          }
          const { detectedHeaders, normalizedHeaders, dataRows, sheetNames } = parseResult;
          const autoMappingSuggestions = inferColumnMapping(detectedHeaders, normalizedHeaders);
          const conflicts = (() => {
            const mapped = Object.values(autoMappingSuggestions).filter(Boolean) as string[];
            const seen = new Set<string>();
            const c: string[] = [];
            mapped.forEach((h) => {
              if (seen.has(h)) c.push(h);
              seen.add(h);
            });
            return c;
          })();
          const hasName = !!autoMappingSuggestions.partName;
          const hasPrice = !!(autoMappingSuggestions.sellPrice || autoMappingSuggestions.buyPrice);
          const mappingConfidence = hasName && hasPrice && conflicts.length === 0 ? 100 : (hasName ? 70 : 40);
          const previewRows = dataRows.slice(0, 5).map((r) => {
            const canonical = toCanonicalRow(r, autoMappingSuggestions, detectedHeaders);
            return Object.fromEntries(Object.entries(canonical).filter(([, v]) => v != null));
          });
          const CANONICAL_TO_API: Record<string, string> = {
            partName: 'name', nameAr: 'nameAr', brand: 'brand', category: 'category',
            sellPrice: 'sellPrice', buyPrice: 'buyPrice', stockQty: 'stockQuantity',
            sku: 'sku', barcode: 'barcode', qrCode: 'qrCode', imageUrl: 'imageUrl', minStockLevel: 'minStockLevel',
          };
          const headerToCanonical: Record<string, string> = {};
          Object.entries(autoMappingSuggestions).forEach(([canonKey, header]) => {
            if (header) headerToCanonical[header] = CANONICAL_TO_API[canonKey] || canonKey;
          });
          return res.json({
            ok: true,
            detectedHeaders,
            normalizedHeaders,
            autoMappingSuggestions,
            headerToCanonical,
            mappingConfidence,
            conflicts,
            totalRowsDetected: dataRows.length,
            rowsCount: dataRows.length,
            sheetNames: sheetNames || [],
            previewRows,
            strictMatch: mappingConfidence === 100 && conflicts.length === 0 && hasName && hasPrice,
          });
        } catch (err: any) {
          console.log('[import] analyze error:', err?.message);
          return res.status(400).json({ ok: false, error: err?.message || 'Failed to parse file', rowsCount: 0, detectedHeaders: [] });
        }
      }
      let mapping: Record<string, string> | null = null;
      try {
        const rawMap = req.body?.mapping;
        if (rawMap && typeof rawMap === 'string') mapping = JSON.parse(rawMap);
        else if (rawMap && typeof rawMap === 'object') mapping = rawMap;
      } catch {
        mapping = null;
      }
      return handleProductsImportUpload(req, res, { buffer: req.file.buffer, filename: req.file.originalname, mapping, sheetIndex, headerRowIndex });
    }

    try {
      const body = req.body || {};
      const items = Array.isArray(body.items) ? body.items : [];
      const shopId = resolveShopId(req);
      if (!shopId) {
        return res.status(400).json({ error: 'shopId is required' });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error:
            'No items received. If uploading a file, send multipart/form-data without setting Content-Type manually.'حدث خطأ. حاول مرة أخرى.'PRODUCT_LIMIT_REACHED',
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

// ========== IMPORT STAGING APIs ==========
app.get(
  '/api/products/import/batch/:batchId',
  authenticateToken,
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  async (req: any, res: Response) => {
    try {
      const batchId = parseInt(req.params.batchId, 10);
      if (!batchId) return res.status(400).json({ ok: false, error: 'Invalid batchId' });
      const shopId = resolveShopId(req);
      if (!shopId) return res.status(400).json({ ok: false, error: 'shopId required' });
      const [rows] = await pool.execute(
        `SELECT b.id, b.user_id, b.shop_id, b.file_name, b.status, b.imported_count, b.failed_count, b.created_at
         FROM import_batches b WHERE b.id = ? AND b.shop_id = ?`,
        [batchId, shopId]
      );
      const batchRow = (rows as any[])[0];
      if (!batchRow) return res.status(404).json({ ok: false, error: 'Batch not found' });
      const [rowRows] = await pool.execute(
        `SELECT id, batch_id, row_index, raw_data, mapped_data, errors, status FROM import_batch_rows WHERE batch_id = ? ORDER BY row_index`,
        [batchId]
      );
      const parseJson = (v: any) => {
        if (v == null) return v;
        if (typeof v === 'object') return v;
        try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return v; }
      };
      const batchRows = (rowRows as any[]).map((r) => ({
        id: r.id,
        rowIndex: r.row_index,
        rawData: parseJson(r.raw_data) || {},
        mappedData: parseJson(r.mapped_data) || {},
        errors: Array.isArray(parseJson(r.errors)) ? parseJson(r.errors) : (parseJson(r.errors) ? [String(parseJson(r.errors))] : []),
        status: r.status,
      }));
      return res.json({
        ok: true,
        batch: {
          id: batchRow.id,
          fileName: batchRow.file_name,
          status: batchRow.status,
          importedCount: batchRow.imported_count,
          failedCount: batchRow.failed_count,
          createdAt: batchRow.created_at,
        },
        rows: batchRows,
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Failed to fetch batch' });
    }
  }
);

app.patch(
  '/api/products/import/batch/:batchId/row/:rowIndex',
  authenticateToken,
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  async (req: any, res: Response) => {
    try {
      const batchId = parseInt(req.params.batchId, 10);
      const rowIndex = parseInt(req.params.rowIndex, 10);
      if (!batchId || !rowIndex) return res.status(400).json({ ok: false, error: 'Invalid batchId or rowIndex' });
      const shopId = resolveShopId(req);
      if (!shopId) return res.status(400).json({ ok: false, error: 'shopId required' });
      const [batchRows] = await pool.execute('SELECT id FROM import_batches WHERE id = ? AND shop_id = ?', [batchId, shopId]);
      if (!(batchRows as any[]).length) return res.status(404).json({ ok: false, error: 'Batch not found' });
      const updates = req.body as Record<string, string | number | null>;
      if (!updates || typeof updates !== 'object') return res.status(400).json({ ok: false, error: 'No updates provided' });
      const [rows] = await pool.execute(
        'SELECT id, mapped_data FROM import_batch_rows WHERE batch_id = ? AND row_index = ?',
        [batchId, rowIndex]
      );
      const r = (rows as any[])[0];
      if (!r) return res.status(404).json({ ok: false, error: 'Row not found' });
      const mapped = r.mapped_data && typeof r.mapped_data === 'string' ? JSON.parse(r.mapped_data) : (r.mapped_data || {});
      const CANONICAL_FIELDS = ['partName', 'nameAr', 'brand', 'category', 'sellPrice', 'buyPrice', 'stockQty', 'sku', 'barcode', 'qrCode', 'imageUrl', 'minStockLevel'];
      const fieldMap: Record<string, string> = {
        name: 'partName', nameAr: 'nameAr', brand: 'brand', category: 'category',
        sellPrice: 'sellPrice', buyPrice: 'buyPrice', stockQuantity: 'stockQty',
        sku: 'sku', barcode: 'barcode', qrCode: 'qrCode', imageUrl: 'imageUrl', minStockLevel: 'minStockLevel',
      };
      for (const [k, v] of Object.entries(updates)) {
        const canon = fieldMap[k] || (CANONICAL_FIELDS.includes(k) ? k : null);
        if (canon) mapped[canon] = v == null ? '' : String(v);
      }
      await pool.execute(
        'UPDATE import_batch_rows SET mapped_data = ? WHERE batch_id = ? AND row_index = ?',
        [JSON.stringify(mapped), batchId, rowIndex]
      );
      return res.json({ ok: true, mappedData: mapped });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Failed to update row' });
    }
  }
);

app.post(
  '/api/products/import/batch/:batchId/commit',
  authenticateToken,
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  async (req: any, res: Response) => {
    try {
      const batchId = parseInt(req.params.batchId, 10);
      if (!batchId) return res.status(400).json({ ok: false, error: 'Invalid batchId' });
      const shopId = resolveShopId(req);
      if (!shopId) return res.status(400).json({ ok: false, error: 'shopId required' });
      const [batchRows] = await pool.execute('SELECT id FROM import_batches WHERE id = ? AND shop_id = ?', [batchId, shopId]);
      if (!(batchRows as any[]).length) return res.status(404).json({ ok: false, error: 'Batch not found' });
      const [rows] = await pool.execute(
        'SELECT id, row_index, mapped_data, status FROM import_batch_rows WHERE batch_id = ? ORDER BY row_index',
        [batchId]
      );
      const categoryMap = new Map<string, number>();
      const [catRows] = await pool.execute('SELECT id, name_en, name_ar FROM categories WHERE shop_id = ? OR shop_id IS NULL', [shopId]);
      (catRows as any[]).forEach((c) => {
        categoryMap.set(normalizeText(c.name_en), c.id);
        categoryMap.set(normalizeText(c.name_ar), c.id);
      });
      const [existing] = await pool.execute('SELECT sku, barcode FROM products WHERE shop_id = ?', [shopId]);
      const skuSet = new Set((existing as any[]).map((p) => normalizeText(p.sku)).filter(Boolean));
      const barcodeSet = new Set((existing as any[]).map((p) => normalizeText(p.barcode)).filter(Boolean));
      let committed = 0;
      const importWarnings: string[] = [];
      for (const r of rows as any[]) {
        if (r.status === 'imported') continue;
        const mapped = r.mapped_data && typeof r.mapped_data === 'string' ? JSON.parse(r.mapped_data) : (r.mapped_data || {});
        const canonical: Record<CanonicalKey, string | null> = {
          partName: mapped.partName ?? mapped.name ?? null,
          nameAr: mapped.nameAr ?? null,
          brand: mapped.brand ?? null,
          category: mapped.category ?? null,
          sellPrice: mapped.sellPrice ?? null,
          buyPrice: mapped.buyPrice ?? null,
          stockQty: mapped.stockQty ?? mapped.stockQuantity ?? null,
          sku: mapped.sku ?? null,
          barcode: mapped.barcode ?? null,
          qrCode: mapped.qrCode ?? null,
          imageUrl: mapped.imageUrl ?? null,
          minStockLevel: mapped.minStockLevel ?? null,
        };
        const valErrs = validateCanonicalRow(canonical, r.row_index - 2, skuSet, barcodeSet);
        if (valErrs.length > 0) continue;
        if (canonical.category) {
          const normCat = normalizeText(canonical.category);
          if (normCat && !categoryMap.has(normCat)) {
            const [ins] = await pool.execute('INSERT INTO categories (name_en, name_ar, shop_id) VALUES (?, ?, ?)', [canonical.category, canonical.category, shopId]);
            const id = (ins as any).insertId;
            if (id) categoryMap.set(normCat, id);
          }
        }
        const [dbRow] = canonicalRowToDbInsert(canonical, shopId, categoryMap, importWarnings);
        await pool.execute(
          `INSERT INTO products (name_en, name_ar, sku, barcode, qr_code, brand, category_id, buy_price, sell_price, stock_quantity, min_stock_level, image_url, shop_id, is_incomplete, extra_fields, missing_fields, import_batch_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [...dbRow, batchId]
        );
        const skuVal = (canonical.sku ?? '').trim();
        if (skuVal) skuSet.add(normalizeText(skuVal));
        const barVal = (canonical.barcode ?? '').trim() || (canonical.qrCode ?? '').trim();
        if (barVal) barcodeSet.add(normalizeText(barVal));
        await pool.execute('UPDATE import_batch_rows SET status = ? WHERE batch_id = ? AND row_index = ?', ['imported', batchId, r.row_index]);
        committed++;
      }
      const [[{ c: remaining }]] = await pool.execute(
        'SELECT COUNT(*) as c FROM import_batch_rows WHERE batch_id = ? AND status IN (?, ?)',
        [batchId, 'pending', 'invalid']
      ) as any;
      await pool.execute(
        'UPDATE import_batches SET imported_count = imported_count + ?, failed_count = ?, status = ? WHERE id = ?',
        [committed, remaining, remaining === 0 ? 'committed' : 'partial', batchId] = await pool.execute(
        'SELECT id, file_name, imported_count, failed_count, created_at FROM import_batches WHERE shop_id = ? AND rolled_back_at IS NULL ORDER BY created_at DESC LIMIT 1',
        [shopId]
      );
      const row = (rows as any[])[0];
      if (!row) return res.status(404).json({ ok: false, error: 'No import batch found' });
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

// Alias for backward compat
app.get(
  '/api/products/import/last-batch',
  authenticateToken,
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  async (req: any, res: Response) => {
    try {
      const shopId = resolveShopId(req);
      if (!shopId) return res.status(400).json({ ok: false, error: 'shopId required' });
      const [rows] = await pool.execute(
        'SELECT id, file_name, status, imported_count, failed_count, created_at FROM import_batches WHERE shop_id = ? ORDER BY id DESC LIMIT 1',
        [shopId]
      );
      const row = (rows as any[])[0];
      if (!row) return res.json({ ok: true, batchId: null });
      return res.json({
        ok: true,
        batchId: row.id,
        fileName: row.file_name,
        createdAt: row.created_at,
        status: row.status,
        importedCount: row.imported_count ?? 0,
        failedCount: row.failed_count ?? 0,
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Failed' });
    }
  }
);

// (cleaned)
app.post(
  '/api/products/import/rollback',
  authenticateToken,
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  async (req: any, res: Response) => {
    try {
      if (req.body?.confirm !== true) {
        return res.status(400).json({
          ok: false,
          error: AR.INVALID_CONFIRM_FORMAT,
        });
      }
      const shopId = resolveShopId(req);
      if (!shopId) return res.status(400).json({ ok: false, error: 'shopId required' });
      let batchId = req.body?.batchId ? parseInt(String(req.body.batchId), 10) : null;
      if (!batchId || !Number.isInteger(batchId)) {
        const [rows] = await pool.execute(
          'SELECT id FROM import_batches WHERE shop_id = ? AND rolled_back_at IS NULL ORDER BY created_at DESC LIMIT 1',
          [shopId]
        );
        const row = (rows as any[])[0];
        if (!row) return res.status(404).json({ ok: false, error: 'No import batch found' });
        batchId = row.id;
      }
      const [batchRows] = await pool.execute(
        'SELECT id FROM import_batches WHERE id = ? AND shop_id = ? AND rolled_back_at IS NULL',
        [batchId, shopId]
      );
      if (!(batchRows as any[]).length) {
        return res.status(404).json({ ok: false, error: 'Batch not found or already rolled back' });
      }
      const [result] = await pool.execute(
        'UPDATE products SET is_deleted = 1 WHERE shop_id = ? AND import_batch_id = ?',
        [shopId, batchId]
      );
      const deletedCount = (result as any).affectedRows ?? 0;
      await pool.execute('UPDATE import_batches SET rolled_back_at = NOW() WHERE id = ?', [batchId]);
      console.log('ROLLBACK IMPORT', { shopId, batchId, deletedCount });
      return res.json({ ok: true, batchId, deletedCount });
    } catch (err: any) {
      console.error('rollback error', err);
      return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
    }
  }
);

// Delete products by import batch (soft delete, shop-scoped rollback)
app.delete(
  '/api/products/by-import-batch/:batchId',
  authenticateToken,
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  async (req: any, res: Response) => {
    try {
      const batchId = parseInt(req.params.batchId, 10);
      if (!batchId) return res.status(400).json({ ok: false, error: 'Invalid batchId' });
      const shopId = resolveShopId(req);
      if (!shopId) return res.status(400).json({ ok: false, error: 'shopId required' });
      const [batchRows] = await pool.execute('SELECT id FROM import_batches WHERE id = ? AND shop_id = ?', [batchId, shopId]);
      if (!(batchRows as any[]).length) return res.status(404).json({ ok: false, error: 'Batch not found' });
      const [result] = await pool.execute(
        'UPDATE products SET is_deleted = 1 WHERE shop_id = ? AND import_batch_id = ?',
        [shopId, batchId]
      );
      const deletedCount = (result as any).affectedRows ?? 0;
      return res.json({ ok: true, deletedCount, batchId });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || 'Delete failed' });
    }
  }
);

// Template download
app.get(
  '/api/products/import/template',
  authenticateToken,
  requireRole('super_admin', 'shop_owner', 'warehouse'),
  async (_req: any, res: Response) => {
    try {
      const XLSX = await import('xlsx');
      const headers = ['name', 'nameAr', 'brand', 'category', 'sellPrice', 'buyPrice', 'stockQuantity', 'sku', 'barcode', 'qrCode', 'imageUrl'];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="products-template.xlsx"');
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err?.message || 'Template download failed' });
    }
  }
);

// POS Store Alerts: low stock + slow stock (branch-scoped when branch_inventory exists)
app.get('/api/pos/alerts', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'), async (req: any, res: Response) => {
  try {
    const shopId = await resolveShopIdSafe(req);
    if (!shopId) return res.json({ lowStock: [], lowStockCount: 0, slowSummary: { deadCount: 0, slowCount: 0 } });
    const branchId = resolveBranchId(req);
    const branchIds = await getBranchManagerBranchIds(req);

    let lowStockQuery = `
      SELECT p.id, p.name_en, p.name_ar, p.stock_quantity, p.min_stock_level, c.name_en as category_name_en, c.name_ar as category_name_ar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL) AND p.shop_id = ?
    `;
    const lowParams: any[] = [shopId];

    const [biCheck] = await pool.execute('SELECT 1 FROM branch_inventory WHERE shop_id = ? LIMIT 1', [shopId]);
    const hasBranchInventory = (biCheck as any[]).length > 0;
    if (hasBranchInventory && (branchId || (branchIds && branchIds.length > 0))) {
      const bid = branchId || (branchIds && branchIds[0] ? branchIds[0] : null);
      if (bid) {
        lowStockQuery = `
          SELECT p.id, p.name_en, p.name_ar, COALESCE(bi.qty, p.stock_quantity) as stock_quantity, p.min_stock_level, c.name_en as category_name_en, c.name_ar as category_name_ar
          FROM products p
          LEFT JOIN branch_inventory bi ON bi.product_id = p.id AND bi.branch_id = ? AND bi.shop_id = p.shop_id
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL) AND p.shop_id = ?
          HAVING COALESCE(bi.qty, p.stock_quantity) <= p.min_stock_level
          ORDER BY COALESCE(bi.qty, p.stock_quantity) ASC
        `;
        lowParams.length = 0;
        lowParams.push(bid, shopId);
      } else {
        lowStockQuery += ' AND p.stock_quantity <= p.min_stock_level ORDER BY p.stock_quantity ASC';
      }
    } else {
      lowStockQuery += ' AND p.stock_quantity <= p.min_stock_level ORDER BY p.stock_quantity ASC';
    }

    const [lowRows] = await pool.execute(lowStockQuery, lowParams);
    const lowStock = (lowRows as any[]).slice(0, 20);

    const days = 120;
    const threshold = 2;
    const [summaryRows] = await pool.execute(
      `SELECT p.id,
        COALESCE(pos_sold.sold, 0) + COALESCE(online_sold.sold, 0) AS soldQtyWindow
       FROM products p
       LEFT JOIN (SELECT si.product_id, SUM(si.quantity) AS sold FROM sale_items si
         JOIN sales s ON s.id = si.sale_id AND (s.source = 'pos' OR s.source IS NULL)
         WHERE s.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND s.shop_id = ?
         GROUP BY si.product_id) pos_sold ON pos_sold.product_id = p.id
       LEFT JOIN (SELECT oi.product_id, SUM(oi.quantity) AS sold FROM online_order_items oi
         JOIN online_orders o ON o.id = oi.order_id AND o.status IN ('confirmed','completed')
         WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND o.shop_id = ?
         GROUP BY oi.product_id) online_sold ON online_sold.product_id = p.id
       WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL) AND p.shop_id = ?`,
      [days, shopId, days, shopId, shopId]
    );
    let deadCount = 0;
    let slowCount = 0;
    for (const r of summaryRows as any[]) {
      const sold = Number(r.soldQtyWindow || 0);
      if (sold === 0) deadCount++;
      else if (sold <= threshold) slowCount++;
    }

    res.json({
      lowStock,
      lowStockCount: (lowRows as any[]).length,
      slowSummary: { deadCount, slowCount },
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Server error' });
  }
});

app.get('/api/products/low-stock', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = resolveShopId(req);
    
    let query = `
      SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL) AND p.stock_quantity <= p.min_stock_level
    `;
    const params: any[] = [];
    
    if (shopId) {
      query += ' AND p.shop_id = ?';
      params.push(shopId);
    } else if (req.user.role !== 'super_admin') {
      return res.status(400).json({ error: 'shopId is required' });
    }
    
    query += ' ORDER BY p.stock_quantity ASC';
    
    const [products] = await pool.execute(query, params);
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== CATEGORIES ==========
app.get('/api/categories', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = Number(resolveShopId(req) || 0);
    if (!shopId) {
      if (req.user?.role === 'super_admin') {
        const [categories] = await pool.execute('SELECT * FROM categories');
        return res.json(categories);
      }
      return res.status(400).json({ error: 'shopId is required' });
    }

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
  requireRole('super_admin', 'shop_owner', 'cashier', 'branch_manager'),
  async (req: any, res: Response) => {
  try {
    const result = await createSaleAndItems(req);
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
      console.log('INVOICE CREATE called');
      console.log('INVOICE USER:', req.user?.id, req.user?.role);
      console.log('INVOICE HEADERS shop:', req.headers['x-shop-id'], req.headers['x-branch-id']);
      console.log('INVOICE PAYLOAD:', JSON.stringify(req.body, null, 2));

      const result = await createSaleAndItems(req);
      return res.status(201).json(result);
    } catch (error: any) {
      console.error('INVOICE ERROR:', error);
      console.error('INVOICE STACK:', error?.stack);

      if (error?.message === 'shopId is required') {
        return res.status(400).json({ error: 'shopId is required' });
      }
      if (error?.message === 'Sale items required') {
        return res.status(400).json({ error: 'Sale items required' });
      }

      return res.status(500).json({
        message: 'INVOICE_FAILED',
        error: error?.message || String(error),
      });
    }
  }
);

// Increment invoice print counter (sales row)
const incrementInvoicePrintCount = async (req: any, saleId: number) => {
  const shopId = Number(resolveShopId(req) || 0);
  if (!Number.isFinite(shopId) || shopId <= 0) {
    throw new Error('shopId is required');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [updateResult] = await connection.execute(
      `UPDATE sales
       SET print_count = COALESCE(print_count, 0) + 1,
           last_printed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND shop_id = ?`,
      [saleId, shopId]
    );
    const updateInfo = updateResult as any;
    if (!updateInfo?.affectedRows) {
      throw new Error('Invoice not found');
    }

    const [rows] = await connection.execute(
      'SELECT id, invoice_number, invoice_serial, print_count, last_printed_at FROM sales WHERE id = ? AND shop_id = ?',
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

    const printCount = Number(invoiceRow?.print_count || 0);
    await connection.execute(
      `INSERT INTO invoice_print_log (shop_id, invoice_id, invoice_type, printed_by_user_id, print_count_after)
       VALUES (?, ?, 'pos', ?, ?)`,
      [shopId, saleId, req.user?.id ?? null, printCount]
    );
    const titleAr = 'عملية بيع جديدة (POS)';
    const titleEn = 'POS invoice printed'حدث خطأ. حاول مرة أخرى.'pos', 'pos_invoice_printed', ?, ?, ?, ?, 0, ?)`,
      [shopId, titleAr, titleEn, bodyAr, bodyEn, JSON.stringify({ invoiceId: saleId, saleId, printCount, lastPrintedAt: invoiceRow?.last_printed_at })]
    );

    await connection.commit();
    return {
      saleId: invoiceRow?.id,
      invoiceNumber: invoiceRow?.invoice_number,
      invoiceSerial: invoiceRow?.invoice_serial,
      printCount: Number(invoiceRow?.print_count || 0),
      lastPrintedAt: invoiceRow?.last_printed_at,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

app.post('/api/invoices/:id/print', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'), async (req: any, res: Response) => {
  try {
    const saleId = parseInt(req.params.id, 10);
    if (!saleId) {
      return res.status(400).json({ error: 'Invalid invoice id' });
    }
    const result = await incrementInvoicePrintCount(req, saleId);
    res.json(result);
  } catch (error: any) {
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
app.post('/api/sales/:id/print', authenticateToken, requireRole('super_admin', 'shop_owner', 'cashier', 'branch_manager'), async (req: any, res: Response) => {
  try {
    const saleId = parseInt(req.params.id, 10);
    if (!saleId) {
      return res.status(400).json({ error: 'Invalid sale id' });
    }
    const result = await incrementInvoicePrintCount(req, saleId);
    res.json(result);
  } catch (error: any) {
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
    const shopId = Number(resolveShopId(req) || 0);
    const branchIds = await getBranchManagerBranchIds(req);
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 500) : 50;
    const sourceFilter = String(req.query.source || 'all').toLowerCase();
    const search = String(req.query.search || req.query.q || '').trim();
    
    let query = `
      SELECT s.*, u.username as cashier_name,
             sh.business_name, sh.owner_name, sh.activity_type, sh.address, sh.contact_email, sh.contact_phone, sh.logo_url
      FROM sales s 
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN shops sh ON s.shop_id = sh.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (!shopId) return res.json([]);
    query += ' AND s.shop_id = ?';
    params.push(shopId);
    if (branchIds?.length) {
      query += ` AND s.branch_id IN (${branchIds.map(() => '?').join(',')})`;
      params.push(...branchIds);
    }
    
    if (sourceFilter === 'online') {
      query += " AND (s.source = 'online' OR s.online_order_id IS NOT NULL)";
    } else if (sourceFilter === 'pos') {
      query += " AND (s.source = 'pos' OR s.source IS NULL OR s.online_order_id IS NULL)";
    }
    
    if (search.length > 0) {
      query += ' AND (s.invoice_number LIKE ? OR s.invoice_serial LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }
    
    query += ` ORDER BY s.created_at DESC LIMIT ${limit}`;
    
    const [sales] = await pool.execute(query, params);
    res.json(sales);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/invoices', authenticateToken, async (req: any, res: Response) => {
  try {
    const fallbackShopId = Number(req.user?.shop_id || req.user?.shopId || 1);
    const resolvedShopId = Number(resolveShopId(req) || fallbackShopId);
    const shopId = Number.isFinite(resolvedShopId) && resolvedShopId > 0 ? resolvedShopId : 1;

    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 500) : 50;
    const sourceFilter = String(req.query.source || 'all').toLowerCase();
    const search = String(req.query.search || req.query.q || '').trim();
    let branchId = resolveBranchId(req);
    if (!branchId && shopId) {
      const [def] = await pool.execute('SELECT default_branch_id FROM shops WHERE id = ?', [shopId]);
      branchId = (def as any[])[0]?.default_branch_id ?? null;
    }

    let query = `
      SELECT s.*, u.username as cashier_name,
             sh.business_name, sh.owner_name, sh.activity_type, sh.address, sh.contact_email, sh.contact_phone, sh.logo_url
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN shops sh ON s.shop_id = sh.id
      WHERE s.shop_id = ?
    `;
    const params: any[] = [shopId];
    if (branchId) {
      query += ' AND s.branch_id = ?';
      params.push(branchId);
    }

    if (sourceFilter === 'online') {
      query += " AND (s.source = 'online' OR s.online_order_id IS NOT NULL)";
    } else if (sourceFilter === 'pos') {
      query += " AND (s.source = 'pos' OR s.source IS NULL OR s.online_order_id IS NULL)";
    }
    if (search.length > 0) {
      query += ' AND (s.invoice_number LIKE ? OR s.invoice_serial LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }
    query += ` ORDER BY s.created_at DESC LIMIT ${limit}`;
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

    const shopId = Number(resolveShopId(req) || 1);
    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required' });
    }
    const [sales] = await pool.execute('SELECT * FROM sales WHERE id = ? AND shop_id = ?', [saleId, shopId]);
    const saleArray = sales as any[];
    if (saleArray.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const [items] = await pool.execute(
      `SELECT si.*, p.name_en, p.name_ar, p.barcode, p.sku
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [saleId]
    );
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// (cleaned)
app.get('/api/vault/summary', authenticateToken, requireRole('super_admin', 'shop_owner', 'cashier'), async (req: any, res: Response) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required' });
    }

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
    const shopId = resolveShopId(req);
    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required' });
    }
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
    const shopId = resolveShopId(req);
    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required' });
    }

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

// (cleaned)
app.get('/api/audit-logs', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required' });
    }
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
    const shopId = resolveShopId(req);
    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required' });
    }

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

// ========== DASHBOARD STATISTICS ==========
app.get('/api/dashboard/stats', authenticateToken, requirePackageFeature('dashboard'), async (req: any, res: Response) => {
  try {
    const shopId = resolveShopId(req);
    let branchId = resolveBranchId(req);
    if (!branchId && shopId) {
      const [def] = await pool.execute('SELECT default_branch_id FROM shops WHERE id = ?', [shopId]);
      branchId = (def as any[])[0]?.default_branch_id ?? null;
    }

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (shopId) {
      whereClause += ' AND s.shop_id = ?';
      params.push(shopId);
    } else if (req.user.role !== 'super_admin') {
      return res.status(400).json({ error: 'shopId is required' });
    }
    if (branchId) {
      whereClause += ' AND s.branch_id = ?';
      params.push(branchId);
    }

    // Monthly revenue (POS only, like reports summary)
    const [revenue] = await pool.execute(
      `
      SELECT COALESCE(SUM(s.total_amount), 0) as monthly_revenue 
      FROM sales s 
      ${whereClause}
      AND (s.source = 'pos' OR s.source IS NULL)
      AND MONTH(s.created_at) = MONTH(CURRENT_DATE())
      AND YEAR(s.created_at) = YEAR(CURRENT_DATE())
      `,
      params
    );

    // Monthly confirmed/complete online revenue (same rules as reports + analytics)
    let onlineWhere = 'WHERE 1=1';
    const onlineParams: any[] = [];
    if (shopId) {
      onlineWhere += ' AND o.shop_id = ?';
      onlineParams.push(shopId);
    }
    if (branchId) {
      onlineWhere += ' AND o.branch_id = ?';
      onlineParams.push(branchId);
    }
    const [onlineRevenueRows] = await pool.execute(
      `
      SELECT COALESCE(SUM(o.total), 0) as monthly_online
      FROM online_orders o
      ${onlineWhere}
      AND o.status IN ('confirmed', 'completed')
      AND MONTH(o.created_at) = MONTH(CURRENT_DATE())
      AND YEAR(o.created_at) = YEAR(CURRENT_DATE())
      `,
      onlineParams
    );
    const monthlyPos = Number((revenue as any[])[0]?.monthly_revenue || 0);
    const monthlyOnline = Number((onlineRevenueRows as any[])[0]?.monthly_online || 0);
    const monthlyCombined = monthlyPos + monthlyOnline;
    
    // Total products
    let productQuery = 'SELECT COUNT(*) as total_products FROM products';
    const productParams: any[] = [];
    if (shopId) {
      productQuery += ' WHERE shop_id = ?';
      productParams.push(shopId);
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
    
    res.json({
      monthlyRevenue: monthlyCombined,
      totalProducts: (products as any[])[0]?.total_products || 0,
      lowStockCount: (lowStock as any[])[0]?.low_stock_count || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/sales-chart', authenticateToken, requirePackageFeature('dashboard'), async (req: any, res: Response) => {
  try {
    const shopId = resolveShopId(req);
    let branchId = resolveBranchId(req);
    if (!branchId && shopId) {
      const [def] = await pool.execute('SELECT default_branch_id FROM shops WHERE id = ?', [shopId]);
      branchId = (def as any[])[0]?.default_branch_id ?? null;
    }
    const days = parseInt(req.query.days as string) || 30;

    let whereClause = '';
    const params: any[] = [days];
    if (shopId) {
      whereClause = 'AND s.shop_id = ?';
      params.push(shopId);
    }
    if (branchId) {
      whereClause += ' AND s.branch_id = ?';
      params.push(branchId);
    }
    if (!shopId && req.user.role !== 'super_admin') {
      return res.status(400).json({ error: 'shopId is required' });
    }

    const [chartData] = await pool.execute(`
      SELECT 
        DATE(s.created_at) as date,
        COALESCE(SUM(s.total_amount), 0) as revenue,
        COUNT(s.id) as transactions
      FROM sales s
      WHERE (s.source = 'pos' OR s.source IS NULL)
        AND s.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
      ${whereClause}
      GROUP BY DATE(s.created_at)
      ORDER BY date ASC
    `, params);
    
    res.json(chartData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dashboard/profit-chart', authenticateToken, requirePackageFeature('dashboard'), async (req: any, res: Response) => {
  try {
    const shopId = resolveShopId(req);
    const days = parseInt(req.query.days as string) || 30;
    
    let whereClause = '';
    const params: any[] = [days];
    
    if (shopId) {
      whereClause = 'AND s.shop_id = ?';
      params.push(shopId);
    } else if (req.user.role !== 'super_admin') {
      return res.status(400).json({ error: 'shopId is required' });
    }
    
    const [profitData] = await pool.execute(`
      SELECT 
        DATE(s.created_at) as date,
        SUM(s.total_amount) as revenue,
        SUM((si.unit_price - p.buy_price) * si.quantity) as profit
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      WHERE s.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
      ${whereClause}
      GROUP BY DATE(s.created_at)
      ORDER BY date ASC
    `, params);
    
    res.json(profitData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ANALYTICS ==========
app.get('/api/admin/analytics/summary', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ANALYTICS] /api/admin/analytics/summary', {
        from: req.query.from,
        to: req.query.to,
        userId: req.user?.id,
        role: req.user?.role,
      });
    }
    const shopId = await resolveShopIdSafe(req);
    if (!shopId) return res.json({ ok: true, pos: { amount: 0, count: 0 }, online: { amount: 0, count: 0 }, combined: { amount: 0, count: 0 } });
    const from = String(req.query.from || '').trim() || new Date().toISOString().slice(0, 10);
    const to = String(req.query.to || '').trim() || from;

    const posShopFilter = ' AND s.shop_id = ?';
    const onlineShopFilter = ' AND o.shop_id = ?';
    const params = [from, to, shopId];

    const [posRows] = await pool.execute(
      `SELECT COALESCE(SUM(s.total_amount), 0) as amount, COUNT(s.id) as count FROM sales s
       WHERE (s.source = 'pos' OR s.source IS NULL) AND DATE(s.created_at) BETWEEN ? AND ?${posShopFilter}`,
      params
    );
    const pos = (posRows as any[])[0] || { amount: 0, count: 0 };

    const [onlineRows] = await pool.execute(
      `SELECT COALESCE(SUM(o.total), 0) as amount, COUNT(o.id) as count FROM online_orders o
       WHERE o.status IN ('confirmed', 'completed') AND DATE(o.created_at) BETWEEN ? AND ?${onlineShopFilter}`,
      params
    );
    const online = (onlineRows as any[])[0] || { amount: 0, count: 0 };

    const posAmount = Number(pos.amount);
    const posCount = Number(pos.count);
    const onlineAmount = Number(online.amount);
    const onlineCount = Number(online.count);

    res.json({
      ok: true,
      pos: { amount: posAmount, count: posCount, total: posAmount },
      online: { amount: onlineAmount, count: onlineCount, total: onlineAmount },
      combined: { amount: posAmount + onlineAmount, count: posCount + onlineCount, total: posAmount + onlineAmount },
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message || 'Server error' });
  }
});

app.get('/api/admin/analytics/timeseries', authenticateToken, requireRole('super_admin', 'shop_owner'), async (req: any, res: Response) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[ANALYTICS] /api/admin/analytics/timeseries', {
        from: req.query.from,
        to: req.query.to,
        bucket: req.query.bucket,
        source: req.query.source,
        userId: req.user?.id,
        role: req.user?.role,
      });
    }
    const shopId = await resolveShopIdSafe(req);
    if (!shopId) return res.json({ ok: true, points: [] });
    const from = String(req.query.from || '').trim() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = String(req.query.to || '').trim() || new Date().toISOString().slice(0, 10);
    const bucket = String(req.query.bucket || 'day').toLowerCase();
    const source = String(req.query.source || 'all').toLowerCase();
    const dateExprS = bucket === 'month' ? "DATE_FORMAT(s.created_at, '%Y-%m-01')" : bucket === 'week' ? "DATE(DATE_SUB(s.created_at, INTERVAL WEEKDAY(s.created_at) DAY))" : 'DATE(s.created_at)';
    const dateExprO = bucket === 'month' ? "DATE_FORMAT(o.created_at, '%Y-%m-01')" : bucket === 'week' ? "DATE(DATE_SUB(o.created_at, INTERVAL WEEKDAY(o.created_at) DAY))" : 'DATE(o.created_at)';
    const posShopFilter = ' AND s.shop_id = ?';
    const onlineShopFilter = ' AND o.shop_id = ?';
    const p = [from, to, shopId];

    const byDate = new Map<string, { posAmount: number; posCount: number; onlineAmount: number; onlineCount: number }>();

    if (source === 'pos' || source === 'all') {
      const [rows] = await pool.execute(
        `SELECT ${dateExprS} as dateKey, COALESCE(SUM(s.total_amount), 0) as posAmount, COUNT(s.id) as posCount
         FROM sales s
         WHERE (s.source = 'pos' OR s.source IS NULL) AND DATE(s.created_at) BETWEEN ? AND ?${posShopFilter}
         GROUP BY ${dateExprS} ORDER BY dateKey ASC`,
        p
      );
      for (const r of rows as any[]) {
        const d = String(r.dateKey).slice(0, 10);
        const existing = byDate.get(d) || { posAmount: 0, posCount: 0, onlineAmount: 0, onlineCount: 0 };
        existing.posAmount = Number(r.posAmount ?? 0);
        existing.posCount = Number(r.posCount ?? 0);
        byDate.set(d, existing);
      }
    }
    if (source === 'online' || source === 'all') {
      const [rows] = await pool.execute(
        `SELECT ${dateExprO} as dateKey, COALESCE(SUM(o.total), 0) as onlineAmount, COUNT(o.id) as onlineCount
         FROM online_orders o
         WHERE o.status IN ('confirmed', 'completed') AND DATE(o.created_at) BETWEEN ? AND ?${onlineShopFilter}
         GROUP BY ${dateExprO} ORDER BY dateKey ASC`,
        p
      );
      for (const r of rows as any[]) {
        const d = String(r.dateKey).slice(0, 10);
        const existing = byDate.get(d) || { posAmount: 0, posCount: 0, onlineAmount: 0, onlineCount: 0 };
        existing.onlineAmount = Number(r.onlineAmount ?? 0);
        existing.onlineCount = Number(r.onlineCount ?? 0);
        byDate.set(d, existing);
      }
    }

    const allDates = new Set<string>();
    for (const d of byDate.keys()) allDates.add(d);
    const sortedDates = Array.from(allDates).sort();
    const points = sortedDates.map((date) => {
      const v = byDate.get(date) || { posAmount: 0, posCount: 0, onlineAmount: 0, onlineCount: 0 };
      const totalAmount = v.posAmount + v.onlineAmount;
      const totalCount = v.posCount + v.onlineCount;
      return {
        date,
        dateKey: date,
        posAmount: v.posAmount,
        posCount: v.posCount,
        onlineAmount: v.onlineAmount,
        onlineCount: v.onlineCount,
        totalAmount,
        totalCount,
        total: totalAmount,
        count: totalCount,
      };
    });
    res.json({ ok: true, points });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message || 'Server error' });
  }
});

// ========== ADMIN REPORTS ==========
app.get('/api/admin/reports/transactions', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager'), async (req: any, res: Response) => {
  try {
    const shopId = await resolveShopIdSafe(req);
    if (!shopId) return res.json({ ok: true, items: [] });
    const branchIds = await getBranchManagerBranchIds(req);
    const from = String(req.query.from || '').trim() || new Date().toISOString().slice(0, 10);
    const to = String(req.query.to || '').trim() || from;
    const source = String(req.query.source || '').toLowerCase();
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || 50), 10) || 50));
    const offset = Math.max(0, parseInt(String(req.query.offset || 0), 10) || 0);

    const posShopFilter = shopId ? ' AND s.shop_id = ?' : '';
    const posBranchFilter = branchIds?.length ? ` AND s.branch_id IN (${branchIds.map(() => '?').join(',')})` : '';
    const onlineShopFilter = shopId ? ' AND o.shop_id = ?' : '';
    const onlineBranchFilter = branchIds?.length ? ` AND o.branch_id IN (${branchIds.map(() => '?').join(',')})` : '';
    const posParams = shopId ? (branchIds?.length ? [from, to, shopId, ...branchIds] : [from, to, shopId]) : [from, to];
    const onlineParams = shopId ? (branchIds?.length ? [from, to, shopId, ...branchIds] : [from, to, shopId]) : [from, to];

    const rows: Array<{ id: string; type: 'pos' | 'online'; date: string; total: number; status?: string; invoiceId?: number; orderId?: number; publicCode?: string }> = [];

    if (source !== 'online') {
      const [posRows] = await pool.execute(
        `SELECT s.id, s.created_at, s.total_amount, s.invoice_number
         FROM sales s WHERE (s.source = 'pos' OR s.source IS NULL) AND DATE(s.created_at) BETWEEN ? AND ?${posShopFilter}${posBranchFilter}
         ORDER BY s.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        posParams
      );
      for (const r of posRows as any[]) {
        rows.push({
          id: String(r.id),
          type: 'pos',
          date: String(r.created_at).slice(0, 19),
          total: Number(r.total_amount),
          invoiceId: r.id,
        });
      }
    }
    if (source !== 'pos') {
      const [onlineRows] = await pool.execute(
        `SELECT o.id, o.created_at, o.total, o.status, o.public_code
         FROM online_orders o WHERE o.status IN ('confirmed', 'completed') AND DATE(o.created_at) BETWEEN ? AND ?${onlineShopFilter}${onlineBranchFilter}
         ORDER BY o.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        onlineParams
      );
      for (const r of onlineRows as any[]) {
        rows.push({
          id: `o-${r.id}`,
          type: 'online',
          date: String(r.created_at).slice(0, 19),
          total: Number(r.total),
          status: r.status,
          orderId: r.id,
          publicCode: r.public_code,
        });
      }
    }

    rows.sort((a, b) => b.date.localeCompare(a.date));
    res.json({ ok: true, items: rows.slice(0, limit) });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') console.error('[reports] transactions SQL error:', (error as any)?.message);
    res.status(500).json({ ok: false, error: String((error as any)?.message || 'Server error') });
  }
});

// ========== DEAD/SLOW STOCK ==========
const clampIntSlow = (val: unknown, min: number, max: number, def: number): number => {
  const n = typeof val === 'number' && Number.isFinite(val) ? Math.floor(val) : parseInt(String(val ?? def), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

app.get('/api/admin/inventory/slow-moving/summary', authenticateToken, requireRole('super_admin', 'shop_owner', 'warehouse', 'branch_manager', 'multi_branch_manager'), async (req: any, res: Response) => {
  try {
    const shopId = await resolveShopIdSafe(req);
    if (!shopId) return res.json({ ok: true, days: 120, threshold: 2, deadCount: 0, slowCount: 0, deadValue: 0, slowValue: 0, bucketCounts: {} });
    const days = clampIntSlow(req.query.days, 7, 365, 120);
    const threshold = clampIntSlow(req.query.threshold, 0, 20, 2);
    const posShopFilter = ' AND s.shop_id = ?';
    const onlineShopFilter = ' AND o.shop_id = ?';

    const [rows] = await pool.execute(
      `SELECT p.id, p.stock_quantity, p.sell_price, p.buy_price, p.name_en, p.name_ar,
        COALESCE(pos_sold.sold, 0) + COALESCE(online_sold.sold, 0) AS soldQtyWindow,
        GREATEST(pos_sold.last_sold, online_sold.last_sold) AS lastSoldAt
       FROM products p
       LEFT JOIN (
         SELECT si.product_id, SUM(si.quantity) AS sold, MAX(s.created_at) AS last_sold
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id AND (s.source = 'pos' OR s.source IS NULL)
         WHERE s.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)${posShopFilter}
         GROUP BY si.product_id
       ) pos_sold ON pos_sold.product_id = p.id
       LEFT JOIN (
         SELECT oi.product_id, SUM(oi.quantity) AS sold, MAX(o.created_at) AS last_sold
         FROM online_order_items oi
         JOIN online_orders o ON o.id = oi.order_id AND o.status IN ('confirmed', 'completed')
         WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)${onlineShopFilter}
         GROUP BY oi.product_id
       ) online_sold ON online_sold.product_id = p.id
       WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL) AND p.shop_id = ?`,
      [days, shopId, days, shopId, shopId]
    );

    let deadCount = 0; let slowCount = 0; let deadValue = 0; let slowValue = 0;
    const buckets: Record<string, number> = { '0_30': 0, '31_90': 0, '91_180': 0, '180_plus': 0, 'never_sold': 0 };

    for (const r of rows as any[]) {
      const sold = Number(r.soldQtyWindow || 0);
      const stock = Number(r.stock_quantity || 0);
      const costOrPrice = Number(r.buy_price ?? r.sell_price ?? 0);
      const tiedVal = stock * costOrPrice;
      const lastSold = r.lastSoldAt ? new Date(r.lastSoldAt) : null;
      const daysSince = lastSold ? Math.floor((Date.now() - lastSold.getTime()) / 86400000) : null;
      const bucket = daysSince === null ? 'never_sold' : daysSince <= 30 ? '0_30' : daysSince <= 90 ? '31_90' : daysSince <= 180 ? '91_180' : '180_plus';
      buckets[bucket] = (buckets[bucket] || 0) + 1;

      if (sold === 0) { deadCount++; deadValue += tiedVal; }
      else if (sold <= threshold) { slowCount++; slowValue += tiedVal; }
    }

    if (shopId) void maybeCreateDeadStockAlert(shopId, deadCount, slowCount);

    res.json({
      ok: true, days, threshold,
      deadCount, slowCount, deadValue, slowValue,
      bucketCounts: buckets,
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message || 'Server error' });
  }
});

app.get('/api/admin/inventory/slow-moving', authenticateToken, requireRole('super_admin', 'shop_owner', 'warehouse', 'branch_manager', 'multi_branch_manager'), async (req: any, res: Response) => {
  try {
    const shopId = await resolveShopIdSafe(req);
    if (!shopId) return res.json({ ok: true, items: [], nextOffset: null });
    const days = clampIntSlow(req.query.days, 7, 365, 120);
    const threshold = clampIntSlow(req.query.threshold, 0, 20, 2);
    const type = String(req.query.type || 'all').toLowerCase();
    const limit = clampIntSlow(req.query.limit, 1, 100, 20);
    const offset = clampIntSlow(req.query.offset, 0, 10000, 0);
    const q = String(req.query.q || '').trim();
    const bucketFilter = String(req.query.bucket || '').trim();

    const posShopFilter = ' AND s.shop_id = ?';
    const onlineShopFilter = ' AND o.shop_id = ?';
    const params: (string | number)[] = [days, shopId, days, shopId, shopId];
    let whereExtra = '';
    if (q) {
      const escaped = String(q).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      whereExtra += ` AND (p.name_en LIKE ? OR p.name_ar LIKE ? OR p.sku LIKE ?)`;
      const qp = `%${escaped}%`;
      params.push(qp, qp, qp);
    }

    const [rows] = await pool.execute(
      `SELECT p.id AS productId, p.name_en AS name, p.name_ar AS nameAr, p.sku, c.name_en AS categoryEn, c.name_ar AS categoryAr,
        p.stock_quantity AS stock, p.sell_price AS price, p.buy_price AS costPrice,
        COALESCE(pos_sold.sold, 0) + COALESCE(online_sold.sold, 0) AS soldQtyWindow,
        GREATEST(pos_sold.last_sold, online_sold.last_sold) AS lastSoldAt
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN (
         SELECT si.product_id, SUM(si.quantity) AS sold, MAX(s.created_at) AS last_sold
         FROM sale_items si JOIN sales s ON s.id = si.sale_id AND (s.source = 'pos' OR s.source IS NULL)
         WHERE s.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)${posShopFilter}
         GROUP BY si.product_id
       ) pos_sold ON pos_sold.product_id = p.id
       LEFT JOIN (
         SELECT oi.product_id, SUM(oi.quantity) AS sold, MAX(o.created_at) AS last_sold
         FROM online_order_items oi JOIN online_orders o ON o.id = oi.order_id AND o.status IN ('confirmed', 'completed')
         WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)${onlineShopFilter}
         GROUP BY oi.product_id
       ) online_sold ON online_sold.product_id = p.id
       WHERE (p.is_deleted = 0 OR p.is_deleted IS NULL) AND p.shop_id = ?${whereExtra}`حدث خطأ. حاول مرة أخرى.`SELECT id FROM notifications WHERE shop_id = ? AND source = 'system' AND type = 'dead_stock_alert'حدث خطأ. حاول مرة أخرى.'system', 'dead_stock_alert', ?, ?, ?, ?, 0, ?)`حدث خطأ. حاول مرة أخرى.` AND s.branch_id IN (${branchIds.map(() => '?').join(',')})` : '';
    const onlineShopFilter = shopId ? ' AND o.shop_id = ?' : '';
    const onlineBranchFilter = branchIds?.length ? ` AND o.branch_id IN (${branchIds.map(() => '?').join(',')})` : '';
    const baseP = shopId ? [from, to, shopId] : [from, to];
    const p = branchIds?.length ? [...baseP, ...branchIds] : baseP;

    let posRevenue = 0; let posCount = 0;
    let onlineRevenue = 0; let onlineCount = 0;
    const statusBreakdown = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };

    if (source !== 'online') {
      const [posRows] = await pool.execute(
        `SELECT COALESCE(SUM(s.total_amount), 0) AS rev, COUNT(*) AS cnt FROM sales s
         WHERE (s.source = 'pos' OR s.source IS NULL) AND DATE(s.created_at) BETWEEN ? AND ?${posShopFilter}${posBranchFilter}`,
        p
      );
      posRevenue = Number((posRows as any[])[0]?.rev ?? 0);
      posCount = Number((posRows as any[])[0]?.cnt ?? 0);
    }

    if (source !== 'pos') {
      const [onlineRows] = await pool.execute(
        `SELECT o.status, COALESCE(SUM(o.total), 0) AS rev, COUNT(*) AS cnt FROM online_orders o
         WHERE DATE(o.created_at) BETWEEN ? AND ?${onlineShopFilter}${onlineBranchFilter} GROUP BY o.status`,
        p
      );
      for (const r of onlineRows as any[]) {
        const s = String(r.status || '').toLowerCase();
        if (s in statusBreakdown) (statusBreakdown as any)[s] = Number(r.cnt ?? 0);
        if (s === 'confirmed' || s === 'completed') {
          onlineRevenue += Number(r.rev ?? 0);
          onlineCount += Number(r.cnt ?? 0);
        }
      }
    }

    const totalRevenue = posRevenue + onlineRevenue;
    const totalCount = posCount + onlineCount;

    const [dailyRows] = await pool.execute(
      `SELECT ${dateExprS} AS dt, COALESCE(SUM(s.total_amount), 0) AS pos
       FROM sales s WHERE (s.source = 'pos' OR s.source IS NULL) AND DATE(s.created_at) BETWEEN ? AND ?${posShopFilter}${posBranchFilter}
       GROUP BY ${dateExprS} ORDER BY dt`,
      p
    );
    const [dailyOnline] = await pool.execute(
      `SELECT ${dateExprO} AS dt, COALESCE(SUM(CASE WHEN o.status IN ('confirmed','completed') THEN o.total ELSE 0 END), 0) AS onlineRev
       FROM online_orders o WHERE DATE(o.created_at) BETWEEN ? AND ?${onlineShopFilter}${onlineBranchFilter}
       GROUP BY ${dateExprO} ORDER BY dt`,
      p
    );
    const byDate = new Map<string, { date: string; pos: number; onlineConfirmed: number; total: number }>();
    for (const r of dailyRows as any[]) {
      const d = String(r.dt).slice(0, 10);
      byDate.set(d, { date: d, pos: Number(r.pos ?? 0), onlineConfirmed: 0, total: Number(r.pos ?? 0) });
    }
    for (const r of dailyOnline as any[]) {
      const d = String(r.dt).slice(0, 10);
      const onl = Number(r.onlineRev ?? 0);
      const existing = byDate.get(d) || { date: d, pos: 0, onlineConfirmed: 0, total: 0 };
      existing.onlineConfirmed = onl;
      existing.total = existing.pos + onl;
      byDate.set(d, existing);
    }
    const dailyRevenue = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));

    const [profitRows] = await pool.execute(
      `SELECT ${dateExprS} AS dt, SUM((si.unit_price - COALESCE(p.buy_price, 0)) * si.quantity) AS profit
       FROM sales s JOIN sale_items si ON s.id = si.sale_id JOIN products p ON p.id = si.product_id
       WHERE (s.source = 'pos' OR s.source IS NULL) AND DATE(s.created_at) BETWEEN ? AND ?${posShopFilter}${posBranchFilter}
       GROUP BY ${dateExprS} ORDER BY dt`,
      p
    );
    let profitAvailable = !isBranchManager && (profitRows as any[]).length > 0;
    const dailyProfit = (profitRows as any[]).map((r: any) => ({ date: String(r.dt).slice(0, 10), profit: Number(r.profit ?? 0) }));

    const [topPos] = await pool.execute(
      `SELECT si.product_id AS productId, p.name_en AS name, p.sku, SUM(si.quantity) AS qty, SUM(si.total_price) AS revenue
       FROM sale_items si JOIN sales s ON s.id = si.sale_id JOIN products p ON p.id = si.product_id
       WHERE (s.source = 'pos' OR s.source IS NULL) AND DATE(s.created_at) BETWEEN ? AND ?${posShopFilter}${posBranchFilter}
       GROUP BY si.product_id ORDER BY revenue DESC LIMIT 20`,
      p
    );
    const [topOnline] = await pool.execute(
      `SELECT oi.product_id AS productId, p.name_en AS name, p.sku, SUM(oi.quantity) AS qty, SUM(oi.quantity * oi.sell_price_snapshot) AS revenue
       FROM online_order_items oi JOIN online_orders o ON o.id = oi.order_id AND o.status IN ('confirmed','completed')
       JOIN products p ON p.id = oi.product_id
       WHERE DATE(o.created_at) BETWEEN ? AND ?${onlineShopFilter}${onlineBranchFilter}
       GROUP BY oi.product_id ORDER BY revenue DESC LIMIT 20`حدث خطأ. حاول مرة أخرى.`SELECT p.id, p.name_en, p.name_ar, p.sku, p.stock_quantity, p.sell_price, p.buy_price,
          COALESCE(ps.sold, 0) + COALESCE(os.sold, 0) AS sold,
          GREATEST(ps.last_sold, os.last_sold) AS lastSold
         FROM products p
         LEFT JOIN (SELECT si.product_id, SUM(si.quantity) AS sold, MAX(s.created_at) AS last_sold FROM sale_items si JOIN sales s ON s.id = si.sale_id AND (s.source = 'pos' OR s.source IS NULL) WHERE s.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)${posShopFilter} GROUP BY si.product_id) ps ON ps.product_id = p.id
         LEFT JOIN (SELECT oi.product_id, SUM(oi.quantity) AS sold, MAX(o.created_at) AS last_sold FROM online_order_items oi JOIN online_orders o ON o.id = oi.order_id AND o.status IN ('confirmed','completed') WHERE o.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)${onlineShopFilter} GROUP BY oi.product_id) os ON os.product_id = p.id
         WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)`,
        [days, shopId, days, shopId, shopId]
      ),
    ]);
    const rows = (listRes[0] as any[]);
    let deadCount = 0; let slowCount = 0; let deadValue = 0; let slowValue = 0;
    const buckets: Record<string, number> = { '0_30': 0, '31_90': 0, '91_180': 0, '180_plus': 0, 'never_sold': 0 };
    const items: any[] = [];
    for (const r of rows) {
      const sold = Number(r.sold || 0);
      const isDead = sold === 0; const isSlow = sold > 0 && sold <= threshold;
      if (!isDead && !isSlow) continue;
      const stock = Number(r.stock_quantity || 0);
      const costOrPrice = Number(r.buy_price ?? r.sell_price ?? 0);
      const tiedValue = stock * costOrPrice;
      const lastSold = r.lastSold ? new Date(r.lastSold) : null;
      const daysSince = lastSold ? Math.floor((Date.now() - lastSold.getTime()) / 86400000) : null;
      const bucket = daysSince === null ? 'never_sold' : daysSince <= 30 ? '0_30' : daysSince <= 90 ? '31_90' : daysSince <= 180 ? '91_180' : '180_plus';
      buckets[bucket] = (buckets[bucket] || 0) + 1;
      if (isDead) { deadCount++; deadValue += tiedValue; } else { slowCount++; slowValue += tiedValue; }
      items.push({ ...r, tiedValue, lastSoldAt: r.lastSold ? String(r.lastSold).slice(0, 19) : null, soldQtyWindow: sold, daysSinceLastSale: daysSince, bucket });
    }
    items.sort((a, b) => b.tiedValue - a.tiedValue);
    res.json({ ok: true, days, threshold, summary: { deadCount, slowCount, deadValue, slowValue, buckets }, items: items.slice(0, 50) });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error?.message || 'Server error' });
  }
});

// ========== SHOP PUBLIC PROFILE ==========
app.get('/api/shop/public', async (req: Request, res: Response) => {
  try {
    const domain = String(req.query.domain || '').trim();
    const shopIdParam = req.query.shopId;
    let shopId: number | null = null;

    if (shopIdParam && Number.isFinite(Number(shopIdParam))) {
      shopId = Number(shopIdParam);
    } else if (domain) {
      const [rows] = await pool.execute(
        `SELECT d.shop_id FROM domains d WHERE d.domain = ? AND d.is_active = 1 AND d.status = 'active' LIMIT 1`,
        [domain.toLowerCase()]
      );
      const row = (rows as any[])[0];
      shopId = row ? Number(row.shop_id) : null;
    }

    if (!shopId || shopId <= 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const [shops] = await pool.execute(
      "SELECT id, name, business_name, activity_type, currency_symbol, package FROM shops WHERE id = ? AND package IN ('gold', 'branches')",
      [shopId]
    );
    const shop = (shops as any[])[0];
    if (!shop) {
      return res.status(404).json({ error: 'Storefront not available' });
    }
    res.json({
      shopId: shop.id,
      shopName: shop.business_name || shop.name,
      businessType: shop.activity_type || 'default',
      currencySymbol: shop.currency_symbol || 'ج.م',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PRODUCTS PUBLIC ==========
app.get('/api/products/public', async (req: Request, res: Response) => {
  try {
    const shopId = Number(req.query.shopId || 0);
    if (!Number.isFinite(shopId) || shopId <= 0) {
      return res.status(400).json({ error: 'shopId is required' });
    }
    await expireOldReservations(shopId);
    const [products] = await pool.execute(
      `SELECT p.id, p.name_en, p.name_ar, p.sku, p.brand, p.sell_price, p.stock_quantity,
        GREATEST(0, COALESCE(p.stock_quantity, 0) - COALESCE((
          SELECT SUM(r.qty) FROM stock_reservations r
          WHERE r.product_id = p.id AND r.shop_id = p.shop_id AND r.status = 'reserved'
        ), 0)) as available_stock,
        p.image_url, c.name_en as category_name_en, c.name_ar as category_name_ar
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
       ORDER BY p.created_at DESC`حدث خطأ. حاول مرة أخرى.`SELECT COALESCE(p.stock_quantity, 0) - COALESCE((
      SELECT SUM(r.qty) FROM stock_reservations r
      WHERE r.product_id = ? AND r.shop_id = ? AND r.status = 'reserved'
    ), 0) AS available
    FROM products p WHERE p.id = ? AND p.shop_id = ?`,
    [productId, shopId, productId, shopId]
  );
  const available = (rows as any[])[0]?.available ?? 0;
  return Math.max(0, Number(available));
}

async function reserveStockForOrder(conn: any, shopId: number, orderId: number, items: Array<{ productId: number; quantity: number }>): Promise<void> {
  for (const it of items) {
    const available = await getAvailableStock(conn, shopId, it.productId);
    if (available < it.quantity) {
      throw new Error(`Insufficient stock for product ${it.productId}: available ${available}, needed ${it.quantity}`);
    }
  }
  for (const it of items) {
    await conn.execute(
      'INSERT INTO stock_reservations (shop_id, order_id, product_id, qty, status) VALUES (?, ?, ?, ?, ?)',
      [shopId, orderId, it.productId, it.quantity, 'reserved']
    );
  }
}

async function finalizeReservation(conn: any, shopId: number, orderId: number): Promise<void> {
  const [rows] = await conn.execute(
    'SELECT product_id, qty FROM stock_reservations WHERE order_id = ? AND shop_id = ? AND status = ?',
    [orderId, shopId, 'reserved']
  );
  for (const r of rows as any[]) {
    await conn.execute('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND shop_id = ?', [
      r.qty,
      r.product_id,
      shopId,
    ]);
    await conn.execute(
      "UPDATE stock_reservations SET status = 'finalized' WHERE order_id = ? AND product_id = ? AND shop_id = ?",
      [orderId, r.product_id, shopId]
    );
  }
}

async function releaseReservation(conn: any, shopId: number, orderId: number): Promise<void> {
  await conn.execute(
    "UPDATE stock_reservations SET status = 'released' WHERE order_id = ? AND shop_id = ? AND status = 'reserved'",
    [orderId, shopId]
  );
}

async function expireOldReservations(shopId?: number): Promise<number> {
  const conn = await pool.getConnection();
  try {
    const cutoff = new Date(Date.now() - RESERVATION_TIMEOUT_MINUTES * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    let where = "o.status = 'pending' AND o.created_at < ?";
    const params: (number | string)[] = [cutoff];
    if (shopId) {
      where += ' AND o.shop_id = ?';
      params.push(shopId);
    }
    const [orders] = await conn.execute(
      `SELECT o.id, o.shop_id FROM online_orders o WHERE ${where}`حدث خطأ. حاول مرة أخرى.`,
              [shopId, titleAr, titleEn, bodyAr, bodyEn, JSON.stringify({ productId: it.productId, requested: it.quantity, available })]
            );
          } catch (_) {}
          return res.status(400).json({
            error: 'Insufficient stock. Product not available in requested quantity.',
            ar: 'حدث خطأ. حاول مرة أخرى.',
          });
        }
      }

      const paymentMethodCode = normalizePaymentMethod(paymentMethod);
      let publicCode = generatePublicCode();
      let tries = 0;
      while (tries < 5) {
        const [dup] = await conn.execute('SELECT id FROM online_orders WHERE public_code = ?', [publicCode]);
        if ((dup as any[]).length === 0) break;
        publicCode = generatePublicCode();
        tries++;
      }
      const [ordResult] = await conn.execute(
        `INSERT INTO online_orders (shop_id, status, order_status, customer_name, phone, governorate, city, address, notes, payment_method, subtotal, total, currency, source, public_code)
         VALUES (?, 'pending', 'NEW', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EGP', 'online'حدث خطأ. حاول مرة أخرى.'online', 'online_order_created', ?, ?, ?, ?, 0, ?)`,
        [shopId, titleAr, titleEn, bodyAr, bodyEn, JSON.stringify({ orderId, total, itemsCount, publicCode })]
      );
      if (process.env.NODE_ENV !== 'production') console.log('[notifications] INSERT online_order_created shopId=', shopId, 'orderId=', orderId);

      // Create payment record (VodafoneCash, InstaPay, Bank, COD etc.)
      const paymentMethodMap: Record<string, string> = {
        cod: 'COD',
        vodafone: 'VodafoneCash',
        vodafonecash: 'VodafoneCash',
        instapay: 'InstaPay',
        bank: 'Bank',
        transfer: 'Bank',
      };
      const methodKey = String(paymentMethodCode || '').toLowerCase();
      const paymentMethodName = paymentMethodMap[methodKey] || paymentMethodCode || 'COD';
      await conn.execute(
        `INSERT INTO payments (shop_id, order_id, method, amount, status) VALUES (?, ?, ?, ?, 'pending')`,
        [shopId, orderId, paymentMethodName, total]
      );

      await conn.commit();
      const trackingUrl = `/track?code=${encodeURIComponent(publicCode)}&phone=${encodeURIComponent(phoneStr)}`;
      res.status(201).json({
        orderId,
        publicCode,
        status: 'pending',
        total,
        trackingUrl,
        message: 'Order created',
        ar: 'حدث خطأ. حاول مرة أخرى.',
      });
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

// ========== STOREFRONT ORDER TRACKING (Public) ==========
app.get('/api/storefront/orders/track', async (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || '').trim().toUpperCase();
    const phone = String(req.query.phone || '').trim().replace(/\D/g, '');
    if (!code || code.length < 4) {
      return res.status(400).json({ ok: false, error: 'Tracking code required', ar: 'حدث خطأ. حاول مرة أخرى.' });
    }
    if (!phone || phone.length < 8) {
      return res.status(400).json({ ok: false, error: 'Phone required', ar: 'حدث خطأ. حاول مرة أخرى.' });
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
      return res.status(404).json({ ok: false, error: 'Order not found', ar: 'حدث خطأ. حاول مرة أخرى.' });
    }
    const [items] = await pool.execute(
      'SELECT * FROM online_order_items WHERE order_id = ?',
      [order.id]
    );
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
});

// ========== ADMIN ORDERS ==========
app.get('/api/admin/orders', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'), async (req: any, res: Response) => {
  try {
    let shopId = resolveShopId(req);
    if (shopId) await expireOldReservations(shopId);
    if (!shopId && req.user?.role === 'super_admin') {
      const [shops] = await pool.execute('SELECT id FROM shops ORDER BY id ASC LIMIT 1');
      shopId = (shops as any[])[0]?.id ?? null;
    }
    if (!shopId) return res.status(400).json({ ok: false, error: 'shopId is required' });
    const status = String(req.query.status || '').trim();
    let query = 'SELECT * FROM online_orders WHERE shop_id = ?';
    const params: any[] = [shopId];
    if (status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT 200';
    const [rows] = await pool.execute(query, params);
    res.json(rows || []);
  } catch (error: any) {
    res.status(500).json({ ok: false, error: String((error as any)?.message || 'Server error') });
  }
});

app.get('/api/admin/orders/:id', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'), async (req: any, res: Response) => {
  try {
    let shopId = resolveShopId(req);
    if (!shopId && req.user?.role === 'super_admin') {
      const [shops] = await pool.execute('SELECT id FROM shops ORDER BY id ASC LIMIT 1');
      shopId = (shops as any[])[0]?.id ?? null;
    }
    if (!shopId) return res.status(400).json({ ok: false, error: 'shopId is required' });
    const orderId = parseInt(req.params.id, 10);
    if (!Number.isFinite(orderId)) return res.status(400).json({ error: 'Invalid order id' });

    const [orders] = await pool.execute('SELECT * FROM online_orders WHERE id = ? AND shop_id = ?', [orderId, shopId]);
    const order = (orders as any[])[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const [items] = await pool.execute('SELECT * FROM online_order_items WHERE order_id = ?', [orderId]);
    res.json({ ...order, items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/orders/:id/status', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'), async (req: any, res: Response) => {
  try {
    let shopId = resolveShopId(req);
    if (!shopId && req.user?.role === 'super_admin') {
      const [shops] = await pool.execute('SELECT id FROM shops ORDER BY id ASC LIMIT 1');
      shopId = (shops as any[])[0]?.id ?? null;
    }
    if (!shopId) return res.status(400).json({ ok: false, error: 'shopId is required' });
    const orderId = parseInt(req.params.id, 10);
    if (!Number.isFinite(orderId)) return res.status(400).json({ error: 'Invalid order id' });
    const { status } = req.body;
    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (status === 'confirmed') {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [orders] = await conn.execute('SELECT * FROM online_orders WHERE id = ? AND shop_id = ?', [orderId, shopId]);
        const order = (orders as any[])[0];
        if (!order) {
          await conn.rollback();
          return res.status(404).json({ error: 'Order not found' });
        }

        const [items] = await conn.execute('SELECT * FROM online_order_items WHERE order_id = ?', [orderId]);
        for (const it of items as any[]) {
          const available = await getAvailableStock(conn, shopId, it.product_id);
          const qty = Number(it.quantity || 0);
          if (available < qty) {
            const [prods] = await conn.execute('SELECT name_en, name_ar FROM products WHERE id = ? AND shop_id = ?', [it.product_id, shopId]);
            const p = (prods as any[])[0];
            await conn.rollback();
            const msg = `حدث خطأ. حاول مرة أخرى.`;
            return res.status(400).json({ error: msg, ar: msgAr });
          }
        }

        await finalizeReservation(conn, shopId, orderId);

        const [lastInv] = await conn.execute(
          'SELECT MAX(invoice_number) as mx FROM online_invoices WHERE shop_id = ?',
          [shopId]
        );
        const nextNum = ((lastInv as any[])[0]?.mx ?? 0) + 1;

        const [invResult] = await conn.execute(
          `INSERT INTO online_invoices (shop_id, order_id, invoice_number, total, printed_count)
           VALUES (?, ?, ?, ?, 0)`,
          [shopId, orderId, nextNum, Number(order.total || 0)]
        );
        const invoiceId = (invResult as any).insertId;

        for (const it of items as any[]) {
          await conn.execute(
            `INSERT INTO online_invoice_items (invoice_id, product_id, name_snapshot, sku_snapshot, price_snapshot, quantity)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [invoiceId, it.product_id, it.name_snapshot, it.sku_snapshot, it.sell_price_snapshot, it.quantity]
          );
        }

        await conn.execute(
          'UPDATE online_orders SET status = ?, order_status = ? WHERE id = ? AND shop_id = ?',
          ['confirmed', 'PROCESSING'حدث خطأ. حاول مرة أخرى.'online', 'online_order_confirmed', ?, ?, ?, ?, 0, ?)`حدث خطأ. حاول مرة أخرى.`,
        [shopId, titleAr, titleEn, bodyAr, bodyEn, JSON.stringify({ orderId, invoiceId: (existingInv as any[])[0]?.id, total })]
      );
    }

    const [ordRows] = await pool.execute('SELECT status FROM online_orders WHERE id = ? AND shop_id = ?', [orderId, shopId]);
    const fromStatus = (ordRows as any[])[0]?.status ?? 'pending';
    const orderStatusMap: Record<string, string> = { pending: 'NEW', confirmed: 'PROCESSING', completed: 'DELIVERED', cancelled: 'CANCELLED' };
    const orderStatus = orderStatusMap[status] || status;
    const [result] = await pool.execute(
      'UPDATE online_orders SET status = ?, order_status = ? WHERE id = ? AND shop_id = ?',
      [status, orderStatus, orderId, shopId]
    );
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found'حدث خطأ. حاول مرة أخرى.'confirmed') {
      try {
        await pool.execute('UPDATE payments SET status = ? WHERE order_id = ? AND shop_id = ?', ['confirmed', orderId, shopId]);
        await pool.execute('UPDATE online_orders SET payment_status = ? WHERE id = ? AND shop_id = ?', ['confirmed'حدث خطأ. حاول مرة أخرى.'online', 'online_order_status_changed', ?, ?, ?, ?, 0, ?)`حدث خطأ. حاول مرة أخرى.`
      SELECT o.*, b.name as branch_name, b.name_ar as branch_name_ar, b.name_en as branch_name_en
      FROM online_orders o
      LEFT JOIN branches b ON b.id = o.branch_id
      WHERE o.shop_id = ?
    `;
    const params: any[] = [shopId];
    if (branchIds && branchIds.length > 0) {
      query += ' AND (o.branch_id IS NULL OR o.branch_id IN (' + branchIds.map(() => '?').join(',') + '))';
      params.push(...branchIds);
    }
    if (branchId) {
      query += ' AND (o.branch_id IS NULL OR o.branch_id = ?)';
      params.push(branchId);
    }
    if (status && ['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      query += ' AND o.status = ?';
      params.push(status);
    }
    if (paymentStatus && ['pending', 'confirmed', 'rejected', 'refunded'].includes(paymentStatus)) {
      query += ' AND (o.payment_status = ? OR (o.payment_status IS NULL AND ? = ?))';
      params.push(paymentStatus, paymentStatus, 'pending');
    }
    if (search) {
      const like = `%${search}%`حدث خطأ. حاول مرة أخرى.`
      SELECT p.*, o.customer_name, o.phone, o.public_code, b.name as branch_name, b.name_ar as branch_name_ar, b.name_en as branch_name_en
      FROM payments p
      LEFT JOIN online_orders o ON o.id = p.order_id
      LEFT JOIN branches b ON b.id = p.branch_id
      WHERE p.shop_id = ?
    `;
    const params: any[] = [shopId];
    if (branchIds && branchIds.length > 0) {
      query += ' AND (p.branch_id IS NULL OR p.branch_id IN (' + branchIds.map(() => '?').join(',') + '))';
      params.push(...branchIds);
    }
    if (branchId) {
      query += ' AND (p.branch_id IS NULL OR p.branch_id = ?)';
      params.push(branchId);
    }
    if (status && ['pending', 'confirmed', 'rejected', 'refunded'].includes(status)) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    if (method) {
      query += ' AND p.method LIKE ?';
      params.push(`%${method}%`);
    }
    if (dateFrom) {
      query += ' AND DATE(p.created_at) >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND DATE(p.created_at) <= ?';
      params.push(dateTo);
    }
    if (search) {
      const like = `%${search}%`حدث خطأ. حاول مرة أخرى.`SELECT b.id, b.name, b.name_ar, b.name_en, b.code,
              COALESCE(bi.qty, 0) as qty
       FROM branches b
       LEFT JOIN branch_inventory bi ON bi.branch_id = b.id AND bi.product_id = ? AND bi.shop_id = ?
       WHERE b.shop_id = ? ${branchFilter}
       ORDER BY COALESCE(bi.qty, 0) DESC`حدث خطأ. حاول مرة أخرى.`SELECT b.id, b.name, b.name_ar, b.name_en, b.code,
              COALESCE(bi.qty, 0) as qty
       FROM branches b
       LEFT JOIN branch_inventory bi ON bi.branch_id = b.id AND bi.product_id = ? AND bi.shop_id = ?
       WHERE b.shop_id = ? ${branchFilter}
       ORDER BY COALESCE(bi.qty, 0) DESC`,
      params
    );
    const list = (safeRows as any[]).map((r) => ({
      branchId: r.id,
      branchName: r.name,
      branchNameAr: r.name_ar || r.name,
      branchNameEn: r.name_en || r.name,
      qty: Number(r.qty || 0),
    }));
    res.json({ productId, branches: list });
  } catch (error: any) {
    res.status(500).json({ error: String(error?.message || 'Server error') });
  }
});

// ========== NOTIFICATIONS ==========
const clampInt = (val: unknown, min: number, max: number, def: number): number => {
  let n: number;
  if (typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val)) {
    n = Math.floor(val);
  } else {
    n = parseInt(String(val ?? def), 10);
  }
  if (!Number.isFinite(n) || Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
};

const countPlaceholders = (sql: string): number => (sql.match(/\?/g) || []).length;

const resolveShopIdSafe = async (req: any): Promise<number | null> => {
  let shopId = resolveShopId(req);
  if (!shopId && req.user?.role === 'super_admin') {
    try {
      const [shops] = await pool.execute('SELECT id FROM shops ORDER BY id ASC LIMIT 1');
      shopId = (shops as any[])[0]?.id ?? null;
    } catch {
      shopId = null;
    }
  }
  return shopId ? Number(shopId) : null;
};

app.get('/api/notifications/unread-count', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = await resolveShopIdSafe(req);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[notifications] unread-count req:', { shopId: shopId ?? 'null', userId: req.user?.id });
    }
    if (!shopId) {
      return res.json({ ok: true, count: 0 });
    }
    const sql = 'SELECT COUNT(*) as c FROM notifications WHERE shop_id = ? AND is_read = 0';
    const params = [shopId];
    if (process.env.NODE_ENV !== 'production') {
      console.log('[notifications] unread-count SQL:', sql, 'bindings:', params.map((p) => `${typeof p}:${p}`));
      if (countPlaceholders(sql) !== params.length) console.error('[notifications] unread-count placeholder mismatch!');
    }
    const [rows] = await pool.execute(sql, params);
    const count = (rows as any[])[0]?.c ?? 0;
    res.json({ ok: true, count: Number(count) });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') console.error('[notifications] unread-count error:', error?.message || error);
    res.status(500).json({ ok: false, error: String(error?.message || 'Server error'), count: 0 });
  }
});

app.get('/api/notifications', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = await resolveShopIdSafe(req);
    const limit = clampInt(req.query.limit, 1, 50, 20);
    const offset = clampInt(req.query.offset, 0, 1e9, 0);
    const sourceRaw = String(req.query.source || '').trim().toLowerCase();
    const sourceFilter = ['online', 'pos', 'system', 'all'].includes(sourceRaw) && sourceRaw !== 'all' ? sourceRaw : '';
    const q = String(req.query.q || req.query.search || '').trim();
    if (process.env.NODE_ENV !== 'production') {
      console.log('[notifications] list req:', { shopId: shopId ?? 'null', limit, offset, sourceFilter, q: q || '(none)' });
    }
    if (!shopId) {
      return res.json({ ok: true, items: [], nextOffset: null, unreadCount: 0 });
    }
    let sql = 'SELECT * FROM notifications WHERE shop_id = ?';
    const params: (string | number)[] = [shopId];
    if (sourceFilter) {
      sql += ' AND source = ?';
      params.push(sourceFilter);
    }
    if (q.length > 0) {
      sql += ' AND (COALESCE(title_ar,\'\') LIKE ? OR COALESCE(title_en,\'\') LIKE ? OR COALESCE(body_ar,\'\') LIKE ? OR COALESCE(body_en,\'\') LIKE ?)';
      const escaped = String(q).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      const qp = `%${escaped}%`;
      params.push(qp, qp, qp, qp);
    }
    sql += ' ORDER BY created_at DESC LIMIT ' + String(limit + 1) + ' OFFSET ' + String(offset);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[notifications] list SQL:', sql, 'bindings:', params.map((p) => `${typeof p}:${JSON.stringify(p)}`));
      if (countPlaceholders(sql) !== params.length) console.error('[notifications] list placeholder mismatch! placeholders=' + countPlaceholders(sql) + ' bindings=' + params.length);
    }
    const [rows] = await pool.execute(sql, params);
    const allRows = rows as any[];
    const items = allRows.slice(0, limit);
    const hasMore = allRows.length > limit;
    const countSql = 'SELECT COUNT(*) as c FROM notifications WHERE shop_id = ? AND is_read = 0';
    const countParams = [shopId];
    if (process.env.NODE_ENV !== 'production' && countPlaceholders(countSql) !== countParams.length) {
      console.error('[notifications] list countSql placeholder mismatch!');
    }
    const [countRows] = await pool.execute(countSql, countParams);
    const unreadCount = (countRows as any[])[0]?.c ?? 0;
    res.json({ ok: true, items, nextOffset: hasMore ? offset + limit : null, unreadCount: Number(unreadCount) });
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') console.error('[notifications] list error:', error?.message || error);
    res.status(500).json({ ok: false, error: String(error?.message || 'Server error'), items: [], nextOffset: null, unreadCount: 0 });
  }
});

app.patch('/api/notifications/mark-all-read', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = await resolveShopIdSafe(req);
    if (!shopId) return res.json({ ok: true, updated: 0 });
    const sql = 'UPDATE notifications SET is_read = 1 WHERE shop_id = ? AND is_read = 0';
    const params = [shopId];
    if (process.env.NODE_ENV !== 'production') {
      console.log('[notifications] mark-all-read SQL:', sql, 'bindings:', params.map((p) => `${typeof p}:${p}`));
      if (countPlaceholders(sql) !== params.length) console.error('[notifications] mark-all-read placeholder mismatch!');
    }
    const [result] = await pool.execute(sql, params);
    const updated = Number((result as any)?.affectedRows ?? 0);
    res.json({ ok: true, updated });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: String(error?.message || 'Server error') });
  }
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req: any, res: Response) => {
  try {
    const shopId = await resolveShopIdSafe(req);
    if (!shopId) return res.json({ ok: true });
    const notifId = parseInt(req.params.id, 10);
    if (!Number.isFinite(notifId)) return res.status(400).json({ ok: false, error: 'Invalid notification id' });

    const sql = 'UPDATE notifications SET is_read = 1 WHERE id = ? AND shop_id = ?';
    const params = [notifId, shopId];
    if (process.env.NODE_ENV !== 'production') {
      console.log('[notifications] PATCH :id/read SQL:', sql, 'bindings:', params.map((p) => `${typeof p}:${p}`));
      if (countPlaceholders(sql) !== params.length) console.error('[notifications] PATCH :id/read placeholder mismatch!');
    }
    const [result] = await pool.execute(sql, params);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ ok: false, error: 'Notification not found' });
    }
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: String((error as any)?.message || 'Server error') });
  }
});

// ========== ADMIN ONLINE INVOICES ==========
app.get('/api/admin/online-invoices', authenticateToken, requireRole('super_admin', 'shop_owner', 'cashier'), async (req: any, res: Response) => {
  try {
    let shopId = resolveShopId(req);
    if (!shopId && req.user?.role === 'super_admin') {
      const [shops] = await pool.execute('SELECT id FROM shops ORDER BY id ASC LIMIT 1');
      shopId = (shops as any[])[0]?.id ?? null;
    }
    if (!shopId) return res.status(400).json({ ok: false, error: 'shopId is required' });
    const query = String(req.query.query || req.query.search || '').trim();
    const limit = Math.min(parseInt(String(req.query.limit || 50), 10) || 50, 200);
    let sql = `
      SELECT inv.*, o.customer_name, o.phone, o.public_code, o.status as order_status, o.created_at as order_created_at,
             'online' AS source
      FROM online_invoices inv
      JOIN online_orders o ON inv.order_id = o.id
      WHERE inv.shop_id = ?
    `;
    const params: any[] = [shopId];
    if (query.length > 0) {
      const q = `%${query}%`;
      sql += ` AND (inv.invoice_number = ? OR inv.order_id = ? OR o.customer_name LIKE ? OR o.phone LIKE ? OR o.public_code = ?)`;
      const num = parseInt(query, 10);
      params.push(Number.isFinite(num) ? num : -1, Number.isFinite(num) ? num : -1, q, q, String(query).toUpperCase());
    }
    sql += ` ORDER BY inv.created_at DESC LIMIT ${limit}`;
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/online-invoices/:id', authenticateToken, requireRole('super_admin', 'shop_owner', 'cashier'), async (req: any, res: Response) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return res.status(400).json({ error: 'shopId is required' });
    const invId = parseInt(req.params.id, 10);
    if (!Number.isFinite(invId)) return res.status(400).json({ error: 'Invalid invoice id' });
    const [invs] = await pool.execute(
      `SELECT inv.*, o.customer_name, o.phone, o.public_code, o.address, o.governorate, o.city,
              o.status as order_status, o.created_at as order_created_at, 'online' AS source
       FROM online_invoices inv JOIN online_orders o ON inv.order_id = o.id
       WHERE inv.id = ? AND inv.shop_id = ?`,
      [invId, shopId]
    );
    const inv = (invs as any[])[0];
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    const [items] = await pool.execute('SELECT * FROM online_invoice_items WHERE invoice_id = ?', [invId]);
    res.json({ ...inv, items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/online-invoices/:id/print', authenticateToken, requireRole('super_admin', 'shop_owner', 'branch_manager', 'multi_branch_manager', 'cashier'), async (req: any, res: Response) => {
  try {
    const shopId = resolveShopId(req);
    if (!shopId) return res.status(400).json({ error: 'shopId is required' });
    const invId = parseInt(req.params.id, 10);
    if (!Number.isFinite(invId)) return res.status(400).json({ error: 'Invalid invoice id' });
    const [result] = await pool.execute(
      'UPDATE online_invoices SET printed_count = printed_count + 1, last_printed_at = CURRENT_TIMESTAMP WHERE id = ? AND shop_id = ?',
      [invId, shopId]
    );
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Invoice not found' });
    const [rows] = await pool.execute('SELECT id, invoice_number, printed_count, last_printed_at FROM online_invoices WHERE id = ?', [invId]);
    const row = (rows as any[])[0];
    const printCount = Number(row?.printed_count || 0);
    await pool.execute(
      `INSERT INTO invoice_print_log (shop_id, invoice_id, invoice_type, printed_by_user_id, print_count_after)
       VALUES (?, ?, 'online', ?, ?)`,
      [shopId, invId, req.user?.id ?? null, printCount]
    );
    res.json({ printCount, lastPrintedAt: row?.last_printed_at });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ========== PUBLIC STOREFRONT (Gold package only) ==========
// Regression checklist: Storefront must NOT show:
// - Deleted products (is_deleted=1)
// - Out-of-stock products (available_stock<=0, for endpoints that compute it)
// All product queries here filter: (p.is_deleted = 0 OR p.is_deleted IS NULL)
// Main storefront endpoints also filter: HAVING available_stock > 0
// Load storefront by domain query (for Back to Store from track page)
app.get('/api/public/storefront/by-domain', async (req: Request, res: Response) => {
  try {
    const domain = String(req.query.domain || '').trim().toLowerCase();
    if (!domain) return res.status(400).json({ error: 'domain query required' });
    const [rows] = await pool.execute(
      `SELECT d.shop_id FROM domains d
       WHERE d.domain = ? AND d.is_active = 1 AND d.status = 'active' LIMIT 1`,
      [domain]
    );
    const row = (rows as any[])[0];
    if (!row) return res.status(404).json({ error: 'Unknown domain' });
    const shopId = Number(row.shop_id);
    const [shops] = await pool.execute("SELECT * FROM shops WHERE id = ? AND package IN ('gold', 'branches')", [shopId]);
    const shopArray = shops as any[];
    if (shopArray.length === 0) return res.status(404).json({ error: 'Storefront not available' });
    const [categories] = await pool.execute(
      'SELECT * FROM categories WHERE shop_id = ? OR shop_id IS NULL ORDER BY id ASC',
      [shopId]
    );
    const [products] = await pool.execute(
      `SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar
       FROM products p LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
       ORDER BY p.created_at DESC`,
      [shopId]
    );
    return res.json({ domain, shop: shopArray[0], categories, products });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

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

    const [categories] = await pool.execute(
      'SELECT * FROM categories WHERE shop_id = ? OR shop_id IS NULL ORDER BY id ASC',
      [shopId]
    );

    const [products] = await pool.execute(
      `
      SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
      ORDER BY p.created_at DESC
      `,
      [shopId]
    );

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

    await expireOldReservations(shopId);

    // Enforce Gold package for storefront publishing
    const [shops] = await pool.execute("SELECT * FROM shops WHERE id = ? AND package IN ('gold', 'branches')", [shopId]);
    const shopArray = shops as any[];
    if (shopArray.length === 0) {
      return res.status(404).json({ error: 'Storefront not available' });
    }

    const [categories] = await pool.execute(
      'SELECT * FROM categories WHERE shop_id = ? OR shop_id IS NULL ORDER BY id ASC',
      [shopId]
    );

    const [products] = await pool.execute(
      `
      SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar,
        GREATEST(0, COALESCE(p.stock_quantity, 0) - COALESCE((
          SELECT SUM(r.qty) FROM stock_reservations r
          WHERE r.product_id = p.id AND r.shop_id = p.shop_id AND r.status = 'reserved'
        ), 0)) as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
      HAVING available_stock > 0
      ORDER BY p.created_at DESC
      `,
      [shopId]
    );

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

    await expireOldReservations(Number(shopId));

    // Check if shop has Gold package
    const [shops] = await pool.execute("SELECT * FROM shops WHERE id = ? AND package IN ('gold', 'branches')", [shopId]);
    const shopArray = shops as any[];

    if (shopArray.length === 0) {
      return res.status(404).json({ error: 'Storefront not available' });
    }

    const [products] = await pool.execute(`
      SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar,
        GREATEST(0, COALESCE(p.stock_quantity, 0) - COALESCE((
          SELECT SUM(r.qty) FROM stock_reservations r
          WHERE r.product_id = p.id AND r.shop_id = p.shop_id AND r.status = 'reserved'
        ), 0)) as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
      HAVING available_stock > 0
      ORDER BY p.created_at DESC
    `, [shopId]);
    
    res.json({
      shop: shopArray[0],
      products
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/public/storefront/:shopId/product/:productId', async (req: Request, res: Response) => {
  try {
    const { shopId, productId } = req.params;
    const [shops] = await pool.execute("SELECT * FROM shops WHERE id = ? AND package IN ('gold', 'branches')", [shopId]);
    const shopArray = shops as any[];
    if (shopArray.length === 0) return res.status(404).json({ error: 'Storefront not available' });
    const [products] = await pool.execute(
      `SELECT p.*, c.name_en as category_name_en, c.name_ar as category_name_ar,
        GREATEST(0, COALESCE(p.stock_quantity, 0) - COALESCE((
          SELECT SUM(r.qty) FROM stock_reservations r
          WHERE r.product_id = p.id AND r.shop_id = p.shop_id AND r.status = 'reserved'
        ), 0)) as available_stock
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ? AND p.shop_id = ? AND (p.is_deleted = 0 OR p.is_deleted IS NULL)`,
      [productId, shopId]
    );
    const product = (products as any[])[0];
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ shop: shopArray[0], product });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
});

const server = app.listen(PORT, '0.0.0.0', () => console.log('listening', PORT));

server.on('error', (error) => {
  console.error('ERROR: Server error:', error);
});

app.use((err: any, _req: Request, res: Response, _next: any) => {
  if (err instanceof SyntaxError && (err as any)?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  console.error('ERROR: Unhandled API error:', err?.message || err);
  console.error('ERROR: Unhandled API error stack:', err?.stack || '(no stack)');

  res.status(500).json({ error: 'Internal server error' });
});

process.on('unhandledRejection', (reason) => {
  console.error('ERROR: Unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('ERROR: Uncaught exception:', error);
});