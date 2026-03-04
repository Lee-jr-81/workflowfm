-- Add full_name and company to get_org_members_with_emails (from auth.users raw_user_meta_data)

DROP FUNCTION IF EXISTS public.get_org_members_with_emails(uuid);

CREATE FUNCTION public.get_org_members_with_emails(p_org_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  full_name text,
  company text,
  role org_member_role,
  active boolean,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    om.user_id,
    au.email,
    au.raw_user_meta_data->>'full_name' AS full_name,
    au.raw_user_meta_data->>'company' AS company,
    om.role,
    om.active,
    om.created_at
  FROM org_members om
  JOIN auth.users au ON au.id = om.user_id
  WHERE om.org_id = p_org_id
    AND EXISTS (
      SELECT 1 FROM org_members m
      WHERE m.org_id = p_org_id AND m.user_id = auth.uid() AND m.active = true
    )
  ORDER BY om.role, om.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_members_with_emails(uuid) TO authenticated;
