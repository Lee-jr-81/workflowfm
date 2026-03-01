-- ============================================================================
-- Seed Test Data for Development/Testing
-- ============================================================================
-- This migration creates a test organization with sample data for testing
-- the staff request portal (Slice 1).
--
-- IMPORTANT: This is for development/testing only. In production, you would:
-- 1. Remove this migration before deploying
-- 2. Or wrap it in a conditional check for environment
-- 3. Or use a separate seeding mechanism
-- ============================================================================

-- Create test organization
INSERT INTO orgs (id, name, slug, created_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Test School',
  'test-school',
  now()
)
ON CONFLICT (slug) DO NOTHING;

-- Create departments
INSERT INTO departments (org_id, name, sort_order, active, created_at)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Maintenance', 1, true, now()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'IT Support', 2, true, now()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Facilities', 3, true, now())
ON CONFLICT (org_id, name) DO NOTHING;

-- Create locations
INSERT INTO locations (org_id, name, active, created_at)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Main Building', true, now()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Sports Hall', true, now()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Library', true, now()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Science Block', true, now())
ON CONFLICT (org_id, name) DO NOTHING;

-- Create categories
INSERT INTO categories (org_id, name, active, created_at)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Plumbing', true, now()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Electrical', true, now()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'HVAC', true, now()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Carpentry', true, now()),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'General Repairs', true, now())
ON CONFLICT (org_id, name) DO NOTHING;

-- Enable staff portal with access code "123456"
-- Hash: $2b$10$sUQRw/aW2n0aY7W/k27qgOQe0hOM7IgRBaRJH9Mn8Mv.Thro.bL82
-- Generated with: bcrypt.hash('123456', 10)
INSERT INTO org_staff_access (org_id, access_code_hash, is_enabled, rotated_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '$2b$10$sUQRw/aW2n0aY7W/k27qgOQe0hOM7IgRBaRJH9Mn8Mv.Thro.bL82',
  true,
  now()
)
ON CONFLICT (org_id) DO UPDATE SET
  access_code_hash = EXCLUDED.access_code_hash,
  is_enabled = EXCLUDED.is_enabled,
  rotated_at = EXCLUDED.rotated_at;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN org_staff_access.access_code_hash IS 'Test hash is for PIN "123456" - DO NOT use in production!';

-- ============================================================================
-- END OF SEED MIGRATION
-- ============================================================================
