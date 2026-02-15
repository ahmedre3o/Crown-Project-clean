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
