# Slice 1: Staff Request Portal - Manual Testing Guide

## Prerequisites

1. **Environment Variables**
   - Ensure `.env.local` contains:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Get these from: https://supabase.com/dashboard/project/_/settings/api

2. **Database Setup**
   - Ensure the migration `20260301093246_init_core_schema.sql` has been applied
   - You need test data in the following tables:
     - `orgs` (at least one organization)
     - `departments` (at least one department for the org)
     - `org_staff_access` (with enabled portal and access code hash)

## Test Data Setup

The test data is provided as a migration file to avoid drift from your migration history.

**Apply the seed migration:**

Since you're working directly against the remote database with psql, apply the seed migration:

```bash
psql "your-connection-string" -f supabase/migrations/002_seed_test_data.sql
```

This creates:
- Test organization: "Test School" (slug: `test-school`)
- 3 departments: Maintenance, IT Support, Facilities
- 4 locations: Main Building, Sports Hall, Library, Science Block
- 5 categories: Plumbing, Electrical, HVAC, Carpentry, General Repairs
- Staff portal enabled with access code: `123456`

**Note:** This seed migration uses `ON CONFLICT DO NOTHING` so it's safe to run multiple times.

**For production:** Remove or conditionally skip this migration before deploying to production.

## Manual Test Steps

### Test 1: Access Code Verification

1. Start the dev server: `npm run dev`
2. Navigate to: `http://localhost:3000/test-school/request`
3. You should see the "Staff Request Portal" page with access code input
4. **Test invalid code:**
   - Enter: `000000`
   - Click "Continue"
   - Expected: Error message "Invalid access code"
5. **Test valid code:**
   - Enter: `123456`
   - Click "Continue"
   - Expected: Form loads with departments, locations, categories

### Test 2: Session Cookie Set

1. After entering valid access code, open browser DevTools
2. Go to Application → Cookies → `http://localhost:3000`
3. Verify cookie exists:
   - Name: `req_sess`
   - Value: UUID (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
   - HttpOnly: ✓
   - Path: `/test-school`
   - SameSite: `Lax`

### Test 3: Create Job (Happy Path)

1. Fill out the form:
   - Your Name: `John Smith`
   - Department: `Maintenance` (required)
   - Location: `Main Building` (optional)
   - Category: `Plumbing` (optional)
   - Issue Summary: `Leaking tap in staff room`
   - Details: `The tap is dripping constantly and needs repair`
2. Click "Submit Request"
3. Expected: Redirect to success page
4. Verify in database:
   ```sql
   SELECT * FROM jobs WHERE requestor_name = 'John Smith';
   SELECT * FROM job_events WHERE event_type = 'created';
   ```
5. Expected results:
   - Job created with status = 'new'
   - Job has department_id, location_id, category_id set
   - Job has requestor_session_id set
   - job_events row created with event_type = 'created', actor_type = 'requestor'

### Test 4: Form Validation

1. Try to submit form with missing required fields:
   - Leave "Your Name" empty → Expected: Browser validation error
   - Leave "Department" empty → Expected: Browser validation error
   - Leave "Issue Summary" empty → Expected: Browser validation error
2. All optional fields (Location, Category, Details) should allow empty values

### Test 5: My Tickets View

1. After creating a ticket, click "View My Tickets" on success page
2. Expected: List of tickets you submitted
3. Verify:
   - Ticket shows correct title
   - Status badge shows "New" (blue)
   - Department, location, category displayed
   - Created timestamp shown
4. Click "New Request" button
5. Expected: Return to request form (session still valid, no PIN required)

### Test 6: Session Persistence

1. Create a ticket
2. Close browser tab
3. Open new tab and navigate to: `http://localhost:3000/test-school/request`
4. Expected: Form loads directly (no PIN required) because cookie persists
5. Navigate to: `http://localhost:3000/test-school/request/my-tickets`
6. Expected: See previously created tickets

### Test 7: Rate Limiting

1. Clear cookies (or use incognito mode)
2. Navigate to: `http://localhost:3000/test-school/request`
3. Enter wrong PIN 5 times quickly
4. On 6th attempt, expected: HTTP 429 error "Too many attempts"
5. Wait 15 minutes or restart server to reset rate limiter

### Test 8: Invalid Session

1. Manually delete `req_sess` cookie in DevTools
2. Try to access: `http://localhost:3000/test-school/request/my-tickets`
3. Expected: HTTP 401 error or redirect to PIN entry

### Test 9: Cross-Org Isolation

If you have multiple orgs in your database:

1. Create tickets for org A (`test-school`)
2. Navigate to org B's request portal (different orgSlug)
3. Enter org B's access code
4. View "My Tickets" for org B
5. Expected: Only see tickets created in org B session (not org A tickets)

## Verification Queries

After testing, verify data integrity:

```sql
-- Check all jobs created
SELECT 
  j.id,
  j.title,
  j.status,
  j.requestor_name,
  d.name as department,
  l.name as location,
  c.name as category,
  j.created_at
FROM jobs j
LEFT JOIN departments d ON j.department_id = d.id
LEFT JOIN locations l ON j.location_id = l.id
LEFT JOIN categories c ON j.category_id = c.id
WHERE j.org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
ORDER BY j.created_at DESC;

-- Check job events timeline
SELECT 
  je.event_type,
  je.actor_type,
  je.created_at,
  je.payload
FROM job_events je
JOIN jobs j ON je.job_id = j.id
WHERE j.org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
ORDER BY je.created_at DESC;

-- Check requestor sessions
SELECT 
  rs.id,
  rs.created_at,
  rs.last_seen_at,
  COUNT(j.id) as ticket_count
FROM requestor_sessions rs
LEFT JOIN jobs j ON j.requestor_session_id = rs.id
WHERE rs.org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
GROUP BY rs.id, rs.created_at, rs.last_seen_at
ORDER BY rs.created_at DESC;
```

## Expected Behavior Summary

✅ **Security:**
- No direct Supabase queries from client
- All data scoped to org_id (derived server-side)
- HttpOnly cookies prevent XSS
- Rate limiting prevents brute force

✅ **Data Integrity:**
- department_id is always set (NOT NULL constraint)
- Job status is 'new' by default
- job_events row created for every job
- Timestamps set server-side

✅ **User Experience:**
- PIN entry once per device
- Session persists across page refreshes
- Form pre-populated with org data
- Clear success/error messages

## Troubleshooting

**Issue: "Organization not found"**
- Check orgSlug in URL matches `orgs.slug` in database
- Verify org exists: `SELECT * FROM orgs WHERE slug = 'test-school';`

**Issue: "Staff portal is disabled"**
- Check: `SELECT * FROM org_staff_access WHERE org_id = '...';`
- Ensure `is_enabled = true`

**Issue: "Invalid access code"**
- The test hash is for "123456"
- To generate a new hash, use bcrypt with 10 rounds
- Or update the hash in the database

**Issue: "Failed to create session"**
- Check Supabase service role key is correct
- Verify `requestor_sessions` table exists
- Check server logs for detailed error

**Issue: Form doesn't load after PIN**
- Check browser console for errors
- Verify `/api/[orgSlug]/staff/bootstrap` returns 200
- Ensure departments exist for the org
