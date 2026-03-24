

# Fix: Client Requests Not Showing for Providers

## Root Cause

The `job_requests` SELECT RLS policy allows providers to see requests via:
```sql
has_role(auth.uid(), 'provider'::app_role)
```

This function queries `public.user_roles`, which was created recently but **never populated**. It has 0 rows. So every provider fails the role check and sees no open requests.

Meanwhile, user roles are stored in `profiles.role` (text column) — a completely separate place that the RLS never checks.

## Fix (Single Migration)

### 1. Backfill `user_roles` from `profiles`

Insert rows into `user_roles` for all existing users based on their `profiles.role` value, mapping the text role to the `app_role` enum (`'customer'` and `'provider'`).

### 2. Create a trigger to keep `user_roles` in sync

When `profiles.role` is inserted or updated, automatically upsert a matching row in `user_roles`. This ensures new signups and role changes are reflected without manual intervention.

```sql
-- Backfill
INSERT INTO public.user_roles (user_id, role)
SELECT id,
  CASE WHEN role = 'provider' THEN 'provider'::app_role
       ELSE 'customer'::app_role END
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Sync trigger
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id,
    CASE WHEN NEW.role = 'provider' THEN 'provider'::app_role
         ELSE 'customer'::app_role END)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_user_role
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();
```

## Files Changed

| File | Change |
|---|---|
| Migration SQL | Backfill `user_roles` from `profiles` + create sync trigger |

No frontend changes needed — the provider dashboard code is correct; it's purely a data/RLS issue.

