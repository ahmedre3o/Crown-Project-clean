-- Print audit + sales return branch (run if API init not yet deployed)
CREATE TABLE IF NOT EXISTS print_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  type VARCHAR(64) NOT NULL,
  reference_id BIGINT NOT NULL DEFAULT 0,
  branch_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  printed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_shop_time (shop_id, printed_at),
  INDEX idx_type_ref (type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sales returns: branch where return is attributed
ALTER TABLE returns ADD COLUMN branch_id BIGINT UNSIGNED NULL;
-- If column exists, ignore error in production (duplicate column)
