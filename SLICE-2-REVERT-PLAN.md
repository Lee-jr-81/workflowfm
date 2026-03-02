# Slice 2 Revert Complete — Rebuild Guide

## What We Did
Removed all Slice 2 application code. **Migrations are preserved** - they've been applied to the DB.

## Migrations - KEEP (Already Applied)

| Migration | Purpose | Why Keep |
|-----------|---------|----------|
| 20260301093246_init_core_schema | Core schema | Original |
| 002_seed_test_data | Test org, PIN 123456 | Slice 1 |
| 003_seed_test_engineer | Test engineer, sample jobs | Data for Slice 2 rebuild |
| 004_fix_org_members_rls_recursion | SECURITY DEFINER for org_members | Fixes RLS infinite recursion - **required** |

**Important:** Migration 004 fixes a bug in the init schema. Without it, any future query to org_members would fail with "infinite recursion". We keep it.

## Files to Revert (git checkout)

- app/layout.tsx
- package.json
- package-lock.json
- supabase/migrations/README.md
- todo.md

(Removes: @supabase/ssr, PWA manifest/viewport, Slice 2 doc references)

## Files to Delete (Slice 2 Only)

**App routes:**
- app/[orgSlug]/(auth)/ (entire folder: sign-in, sign-in-password, auth/callback)
- app/[orgSlug]/engineer/ (entire folder)
- app/api/[orgSlug]/auth/ (entire folder)

**Server:**
- server/auth/
- server/db/auth-client.ts
- server/engineer/

**Components:**
- components/engineer/
- components/ui/tabs.tsx

**Middleware:**
- proxy.ts

**PWA:**
- app/manifest.ts
- app/icon.svg
- public/icon-192.png, icon-512.png, icon-192-maskable.png, icon-512-maskable.png

**Docs:**
- SLICE-2-COMPLETE.md
- SLICE-2-TESTING.md
- docs/05-slice-2-implementation.md
- docs/06-pwa-icons.md
- PWA-SETUP.md
- SUPABASE-AUTH-CONFIG.md

**Scripts:**
- scripts/add-test-engineer.sql
- scripts/set-test-password.sql
- scripts/check-membership.sql

## Files to Keep

- docs/07-supabase-smtp-setup.md (SMTP guide for clean rebuild)
- supabase/migrations/003_seed_test_engineer.sql (applied, test data)
- supabase/migrations/004_fix_org_members_rls_recursion.sql (applied, RLS fix)

## Result After Revert

- Slice 1 (staff portal) fully working
- No engineer routes
- No auth routes (sign-in, callback)
- No proxy/middleware
- DB in good state (migrations 001-004 applied)
- Ready for clean Slice 2 rebuild

## For Clean Slice 2 Rebuild

1. **SMTP first** - Follow `docs/07-supabase-smtp-setup.md` before building
2. **Single flow** - Magic link only (no password workaround)
3. **Use createBrowserClient** - In auth callback, from @supabase/ssr (cookie sync)
4. **Engineer routes** - Use `app/[orgSlug]/engineer/` (not route group)
5. **RLS** - Migration 004 already applied; org_members policies work
