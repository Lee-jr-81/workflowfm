# Slice 4: Testing Guide

## Prerequisites

- Slices 1–3 complete
- Migration 006 applied
- Job-photos bucket exists (create manually if migration insert fails)

## Apply Migration

```bash
psql "your-connection-string" -f supabase/migrations/006_work_status_and_storage.sql
```

## Test Steps

### 1. Work status toggle
1. Take a job (Slice 3)
2. Open job detail
3. See "Active" badge (green)
4. Click "Put on hold" → modal opens
5. Enter reason (required), submit
6. **Expected:** Badge becomes "On hold" (orange), note shown
7. Click "Mark active"
8. **Expected:** Badge returns to "Active"

### 2. Work update
1. In work updates section, type text in textarea
2. Click "Add update"
3. **Expected:** Text appears in timeline

### 3. Photo upload
1. Click "Add photo", select image (JPEG/PNG/WebP, max 5MB)
2. **Expected:** Photo appears in timeline as thumbnail (signed URL)

### 4. Engineer cannot update another's job
1. Engineer A takes a job
2. Engineer B (different account) navigates to same job URL
3. **Expected:** JobUpdatesSection not shown or actions fail (engineer B is not assigned)

### 5. Completed jobs
1. (Slice 5) Complete a job
2. Open job detail
3. **Expected:** No work updates section (job is read-only)

## Verify Data

```sql
SELECT id, status, work_status, work_status_note FROM jobs WHERE org_id = 'your-org-id';

SELECT event_type, payload FROM job_events WHERE job_id = 'job-id' ORDER BY created_at;
```
