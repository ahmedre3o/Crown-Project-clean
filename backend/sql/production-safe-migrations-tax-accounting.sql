-- Crown API – Tax system + Accounting (chart of accounts, journal, payments)
-- Idempotent. Run via run-migrations.ts.

SET @db = DATABASE();

-- ========== TAX RATES ==========
CREATE TABLE IF NOT EXISTS tax_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
  rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  inclusive TINYINT(1) NOT NULL DEFAULT 0,
  apply_before_discount TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tax_rates_shop (shop_id),
  CONSTRAINT fk_tax_rates_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== PRODUCTS: tax_rate_id ==========
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'tax_rate_id');
SET @sql = IF(@col = 0, 'ALTER TABLE products ADD COLUMN tax_rate_id INT NULL AFTER category_id, ADD INDEX idx_products_tax_rate (tax_rate_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========== SALE_ITEMS: tax columns ==========
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'tax_rate_id');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN tax_rate_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'tax_rate');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN tax_rate DECIMAL(10,2) NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'tax_amount');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN tax_amount DECIMAL(10,2) NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'line_total_before_tax');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN line_total_before_tax DECIMAL(10,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'line_total_after_tax');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN line_total_after_tax DECIMAL(10,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========== SALES: totals for tax ==========
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'subtotal');
SET @sql = IF(@col = 0, 'ALTER TABLE sales ADD COLUMN subtotal DECIMAL(10,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'total_discount');
SET @sql = IF(@col = 0, 'ALTER TABLE sales ADD COLUMN total_discount DECIMAL(10,2) NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'total_tax');
SET @sql = IF(@col = 0, 'ALTER TABLE sales ADD COLUMN total_tax DECIMAL(10,2) NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'grand_total');
SET @sql = IF(@col = 0, 'ALTER TABLE sales ADD COLUMN grand_total DECIMAL(10,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========== CHART OF ACCOUNTS ==========
CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  type ENUM('asset','liability','equity','revenue','expense') NOT NULL,
  parent_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_accounts_shop (shop_id),
  INDEX idx_accounts_parent (parent_id),
  INDEX idx_accounts_code (shop_id, code),
  CONSTRAINT fk_accounts_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== JOURNAL ENTRIES ==========
CREATE TABLE IF NOT EXISTS journal_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  date DATE NOT NULL,
  reference VARCHAR(128) NULL,
  description TEXT NULL,
  source_type VARCHAR(64) NULL,
  source_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id INT NULL,
  INDEX idx_journal_shop (shop_id),
  INDEX idx_journal_date (shop_id, date),
  INDEX idx_journal_source (source_type, source_id),
  CONSTRAINT fk_journal_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== JOURNAL LINES ==========
CREATE TABLE IF NOT EXISTS journal_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journal_entry_id INT NOT NULL,
  account_id INT NOT NULL,
  debit DECIMAL(14,2) NOT NULL DEFAULT 0,
  credit DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_journal_lines_entry (journal_entry_id),
  INDEX idx_journal_lines_account (account_id),
  CONSTRAINT fk_journal_lines_entry FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  CONSTRAINT fk_journal_lines_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========== ACCOUNTING PAYMENTS (payment module) ==========
CREATE TABLE IF NOT EXISTS accounting_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  date DATE NOT NULL,
  reference VARCHAR(128) NULL,
  description TEXT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_method VARCHAR(32) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id INT NULL,
  INDEX idx_acct_payments_shop (shop_id),
  INDEX idx_acct_payments_date (shop_id, date),
  CONSTRAINT fk_acct_payments_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NOT NULL,
  account_id INT NOT NULL,
  debit DECIMAL(14,2) NOT NULL DEFAULT 0,
  credit DECIMAL(14,2) NOT NULL DEFAULT 0,
  sale_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payment_lines_payment (payment_id),
  INDEX idx_payment_lines_account (account_id),
  CONSTRAINT fk_payment_lines_payment FOREIGN KEY (payment_id) REFERENCES accounting_payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_lines_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
