# Database Migrations

## Migration Files

### Naming Convention

Format: `NNN_description.sql` where NNN is a zero-padded sequence number (001, 002, 003, etc.)

**Exception:** The first migration keeps its timestamp format as it was already applied:
- `20260301093246_init_core_schema.sql` (already applied, don't rename)

### Schema Migrations

- `20260301093246_init_core_schema.sql` - Core database schema (V1)
  - Tables, enums, RLS policies, indexes
  - Safe for production

### Seed Migrations

- `002_seed_test_data.sql` - Test/development seed data
  - Creates test organization "Test School"
  - Sample departments, locations, categories
  - Staff portal access code: "123456"
  - **⚠️ FOR DEVELOPMENT ONLY**

## Applying Migrations

Since you're working directly against the remote database with psql:

```bash
# Apply migrations in order
psql "your-connection-string" -f supabase/migrations/20260301093246_init_core_schema.sql
psql "your-connection-string" -f supabase/migrations/002_seed_test_data.sql
```

## Production Deployment

**Before deploying to production:**

1. **Remove or skip the seed migration:**
   - Option A: Delete `20260301100000_seed_test_data.sql`
   - Option B: Add environment check to skip in production
   - Option C: Keep it but don't apply it to production database

2. **Create production data through the application:**
   - Admin signup flow (to be implemented in Slice 6)
   - Org creation via admin UI
   - Department/location/category setup via admin UI

## Migration Naming Convention

Format: `NNN_description.sql` where NNN is a zero-padded 3-digit sequence number.

Examples:
- `001_init_core_schema.sql` (or `20260301093246_init_core_schema.sql` for legacy first migration)
- `002_seed_test_data.sql`
- `003_add_job_photos.sql`
- `010_add_engineer_notes.sql`

This makes it easy to see the order at a glance and ensures proper sequential application.

## Best Practices

✅ **DO:**
- Use migrations for all schema changes
- Use `ON CONFLICT` clauses in seed data for idempotency
- Test migrations on a copy of production data before applying
- Keep migrations in version control

❌ **DON'T:**
- Run manual SQL in Supabase UI (creates drift)
- Edit existing migrations after they've been applied
- Skip migrations in the sequence
- Include production secrets in migrations

## Rollback Strategy

If you need to rollback a migration:

1. Create a new migration that reverses the changes
2. Name it with a newer timestamp
3. Apply it to the database

Example:
- Original: `20260301093246_init_core_schema.sql`
- Rollback: `20260301120000_rollback_init_core_schema.sql`

**Never** delete or modify an applied migration file.
