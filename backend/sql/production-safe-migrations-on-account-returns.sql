-- Crown API – On-Account + Returns integration with Sales
-- Idempotent. Run after production-safe-migrations-returns-debts-expenses.sql

SET @db = DATABASE();

-- 1) sales: add payment_status (paid/unpaid)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'payment_status');
SET @sql = IF(@col = 0, 'ALTER TABLE sales ADD COLUMN payment_status VARCHAR(32) NULL DEFAULT ''paid''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) sales: add paid_at
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'paid_at');
SET @sql = IF(@col = 0, 'ALTER TABLE sales ADD COLUMN paid_at DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) sales: add paid_by_user_id
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'paid_by_user_id');
SET @sql = IF(@col = 0, 'ALTER TABLE sales ADD COLUMN paid_by_user_id BIGINT UNSIGNED NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4) sales: add return_status (null|partial|full)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'return_status');
SET @sql = IF(@col = 0, 'ALTER TABLE sales ADD COLUMN return_status VARCHAR(16) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5) sales: add returned_amount (for partial returns)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'returned_amount');
SET @sql = IF(@col = 0, 'ALTER TABLE sales ADD COLUMN returned_amount DECIMAL(12,2) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6) payment_method: ensure VARCHAR to allow on_account (ENUM may not include it)
SET @col_type = (SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'payment_method');
SET @is_enum = (SELECT @col_type LIKE 'enum%');
SET @sql = IF(@is_enum = 1, "ALTER TABLE sales MODIFY COLUMN payment_method VARCHAR(32) DEFAULT 'cash'", 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7) sale_payments (record when on-account sale is paid)
CREATE TABLE IF NOT EXISTS sale_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id BIGINT UNSIGNED NOT NULL,
  shop_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(32) NULL DEFAULT 'cash',
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sale_payments_sale (sale_id),
  INDEX idx_sale_payments_shop (shop_id),
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8) sale_items: add quantity_returned (for partial returns)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'quantity_returned');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN quantity_returned INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 9) return_items: add sale_item_id (link to original sale_item for partial returns)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'return_items' AND COLUMN_NAME = 'sale_item_id');
SET @sql = IF(@col = 0, 'ALTER TABLE return_items ADD COLUMN sale_item_id BIGINT UNSIGNED NULL AFTER return_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 10) Backfill: existing sales are paid
UPDATE sales SET payment_status = 'paid', paid_at = created_at WHERE payment_status IS NULL OR payment_status = '';
