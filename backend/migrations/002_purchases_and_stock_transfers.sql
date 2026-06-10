-- Migrations: Purchase tables + inventory_movements + stock_transfers
-- Run automatically on server start via ensurePurchaseTables() and ensureStockTransferTables() in db.ts

-- Purchase orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  supplier_id INT NULL,
  branch_id INT NULL,
  status ENUM('draft','approved','received','sent','partial','cancelled') DEFAULT 'draft',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_po_shop (shop_id),
  INDEX idx_po_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Purchase order items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  INDEX idx_poi_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Purchase invoices
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  supplier_id INT NULL,
  order_id INT NULL,
  branch_id INT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('draft','paid','unpaid') DEFAULT 'unpaid',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pi_shop (shop_id),
  INDEX idx_pi_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Purchase invoice items (purchase_items)
CREATE TABLE IF NOT EXISTS purchase_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_invoice_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  INDEX idx_pi_items_invoice (purchase_invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Purchase returns
CREATE TABLE IF NOT EXISTS purchase_returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  supplier_id INT NULL,
  invoice_id INT NULL,
  branch_id INT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pr_shop (shop_id),
  INDEX idx_pr_supplier (supplier_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Purchase return items
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  INDEX idx_pri_return (return_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Inventory movements
CREATE TABLE IF NOT EXISTS inventory_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  product_id INT NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'purchase',
  quantity INT NOT NULL,
  reference_type VARCHAR(32) NULL,
  reference_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_im_shop (shop_id),
  INDEX idx_im_product (product_id),
  INDEX idx_im_ref (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Stock transfers (branch-to-branch)
CREATE TABLE IF NOT EXISTS stock_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  from_warehouse_id INT NULL,
  to_warehouse_id INT NULL,
  from_branch_id BIGINT UNSIGNED NULL,
  to_branch_id BIGINT UNSIGNED NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  status ENUM('pending','completed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_st_shop (shop_id),
  INDEX idx_st_branches (from_branch_id, to_branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
