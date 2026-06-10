-- Crown API – Expenses: updated_by_user_id for audit
-- Idempotent. Run after production-safe-migrations-returns-debts-expenses.sql

SET @db = DATABASE();

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'expenses' AND COLUMN_NAME = 'updated_by_user_id');
SET @sql = IF(@col = 0, 'ALTER TABLE expenses ADD COLUMN updated_by_user_id BIGINT UNSIGNED NULL AFTER updated_at', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
