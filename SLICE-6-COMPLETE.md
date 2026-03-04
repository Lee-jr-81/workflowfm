# Slice 6: Admin Configuration — Complete

## Summary
Admin can manage departments, locations, categories, and staff request portal (enable/disable, rotate access code).

## What Was Built

- **server/admin/guard.ts** — `requireAdmin(orgSlug)` (admin role only)
- **server/admin/config.ts** — server actions:
  - `getConfig(orgSlug)` — departments, locations, categories, staff access
  - `createDepartment`, `toggleDepartment`
  - `createLocation`, `toggleLocation`
  - `createCategory`, `toggleCategory`
  - `setStaffPortalEnabled(orgSlug, enabled)`
  - `rotateAccessCode(orgSlug)` → returns new 6-digit code once
- **app/[orgSlug]/admin/** — admin layout + config page
- **components/admin/config-section.tsx** — generic list + add + enable/disable
- **components/admin/staff-portal-section.tsx** — enable/disable + rotate code
- **Engineer layout** — "Admin" link for admin users

## Routes

- `/[orgSlug]/admin` — configuration (admin only)
- Non-admins redirect to engineer queue

## Staff Portal

- Enable/disable portal (staff can/cannot submit tickets)
- Rotate access code — generates new 6-digit code, hashed with bcrypt
- New code shown once; admin shares with staff

## Out of Scope (Slice 6)

- Invite/manage engineers
- Org setup (org creation)
- Reporting dashboard
