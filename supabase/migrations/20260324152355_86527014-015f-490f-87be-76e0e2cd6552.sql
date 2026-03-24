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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;