import mysql from 'mysql2/promise';
import crypto from 'crypto';

// Google Cloud SQL connection configuration
// Note: Update the host with your actual Google Cloud SQL instance IP or connection name
const dbConfig = {
  host: process.env.DB_HOST || '136.112.82.150', // Google Cloud SQL IP or connection name
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'crown_admin',
  password: process.env.DB_PASSWORD || 'Crown2026',
  database: process.env.DB_NAME || 'crown-services-last-project-db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

// Create connection pool (connects lazily on first use)
export const pool = mysql.createPool(dbConfig);

async function ensureDatabaseExists() {
  const { database, ...serverConfig } = dbConfig;
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
    await ensureDatabaseExists();
    const connection = await pool.getConnection();
    console.log('✅ Connected to Google Cloud SQL');
    connection.release();
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
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('super_admin', 'shop_owner', 'cashier', 'warehouse') DEFAULT 'cashier',
        package ENUM('bronze', 'silver', 'gold') DEFAULT 'bronze',
        shop_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_shop_id (shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure role enum includes warehouse (for existing schemas)
    await pool.execute(`
      ALTER TABLE users
      MODIFY COLUMN role ENUM('super_admin', 'shop_owner', 'cashier', 'warehouse') DEFAULT 'cashier';
    `);

    // Shops table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS shops (
        id INT AUTO_INCREMENT PRIMARY KEY,
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
        owner_id INT NOT NULL,
        package ENUM('bronze', 'silver', 'gold') DEFAULT 'bronze',
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
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
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

    // Categories table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        shop_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_shop_id (shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Products/Inventory table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(255) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        sku VARCHAR(128) NULL,
        barcode VARCHAR(128) NULL,
        qr_code VARCHAR(255) NULL,
        brand VARCHAR(255),
        category_id INT,
        buy_price DECIMAL(10, 2) NOT NULL,
        sell_price DECIMAL(10, 2) NOT NULL,
        stock_quantity INT DEFAULT 0,
        min_stock_level INT DEFAULT 5,
        image_url TEXT NULL,
        shop_id INT NOT NULL,
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

    // Sales/Transactions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        user_id INT NULL,
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

    await pool.execute(`
      ALTER TABLE sales
      MODIFY COLUMN user_id INT NULL;
    `);

    try {
      await pool.execute(`ALTER TABLE products ADD COLUMN image_url TEXT NULL;`);
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
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
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
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_sale_id (sale_id),
        INDEX idx_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Invoices view (alias for sales)
    await pool.execute(`CREATE OR REPLACE VIEW invoices AS SELECT * FROM sales;`);

    // Vault transactions (الخزنة)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS vault_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        user_id INT NULL,
        type ENUM('in', 'out') NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        reason VARCHAR(255) NULL,
        notes TEXT NULL,
        related_sale_id INT NULL,
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
        id INT AUTO_INCREMENT PRIMARY KEY,
        shop_id INT NOT NULL,
        user_id INT NULL,
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

    // Licenses table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS licenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        license_key VARCHAR(128) UNIQUE NOT NULL,
        plan ENUM('bronze', 'silver', 'gold') NOT NULL,
        duration ENUM('monthly', 'quarterly', 'yearly', 'lifetime') NOT NULL,
        status ENUM('unused', 'active', 'expired') DEFAULT 'unused',
        used_by_user_id INT NULL,
        used_at TIMESTAMP NULL,
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_license_key (license_key),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Insert default categories if they don't exist
    await pool.execute(`
      INSERT IGNORE INTO categories (name_en, name_ar) VALUES
      ('Oil', 'زيت'),
      ('Tires', 'إطارات'),
      ('Batteries', 'بطاريات');
    `);

    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}
