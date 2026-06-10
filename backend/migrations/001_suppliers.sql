-- Migration: suppliers table
-- Run automatically on server start via ensureSuppliersTable() in db.ts
-- Manual run: execute this against your database if needed.

CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  address TEXT NULL,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  shop_id INT NOT NULL,
  branch_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_suppliers_shop (shop_id),
  INDEX idx_suppliers_branch (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional: add columns to existing table (if it was created with old schema)
-- ALTER TABLE suppliers ADD COLUMN email VARCHAR(255) NULL AFTER phone;
-- ALTER TABLE suppliers ADD COLUMN branch_id INT NULL AFTER shop_id;
