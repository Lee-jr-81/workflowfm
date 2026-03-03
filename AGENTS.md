# AGENTS.md — Project Rules & Intent (Read First)

## Product

A lightweight, mobile-first maintenance work order SaaS for mid-sized facilities teams (schools, colleges, care homes, multi-site SMEs).
This is NOT enterprise CAFM/CMMS. It streamlines the ticket pipeline AND (equally important) provides executive-ready reporting.

Replaces:

- clunky internal systems
- WhatsApp job updates (ticket updates belong inside tickets)
- manual Excel reporting and monthly summaries

Does NOT replace:

- general team chat (WhatsApp still used for coordination)

## Tenancy

- Path-based tenancy: /[orgSlug]/...
- orgSlug is routing only and must never be treated as a security boundary.
- org_id is the security boundary.
- All tenant-owned tables MUST have org_id.
- All reads/writes MUST be scoped to org_id, derived server-side.

## Roles

### Admin (FM Manager)

- org setup
- manage locations, categories, departments
- enable/disable staff request portal + rotate org access code
- invite/manage engineers
- view all jobs, rare override assignment
- reporting dashboard + CSV export + monthly PDF export (if included)

### Engineer

- PWA-first UI
- see unassigned jobs + my jobs
- self-assign (take job)
- notes + before/after photos
- mark complete
- create jobs discovered during the day
- duplicate/clone job for rapid entry

### Staff Requestor (no account)

- request portal is OFF by default, enabled by admin
- access via org link /[orgSlug]/request
- enter org access code once per device (session cookie)
- create tickets + optional photo
- must provide name (string) and select department
- can view ONLY their own submitted tickets (Model A, per device session)

## Security Non-Negotiables

- Supabase Auth for Admin/Engineer.
- RLS enabled on ALL tenant-owned tables.
- Staff requestors NEVER query Supabase directly from the client (no anon reads/writes).
  Staff requests go through server endpoints only, using a requestor session cookie.
- Do not trust any client-provided org_id. Derive org_id from orgSlug + membership/session.
- All job state transitions enforced server-side:
  - NEW -> TAKEN -> COMPLETED
  - timestamps written server-side
  - write a job_events timeline row for each transition
- Storage is private. File access via signed URLs minted server-side after permission checks.
- Rate limit access code verification attempts.

## Data Integrity Rules

- department_id is REQUIRED on jobs (for reporting).
- job_type is enum/check constraint: reactive | install
- status is enum/check constraint: new | taken | completed
- created_at always set; taken_at set only when taken; completed_at set only when completed.
- assigned_to_user_id set only when status=taken/completed.
- job_events is the audit/timeline source of truth.

## Reporting V1 Must Support

Admin dashboard:

- Open jobs counts (new/taken)
- Backlog aging bands (0–7, 8–14, 15–30, 30+ days)
- Median time to take (created -> taken)
- Median time to complete (created -> completed)
- Created vs Completed trend (monthly)
- Jobs by department / location / category
  Exports:
- CSV export for filtered job data (date range + filters)
- Monthly PDF export is optional; if implemented, it must be executive-ready.

## Out of Scope V1 (Do Not Add)

- Asset registers/compliance engine
- contractor marketplace/procurement workflows
- inventory/costing/timesheets
- messaging/chat
- enterprise integrations and approval chains

## Architecture Conventions

- Business logic goes in /server/\* (not React components).
- app/\* routes/pages should stay thin.
- Input validation with zod in server layer.
- Use transactions for multi-write operations (e.g., take job + insert job_event).
- Prefer minimal changes; do not refactor unrelated code.
- Always output: files changed + manual test steps + note any RLS/index changes.

## System Guarantees (Non-Negotiable)

- orgSlug is routing only; org_id is the security boundary.
- All tenant data must include org_id.
- All state transitions must be server-enforced.
- All transitions must create job_events entries.
- Reporting integrity depends on timestamps being written atomically.
- UI must not contain business logic.

## Lifecycle Discipline (Non-Negotiable)

The job lifecycle is strictly:

new → taken → completed

Do NOT introduce:

in_progress

cancelled

reopened

draft

any additional lifecycle states

work_status is NOT a lifecycle state.
It is a sub-status valid only when status = 'taken'.

Transition Requirements

All state transitions must:

Be server-enforced

Validate previous state

Validate actor permissions

Be atomic

Write a corresponding job_events entry

Use server/DB timestamps

Client must never:

Set status directly

Provide org_id

Provide actor IDs

Provide timestamps

Completion Rules

Completion:

Requires resolution text.

Only allowed from taken.

Must atomically set status and completed_at.

Must insert job_events('completed').

Must freeze the job afterward.

Security Model Reminder

orgSlug is routing only; org_id is the security boundary.

All tenant-owned tables must include org_id.

RLS must remain enabled on all tenant tables.

No direct client writes to Supabase.

Storage must remain private; signed URLs minted server-side only.

These additions prevent:

State creep

Partial transitions

Client-side logic leakage

Reporting corruption

Lifecycle drift
