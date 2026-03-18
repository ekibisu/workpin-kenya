

# Problem: Services Page Shows Nothing

## Root Cause

The `services` table has **20 records** in it — the data is there. However, the query returns an empty array because of a **Row Level Security (RLS) policy** issue.

The current SELECT policy on `services` is:

```
Policy: "Authenticated can view services"
Command: SELECT
Roles: {authenticated}
Using: true
```

This means **only logged-in users** can see services. When someone visits `/services` without being logged in (which is the common case for browsing), the query returns `[]`.

Services are public catalog data — there is no reason to restrict them to authenticated users.

## Fix

**Single database migration** to add an anonymous-accessible SELECT policy:

```sql
CREATE POLICY "Anyone can view active services"
  ON public.services
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
```

This allows both anonymous and authenticated users to see active services. The existing "Admin can manage services" policy still controls insert/update/delete.

Optionally, drop the now-redundant authenticated-only policy since the new one covers both roles:

```sql
DROP POLICY IF EXISTS "Authenticated can view services" ON public.services;
```

## No Code Changes Needed

The frontend code (`useServices.ts`, `Services.tsx`) is correct — it queries with `.eq('is_active', true)` and orders by `sort_order`. The only issue is the RLS policy blocking anonymous reads.

## Summary

| What | Detail |
|---|---|
| Problem | RLS blocks anonymous users from reading services |
| Fix | One migration: add public SELECT policy for `anon` + `authenticated` |
| Risk | None — services are public catalog data |
| Files changed | One new migration file only |

