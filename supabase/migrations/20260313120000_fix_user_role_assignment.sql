DELETE FROM public.user_roles ur
USING (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, role
             ORDER BY created_at, id
           ) AS row_num
    FROM public.user_roles
  ) ranked
  WHERE ranked.row_num > 1
) duplicates
WHERE ur.id = duplicates.id;

CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_id_role_idx
ON public.user_roles (user_id, role);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  new_role public.app_role;
BEGIN
  new_role := CASE COALESCE(NEW.raw_user_meta_data->>'role', 'client')
    WHEN 'provider' THEN 'provider'::public.app_role
    WHEN 'admin' THEN 'client'::public.app_role
    ELSE 'client'::public.app_role
  END;

  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullname', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    new_role::text
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    role = EXCLUDED.role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, new_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, p.role::public.app_role
FROM public.profiles p
WHERE p.role IN ('client', 'provider')
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p.id
      AND ur.role = p.role::public.app_role
  );