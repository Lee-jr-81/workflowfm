-- ============================================================================
-- WorkflowFM V1 Core Schema Migration
-- ============================================================================
-- This migration creates the core database schema for a multi-tenant
-- maintenance work order system with path-based tenancy and RLS security.
--
-- Security model:
-- - org_id is the security boundary (NOT orgSlug)
-- - All tenant-owned tables include org_id
-- - RLS enabled on all tables
-- - Staff requestors use server endpoints only (no anon access)
-- ============================================================================

-- ============================================================================
-- ENUMS & TYPES
-- ============================================================================

CREATE TYPE org_member_role AS ENUM ('admin', 'engineer');
CREATE TYPE job_status AS ENUM ('new', 'taken', 'completed');
CREATE TYPE job_type AS ENUM ('reactive', 'install');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- orgs: Organization master table
-- ----------------------------------------------------------------------------
CREATE TABLE orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- org_members: User membership with role (admin|engineer)
-- ----------------------------------------------------------------------------
CREATE TABLE org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_member_role NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- ----------------------------------------------------------------------------
-- departments: Required for jobs (org-scoped)
-- ----------------------------------------------------------------------------
CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

-- ----------------------------------------------------------------------------
-- locations: Optional job metadata (org-scoped)
-- ----------------------------------------------------------------------------
CREATE TABLE locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

-- ----------------------------------------------------------------------------
-- categories: Optional job metadata (org-scoped)
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

-- ----------------------------------------------------------------------------
-- org_staff_access: Staff portal access code config (1:1 with orgs)
-- ----------------------------------------------------------------------------
CREATE TABLE org_staff_access (
  org_id uuid PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  access_code_hash text,
  is_enabled boolean NOT NULL DEFAULT false,
  rotated_at timestamptz
);

-- ----------------------------------------------------------------------------
-- requestor_sessions: Anonymous staff sessions (per device)
-- ----------------------------------------------------------------------------
CREATE TABLE requestor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

-- ----------------------------------------------------------------------------
-- jobs: Core work order table
-- ----------------------------------------------------------------------------
CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  status job_status NOT NULL DEFAULT 'new',
  job_type job_type NOT NULL DEFAULT 'reactive',
  priority smallint,
  title text NOT NULL,
  description text,
  requestor_name text,
  requestor_session_id uuid REFERENCES requestor_sessions(id) ON DELETE SET NULL,
  assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  taken_at timestamptz,
  completed_at timestamptz
);

-- ----------------------------------------------------------------------------
-- job_events: Audit timeline for all job state changes
-- ----------------------------------------------------------------------------
CREATE TABLE job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_type text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb
);

-- ============================================================================
-- INDEXES (optimized for queues + reporting)
-- ============================================================================

-- Jobs: queue queries (unassigned + status filtering)
CREATE INDEX idx_jobs_org_status_created 
  ON jobs(org_id, status, created_at DESC);

-- Jobs: "my jobs" queries
CREATE INDEX idx_jobs_org_assigned_status 
  ON jobs(org_id, assigned_to_user_id, status) 
  WHERE assigned_to_user_id IS NOT NULL;

-- Jobs: department reporting
CREATE INDEX idx_jobs_org_department_created 
  ON jobs(org_id, department_id, created_at DESC);

-- Jobs: location reporting
CREATE INDEX idx_jobs_org_location_created 
  ON jobs(org_id, location_id, created_at DESC) 
  WHERE location_id IS NOT NULL;

-- Jobs: category reporting
CREATE INDEX idx_jobs_org_category_created 
  ON jobs(org_id, category_id, created_at DESC) 
  WHERE category_id IS NOT NULL;

-- Job events: timeline queries
CREATE INDEX idx_job_events_org_job_created 
  ON job_events(org_id, job_id, created_at DESC);

-- Org members: lookup by user_id for membership checks
CREATE INDEX idx_org_members_user_id 
  ON org_members(user_id) 
  WHERE active = true;

-- Requestor sessions: lookup by org_id for session validation
CREATE INDEX idx_requestor_sessions_org 
  ON requestor_sessions(org_id, created_at DESC) 
  WHERE revoked_at IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tenant-owned tables
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_staff_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE requestor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: orgs
-- ============================================================================

-- Users can read orgs they are active members of
CREATE POLICY "Users can read their orgs"
  ON orgs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = orgs.id
        AND org_members.user_id = auth.uid()
        AND org_members.active = true
    )
  );

-- Admins can update their org details
CREATE POLICY "Admins can update their org"
  ON orgs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = orgs.id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
        AND org_members.active = true
    )
  );

-- ============================================================================
-- RLS POLICIES: org_members
-- ============================================================================

-- Users can read members of orgs they belong to
CREATE POLICY "Users can read org members"
  ON org_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members AS my_membership
      WHERE my_membership.org_id = org_members.org_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.active = true
    )
  );

-- Admins can insert new members
CREATE POLICY "Admins can insert org members"
  ON org_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members AS my_membership
      WHERE my_membership.org_id = org_members.org_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.role = 'admin'
        AND my_membership.active = true
    )
  );

-- Admins can update members (role changes, deactivation)
CREATE POLICY "Admins can update org members"
  ON org_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members AS my_membership
      WHERE my_membership.org_id = org_members.org_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.role = 'admin'
        AND my_membership.active = true
    )
  );

-- ============================================================================
-- RLS POLICIES: departments
-- ============================================================================

-- Users can read departments of orgs they belong to
CREATE POLICY "Users can read departments"
  ON departments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = departments.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.active = true
    )
  );

-- Admins can insert departments
CREATE POLICY "Admins can insert departments"
  ON departments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = departments.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
        AND org_members.active = true
    )
  );

-- Admins can update departments
CREATE POLICY "Admins can update departments"
  ON departments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = departments.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
        AND org_members.active = true
    )
  );

-- ============================================================================
-- RLS POLICIES: locations
-- ============================================================================

-- Users can read locations of orgs they belong to
CREATE POLICY "Users can read locations"
  ON locations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = locations.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.active = true
    )
  );

-- Admins can insert locations
CREATE POLICY "Admins can insert locations"
  ON locations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = locations.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
        AND org_members.active = true
    )
  );

-- Admins can update locations
CREATE POLICY "Admins can update locations"
  ON locations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = locations.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
        AND org_members.active = true
    )
  );

-- ============================================================================
-- RLS POLICIES: categories
-- ============================================================================

-- Users can read categories of orgs they belong to
CREATE POLICY "Users can read categories"
  ON categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = categories.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.active = true
    )
  );

-- Admins can insert categories
CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = categories.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
        AND org_members.active = true
    )
  );

-- Admins can update categories
CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = categories.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
        AND org_members.active = true
    )
  );

-- ============================================================================
-- RLS POLICIES: org_staff_access
-- ============================================================================

-- Admins can read staff access config for their org
CREATE POLICY "Admins can read staff access config"
  ON org_staff_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = org_staff_access.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
        AND org_members.active = true
    )
  );

-- Admins can insert staff access config
CREATE POLICY "Admins can insert staff access config"
  ON org_staff_access FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = org_staff_access.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
        AND org_members.active = true
    )
  );

-- Admins can update staff access config
CREATE POLICY "Admins can update staff access config"
  ON org_staff_access FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = org_staff_access.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.role = 'admin'
        AND org_members.active = true
    )
  );

-- ============================================================================
-- RLS POLICIES: requestor_sessions
-- ============================================================================

-- No direct client access to requestor_sessions
-- Server endpoints will use service role to manage sessions

-- ============================================================================
-- RLS POLICIES: jobs
-- ============================================================================

-- Users can read jobs for orgs they belong to
CREATE POLICY "Users can read jobs"
  ON jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = jobs.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.active = true
    )
  );

-- Users can insert jobs (engineers creating discovered jobs, admins creating jobs)
CREATE POLICY "Users can insert jobs"
  ON jobs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = jobs.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.active = true
    )
  );

-- Users can update jobs (state transitions enforced in server endpoints)
CREATE POLICY "Users can update jobs"
  ON jobs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = jobs.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.active = true
    )
  );

-- ============================================================================
-- RLS POLICIES: job_events
-- ============================================================================

-- Users can read job events for orgs they belong to
CREATE POLICY "Users can read job events"
  ON job_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = job_events.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.active = true
    )
  );

-- Users can insert job events (audit trail)
CREATE POLICY "Users can insert job events"
  ON job_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = job_events.org_id
        AND org_members.user_id = auth.uid()
        AND org_members.active = true
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS (optional, for future use)
-- ============================================================================

-- Function to get user's org_id from orgSlug (for server-side use)
CREATE OR REPLACE FUNCTION get_org_id_for_user(p_org_slug text, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT o.id INTO v_org_id
  FROM orgs o
  INNER JOIN org_members om ON om.org_id = o.id
  WHERE o.slug = p_org_slug
    AND om.user_id = p_user_id
    AND om.active = true;
  
  RETURN v_org_id;
END;
$$;

-- ============================================================================
-- COMMENTS (for documentation)
-- ============================================================================

COMMENT ON TABLE orgs IS 'Organization master table. Each org is a tenant.';
COMMENT ON TABLE org_members IS 'User membership with role (admin|engineer). Active members can access org data.';
COMMENT ON TABLE departments IS 'Departments within an org. Required for jobs (for reporting).';
COMMENT ON TABLE locations IS 'Locations within an org. Optional job metadata.';
COMMENT ON TABLE categories IS 'Categories/trades within an org. Optional job metadata.';
COMMENT ON TABLE org_staff_access IS 'Staff portal access code config (1:1 with orgs). Controls if staff can submit tickets.';
COMMENT ON TABLE requestor_sessions IS 'Anonymous staff sessions (per device). Used to track staff-submitted tickets.';
COMMENT ON TABLE jobs IS 'Core work order table. Status: new -> taken -> completed.';
COMMENT ON TABLE job_events IS 'Audit timeline for all job state changes. Source of truth for job history.';

COMMENT ON COLUMN jobs.department_id IS 'Required for reporting. Cannot be null.';
COMMENT ON COLUMN jobs.status IS 'Job status: new (unassigned) | taken (assigned) | completed (closed).';
COMMENT ON COLUMN jobs.job_type IS 'Job type: reactive (fix/repair) | install (new work).';
COMMENT ON COLUMN jobs.taken_at IS 'Set when status changes to taken. Null for new jobs.';
COMMENT ON COLUMN jobs.completed_at IS 'Set when status changes to completed. Null for new/taken jobs.';
COMMENT ON COLUMN jobs.requestor_session_id IS 'Links to requestor_sessions for staff-submitted tickets. Null for engineer-created jobs.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
