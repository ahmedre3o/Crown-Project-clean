-- Crown API – Debt Convert + Returns workflow
-- Idempotent. Run after production-safe-migrations-returns-debts-expenses.sql

SET @db = DATABASE();

-- 1) customer_debts: add status
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'customer_debts' AND COLUMN_NAME = 'status');
SET @sql = IF(@col = 0, "ALTER TABLE customer_debts ADD COLUMN status VARCHAR(32) DEFAULT 'unpaid'", 'SELECT 1');
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

-- 5) customer_debt_items: add quantity_base_units (for stock reduction)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'customer_debt_items' AND COLUMN_NAME = 'quantity_base_units');
SET @sql = IF(@col = 0, 'ALTER TABLE customer_debt_items ADD COLUMN quantity_base_units INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6) return_items: add sale_item_id (link to original sale_item)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'return_items' AND COLUMN_NAME = 'sale_item_id');
SET @sql = IF(@col = 0, 'ALTER TABLE return_items ADD COLUMN sale_item_id BIGINT UNSIGNED NULL AFTER return_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7) sale_items: add quantity_returned (for partial returns validation)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'quantity_returned');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN quantity_returned INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 8) returns: add print_count (for return receipt print tracking)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'returns' AND COLUMN_NAME = 'print_count');
SET @sql = IF(@col = 0, 'ALTER TABLE returns ADD COLUMN print_count INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
