-- Crown API – Production-safe migration: sale_items discount columns
-- Idempotent via information_schema checks. Run on Cloud SQL (MySQL 5.7+ / 8).
-- Usage: mysql -h 127.0.0.1 -P 9470 -u crown_admin -p crown_services_dev < backend/sql/production-safe-migrations-sale-items-discount.sql

SET @db = DATABASE();

-- 1) sale_items: add unit_price_before_discount
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'unit_price_before_discount');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN unit_price_before_discount DECIMAL(10,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) sale_items: add unit_discount
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'unit_discount');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN unit_discount DECIMAL(10,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) sale_items: add discount_type
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'discount_type');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN discount_type VARCHAR(16) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4) sale_items: add discount_value
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'discount_value');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN discount_value DECIMAL(10,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5) sale_items: add discount_applied
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'discount_applied');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN discount_applied TINYINT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
