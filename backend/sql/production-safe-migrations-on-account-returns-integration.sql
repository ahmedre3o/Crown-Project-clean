-- Crown API – On-Account + Returns integration with Sales
-- Idempotent. Run after production-safe-migrations-returns-debts-expenses.sql

SET @db = DATABASE();

-- 1) sales: add payment_status (paid/unpaid)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'payment_status');
SET @sql = IF(@col = 0, "ALTER TABLE sales ADD COLUMN payment_status VARCHAR(16) DEFAULT 'paid'", 'SELECT 1');
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

-- 4) sales: add on_account to payment_method ENUM (MySQL 5.7+)
SET @def = (SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'payment_method');
SET @has_on_account = (SELECT @def LIKE '%on_account%');
SET @sql = IF(@has_on_account = 0, "ALTER TABLE sales MODIFY COLUMN payment_method ENUM('cash', 'card', 'other', 'invoice', 'on_account') DEFAULT 'cash'", 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5) sales: add return_status
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'return_status');
SET @sql = IF(@col = 0, "ALTER TABLE sales ADD COLUMN return_status VARCHAR(16) DEFAULT 'none'", 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6) sales: add amount_returned
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sales' AND COLUMN_NAME = 'amount_returned');
SET @sql = IF(@col = 0, 'ALTER TABLE sales ADD COLUMN amount_returned DECIMAL(12,2) DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7) sale_items: add quantity_returned (for partial returns)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'quantity_returned');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN quantity_returned INT DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 8) return_items: add sale_item_id and quantity_base_units (for correct stock restore)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'return_items' AND COLUMN_NAME = 'sale_item_id');
SET @sql = IF(@col = 0, 'ALTER TABLE return_items ADD COLUMN sale_item_id BIGINT UNSIGNED NULL AFTER return_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'return_items' AND COLUMN_NAME = 'quantity_base_units');
SET @sql = IF(@col = 0, 'ALTER TABLE return_items ADD COLUMN quantity_base_units INT NULL DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 9) sale_payments (for on-account payment records)
CREATE TABLE IF NOT EXISTS sale_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sale_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_by_user_id BIGINT UNSIGNED NULL,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sale_payments_sale (sale_id),
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
