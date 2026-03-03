# Slice 4: Engineer Work Updates (TAKEN jobs) — Complete

## Summary
While a job is TAKEN, assigned engineer (or admin) can:
- Toggle work_status (active ↔ on_hold) with required reason for on_hold
- Add work updates (text) to timeline
- Upload photos (private storage, signed URLs)

## What Was Built

- **Migration 006** — work_status column, job-photos bucket, take_job update
- **server/engineer/guard.ts** — reusable `getEngineerContext(orgSlug)`
- **server/engineer/jobs-updates.ts** — server actions:
  - `setWorkStatus(jobId, newStatus, note?)`
  - `addWorkUpdate(jobId, text)`
  - `createPhotoUploadUrl(jobId, mimeType)` → signed upload URL
  - `recordPhotoAdded(jobId, path, mimeType, size)`
  - `listJobTimeline(jobId)` → events + signed view URLs for photos
- **components/engineer/job-updates-section.tsx** — work status badge/toggle, update form, photo upload, timeline
- **Job detail page** — renders JobUpdatesSection when status=taken

## Invariants

- Only TAKEN jobs can be updated
- Engineer: only jobs assigned to them
- Admin: any taken job in org
- work_status: active (default) | on_hold; on_hold requires note
- All actions create job_events
- Storage private; access via signed URLs only

## Event Types

- `work_status_changed` — payload: previous_status, new_status, note?
- `work_update` — payload: text
- `photo_added` — payload: path, mime, size

## Apply Migration

```bash
psql "connection-string" -f supabase/migrations/006_work_status_and_storage.sql
```

If the storage bucket insert fails, create `job-photos` manually in Supabase Dashboard: private, 5MB limit, allowed MIME: image/jpeg, image/png, image/webp.
