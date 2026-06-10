-- Branch inventory: per-branch stock (which product belongs to which branch).
-- part_id = product id (references products.id). Run via ensureBranchInventoryTable() on server start.

CREATE TABLE IF NOT EXISTS branch_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id INT NOT NULL,
    branch_id INT NOT NULL,
    part_id INT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 0,
    min_quantity DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_branch_part (branch_id, part_id),
    INDEX idx_shop (shop_id),
    INDEX idx_branch (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
