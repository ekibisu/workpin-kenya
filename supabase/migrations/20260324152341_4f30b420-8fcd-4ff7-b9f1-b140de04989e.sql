-- Backfill user_roles from profiles
INSERT INTO public.user_roles (user_id, role)
SELECT id,
  CASE WHEN role = 'provider' THEN 'provider'::app_role
       ELSE 'customer'::app_role END
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Sync trigger function
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

-- Trigger to keep user_roles in sync with profiles.role
CREATE TRIGGER trg_sync_user_role
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();