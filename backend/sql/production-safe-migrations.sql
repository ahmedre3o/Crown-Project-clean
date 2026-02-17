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
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
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
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  kind VARCHAR(16) NOT NULL DEFAULT 'plan',
  feature_key VARCHAR(64) NULL,
  plan_key VARCHAR(16) NULL,
  max_branches INT NULL,
  expires_at DATETIME NULL,
  used_by_shop_id BIGINT UNSIGNED NULL,
  used_by_user_id BIGINT UNSIGNED NULL,
  used_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_license_codes_code (code),
  INDEX idx_license_codes_used (used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9) shop_features (e.g. multi_branch)
CREATE TABLE IF NOT EXISTS shop_features (
  shop_id BIGINT UNSIGNED NOT NULL,
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
  shop_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  plan VARCHAR(16) NOT NULL DEFAULT 'bronze',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
