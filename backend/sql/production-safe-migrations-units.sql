-- Crown API – Packaging Units (piece/pack/carton). Production-safe, idempotent.
-- Run on Cloud SQL (MySQL 5.7+ / 8). Can run multiple times safely.
-- Execute after production-safe-migrations.sql (products, sale_items must exist).

SET @db = DATABASE();

-- 1) product_units: packaging levels (قطعة/علبة/كرتونة)
CREATE TABLE IF NOT EXISTS product_units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  name_ar VARCHAR(64) NOT NULL,
  name_en VARCHAR(64) NULL,
  factor_to_base INT NOT NULL DEFAULT 1,
  level TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_units_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) product_barcodes: barcode -> product mapping
CREATE TABLE IF NOT EXISTS product_barcodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  barcode_value VARCHAR(128) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_product_barcodes_value (barcode_value),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_barcodes_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) products: add carton_packs_count (X) and pack_units_count (Y)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'carton_packs_count');
SET @sql = IF(@col = 0, 'ALTER TABLE products ADD COLUMN carton_packs_count INT NULL DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'pack_units_count');
SET @sql = IF(@col = 0, 'ALTER TABLE products ADD COLUMN pack_units_count INT NULL DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4) sale_items: add unit_id and quantity_base_units
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'unit_id');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN unit_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'sale_items' AND COLUMN_NAME = 'quantity_base_units');
SET @sql = IF(@col = 0, 'ALTER TABLE sale_items ADD COLUMN quantity_base_units INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
