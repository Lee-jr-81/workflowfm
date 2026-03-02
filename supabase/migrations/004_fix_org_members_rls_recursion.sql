-- Fix infinite recursion in org_members RLS policies
--
-- The org_members policies referenced org_members to check membership,
-- causing: "infinite recursion detected in policy for relation org_members"
--
-- Solution: Use a SECURITY DEFINER function that bypasses RLS for the
-- membership check. This breaks the circular dependency.

-- Create helper function (runs with definer privileges, bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_active_org_member(org_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = org_uuid
      AND user_id = auth.uid()
      AND active = true
  );
$$;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Users can read org members" ON org_members;
DROP POLICY IF EXISTS "Admins can insert org members" ON org_members;
DROP POLICY IF EXISTS "Admins can update org members" ON org_members;

-- Create admin check helper (also bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_org_admin(org_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = org_uuid
      AND user_id = auth.uid()
      AND role = 'admin'
      AND active = true
  );
$$;

-- Grant execute so authenticated users can use in RLS
GRANT EXECUTE ON FUNCTION public.is_active_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;

-- Recreate policies using helpers (no recursion)
CREATE POLICY "Users can read org members"
  ON org_members FOR SELECT
  USING (is_active_org_member(org_id));

CREATE POLICY "Admins can insert org members"
  ON org_members FOR INSERT
  WITH CHECK (is_org_admin(org_id));

CREATE POLICY "Admins can update org members"
  ON org_members FOR UPDATE
  USING (is_org_admin(org_id));
