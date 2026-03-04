# Slice 5: Engineer Complete Job — Complete

## Summary
Assigned engineer (or admin) can close a TAKEN job with required resolution text. Photos uploaded in Slice 4 are auto-included.

## What Was Built

- **Migration 007** — `complete_job(uuid, text)` DB function
- **server/engineer/jobs-complete.ts** — `completeJob(orgSlug, jobId, resolutionText)` server action
- **components/engineer/complete-job-button.tsx** — "Mark completed" button + modal (resolution textarea)
- **Job detail page** — CompleteJobButton when status=taken
- **Engineer page** — "Job completed." banner when `?success=completed`

## Invariants

- Only TAKEN jobs can be completed
- Engineer: only jobs assigned to them
- Admin: any taken job in org
- Resolution text required (trimmed, max 5000 chars)
- Atomic: status + completed_at + job_event
- Photos auto-collected from job_events (photo_added)

## Payload

```json
{
  "resolution_text": "...",
  "photo_paths": ["org/.../jobs/.../uuid.jpg", ...]
}
```

## Apply Migration

```bash
psql "connection-string" -f supabase/migrations/007_complete_job_function.sql
```
