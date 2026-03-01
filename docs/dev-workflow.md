# Development Workflow (Dockerless Supabase)

This project uses Supabase (remote only).  
We are not running Supabase locally with Docker at this stage.

All schema changes are version-controlled via migration files and applied directly to the remote database using `psql`.

---

## Environment Setup

Required:

- Supabase CLI (installed via Scoop)
- PostgreSQL CLI tools (`psql`)
- Remote Supabase project (London region)

Environment variables (in `.env.local`):

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

`.env.local` is ignored via `.env*` in `.gitignore`.

---

## Migration Workflow (Authoritative Process)

### 1️⃣ Create a new migration file

```bash
supabase migration new descriptive_name
```

### 2️⃣ Write SQL inside the migration file

Tables

Indexes

Constraints

RLS policies

Enum definitions

Alter statements

Do NOT modify tables manually in the Supabase dashboard.
All schema changes must exist in migration files.

###

3️⃣ Apply migration to remote database

Use the direct connection string from:

Supabase Dashboard → Settings → Database → Connection string (Direct)

Then run:

psql "postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres" -f supabase/migrations/<MIGRATION_FILE>.sql

This applies the migration directly to the remote Postgres database.

No Docker required.

###

4️⃣ Commit migration
git add supabase/migrations
git commit -m "Add migration: descriptive_name"
git push

The migration files in Git are the source of truth for schema history.

###

RLS Discipline

RLS must be enabled on all tenant-owned tables.

All tenant tables must include org_id.

Never allow public/anon access for tenant data.

Staff requestors interact via server endpoints only (no client DB access).

Reset Strategy (Early Stage)

Because we are remote-only:

If a schema mistake is made early in development:

Either write a corrective migration

Or (if still early) delete and recreate the Supabase project and re-run all migrations

This is acceptable during MVP phase.

When to Introduce Docker

We will consider local Supabase (Docker) when:

Multiple developers are collaborating

CI/CD needs reproducible DB environments

Complex migration testing becomes necessary

Until then, keep the workflow simple.

###

Principle

Migration files in Git define the system.

The Supabase project is just a deployment target.

Do not treat dashboard edits as authoritative.

---

This gives you:

- Clarity
- Repeatability
- Guardrails
- And prevents 3-weeks-later confusion

---

You are now in a very solid place:

- Repo structured
- Security model defined
- Schema deployed
- RLS enabled
- Workflow documented

That’s a proper SaaS foundation.

---

Ready for your first real feature slice (staff access code → requestor session → create job)?
