import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2/promise';
import crypto from 'crypto';

type UserRow = RowDataPacket & { id: number; email: string | null };

function generatePublicCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// Connection mode: socket (Cloud SQL Unix socket) or ip (TCP host/port)
const DB_MODE = (process.env.DB_MODE || 'ip').toLowerCase();
const isSocketMode = DB_MODE === 'socket';

if (isSocketMode) {
  // socket mode: INSTANCE_CONNECTION_NAME required
  if (!process.env.INSTANCE_CONNECTION_NAME) {
    throw new Error('[db] DB_MODE=socket requires INSTANCE_CONNECTION_NAME to be set');
  }
} else {
  // ip mode: require DB_HOST, DB_NAME, DB_USER, DB_PASSWORD
  const required: string[] = [];
  if (!process.env.DB_HOST) required.push('DB_HOST');
  if (!process.env.DB_NAME) required.push('DB_NAME');
  if (!process.env.DB_USER) required.push('DB_USER');
  if (!process.env.DB_PASSWORD) required.push('DB_PASSWORD');
  if (required.length > 0) {
    throw new Error(`[db] DB_MODE=ip missing required env: ${required.join(', ')}`);
  }
}

const poolConfig: mysql.PoolOptions = isSocketMode
  ? {
      socketPath: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: undefined,
    }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };

if (process.env.NODE_ENV !== 'production') {
  const logParts: string[] = ['[db] mode:', isSocketMode ? 'socket' : 'ip', '| DB_NAME:', process.env.DB_NAME ?? '(not set)'];
  if (isSocketMode) {
    logParts.push('| INSTANCE_CONNECTION_NAME:', process.env.INSTANCE_CONNECTION_NAME ? '(set)' : '(not set)');
  } else {
    logParts.push('| host:', process.env.DB_HOST ?? '(not set)');
  }
  console.log(logParts.join(' '));
}

// Create connection pool (connects lazily on first use)
export const pool = mysql.createPool(poolConfig);

// Dev-only SQL logging wrapper to help debug schema issues and keep server running on benign DDL errors
if (process.env.NODE_ENV !== 'production') {
  const originalExecute = pool.execute.bind(pool);
  (pool as any).execute = async (...args: any[]) => {
    const [sql, params] = args;
    try {
      return await originalExecute(sql, params);
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const benignCodes = new Set([
        'ER_DUP_FIELDNAME',
        'ER_DUP_KEYNAME',
        'ER_FK_DUP_NAME',
        'ER_TABLE_EXISTS_ERROR',
        'ER_CANT_DROP_FIELD_OR_KEY',
        'ER_DUP_INDEX',
      ]);
      try {
        const [dbRows] = await originalExecute('SELECT DATABASE() AS db', []);
        const currentDb = (dbRows as any[])[0]?.db ?? null;
        const payload = {
          db: currentDb,
          sql,
          params,
          code,
          message: err?.message,
          stack: err?.stack,
        };
        if (benignCodes.has(code || '')) {
          console.warn('[SQL WARNING]', payload);
          // Return an empty result to keep the server running
          return [[], []];
        }
        console.error('[SQL ERROR]', payload);
      } catch {
        const payload = {
          sql,
          params,
          code,
          message: err?.message,
          stack: err?.stack,
        };
        if (benignCodes.has(code || '')) {
          console.warn('[SQL WARNING]', payload);
          return [[], []];
        }
        console.error('[SQL ERROR]', payload);
      }
      throw err;
    }
  };
}

async function ensureDatabaseExists() {
  const database = poolConfig.database;
  if (!database) return;
  const { database: _db, ...serverConfig } = poolConfig;
  const connection = await mysql.createConnection({
    ...serverConfig,
    database: undefined,
  });
  try {
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  } finally {
    await connection.end();
  }
}

// Test connection
export async function testConnection() {
  try {
    console.log('[INIT] initializeDatabase called via testConnection');
    await ensureDatabaseExists();
    const connection = await pool.getConnection();
    console.log('✅ Connected to Google Cloud SQL');
    try {
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT DATABASE() AS db, @@server_uuid AS uuid, @@hostname AS host, @@port AS port, CURRENT_USER() AS user'
      );
      console.log('[DB CHECK]', rows);
    } catch (e: any) {
      console.error('[DB CHECK ERROR]', e?.message || e);
    } finally {
      connection.release();
    }
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return false;
  }
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Users table with RBAC roles
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'cashier',
        package VARCHAR(32) NULL DEFAULT 'bronze',
        shop_id BIGINT UNSIGNED NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_shop_id (shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure role includes warehouse and branch_manager (for existing schemas)
    try {
      await pool.execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(32) NOT NULL DEFAULT 'cashier'");
    } catch (e: any) {
      if (e?.code !== 'ER_BAD_FIELD_ERROR') {}
    }

    // Shops table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS shops (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        business_name VARCHAR(255) NULL,
        owner_name VARCHAR(255) NULL,
        activity_type VARCHAR(255) NULL,
        address TEXT NULL,
        contact_email VARCHAR(255) NULL,
        contact_phone VARCHAR(64) NULL,
        country_name VARCHAR(255) NULL,
        currency_code VARCHAR(16) NULL,
        currency_symbol VARCHAR(16) NULL,
        plan_type VARCHAR(32) NULL,
        is_active TINYINT(1) DEFAULT 0,
        trial_ends_at TIMESTAMP NULL,
        logo_url TEXT NULL,
        owner_id BIGINT UNSIGNED NOT NULL,
        package VARCHAR(32) NULL DEFAULT 'bronze',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_owner_id (owner_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Custom domains table (multi-tenant storefront resolution by Host header)
    // - One domain maps to one shop_id (UNIQUE domain)
    // - Allowed TLDs: .com, .net, .org, .shop, .store (enforced by CHECK + app validation)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS domains (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL,
        domain VARCHAR(253) NOT NULL,
        status ENUM('pending', 'verified', 'active', 'inactive') DEFAULT 'pending',
        is_active TINYINT(1) DEFAULT 0,
        verification_method ENUM('txt', 'cname') DEFAULT 'txt',
        verification_token CHAR(64) NOT NULL,
        verified_at TIMESTAMP NULL,
        activated_at TIMESTAMP NULL,
        deactivated_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_domains_shop_id FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        CONSTRAINT uq_domains_domain UNIQUE (domain),
        CONSTRAINT ck_domains_domain_lower CHECK (domain = LOWER(domain)),
        CONSTRAINT ck_domains_allowed_tld CHECK (SUBSTRING_INDEX(domain, '.', -1) IN ('com', 'net', 'org', 'shop', 'store')),
        CONSTRAINT ck_domains_domain_format CHECK (
          domain REGEXP '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+(com|net|org|shop|store)$'
        ),
        INDEX idx_domains_shop_id (shop_id),
        INDEX idx_domains_resolution (domain, is_active, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Domains migrations for existing schemas (safe adds)
    const domainColumns: Array<{ name: string; definition: string }> = [
      { name: 'status', definition: `ENUM('pending', 'verified', 'active', 'inactive') DEFAULT 'pending'` },
      { name: 'is_active', definition: 'TINYINT(1) DEFAULT 0' },
      { name: 'verification_method', definition: `ENUM('txt', 'cname') DEFAULT 'txt'` },
      // NOTE: added nullable for migration safety; we backfill + tighten below
      { name: 'verification_token', definition: 'CHAR(64) NULL' },
      { name: 'verified_at', definition: 'TIMESTAMP NULL' },
      { name: 'activated_at', definition: 'TIMESTAMP NULL' },
      { name: 'deactivated_at', definition: 'TIMESTAMP NULL' },
    ];

    for (const column of domainColumns) {
      try {
        await pool.execute(`ALTER TABLE domains ADD COLUMN ${column.name} ${column.definition};`);
      } catch (error: any) {
        if (error?.code !== 'ER_DUP_FIELDNAME' && error?.code !== 'ER_NO_SUCH_TABLE') {
          throw error;
        }
      }
    }

    // Backfill missing verification tokens (if table existed before this migration)
    try {
      const [rows] = await pool.execute(
        `SELECT id FROM domains WHERE verification_token IS NULL OR verification_token = ''`
      );
      for (const row of rows as any[]) {
        const token = crypto.randomBytes(32).toString('hex');
        await pool.execute('UPDATE domains SET verification_token = ? WHERE id = ?', [token, row.id]);
      }
      try {
        await pool.execute('ALTER TABLE domains MODIFY COLUMN verification_token CHAR(64) NOT NULL');
      } catch (error: any) {
        // Ignore if already NOT NULL or table missing
        if (error?.code !== 'ER_NO_SUCH_TABLE') {
          // Some MySQL setups might reject this if constraints differ; keep it best-effort.
        }
      }
    } catch (error: any) {
      if (error?.code !== 'ER_NO_SUCH_TABLE') {
        throw error;
      }
    }

    try {
      await pool.execute('CREATE UNIQUE INDEX uq_domains_domain ON domains (domain)');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEYNAME') {
        // Ignore missing table as it will be created above
        if (error?.code !== 'ER_NO_SUCH_TABLE') throw error;
      }
    }

    try {
      await pool.execute('CREATE INDEX idx_domains_resolution ON domains (domain, is_active, status)');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEYNAME') {
        if (error?.code !== 'ER_NO_SUCH_TABLE') throw error;
      }
    }

    // Branches table (multi-branch per shop)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS branches (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255) NULL,
        name_en VARCHAR(255) NULL,
        code VARCHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        UNIQUE KEY uq_branches_shop_code (shop_id, code),
        INDEX idx_branches_shop_id (shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute('ALTER TABLE branches ADD COLUMN name_ar VARCHAR(255) NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE branches ADD COLUMN name_en VARCHAR(255) NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute("UPDATE branches SET name_ar = name, name_en = CASE WHEN name = 'الفرع الرئيسي' THEN 'Main Branch' ELSE name END WHERE name_ar IS NULL OR name_en IS NULL");
    } catch (_) {}
    try {
      await pool.execute('ALTER TABLE shops ADD COLUMN default_branch_id BIGINT UNSIGNED NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    try {
      await pool.execute('ALTER TABLE shops ADD CONSTRAINT fk_shops_default_branch FOREIGN KEY (default_branch_id) REFERENCES branches(id) ON DELETE SET NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME' && e?.code !== 'ER_FK_DUP_NAME') {}
    }

    // User-branch assignments (Branch Manager restricted to assigned branch)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_branch_assignments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NOT NULL,
        shop_id BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_branch (user_id, branch_id),
        INDEX idx_uba_user (user_id),
        INDEX idx_uba_branch (branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Subscriptions (per-shop plan and expiry; stacking via subscription_activations)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL UNIQUE,
        plan_name VARCHAR(32) NOT NULL DEFAULT 'gold',
        started_at TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        last_activated_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        INDEX idx_subscriptions_shop (shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS subscription_activations (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL,
        code VARCHAR(128) NOT NULL,
        days INT NOT NULL,
        activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        previous_expires_at TIMESTAMP NULL,
        new_expires_at TIMESTAMP NULL,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        INDEX idx_sub_act_shop (shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Categories table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        shop_id BIGINT UNSIGNED NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_shop_id (shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Products/Inventory table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        sku VARCHAR(128) NULL,
        barcode VARCHAR(128) NULL,
        qr_code VARCHAR(255) NULL,
        brand VARCHAR(255),
        category_id BIGINT UNSIGNED,
        buy_price DECIMAL(10, 2) NOT NULL,
        sell_price DECIMAL(10, 2) NOT NULL,
        stock_quantity INT DEFAULT 0,
        min_stock_level INT DEFAULT 5,
        image_url TEXT NULL,
        shop_id BIGINT UNSIGNED NOT NULL,
        is_deleted TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        INDEX idx_shop_id (shop_id),
        INDEX idx_category_id (category_id),
        INDEX idx_sku (sku),
        INDEX idx_barcode (barcode),
        INDEX idx_qr_code (qr_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Branch inventory (qty per branch; products remain global per shop)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS branch_inventory (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        qty INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY uq_branch_inventory (branch_id, product_id),
        INDEX idx_branch_inventory_shop (shop_id),
        INDEX idx_branch_inventory_branch (branch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Sales/Transactions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sales (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        invoice_number VARCHAR(32) UNIQUE NULL,
        customer_name VARCHAR(255) NULL,
        customer_phone VARCHAR(64) NULL,
        customer_address TEXT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_method ENUM('cash', 'card', 'other', 'invoice') DEFAULT 'cash',
        print_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_shop_id (shop_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute('ALTER TABLE sales ADD COLUMN branch_id BIGINT UNSIGNED NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    try {
      await pool.execute('CREATE INDEX idx_sales_branch_id ON sales(branch_id)');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME') {}
    }

    await pool.execute(`
      ALTER TABLE sales
      MODIFY COLUMN user_id BIGINT UNSIGNED NULL;
    `);

    try {
      await pool.execute(`ALTER TABLE products ADD COLUMN image_url TEXT NULL;`);
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    // Soft-delete flag for products (many queries filter on p.is_deleted)
    try {
      await pool.execute('ALTER TABLE products ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    const shopColumns: Array<{ name: string; definition: string }> = [
      { name: 'business_name', definition: 'VARCHAR(255) NULL' },
      { name: 'owner_name', definition: 'VARCHAR(255) NULL' },
      { name: 'activity_type', definition: 'VARCHAR(255) NULL' },
      { name: 'address', definition: 'TEXT NULL' },
      { name: 'contact_email', definition: 'VARCHAR(255) NULL' },
      { name: 'contact_phone', definition: 'VARCHAR(64) NULL' },
      { name: 'logo_url', definition: 'TEXT NULL' },
      { name: 'country_name', definition: 'VARCHAR(255) NULL' },
      { name: 'currency_code', definition: 'VARCHAR(16) NULL' },
      { name: 'currency_symbol', definition: 'VARCHAR(16) NULL' },
      { name: 'plan_type', definition: 'VARCHAR(32) NULL' },
      { name: 'is_active', definition: 'TINYINT(1) DEFAULT 0' },
      { name: 'trial_ends_at', definition: 'TIMESTAMP NULL' },
    ];

    for (const column of shopColumns) {
      try {
        await pool.execute(`ALTER TABLE shops ADD COLUMN ${column.name} ${column.definition};`);
      } catch (error: any) {
        if (error?.code !== 'ER_DUP_FIELDNAME') {
          throw error;
        }
      }
    }

    try {
      await pool.execute('ALTER TABLE shops MODIFY COLUMN logo_url LONGTEXT');
    } catch (error: any) {
      if (error?.code !== 'ER_BAD_FIELD_ERROR') {
        throw error;
      }
    }

    const productColumns: Array<{ name: string; definition: string }> = [
      { name: 'sku', definition: 'VARCHAR(128) NULL' },
      { name: 'barcode', definition: 'VARCHAR(128) NULL' },
      { name: 'qr_code', definition: 'VARCHAR(255) NULL' },
    ];

    for (const column of productColumns) {
      try {
        await pool.execute(`ALTER TABLE products ADD COLUMN ${column.name} ${column.definition};`);
      } catch (error: any) {
        if (error?.code !== 'ER_DUP_FIELDNAME') {
          throw error;
        }
      }
    }

    try {
      await pool.execute('CREATE INDEX idx_sku ON products (sku)');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    try {
      await pool.execute('CREATE INDEX idx_barcode ON products (barcode)');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    try {
      await pool.execute('CREATE INDEX idx_qr_code ON products (qr_code)');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    try {
      await pool.execute('ALTER TABLE products ADD COLUMN import_batch_id BIGINT UNSIGNED NULL');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
    // Products: is_incomplete, extra_fields, missing_fields (Excel import / edit)
    try {
      await pool.execute('ALTER TABLE products ADD COLUMN is_incomplete TINYINT(1) DEFAULT 0');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE products ADD COLUMN extra_fields JSON NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE products ADD COLUMN missing_fields JSON NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    // Online product details (eCommerce)
    const productDetailColumns: Array<{ name: string; definition: string }> = [
      { name: 'description_short', definition: 'TEXT NULL' },
      { name: 'description_long', definition: 'TEXT NULL' },
      { name: 'specs_json', definition: 'JSON NULL' },
      { name: 'warranty_text', definition: 'TEXT NULL' },
      { name: 'return_policy_text', definition: 'TEXT NULL' },
      { name: 'gallery_urls_json', definition: 'JSON NULL' },
    ];
    for (const col of productDetailColumns) {
      try {
        await pool.execute(`ALTER TABLE products ADD COLUMN ${col.name} ${col.definition}`);
      } catch (e: any) {
        if (e?.code !== 'ER_DUP_FIELDNAME') {}
      }
    }
    try {
      await pool.execute('CREATE INDEX idx_products_import_batch ON products (import_batch_id)');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_KEYNAME') {
        throw error;
      }
    }

    const salesColumns: Array<{ name: string; definition: string }> = [
      { name: 'customer_name', definition: 'VARCHAR(255) NULL' },
      { name: 'customer_phone', definition: 'VARCHAR(64) NULL' },
      { name: 'customer_address', definition: 'TEXT NULL' },
    ];

    for (const column of salesColumns) {
      try {
        await pool.execute(`ALTER TABLE sales ADD COLUMN ${column.name} ${column.definition};`);
      } catch (error: any) {
        if (error?.code !== 'ER_DUP_FIELDNAME') {
          throw error;
        }
      }
    }

    // Invoice print counter (for existing schemas)
    try {
      await pool.execute('ALTER TABLE sales ADD COLUMN print_count INT DEFAULT 0;');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    // Password resets table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        token VARCHAR(128) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_token (token)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await pool.execute(`ALTER TABLE sales ADD COLUMN invoice_number VARCHAR(32) UNIQUE NULL;`);
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    await pool.execute(`
      ALTER TABLE sales
      MODIFY COLUMN payment_method ENUM('cash', 'card', 'other', 'invoice') DEFAULT 'cash';
    `);

    // Sale items table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        sale_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_sale_id (sale_id),
        INDEX idx_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute('ALTER TABLE sale_items ADD COLUMN branch_id BIGINT UNSIGNED NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    // Invoices view (alias for sales)
    await pool.execute(`CREATE OR REPLACE VIEW invoices AS SELECT * FROM sales;`);

    // Vault transactions (الخزنة)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS vault_transactions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        type ENUM('in', 'out') NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        reason VARCHAR(255) NULL,
        notes TEXT NULL,
        related_sale_id BIGINT UNSIGNED NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (related_sale_id) REFERENCES sales(id) ON DELETE SET NULL,
        INDEX idx_vault_shop_id (shop_id),
        INDEX idx_vault_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Audit logs (المراجع)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NULL,
        action VARCHAR(128) NOT NULL,
        entity_type VARCHAR(128) NOT NULL,
        entity_id INT NULL,
        details TEXT NULL,
        ip_address VARCHAR(64) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_audit_shop_id (shop_id),
        INDEX idx_audit_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Invoice print log (every print logs: invoice_id, printed_by_user_id, printed_at, print_count_after)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS invoice_print_log (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL,
        invoice_id BIGINT UNSIGNED NOT NULL,
        invoice_type ENUM('pos', 'online') DEFAULT 'pos',
        printed_by_user_id INT NULL,
        printed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        print_count_after INT NOT NULL,
        INDEX idx_ipl_shop_invoice (shop_id, invoice_id),
        INDEX idx_ipl_printed_at (printed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Licenses table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS licenses (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        license_key VARCHAR(128) UNIQUE NOT NULL,
        plan ENUM('bronze', 'silver', 'gold') NOT NULL,
        duration ENUM('monthly', 'quarterly', 'yearly', 'lifetime') NOT NULL,
        status ENUM('unused', 'active', 'expired') DEFAULT 'unused',
        used_by_user_id BIGINT UNSIGNED NULL,
        used_at TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_license_key (license_key),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute("ALTER TABLE licenses MODIFY COLUMN plan VARCHAR(32) NOT NULL DEFAULT 'bronze'");
    } catch (e: any) {
      if (e?.code !== 'ER_BAD_FIELD_ERROR') {}
    }

    // Import staging: batches and rows
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS import_batches (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        shop_id BIGINT UNSIGNED NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        status ENUM('pending', 'partial', 'committed') DEFAULT 'pending',
        imported_count INT DEFAULT 0,
        failed_count INT DEFAULT 0,
        rolled_back_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        INDEX idx_import_batch_shop (shop_id),
        INDEX idx_import_batch_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute('ALTER TABLE import_batches ADD COLUMN rolled_back_at TIMESTAMP NULL');
    } catch (error: any) {
      if (error?.code !== 'ER_DUP_FIELDNAME') throw error;
    }
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS import_batch_rows (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        batch_id BIGINT UNSIGNED NOT NULL,
        row_index INT NOT NULL,
        raw_data JSON,
        mapped_data JSON,
        errors JSON,
        status ENUM('pending', 'valid', 'invalid', 'imported', 'fixed') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (batch_id) REFERENCES import_batches(id) ON DELETE CASCADE,
        INDEX idx_import_row_batch (batch_id),
        INDEX idx_import_row_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Insert default categories if they don't exist
    await pool.execute(`
      INSERT IGNORE INTO categories (name_en, name_ar) VALUES
      ('Oil', 'زيت'),
      ('Tires', 'إطارات'),
      ('Batteries', 'بطاريات');
    `);

    // Online orders (storefront) - spec schema
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS online_orders (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL,
        status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
        customer_name VARCHAR(255) NOT NULL,
        phone VARCHAR(64) NOT NULL,
        governorate VARCHAR(128) NOT NULL,
        city VARCHAR(128) NOT NULL,
        address TEXT NOT NULL,
        notes TEXT NULL,
        payment_method VARCHAR(50) NULL,
        subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
        total DECIMAL(12, 2) NOT NULL DEFAULT 0,
        currency VARCHAR(8) DEFAULT 'EGP',
        source VARCHAR(32) DEFAULT 'online',
        public_code VARCHAR(16) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        INDEX idx_online_orders_shop (shop_id),
        INDEX idx_online_orders_status (status),
        INDEX idx_online_orders_public_code (public_code),
        INDEX idx_online_orders_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute('ALTER TABLE online_orders ADD COLUMN branch_id BIGINT UNSIGNED NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
    }
    // Payments / Orders: payment_status and order_status on orders
    try {
      await pool.execute("ALTER TABLE online_orders ADD COLUMN payment_status VARCHAR(32) NULL DEFAULT 'pending'");
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute("ALTER TABLE online_orders ADD COLUMN order_status VARCHAR(32) NULL DEFAULT 'NEW'");
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute("UPDATE online_orders SET order_status = CASE WHEN status = 'pending' THEN 'NEW' WHEN status = 'confirmed' THEN 'PROCESSING' WHEN status = 'completed' THEN 'DELIVERED' WHEN status = 'cancelled' THEN 'CANCELLED' ELSE COALESCE(order_status, 'NEW') END WHERE order_status IS NULL");
    } catch (_) {}
    // Dedicated payments table (VodafoneCash, InstaPay, Bank transfers, etc.)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL,
        order_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NULL,
        method VARCHAR(64) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        reference VARCHAR(255) NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        proof_url TEXT NULL,
        reject_reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES online_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
        INDEX idx_payments_shop (shop_id),
        INDEX idx_payments_order (order_id),
        INDEX idx_payments_status (status),
        INDEX idx_payments_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS online_order_items (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NULL,
        name_snapshot VARCHAR(255) NULL,
        sku_snapshot VARCHAR(128) NULL,
        barcode_snapshot VARCHAR(128) NULL,
        sell_price_snapshot DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        FOREIGN KEY (order_id) REFERENCES online_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        INDEX idx_online_order_items_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Extend sales for online invoices
    const salesExtensions: Array<{ name: string; definition: string }> = [
      { name: 'source', definition: "VARCHAR(16) DEFAULT 'pos'" },
      { name: 'online_order_id', definition: 'INT NULL' },
      { name: 'last_printed_at', definition: 'TIMESTAMP NULL' },
      { name: 'invoice_serial', definition: 'VARCHAR(64) NULL' },
    ];
    for (const col of salesExtensions) {
      try {
        await pool.execute(`ALTER TABLE sales ADD COLUMN ${col.name} ${col.definition};`);
      } catch (err: any) {
        if (err?.code !== 'ER_DUP_FIELDNAME') throw err;
      }
    }
    try {
      await pool.execute('CREATE UNIQUE INDEX idx_sales_invoice_serial ON sales(invoice_serial);');
    } catch (err: any) {
      if (err?.code !== 'ER_DUP_KEYNAME' && err?.code !== 'ER_MULTIPLE_PRI_KEY') {
        // column may not exist or index already exists
      }
    }

    // Dedicated online invoices (separate from POS sales)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS online_invoices (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL,
        order_id BIGINT UNSIGNED NOT NULL UNIQUE,
        invoice_number INT NOT NULL,
        total DECIMAL(12, 2) NOT NULL DEFAULT 0,
        printed_count INT DEFAULT 0,
        last_printed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES online_orders(id) ON DELETE CASCADE,
        INDEX idx_online_invoices_shop (shop_id),
        INDEX idx_online_invoices_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS online_invoice_items (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        invoice_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NULL,
        name_snapshot VARCHAR(255) NULL,
        sku_snapshot VARCHAR(128) NULL,
        price_snapshot DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        FOREIGN KEY (invoice_id) REFERENCES online_invoices(id) ON DELETE CASCADE,
        INDEX idx_online_invoice_items_invoice (invoice_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Add public_code to existing online_orders if missing
    try {
      await pool.execute('ALTER TABLE online_orders ADD COLUMN public_code VARCHAR(16) NULL');
    } catch (err: any) {
      if (err?.code !== 'ER_DUP_FIELDNAME') {
        // ignore
      }
    }
    try {
      const [rows] = await pool.execute("SELECT id FROM online_orders WHERE public_code IS NULL OR public_code = ''");
      for (const r of rows as any[]) {
        const code = generatePublicCode();
        await pool.execute('UPDATE online_orders SET public_code = ? WHERE id = ?', [code, r.id]);
      }
    } catch {
      // best effort backfill
    }

    // Notifications (activity log: online + pos + system) - persistent forever
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL,
        source VARCHAR(32) NOT NULL DEFAULT 'online',
        type VARCHAR(64) NOT NULL DEFAULT 'online_order_created',
        title_ar VARCHAR(255) NOT NULL DEFAULT '',
        title_en VARCHAR(255) NOT NULL DEFAULT '',
        body_ar TEXT NOT NULL,
        body_en TEXT NOT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        meta JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        INDEX idx_notifications_shop_created (shop_id, created_at DESC),
        INDEX idx_notifications_shop_read (shop_id, is_read),
        INDEX idx_notifications_shop_source_created (shop_id, source, created_at DESC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // Safe migrations for existing tables
    try {
      await pool.execute('ALTER TABLE notifications ADD COLUMN source VARCHAR(32) NOT NULL DEFAULT \'online\' AFTER shop_id');
    } catch (m: any) {
      if (!String(m?.message || m).includes('Duplicate column')) console.error('notifications.source:', m?.message || m);
    }
    try {
      await pool.execute('CREATE INDEX idx_notifications_shop_source_created ON notifications (shop_id, source, created_at DESC)');
    } catch (m: any) {
      if (!String(m?.message || m).includes('Duplicate')) console.error('notifications.idx_shop_source_created:', m?.message || m);
    }
    try {
      await pool.execute('ALTER TABLE notifications ADD COLUMN branch_id BIGINT UNSIGNED NULL');
    } catch (m: any) {
      if (m?.code !== 'ER_DUP_FIELDNAME') {}
    }

    // Stock reservations for online orders (prevent overselling)
    // Ensure PK/FK types match BIGINT UNSIGNED IDs in shops / online_orders / products
    if (process.env.NODE_ENV !== 'production' && (process.env.DB_NAME || '').includes('_dev')) {
      // In dev-only databases, drop any legacy table with wrong types so we can recreate cleanly
      await pool.execute('DROP TABLE IF EXISTS stock_reservations');
    }
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS stock_reservations (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        shop_id BIGINT UNSIGNED NOT NULL,
        order_id BIGINT UNSIGNED NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        qty INT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'reserved',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES online_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_reservations_order (order_id),
        INDEX idx_reservations_shop_status (shop_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await pool.execute('ALTER TABLE stock_reservations ADD COLUMN branch_id BIGINT UNSIGNED NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') throw e;
    }

    // Backfill default branch for existing shops (multi-branch)
    try {
      const [shopsRows] = await pool.execute('SELECT s.id AS shop_id FROM shops s LEFT JOIN branches b ON b.shop_id = s.id WHERE b.id IS NULL');
      for (const row of (shopsRows as any[])) {
        const [ins] = await pool.execute('INSERT INTO branches (shop_id, name, name_ar, name_en, code) VALUES (?, ?, ?, ?, ?)', [
          row.shop_id,
          'الفرع الرئيسي',
          'الفرع الرئيسي',
          'Main Branch',
          'main',
        ]);
        const insertId = (ins as any).insertId;
        await pool.execute('UPDATE shops SET default_branch_id = ? WHERE id = ?', [insertId, row.shop_id]);
      }
    } catch (e) {
      // best effort
    }

    // Extend package enum for Royal + Branches plan
    try {
      await pool.execute(
        "ALTER TABLE shops MODIFY COLUMN package VARCHAR(32) NULL DEFAULT 'bronze'"
      );
    } catch (e: any) {
      if (e?.code !== 'ER_BAD_FIELD_ERROR') {}
    }
    try {
      await pool.execute(
        "ALTER TABLE users MODIFY COLUMN package VARCHAR(32) NULL DEFAULT 'bronze'"
      );
    } catch (e: any) {
      if (e?.code !== 'ER_BAD_FIELD_ERROR') {}
    }

    // Flexible login: employee_id + email (nullable)
    try {
      await pool.execute('ALTER TABLE users ADD COLUMN employee_id VARCHAR(64) NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('CREATE INDEX idx_users_shop_username ON users (shop_id, username)');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME') {}
    }
    try {
      await pool.execute('CREATE INDEX idx_users_shop_employee_id ON users (shop_id, employee_id)');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME') {}
    }
    try {
      await pool.execute('CREATE INDEX idx_users_email ON users (email)');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME') {}
    }
    try {
      await pool.execute('ALTER TABLE users ADD COLUMN username VARCHAR(64) NULL');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_FIELDNAME') {}
    }
    try {
      await pool.execute('CREATE UNIQUE INDEX ux_users_username ON users (username)');
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_KEYNAME') {}
    }

    // Backfill username for existing rows where username IS NULL (avoid duplicates with prefix_id)
    try {
      const [rows] = await pool.execute<UserRow[]>(
        'SELECT id, email FROM users WHERE username IS NULL OR TRIM(COALESCE(username, "")) = ""'
      );
      const pending = rows;
      const used = new Set<string>();
      const sanitize = (s: string): string =>
        String(s)
          .replace(/[^a-zA-Z0-9_\u0600-\u06FF.-]/g, '')
          .slice(0, 58);
      for (const row of pending) {
        const prefix = row.email
          ? sanitize(row.email.split('@')[0] || row.email)
          : 'user';
        const base = prefix || 'user';
        let username = base;
        if (used.has(username)) username = `${base}_${row.id}`;
        used.add(username);
        await pool.execute('UPDATE users SET username = ? WHERE id = ?', [username, row.id]);
      }
    } catch (e: any) {
      if (e?.code !== 'ER_DUP_ENTRY' && e?.code !== 'ER_DUP_KEYNAME') {
        console.error('Username backfill warning:', e?.message || e);
      }
    }

    // Idempotency for offline sync (POS sales/invoices)
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
          idempotency_key VARCHAR(64) PRIMARY KEY,
          sale_id INT NOT NULL,
          shop_id INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e: any) {
      if (e?.code !== 'ER_TABLE_EXISTS_ERROR') {}
    }

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}
