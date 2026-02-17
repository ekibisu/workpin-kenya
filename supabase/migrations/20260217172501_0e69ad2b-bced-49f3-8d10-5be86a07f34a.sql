CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _role app_role;
BEGIN
  INSERT INTO public.profiles (id, phone, email, full_name)
  VALUES (NEW.id, NEW.phone, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  IF NEW.raw_user_meta_data->>'role' = 'provider' THEN
    _role := 'provider';
  ELSE
    _role := 'customer';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;