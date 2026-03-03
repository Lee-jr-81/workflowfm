# Slice 3: Testing Guide

## Prerequisites

- Slices 1–2 complete
- Migration 005 applied

## Apply Migration

```bash
psql "postgresql://postgres:ioMbV7ir4ETvxyJs@db.rtjvzzqyyydytdldozue.supabase.co:5432/postgres" -f supabase/migrations/005_take_job_function.sql
```

## Test Steps

### 1. Take a job

1. Sign in as engineer
2. Go to Unassigned tab
3. Click a job
4. Click "Take job"
5. **Expected:** Redirect to engineer home, job appears in My Jobs

### 2. Already taken

1. Open a job in one tab
2. In another tab (or device), sign in as different engineer
3. Both click "Take job" on the same job
4. **Expected:** One succeeds, other sees "That job was taken by someone else"

### 3. Taken job has no button

1. Take a job
2. Open its detail page
3. **Expected:** No "Take job" button (status is taken)

### 4. Cross-org

1. Note a job ID from your org
2. Try to call takeJob with that ID but a different orgSlug (would require code change or direct API call)
3. **Expected:** not_found / no update (org_id derived from session)

## Verify Data

```sql
SELECT j.id, j.status, j.assigned_to_user_id, j.taken_at
FROM jobs j
WHERE j.org_id = 'your-org-id'
ORDER BY j.created_at DESC;

SELECT * FROM job_events WHERE event_type = 'taken' ORDER BY created_at DESC;
```
