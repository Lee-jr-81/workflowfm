# Slice 6: Testing Guide

## Prerequisites

- Slice 2 complete (engineer auth)
- Test user with **admin** role in org

To make your test user an admin:

```sql
UPDATE org_members SET role = 'admin'
WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' AND user_id = 'b277fa72-1251-421c-8057-0cede6e61e75';
```

## Test Steps

### 1. Admin access

1. Sign in as admin
2. **Expected:** "Admin" link in engineer header
3. Click Admin → config page
4. Sign in as engineer (non-admin)
5. **Expected:** No Admin link; navigating to /[orgSlug]/admin redirects to engineer

### 2. Departments

1. Add a department (e.g. "IT")
2. **Expected:** Appears in list
3. Add duplicate name → "Already exists"
4. Disable → item shows strikethrough
5. Enable → normal display

### 3. Locations

1. Add location (e.g. "Building A")
2. Toggle active/inactive

### 4. Categories

1. Add category (e.g. "Plumbing")
2. Toggle active/inactive

### 5. Staff portal

1. Enable portal
2. **Expected:** "Rotate access code" button appears
3. Click Rotate
4. **Expected:** New 6-digit code shown (copy it)
5. Staff can use that code at /[orgSlug]/request
6. Disable portal → staff cannot verify code

## Verify Data

```sql
SELECT * FROM departments WHERE org_id = 'your-org-id';
SELECT * FROM locations WHERE org_id = 'your-org-id';
SELECT * FROM categories WHERE org_id = 'your-org-id';
SELECT * FROM org_staff_access WHERE org_id = 'your-org-id';
```
