# Slice 2: Engineer Auth + Job Queues — Complete

## Summary
Engineer magic link auth and job queues (unassigned + my jobs). Single flow, no password workaround. SMTP via Resend (already configured).

## What Was Built

- Magic link sign-in (`/[orgSlug]/sign-in`)
- Auth callback (`/[orgSlug]/auth/callback`) — createBrowserClient for cookie sync
- Middleware — token refresh, protects `/[orgSlug]/engineer` routes
- Engineer home — Unassigned + My Jobs tabs
- Job detail — read-only view
- Sign out

## Files

**Server:** `server/db/auth-client.ts`, `server/auth/session.ts`, `server/engineer/jobs.ts`  
**Middleware:** `middleware.ts`  
**Pages:** `app/[orgSlug]/sign-in/`, `app/[orgSlug]/auth/callback/`, `app/[orgSlug]/engineer/`  
**Components:** `components/engineer/job-card.tsx`, `components/engineer/job-status-badge.tsx`, `components/ui/tabs.tsx`

## Test

1. Ensure 003 and 004 migrations applied; user in `org_members`.
2. Go to `http://localhost:3000/test-school/sign-in`
3. Enter email, click "Send magic link"
4. Open magic link from email → should land on `/test-school/engineer`
5. Check Unassigned and My Jobs tabs.

## Supabase Redirect URL

In Supabase Dashboard → Authentication → URL Configuration, add:
`http://localhost:3000/**/auth/callback`
