-- Crown API – Production-safe migration: Returns, On-Account (Debts), Expenses
-- Idempotent via information_schema. Run on Cloud SQL (MySQL 5.7+ / 8).

SET @db = DATABASE();

-- 1) returns table
CREATE TABLE IF NOT EXISTS returns (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  sale_id BIGINT UNSIGNED NULL,
  online_order_id BIGINT UNSIGNED NULL,
  return_number VARCHAR(64) NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  reason VARCHAR(255) NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_returns_shop (shop_id),
  INDEX idx_returns_sale (sale_id),
  INDEX idx_returns_online_order (online_order_id),
  INDEX idx_returns_created (created_at),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) return_items table
CREATE TABLE IF NOT EXISTS return_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  return_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_return_items_return (return_id),
  INDEX idx_return_items_product (product_id),
  FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3) customer_debts table (on-account / على الحساب)
CREATE TABLE IF NOT EXISTS customer_debts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(64) NULL,
  total_due DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customer_debts_shop (shop_id),
  INDEX idx_customer_debts_phone (customer_phone),
  INDEX idx_customer_debts_name (customer_name(100)),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) customer_debt_payments table
CREATE TABLE IF NOT EXISTS customer_debt_payments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  debt_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(32) NULL DEFAULT 'cash',
  notes TEXT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_debt_payments_debt (debt_id),
  FOREIGN KEY (debt_id) REFERENCES customer_debts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5) customer_debt_items (unpaid items per debt)
CREATE TABLE IF NOT EXISTS customer_debt_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  debt_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  description VARCHAR(255) NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_debt_items_debt (debt_id),
  FOREIGN KEY (debt_id) REFERENCES customer_debts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6) expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  category VARCHAR(64) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NULL,
  expense_date DATE NOT NULL,
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_expenses_shop (shop_id),
  INDEX idx_expenses_date (expense_date),
  INDEX idx_expenses_category (category),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
