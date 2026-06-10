-- Crown API – Production-safe migration: Discounts + Coupons
-- Idempotent via information_schema checks. Run on Cloud SQL (MySQL 5.7+ / 8).
-- Usage: mysql -h 127.0.0.1 -P 9470 -u crown_admin -p crown_services_dev < backend/sql/production-safe-migrations-discounts-coupons.sql

SET @db = DATABASE();

-- 1) products: add discount_type (none|percent|fixed)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'discount_type');
SET @sql = IF(@col = 0, 'ALTER TABLE products ADD COLUMN discount_type VARCHAR(16) NOT NULL DEFAULT ''none''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) products: add discount_value
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'discount_value');
SET @sql = IF(@col = 0, 'ALTER TABLE products ADD COLUMN discount_value DECIMAL(10,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) products: add discount_active
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'discount_active');
SET @sql = IF(@col = 0, 'ALTER TABLE products ADD COLUMN discount_active TINYINT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4) coupons table (shop-scoped; shop_id BIGINT UNSIGNED to match shops.id)
CREATE TABLE IF NOT EXISTS coupons (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(64) NOT NULL,
  type VARCHAR(16) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  is_active TINYINT NOT NULL DEFAULT 1,
  starts_at DATETIME NULL,
  expires_at DATETIME NULL,
  usage_limit INT NULL,
  usage_count INT NOT NULL DEFAULT 0,
  min_order_total DECIMAL(10,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_coupons_shop_code (shop_id, code),
  INDEX idx_coupons_shop_active (shop_id, is_active),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5) online_orders: add coupon_id
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'online_orders' AND COLUMN_NAME = 'coupon_id');
SET @sql = IF(@col = 0, 'ALTER TABLE online_orders ADD COLUMN coupon_id BIGINT UNSIGNED NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6) online_orders: add coupon_code
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'online_orders' AND COLUMN_NAME = 'coupon_code');
SET @sql = IF(@col = 0, 'ALTER TABLE online_orders ADD COLUMN coupon_code VARCHAR(64) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7) online_orders: add discount_total
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'online_orders' AND COLUMN_NAME = 'discount_total');
SET @sql = IF(@col = 0, 'ALTER TABLE online_orders ADD COLUMN discount_total DECIMAL(10,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 8) online_orders: add total_before_discount
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'online_orders' AND COLUMN_NAME = 'total_before_discount');
SET @sql = IF(@col = 0, 'ALTER TABLE online_orders ADD COLUMN total_before_discount DECIMAL(10,2) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 9) Add FK from online_orders.coupon_id to coupons.id (only if coupons exists and column exists)
SET @tbl = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'coupons');
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'online_orders' AND COLUMN_NAME = 'coupon_id');
SET @fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'online_orders' AND CONSTRAINT_NAME = 'fk_online_orders_coupon');
SET @sql = IF(@tbl = 1 AND @col = 1 AND @fk = 0, 'ALTER TABLE online_orders ADD CONSTRAINT fk_online_orders_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
