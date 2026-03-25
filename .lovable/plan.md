

# Fix: Signup 500 Error — Duplicate `user_roles` Insert

## Root Cause

Two triggers race to insert the same row into `user_roles`:

1. **`handle_new_user`** (on `auth.users` INSERT):
   - Inserts into `profiles` → this fires trigger #2 below
   - Then inserts into `user_roles` (NO conflict handling)

2. **`trg_sync_user_role`** (on `profiles` INSERT/UPDATE):
   - Also inserts into `user_roles` (has `ON CONFLICT DO NOTHING`)

The sequence: `handle_new_user` inserts profile → `sync_user_role` fires and inserts into `user_roles` first → `handle_new_user` continues and tries the same insert → **unique constraint violation → 500 error**.

## Fix

Add `ON CONFLICT (user_id, role) DO NOTHING` to the `handle_new_user` function's `user_roles` insert. This makes both triggers safe regardless of execution order.

### Migration SQL

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
BEGIN
  INSERT INTO public.profiles (id, phone, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.phone,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );

  IF NEW.raw_user_meta_data->>'role' = 'provider' THEN
    _role := 'provider';
  ELSE
    _role := 'customer';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
```

### Changes from current version
- Added `ON CONFLICT (user_id, role) DO NOTHING` to the `user_roles` insert
- Also sets `profiles.role` from metadata (currently defaults to `'client'` even for providers)

### Files changed
| Action | File |
|--------|------|
| Migration | Update `handle_new_user` function |

No frontend code changes needed.

