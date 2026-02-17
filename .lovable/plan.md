

# Add Role Selection to Signup

Currently, every new account is automatically assigned the "customer" role. There is no way for someone signing up as a service provider to indicate that during registration. This change adds a clear role picker to the signup form.

## What You'll See

On the signup form, a new "I am a..." section will appear with two clearly labeled options:

- **Client** -- "I'm looking to hire service professionals"
- **Service Provider** -- "I offer professional services"

The selection defaults to "Client" and uses visually distinct, selectable cards so the choice is obvious. If someone arrives via the "Join as a Pro" or "Become a Pro" links, the provider option will be pre-selected automatically.

After signup, the chosen role is stored in the user's metadata and used by a database trigger to assign the correct role.

## What Changes

### 1. Signup Form UI (Auth.tsx)
- Add a `role` state variable initialized from the `?role=provider` URL param (falling back to `"customer"`).
- Render two selectable card-style options above the name/email/password fields.
- Pass the selected role in `signUp({ options: { data: { full_name, role } } })`.

### 2. Database Trigger Update (Migration)
- Modify the `handle_new_user` trigger function to read `raw_user_meta_data->>'role'` and insert either `'customer'` or `'provider'` into `user_roles` (defaulting to `'customer'` if missing or invalid).

### 3. Post-Signup Redirect Logic
- After login, check the user's role and redirect providers to `/provider-dashboard` and customers to `/dashboard`.

---

## Technical Details

**Migration SQL:**
```sql
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
```

**Auth.tsx changes:**
- Add `role` state: `useState(searchParams.get("role") === "provider" ? "provider" : "customer")`
- Add role selector UI with two clickable cards using Search and Briefcase icons
- Include role in signup metadata: `data: { full_name: fullName, role }`
- On login success, query `user_roles` to determine redirect destination (`/dashboard` vs `/provider-dashboard`)

