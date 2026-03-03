-- Atomic take_job: NEW -> TAKEN
-- Race-safe, single winner, audit trail.
-- Returns: { "ok": true } or { "ok": false, "reason": "already_taken" | "not_found" }

CREATE OR REPLACE FUNCTION public.take_job(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Verify caller is active engineer/admin in the job's org
  SELECT j.org_id INTO v_org_id
  FROM jobs j
  INNER JOIN org_members om ON om.org_id = j.org_id
    AND om.user_id = auth.uid()
    AND om.active = true
    AND om.role IN ('engineer', 'admin')
  WHERE j.id = p_job_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  -- Atomic conditional update (single winner)
  UPDATE jobs
  SET status = 'taken',
      assigned_to_user_id = auth.uid(),
      taken_at = now()
  WHERE id = p_job_id
    AND org_id = v_org_id
    AND status = 'new';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_taken');
  END IF;

  -- Audit event
  INSERT INTO job_events (org_id, job_id, event_type, actor_type, actor_user_id)
  VALUES (v_org_id, p_job_id, 'taken', 'user', auth.uid());

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.take_job(uuid) TO authenticated;
