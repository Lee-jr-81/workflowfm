# Slice 5: Testing Guide

## Prerequisites

- Slices 1–4 complete
- Migration 007 applied

## Apply Migration

```bash
psql "your-connection-string" -f supabase/migrations/007_complete_job_function.sql
```

## Test Steps

### 1. Complete a job
1. Take a job (or use one in My Jobs)
2. Open job detail
3. Click "Mark completed"
4. Enter resolution text (required)
5. Click "Close job"
6. **Expected:** Redirect to engineer queue, "Job completed." banner

### 2. Resolution required
1. Click "Mark completed"
2. Leave resolution empty
3. **Expected:** "Close job" disabled, or "Resolution is required" on submit

### 3. Photos included
1. Upload a photo to a taken job (Slice 4)
2. Complete the job with resolution
3. **Expected:** job_events payload includes photo_paths array

### 4. Already completed
1. Complete a job
2. (In another tab or after refresh) Open same job
3. **Expected:** No "Mark completed" button (job is read-only)
4. Or if modal open and another user completes: "This job is already completed."

### 5. Engineer cannot complete another's job
1. Engineer A takes a job
2. Engineer B navigates to that job
3. **Expected:** No CompleteJobButton (or action returns forbidden)

## Verify Data

```sql
SELECT id, status, completed_at FROM jobs WHERE org_id = 'your-org-id';

SELECT event_type, payload FROM job_events WHERE event_type = 'completed';
```
