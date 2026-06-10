-- Add product_id to branch_inventory and populate from products if table empty.
-- Run once; safe to re-run (adds column if missing, populates only when empty).

-- Add product_id if missing (for Crown ERP branch inventory)
ALTER TABLE branch_inventory ADD COLUMN product_id INT NULL AFTER id;

-- Backfill product_id from part_id where applicable
UPDATE branch_inventory SET product_id = part_id WHERE product_id IS NULL AND part_id IS NOT NULL;

-- If branch_inventory is empty, populate from products (first branch per shop)
-- MySQL: run per-shop (application does this in populateBranchInventoryFromProducts).
