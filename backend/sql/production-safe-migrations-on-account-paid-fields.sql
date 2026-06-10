-- Crown API – On-Account: paid_amount, paid_by_user_id for debt history
-- Idempotent. Run after production-safe-migrations-on-account-workflow.sql

SET @db = DATABASE();

-- 1) customer_debts: add paid_amount
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'customer_debts' AND COLUMN_NAME = 'paid_amount');
SET @sql = IF(@col = 0, "ALTER TABLE customer_debts ADD COLUMN paid_amount DECIMAL(12,2) NULL AFTER paid_at", 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) customer_debts: add paid_by_user_id
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'customer_debts' AND COLUMN_NAME = 'paid_by_user_id');
SET @sql = IF(@col = 0, 'ALTER TABLE customer_debts ADD COLUMN paid_by_user_id BIGINT UNSIGNED NULL AFTER paid_amount', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
