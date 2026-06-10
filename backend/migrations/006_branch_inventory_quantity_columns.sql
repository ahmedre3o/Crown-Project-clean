-- Ensure branch_inventory has quantity, created_at, updated_at and unique_product_branch.
-- The backend runs this automatically on startup (ensureBranchInventoryColumns in db.ts).
-- If you still see "Unknown column 'quantity'", run these manually (ignore Duplicate column/key):
--
-- Inspect: DESCRIBE branch_inventory;  SELECT DATABASE();

ALTER TABLE branch_inventory ADD COLUMN quantity DECIMAL(10,2) DEFAULT 0;
ALTER TABLE branch_inventory ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE branch_inventory ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE branch_inventory ADD UNIQUE KEY unique_product_branch (product_id, branch_id);
