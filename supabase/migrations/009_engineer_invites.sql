-- Engineer invites: pending_invites + trigger to add to org_members when user is created
-- Used by Supabase inviteUserByEmail - user is created immediately, trigger adds them to org

-- ----------------------------------------------------------------------------
-- pending_invites: Tracks invites before user exists in auth.users
-- ----------------------------------------------------------------------------
CREATE TABLE pending_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  role org_member_role NOT NULL DEFAULT 'engineer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(email, org_id)
);

ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (bypasses RLS) can access; trigger runs as definer

-- ----------------------------------------------------------------------------
-- Helper: get user_id by email (for adding existing users to org)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM auth.users WHERE LOWER(email) = LOWER(p_email) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;

-- ----------------------------------------------------------------------------
-- Helper: check if email is already an active org member
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_org_member_by_email(p_org_id uuid, p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members om
    JOIN auth.users au ON au.id = om.user_id
    WHERE om.org_id = p_org_id
      AND LOWER(au.email) = LOWER(p_email)
      AND om.active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_member_by_email(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member_by_email(uuid, text) TO service_role;

-- ----------------------------------------------------------------------------
-- Helper: list org members with emails (for admin engineers list)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_org_members_with_emails(p_org_id uuid)
RETURNS TABLE(user_id uuid, email text, role org_member_role, active boolean, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT om.user_id, au.email, om.role, om.active, om.created_at
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

-- ----------------------------------------------------------------------------
-- Trigger: when auth user is created, add from pending_invites to org_members
-- Fires for inviteUserByEmail (we pre-insert pending_invites) and for signInWithOtp
-- (no pending_invites, so nothing inserted)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_invited_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.org_members (org_id, user_id, role, active)
  SELECT pi.org_id, NEW.id, pi.role, true
  FROM public.pending_invites pi
  WHERE LOWER(pi.email) = LOWER(NEW.email);

  DELETE FROM public.pending_invites WHERE LOWER(email) = LOWER(NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_invited_user();

COMMENT ON TABLE pending_invites IS 'Tracks engineer invites before user exists. Trigger adds to org_members when auth user is created.';
