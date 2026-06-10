-- Crown API – On-Account workflow: debt-first, convert to sale on full payment
-- Idempotent. Run after production-safe-migrations-returns-debts-expenses.sql

SET @db = DATABASE();

-- 1) customer_debts: add status ENUM
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'customer_debts' AND COLUMN_NAME = 'status');
SET @sql = IF(@col = 0, "ALTER TABLE customer_debts ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'unpaid'", 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) customer_debts: add converted_sale_id
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'customer_debts' AND COLUMN_NAME = 'converted_sale_id');
SET @sql = IF(@col = 0, 'ALTER TABLE customer_debts ADD COLUMN converted_sale_id BIGINT UNSIGNED NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) customer_debts: add paid_at
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'customer_debts' AND COLUMN_NAME = 'paid_at');
SET @sql = IF(@col = 0, 'ALTER TABLE customer_debts ADD COLUMN paid_at DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4) customer_debts: add converted_at
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'customer_debts' AND COLUMN_NAME = 'converted_at');
SET @sql = IF(@col = 0, 'ALTER TABLE customer_debts ADD COLUMN converted_at DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5) customer_debt_items: add quantity_base_units (for stock + convert)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'customer_debt_items' AND COLUMN_NAME = 'quantity_base_units');
SET @sql = IF(@col = 0, 'ALTER TABLE customer_debt_items ADD COLUMN quantity_base_units INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6) customer_debt_items: add unit_id (for convert to sale_items)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'customer_debt_items' AND COLUMN_NAME = 'unit_id');
SET @sql = IF(@col = 0, 'ALTER TABLE customer_debt_items ADD COLUMN unit_id BIGINT UNSIGNED NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7) return_items: add sale_item_id if missing
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'return_items' AND COLUMN_NAME = 'sale_item_id');
SET @sql = IF(@col = 0, 'ALTER TABLE return_items ADD COLUMN sale_item_id BIGINT UNSIGNED NULL AFTER return_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
