# Slice 3: Engineer Take Job — Complete

## Summary
Engineer can self-assign a job (NEW → TAKEN). Atomic, race-safe, audit trail.

## What Was Built

- **DB function** `take_job(uuid)` — atomic update + job_event, single winner
- **Server action** `takeJob(orgSlug, jobId)` — validated, org-derived
- **UI** Take job button on job detail (status=new only)
- **Feedback** Success → redirect to engineer home; conflict → "Already taken" banner

## Files

- `supabase/migrations/005_take_job_function.sql`
- `server/engineer/take-job.ts`
- `components/engineer/take-job-button.tsx`
- `app/[orgSlug]/engineer/jobs/[jobId]/page.tsx` (Take button)
- `app/[orgSlug]/engineer/page.tsx` (already_taken banner)

## Invariants

- Only NEW jobs can be taken
- Atomic: job update + job_event in one transaction
- Race-safe: conditional UPDATE (single winner)
- Org-scoped: org_id from membership, never from client
- Timestamps: taken_at set server-side with now()

## Apply Migration

```bash
psql "connection-string" -f supabase/migrations/005_take_job_function.sql
```
