-- Seed license codes for testing / staging. Run after backend has created license_codes table.
-- PLAN: SILVER-XXXX, GOLD-XXXX
-- FEATURE: BRANCH-5-XXXX (max_branches=5)

-- Example plan codes (kind=plan, plan_key=silver/gold)
INSERT IGNORE INTO license_codes (code, kind, plan_key, feature_key, max_branches, expires_at)
VALUES
  ('SILVER-DEMO-001', 'plan', 'silver', NULL, NULL, NULL),
  ('SILVER-DEMO-002', 'plan', 'silver', NULL, NULL, NULL),
  ('GOLD-DEMO-001', 'plan', 'gold', NULL, NULL, NULL),
  ('GOLD-DEMO-002', 'plan', 'gold', NULL, NULL, NULL);

-- Example feature codes (kind=feature, feature_key=multi_branch, max_branches=5)
INSERT IGNORE INTO license_codes (code, kind, plan_key, feature_key, max_branches, expires_at)
VALUES
  ('BRANCH-5-DEMO01', 'feature', NULL, 'multi_branch', 5, NULL),
  ('BRANCH-5-DEMO02', 'feature', NULL, 'multi_branch', 5, NULL),
  ('BRANCH-10-DEMO1', 'feature', NULL, 'multi_branch', 10, NULL);
