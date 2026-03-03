# Vertical Slice Order (MVP)

Slice 1: Staff access code → requestor session → create NEW job + job_event
Slice 2: Engineer auth → view unassigned + my jobs
Slice 3: Engineer take job (NEW → TAKEN)
Slice 4: Engineer add notes/photos
Slice 5: Engineer complete job (TAKEN → COMPLETED)
Slice 6: Admin configuration (departments, locations, categories, access code)
Slice 7: Admin reporting dashboard + CSV export

##docs/03-slices.md — Additions

Update slices 4 and 5 to reflect final design.

Slice 4: Engineer Work Updates (TAKEN only)

Goal: While job is TAKEN, assigned engineer (or admin) can:

Toggle work_status (active ↔ on_hold, reason required for on_hold)

Add work updates (short text entries)

Upload photos (private storage + signed URLs)

Constraints:

No new lifecycle states.

No completion logic in this slice.

Engineers may only update their assigned jobs.

Admin may update any taken job in org.

All updates must create job_events.

Storage remains private; signed URLs minted server-side only.

Out of scope:

Completion

Resolution

Editing/deleting events

Reopening jobs

Slice 5: Engineer Completion (TAKEN → COMPLETED)

Goal: Assigned engineer (or admin) can complete a job with required resolution text and optional photos.

Must:

Enforce taken → completed only.

Require resolution text.

Perform atomic transition.

Insert job_events('completed').

Redirect to My Jobs + show toast.

After completion:

Job becomes read-only.

No further updates allowed.

Out of scope:

Reopen

Cancel

Edit resolution

Delete photos

Reporting enhancements
