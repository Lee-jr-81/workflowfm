# Slice 7: Testing Guide

## Prerequisites

- Slices 1–6 complete
- Admin user
- Some jobs (new, taken, completed) in the org

## Test Steps

### 1. Reporting page
1. Sign in as admin
2. Click "Reporting" in admin header
3. **Expected:** Dashboard with open count, median times, aging bands, trends, breakdowns

### 2. Metrics
1. Verify open jobs count matches Unassigned + My Jobs
2. Verify aging bands sum to open count
3. Verify by-department matches job counts

### 3. CSV export
1. Click "Export CSV" (no filters)
2. **Expected:** Download CSV with all jobs
3. Set date range and/or status, export again
4. **Expected:** Filtered rows in CSV

### 4. Unauthorized
1. Sign in as engineer (non-admin)
2. Navigate to /[orgSlug]/admin/reporting
3. **Expected:** Redirect to engineer queue
