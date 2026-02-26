-- Crown API – Units Pricing + Shop-scoped Barcodes. Production-safe, idempotent.
-- Run after production-safe-migrations-units.sql. Can run multiple times safely.

SET @db = DATABASE();

-- ========== A) product_units: add sell_price, buy_price ==========
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_units' AND COLUMN_NAME = 'sell_price');
SET @sql = IF(@col = 0, 'ALTER TABLE product_units ADD COLUMN sell_price DECIMAL(10,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_units' AND COLUMN_NAME = 'buy_price');
SET @sql = IF(@col = 0, 'ALTER TABLE product_units ADD COLUMN buy_price DECIMAL(10,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index on (product_id, level) if not present
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_units' AND INDEX_NAME = 'idx_product_units_product_level');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_product_units_product_level ON product_units (product_id, level)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========== B) product_barcodes: shop-scoped + unit_id + is_active ==========
-- Add shop_id (must be NOT NULL after backfill)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_barcodes' AND COLUMN_NAME = 'shop_id');
SET @sql = IF(@col = 0, 'ALTER TABLE product_barcodes ADD COLUMN shop_id BIGINT UNSIGNED NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_barcodes' AND COLUMN_NAME = 'unit_id');
SET @sql = IF(@col = 0, 'ALTER TABLE product_barcodes ADD COLUMN unit_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_barcodes' AND COLUMN_NAME = 'is_active');
SET @sql = IF(@col = 0, 'ALTER TABLE product_barcodes ADD COLUMN is_active TINYINT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill shop_id from products
UPDATE product_barcodes pb
JOIN products p ON p.id = pb.product_id
SET pb.shop_id = p.shop_id
WHERE pb.shop_id IS NULL OR pb.shop_id = 0;

-- Remove orphan barcodes (product deleted) so we can safely add NOT NULL
DELETE pb FROM product_barcodes pb
LEFT JOIN products p ON p.id = pb.product_id
WHERE p.id IS NULL AND (pb.shop_id IS NULL OR pb.shop_id = 0);

-- Make shop_id NOT NULL (after backfill)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_barcodes' AND COLUMN_NAME = 'shop_id' AND IS_NULLABLE = 'YES');
SET @sql = IF(@col = 1, 'ALTER TABLE product_barcodes MODIFY COLUMN shop_id BIGINT UNSIGNED NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop old global unique (uq_product_barcodes_value) if present
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_barcodes' AND INDEX_NAME = 'uq_product_barcodes_value');
SET @sql = IF(@idx > 0, 'ALTER TABLE product_barcodes DROP INDEX uq_product_barcodes_value', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create new shop-scoped unique
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_barcodes' AND INDEX_NAME = 'uq_product_barcodes_shop_value');
SET @sql = IF(@idx = 0, 'CREATE UNIQUE INDEX uq_product_barcodes_shop_value ON product_barcodes (shop_id, barcode_value)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index (shop_id, barcode_value) for fast lookup
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_barcodes' AND INDEX_NAME = 'idx_product_barcodes_shop_value');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_product_barcodes_shop_value ON product_barcodes (shop_id, barcode_value)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index (product_id) if not present
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_barcodes' AND INDEX_NAME = 'idx_product_barcodes_product');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_product_barcodes_product ON product_barcodes (product_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
