-- Crown API – Production-safe SQL (no DROP). Uses INFORMATION_SCHEMA to avoid duplicate column/index errors.
-- Run on Cloud SQL (MySQL 5.7+ / 8). Execute as one script (e.g. from mysql client or Cloud Console).

SET @db = DATABASE();

-- 1) users: add employee_id only if missing
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'employee_id');
SET @sql = IF(@col = 0, 'ALTER TABLE users ADD COLUMN employee_id VARCHAR(64) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) users: add email only if missing
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email');
SET @sql = IF(@col = 0, 'ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) users: add index idx_users_shop_employee_id only if missing
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_shop_employee_id');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_users_shop_employee_id ON users (shop_id, employee_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4) users: add UNIQUE ux_users_shop_employee_id only if missing
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND INDEX_NAME = 'ux_users_shop_employee_id');
SET @sql = IF(@idx = 0, 'CREATE UNIQUE INDEX ux_users_shop_employee_id ON users (shop_id, employee_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5) users: add index idx_users_email only if missing
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_email');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_users_email ON users (email)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6) users: add index idx_users_shop_username only if missing
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_shop_username');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_users_shop_username ON users (shop_id, username)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7) user_invites table (shop_id BIGINT UNSIGNED = shops.id); idempotent
CREATE TABLE IF NOT EXISTS user_invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  role VARCHAR(32) NOT NULL,
  employee_id VARCHAR(64) NULL,
  email VARCHAR(255) NULL,
  invite_code VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_invites_shop_code (shop_id, invite_code),
  INDEX idx_user_invites_expires (expires_at),
  CONSTRAINT fk_user_invites_shop FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 8) license_codes (plan/feature activation)
CREATE TABLE IF NOT EXISTS license_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  kind VARCHAR(16) NOT NULL DEFAULT 'plan',
  feature_key VARCHAR(64) NULL,
  plan_key VARCHAR(16) NULL,
  max_branches INT NULL,
  expires_at DATETIME NULL,
  used_by_shop_id INT NULL,
  used_by_user_id INT NULL,
  used_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_license_codes_code (code),
  INDEX idx_license_codes_used (used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 9) shop_features (e.g. multi_branch)
CREATE TABLE IF NOT EXISTS shop_features (
  shop_id INT NOT NULL,
  feature_key VARCHAR(64) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  max_limit INT NULL,
  activated_at DATETIME NULL,
  expires_at DATETIME NULL,
  PRIMARY KEY (shop_id, feature_key),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  INDEX idx_shop_features_key (feature_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 10) shop_subscriptions (plan per shop)
CREATE TABLE IF NOT EXISTS shop_subscriptions (
  shop_id INT NOT NULL PRIMARY KEY,
  plan VARCHAR(16) NOT NULL DEFAULT 'bronze',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10.1) shop_subscriptions: activation metadata (safe adds)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'shop_subscriptions' AND COLUMN_NAME = 'activation_code');
SET @sql = IF(@col = 0, 'ALTER TABLE shop_subscriptions ADD COLUMN activation_code VARCHAR(128) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'shop_subscriptions' AND COLUMN_NAME = 'activation_source');
SET @sql = IF(@col = 0, 'ALTER TABLE shop_subscriptions ADD COLUMN activation_source VARCHAR(32) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'shop_subscriptions' AND COLUMN_NAME = 'activated_by_user_id');
SET @sql = IF(@col = 0, 'ALTER TABLE shop_subscriptions ADD COLUMN activated_by_user_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'shop_subscriptions' AND COLUMN_NAME = 'last_activated_at');
SET @sql = IF(@col = 0, 'ALTER TABLE shop_subscriptions ADD COLUMN last_activated_at DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 10.2) licenses: add smart activation fields if table exists
SET @tbl = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'licenses');
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'licenses' AND COLUMN_NAME = 'duration_days');
SET @sql = IF(@tbl = 1 AND @col = 0, 'ALTER TABLE licenses ADD COLUMN duration_days INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 10.3) notifications: enforce utf8mb4 collation on table/columns
SET @tbl = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'notifications');

SET @sql = IF(@tbl = 1, 'ALTER TABLE notifications CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@tbl = 1, 'ALTER TABLE notifications MODIFY COLUMN title_ar VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT ''''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@tbl = 1, 'ALTER TABLE notifications MODIFY COLUMN title_en VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT ''''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@tbl = 1, 'ALTER TABLE notifications MODIFY COLUMN body_ar TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@tbl = 1, 'ALTER TABLE notifications MODIFY COLUMN body_en TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- notifications: add payload JSON if missing + backfill from meta
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'payload');
SET @sql = IF(@tbl = 1 AND @col = 0, 'ALTER TABLE notifications ADD COLUMN payload JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@tbl = 1, 'UPDATE notifications SET payload = meta WHERE payload IS NULL AND meta IS NOT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'licenses' AND COLUMN_NAME = 'permissions_json');
SET @sql = IF(@tbl = 1 AND @col = 0, 'ALTER TABLE licenses ADD COLUMN permissions_json JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'licenses' AND COLUMN_NAME = 'used_by_shop_id');
SET @sql = IF(@tbl = 1 AND @col = 0, 'ALTER TABLE licenses ADD COLUMN used_by_shop_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'licenses' AND COLUMN_NAME = 'code_expires_at');
SET @sql = IF(@tbl = 1 AND @col = 0, 'ALTER TABLE licenses ADD COLUMN code_expires_at TIMESTAMP NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'licenses' AND COLUMN_NAME = 'duration');
SET @sql = IF(@tbl = 1 AND @col = 1, 'ALTER TABLE licenses MODIFY COLUMN duration VARCHAR(32) NOT NULL DEFAULT ''monthly''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 11) users: add last_seen_at only if missing (for online/active tracking)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_seen_at');
SET @sql = IF(@col = 0, 'ALTER TABLE users ADD COLUMN last_seen_at DATETIME NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 12) users: index on last_seen_at for fast online/active queries
SET @idx = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_last_seen_at');
SET @sql = IF(@idx = 0, 'CREATE INDEX idx_users_last_seen_at ON users (last_seen_at)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 13) shops: add business_name_ar / business_name_en if missing
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'shops' AND COLUMN_NAME = 'business_name_ar');
SET @sql = IF(@col = 0, 'ALTER TABLE shops ADD COLUMN business_name_ar VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'shops' AND COLUMN_NAME = 'business_name_en');
SET @sql = IF(@col = 0, 'ALTER TABLE shops ADD COLUMN business_name_en VARCHAR(255) NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 14) shops: migrate existing business_name into both AR/EN name columns (idempotent)
UPDATE shops
SET
  business_name_ar = COALESCE(business_name_ar, business_name),
  business_name_en = COALESCE(business_name_en, business_name)
WHERE business_name IS NOT NULL AND business_name <> '';

-- 15) products: add is_deleted (soft-delete) if missing – fixes "Unknown column 'p.is_deleted'" in production
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'is_deleted');
SET @sql = IF(@col = 0, 'ALTER TABLE products ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 15b) products: add gallery_urls_json for product image gallery
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'products' AND COLUMN_NAME = 'gallery_urls_json');
SET @sql = IF(@col = 0, 'ALTER TABLE products ADD COLUMN gallery_urls_json JSON NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 16) sale_items table if missing – fixes "Table crown_services.sale_items doesn't exist"
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

-- 17) notifications: enforce utf8mb4 table/columns (mojibake guard)
SET @tbl = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'notifications');
SET @sql = IF(@tbl = 1, 'ALTER TABLE notifications CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


