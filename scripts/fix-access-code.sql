-- Fix the access code hash for test-school
-- This updates the hash to a valid bcrypt hash for "123456"

UPDATE org_staff_access 
SET access_code_hash = '$2b$10$sUQRw/aW2n0aY7W/k27qgOQe0hOM7IgRBaRJH9Mn8Mv.Thro.bL82',
    rotated_at = now()
WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- Verify the update
SELECT org_id, is_enabled, access_code_hash, rotated_at 
FROM org_staff_access 
WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
