-- ============================================================================
-- Seed Test Engineer User for Development/Testing
-- ============================================================================
-- This migration adds a test engineer user to the test-school org.
--
-- PREREQUISITES:
-- 1. Create user in Supabase Dashboard -> Authentication -> Users
--    Email: YOUR-REAL-EMAIL (use your own email for testing)
--    Confirm email: Yes
-- 2. Copy the user ID from the created user
-- 3. Replace 'YOUR-USER-ID-HERE' below with the actual UUID
-- 4. Apply this migration
--
-- IMPORTANT: This is for development/testing only.
-- For production, remove this migration or don't apply it.
-- ============================================================================

-- INSTRUCTIONS:
-- Before running this migration, you MUST:
-- 1. Create the user in Supabase Auth UI
-- 2. Replace 'YOUR-USER-ID-HERE' with the actual user ID (UUID format)
--
-- If you don't do this, the migration will fail with a foreign key error.

-- Add engineer membership to test-school org
INSERT INTO org_members (org_id, user_id, role, active, created_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- test-school org
  'b277fa72-1251-421c-8057-0cede6e61e75',                      -- REPLACE THIS with actual user ID from auth.users
  'engineer',
  true,
  now()
)
ON CONFLICT (org_id, user_id) DO UPDATE SET
  active = true,
  role = 'engineer';

-- Create some test jobs for the engineer to see
-- These will appear in the "Unassigned" queue
DO $$
DECLARE
  v_dept_id uuid;
  v_location_id uuid;
  v_category_id uuid;
BEGIN
  -- Get department ID
  SELECT id INTO v_dept_id 
  FROM departments 
  WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' 
    AND name = 'Maintenance' 
  LIMIT 1;

  -- Get location ID
  SELECT id INTO v_location_id 
  FROM locations 
  WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' 
    AND name = 'Main Building' 
  LIMIT 1;

  -- Get category ID
  SELECT id INTO v_category_id 
  FROM categories 
  WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' 
    AND name = 'Plumbing' 
  LIMIT 1;

  -- Insert test jobs if they don't already exist
  INSERT INTO jobs (org_id, department_id, location_id, category_id, title, description, status, job_type, requestor_name, created_at)
  SELECT 
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    v_dept_id,
    v_location_id,
    v_category_id,
    'Fix leaking tap in staff room',
    'The tap is dripping constantly and needs repair urgently',
    'new',
    'reactive',
    'Sarah Johnson',
    now() - interval '2 hours'
  WHERE NOT EXISTS (
    SELECT 1 FROM jobs WHERE title = 'Fix leaking tap in staff room'
  );

  INSERT INTO jobs (org_id, department_id, location_id, category_id, title, description, status, job_type, requestor_name, created_at)
  SELECT 
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    v_dept_id,
    (SELECT id FROM locations WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND name = 'Sports Hall' LIMIT 1),
    (SELECT id FROM categories WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND name = 'Electrical' LIMIT 1),
    'Replace broken light fixture',
    'Light fixture in sports hall is flickering and needs replacement',
    'new',
    'reactive',
    'Mike Thompson',
    now() - interval '5 hours'
  WHERE NOT EXISTS (
    SELECT 1 FROM jobs WHERE title = 'Replace broken light fixture'
  );

  INSERT INTO jobs (org_id, department_id, location_id, title, description, status, job_type, created_at)
  SELECT 
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    v_dept_id,
    (SELECT id FROM locations WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND name = 'Library' LIMIT 1),
    'Install new door lock',
    'New lock needed for library entrance for security upgrade',
    'new',
    'install',
    now() - interval '1 day'
  WHERE NOT EXISTS (
    SELECT 1 FROM jobs WHERE title = 'Install new door lock'
  );
END $$;

-- Verify the engineer membership was created
-- Note: This will only show results if you replaced YOUR-USER-ID-HERE
SELECT 
  om.id,
  om.role,
  om.active,
  u.email,
  o.name as org_name
FROM org_members om
JOIN auth.users u ON om.user_id = u.id
JOIN orgs o ON om.org_id = o.id
WHERE om.user_id = 'b277fa72-1251-421c-8057-0cede6e61e75';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE org_members IS 'Remember to replace YOUR-USER-ID-HERE with actual user ID before running this migration!';

-- ============================================================================
-- END OF SEED MIGRATION
-- ============================================================================
