# Slice 7: Admin Reporting Dashboard — Complete

## Summary
Admin dashboard with metrics, breakdowns, and CSV export for filtered job data.

## What Was Built

- **server/admin/reporting.ts**
  - `getReportingMetrics(orgSlug)` — open count, aging bands, median times, monthly trends, by dept/location/category
  - `getJobsForExport(orgSlug, filters)` — jobs with date range + status filters
  - `jobsToCsv(rows)` — CSV formatting
- **app/[orgSlug]/admin/reporting/page.tsx** — reporting dashboard
- **app/api/[orgSlug]/admin/reporting/export/route.ts** — GET CSV download (query: from, to, status)
- **components/admin/export-form.tsx** — date range + status filters, Export CSV link
- **Admin layout** — Config + Reporting nav links

## Metrics

- Open jobs (new + taken)
- Backlog aging (0–7, 8–14, 15–30, 30+ days)
- Median time to take (created → taken)
- Median time to complete (created → completed)
- Created vs completed trend (monthly)
- Jobs by department / location / category

## CSV Export

- Date range (from, to)
- Status filter (all, new, taken, completed)
- Download via GET /api/[orgSlug]/admin/reporting/export?from=...&to=...&status=...

## Out of Scope (V1)

- Monthly PDF export
