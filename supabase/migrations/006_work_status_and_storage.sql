-- Slice 4: work_status (sub-status for TAKEN), storage bucket for job photos
-- work_status: active | on_hold, default active when taken

-- 1. Add work_status to jobs
CREATE TYPE work_status AS ENUM ('active', 'on_hold');

ALTER TABLE jobs
  ADD COLUMN work_status work_status,
  ADD COLUMN work_status_note text;

-- Backfill: existing taken jobs get work_status = 'active'
UPDATE jobs SET work_status = 'active' WHERE status = 'taken';

ALTER TABLE jobs
  ALTER COLUMN work_status SET DEFAULT 'active';

-- 3. Update take_job to set work_status = 'active'
CREATE OR REPLACE FUNCTION public.take_job(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
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

  UPDATE jobs
  SET status = 'taken',
      assigned_to_user_id = auth.uid(),
      taken_at = now(),
      work_status = 'active'
  WHERE id = p_job_id
    AND org_id = v_org_id
    AND status = 'new';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_taken');
  END IF;

  INSERT INTO job_events (org_id, job_id, event_type, actor_type, actor_user_id)
  VALUES (v_org_id, p_job_id, 'taken', 'user', auth.uid());

  RETURN jsonb_build_object('ok', true);
END;
$$;

COMMENT ON COLUMN jobs.work_status IS 'Sub-status when status=taken. active | on_hold. Default active.';
COMMENT ON COLUMN jobs.work_status_note IS 'Latest note when on_hold. Full history in job_events.';

-- 2. Create private storage bucket for job photos
-- Path: org/<org_id>/jobs/<job_id>/<uuid>.<ext>
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-photos',
  'job-photos',
  false,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Bucket is private. Access only via server-signed URLs (service role bypasses RLS).
