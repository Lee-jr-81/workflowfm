-- Allow admins to delete org members (e.g. remove engineers)

CREATE POLICY "Admins can delete org members"
  ON org_members FOR DELETE
  USING (is_org_admin(org_id));
