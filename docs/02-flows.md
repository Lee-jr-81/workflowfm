# Core User Flows (V1)

## 1) Admin setup flow

1. Admin creates org (name, slug) and becomes org admin.
2. Admin configures:
   - Departments (required for tickets)
   - Locations
   - Categories/trades
3. Admin enables Staff Request Portal (optional):
   - toggles on
   - sets/rotates org access code
4. Admin invites engineers (internal or contractor) via email.

## 2) Staff requestor flow (Model A)

Precondition: request portal enabled by admin.

1. Staff opens /[orgSlug]/request
2. Enter org access code (6 digits)
3. Session created and stored as secure httpOnly cookie (per device)
4. Staff creates ticket:
   - name (string)
   - department (required)
   - location (optional if desired)
   - category (optional if desired)
   - description
   - optional photo
5. Staff sees confirmation + "My tickets" list
6. Staff can view only their own submitted tickets and their statuses/timeline.

## 3) Engineer flow (PWA)

1. Engineer signs in via email (magic link).
2. Engineer home shows:
   - Unassigned (NEW)
   - My jobs (TAKEN)
   - Completed (recent)
3. Engineer takes a job:
   - system sets assigned_to_user_id
   - status NEW -> TAKEN
   - taken_at set
   - job_events row written
4. Engineer updates job:
   - notes (speech-to-text optional later)
   - before/after photos
   - job_events row written for updates
5. Engineer completes job:
   - status TAKEN -> COMPLETED
   - completed_at set
   - job_events row written
6. Engineer can create discovered jobs and duplicate jobs.

## 4) Admin oversight & reporting flow

1. Admin dashboard shows:
   - open jobs + aging bands
   - median time to take + complete
   - created vs completed trend
   - breakdown by department/location/category
2. Admin views jobs list and individual job detail.
3. Admin exports:
   - CSV for filtered jobs (date range + filters)
   - Monthly summary export (PDF optional)

## 5) Job status model

- NEW: unassigned
- TAKEN: assigned to an engineer
- COMPLETED: closed
  All transitions write job_events and timestamps.

## Job State Machine (Authoritative)

Allowed states:

- new
- taken
- completed

Allowed transitions:

new → taken
taken → completed

No other transitions allowed.

Transitions must:

- Be enforced server-side
- Validate previous state
- Validate actor permissions
- Write a job_events row
- Write timestamps atomically

## Actor Capability Matrix

| Actor     | Create | Take | Complete | Configure |
| --------- | ------ | ---- | -------- | --------- |
| Requestor | ✅     | ❌   | ❌       | ❌        |
| Engineer  | ✅     | ✅   | ✅       | ❌        |
| Admin     | ✅     | ✅   | ✅       | ✅        |

## Job Lifecycle (Authoritative)

The job lifecycle is strictly:

new → taken → completed

No other lifecycle states exist.

Allowed Transitions

new → taken

taken → completed

Forbidden Transitions

new → completed

completed → any

taken → new

Any implicit state skipping

All transitions must:

Be enforced server-side

Validate previous state

Validate actor permissions

Write a job_events row

Write timestamps atomically

Use server/DB time (never client time)

Work Status (Sub-State of TAKEN Only)

work_status is not a lifecycle state.

It is a sub-status used only when status = 'taken'.

Valid values:

active (default when taken)

on_hold

Rules:

Only assigned engineer (or admin) may change work_status.

Setting on_hold requires a reason.

Changing work_status must create job_events('work_status_changed').

work_status is irrelevant once job is completed.

This must never introduce new lifecycle states.

Completion Rules

A job may only be completed if:

status = 'taken'

Resolution text is provided

Actor is:

Assigned engineer, or

Admin

Completion must atomically:

Set status = 'completed'

Set completed_at = now()

Insert job_events('completed') with resolution payload

After completion:

Job is read-only.

No further updates allowed.

No work_status changes allowed.

No photo uploads allowed.
