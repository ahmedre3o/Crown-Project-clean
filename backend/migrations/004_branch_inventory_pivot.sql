-- Pivot table: product (part_id) <-> branch (branch_id). Used by PUT /api/admin/branch-inventory/product/:id
-- shop_id for multi-tenant; if table exists from 003 this is a no-op.
CREATE TABLE IF NOT EXISTS branch_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id INT NOT NULL DEFAULT 1,
    branch_id INT NOT NULL,
    part_id INT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 0,
    UNIQUE KEY unique_branch_part (branch_id, part_id)
);
