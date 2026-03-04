-- Store current access code for admin display (only admins can read org_staff_access)
ALTER TABLE org_staff_access
  ADD COLUMN IF NOT EXISTS access_code_plaintext text;

COMMENT ON COLUMN org_staff_access.access_code_plaintext IS 'Current code for admin display. Updated on rotate.';
