-- Normalize branch_inventory: single product_id and quantity; UNIQUE(shop_id, branch_id, product_id).
-- The backend runs normalizeBranchInventorySchema() on startup (drops qty/part_id, adds unique key).
-- This file is for reference. Run manually only if needed (omit steps that fail due to missing column/index).

-- 1. Drop legacy columns (skip if column does not exist)
-- ALTER TABLE branch_inventory DROP COLUMN qty;
-- ALTER TABLE branch_inventory DROP COLUMN part_id;

-- 2. Drop old unique keys (skip if index does not exist)
-- ALTER TABLE branch_inventory DROP INDEX unique_branch_part;
-- ALTER TABLE branch_inventory DROP INDEX unique_product_branch;

-- 3. Add normalized unique constraint
-- ALTER TABLE branch_inventory ADD UNIQUE KEY unique_shop_branch_product (shop_id, branch_id, product_id);

-- Expected: id, shop_id, branch_id, product_id, quantity, created_at, updated_at
-- Verify: SELECT branch_id, quantity FROM branch_inventory WHERE product_id = 44;
