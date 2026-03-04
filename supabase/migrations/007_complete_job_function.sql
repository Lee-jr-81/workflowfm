-- Slice 5: Atomic complete_job (TAKEN -> COMPLETED)
-- Race-safe, audit trail, optional photo_paths in payload.

CREATE OR REPLACE FUNCTION public.complete_job(
  p_job_id uuid,
  p_resolution_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_role text;
  v_assigned_to uuid;
  v_photo_paths jsonb;
BEGIN
  -- Verify caller is active engineer/admin in the job's org
  SELECT j.org_id, om.role, j.assigned_to_user_id
  INTO v_org_id, v_role, v_assigned_to
  FROM jobs j
  INNER JOIN org_members om ON om.org_id = j.org_id
    AND om.user_id = auth.uid()
    AND om.active = true
    AND om.role IN ('engineer', 'admin')
  WHERE j.id = p_job_id
    AND j.status = 'taken';

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF v_role = 'engineer' AND v_assigned_to IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  -- Validate resolution text (trimmed, non-empty, length-limited)
  IF trim(p_resolution_text) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'resolution_required');
  END IF;

  IF length(trim(p_resolution_text)) > 5000 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'resolution_too_long');
  END IF;

  -- Collect photo paths from job_events (photo_added)
  SELECT COALESCE(
    jsonb_agg((payload->>'path') ORDER BY created_at),
    '[]'::jsonb
  )
  INTO v_photo_paths
  FROM job_events
  WHERE job_id = p_job_id
    AND org_id = v_org_id
    AND event_type = 'photo_added'
    AND payload ? 'path';

  -- Atomic update + event
  UPDATE jobs
  SET status = 'completed',
      completed_at = now()
  WHERE id = p_job_id
    AND org_id = v_org_id
    AND status = 'taken';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_completed');
  END IF;

  INSERT INTO job_events (org_id, job_id, event_type, actor_type, actor_user_id, payload)
  VALUES (
    v_org_id,
    p_job_id,
    'completed',
    'user',
    auth.uid(),
    jsonb_build_object(
      'resolution_text', trim(p_resolution_text),
      'photo_paths', COALESCE(v_photo_paths, '[]'::jsonb)
    )
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_job(uuid, text) TO authenticated;
