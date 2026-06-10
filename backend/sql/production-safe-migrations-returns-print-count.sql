-- Crown API – Returns: add print_count
-- Idempotent. Run after production-safe-migrations-returns-debts-expenses.sql

SET @db = DATABASE();

-- returns: add print_count
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'returns' AND COLUMN_NAME = 'print_count');
SET @sql = IF(@col = 0, 'ALTER TABLE returns ADD COLUMN print_count INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
