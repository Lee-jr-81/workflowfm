# Slice 2: Testing Guide

## Prerequisites

- Migrations 001–004 applied
- Resend SMTP configured (no email limits)
- Supabase redirect URL: `http://localhost:3000/**/auth/callback`

## Test Engineer Setup

1. Supabase Dashboard → Authentication → Users → Add user (use your email)
2. Copy user ID
3. Edit `supabase/migrations/003_seed_test_engineer.sql` — replace `YOUR-USER-ID-HERE` (both places)
4. Run: `psql "connection-string" -f supabase/migrations/003_seed_test_engineer.sql`

## Test Steps

### 1. Sign in
- Go to `http://localhost:3000/test-school/sign-in`
- Enter your email
- Click "Send magic link"
- Check email, click link

### 2. Engineer home
- Should redirect to `/test-school/engineer`
- See Unassigned and My Jobs tabs
- Sample jobs from 003 migration

### 3. Job detail
- Click a job
- Should show full details at `/test-school/engineer/jobs/[id]`

### 4. Sign out
- Click sign out in header
- Should redirect to sign-in

### 5. Protected route
- While signed out, visit `http://localhost:3000/test-school/engineer`
- Should redirect to sign-in with `?redirect=...`
