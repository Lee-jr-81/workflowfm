# Product Brief (V1)

## Summary

A lightweight, mobile-first maintenance work order system for mid-sized facilities teams that do not need enterprise CAFM/CMMS.
Core value: streamline ticket flow AND provide clear reporting + exports for FM managers to justify budgets and communicate impact.

## Target customers

- Schools / academies (single or multi-site)
- Care homes
- Multi-site SMEs (retail, light industrial, offices)
- Lettings / property maintenance teams (using locations as properties)

Typical profile:

- 1 FM manager (admin)
- 3–20 engineers (internal + contractors)
- Staff need simple ticket submission (no accounts)
- Currently using WhatsApp + email + Excel

## Problems solved

- Ticket updates move from WhatsApp into structured tickets
- Engineers self-assign from a single queue
- Managers get real metrics without manual spreadsheets
- Board-ready reporting + CSV exports

## What V1 includes

- Multi-tenant SaaS: /[orgSlug]/...
- Admin:
  - org setup
  - manage locations, categories, departments
  - enable/disable staff request portal + rotate access code
  - invite/manage engineers
  - dashboard reporting + CSV export
- Engineer (PWA):
  - unassigned + my jobs
  - take job (self-assign)
  - notes + photos
  - complete
  - create job + duplicate job
- Staff requestor:
  - access code per org
  - create ticket (name + department required)
  - view “my tickets” only (per device session)

## Out of scope (explicit)

- asset registers/compliance engine
- contractor marketplace / bidding / invoicing
- inventory and costing
- timesheets
- messaging platform
- enterprise procurement workflows

## Success criteria for MVP

- A team can run their daily maintenance workflow fully in the app.
- FM manager can produce monthly metrics + exports without spreadsheets.
- System is tenant-safe (no cross-org data exposure).
