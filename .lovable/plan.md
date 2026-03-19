

# Fix: Request Images Not Saving (Missing `user_roles` Table)

## Root Cause

After creating a job request, `RequestService` runs a separate PATCH to write `image_urls`. This PATCH **fails with a 404** because the SELECT RLS policy on `job_requests` calls `has_role()`, which queries `public.user_roles` — a table that **does not exist**.

The error from the network response:
```
{"code":"42P01","message":"relation \"public.user_roles\" does not exist"}
```

The `has_role` function and `app_role` enum exist, but the underlying `user_roles` table was never created.

## Changes

### 1. Create `user_roles` table (migration)

Create the missing table that `has_role()` already references:

```sql
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

### 2. Include `image_urls` in the initial insert (`RequestService.tsx`)

Instead of a separate PATCH (which can fail silently), pass `image_urls` directly in the insert call. This eliminates the two-step write entirely.

## Files Changed

| File | Change |
|---|---|
| Migration SQL | Create `user_roles` table with RLS |
| `src/pages/RequestService.tsx` | Move `image_urls` into the insert; remove the separate update call |

