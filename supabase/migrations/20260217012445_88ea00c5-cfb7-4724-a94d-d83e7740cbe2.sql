
-- Role enum
CREATE TYPE public.app_role AS ENUM ('customer', 'provider', 'admin');

-- User roles table (roles MUST be separate)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Providers
CREATE TABLE public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  bio TEXT,
  location_lat DOUBLE PRECISION,
  location_long DOUBLE PRECISION,
  whatsapp_number TEXT,
  rating NUMERIC DEFAULT 0,
  total_reviews INT DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  subscription_status TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Services catalog
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Service requests
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  service_id UUID NOT NULL REFERENCES public.services(id),
  description TEXT NOT NULL,
  budget NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  location_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Quotes
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.service_requests(id),
  provider_id UUID NOT NULL REFERENCES public.profiles(id),
  price NUMERIC NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Jobs
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id),
  status TEXT NOT NULL DEFAULT 'in_progress',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Messages (realtime)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL,
  mpesa_ref TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, email, full_name)
  VALUES (NEW.id, NEW.phone, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- user_roles: users can read own roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- profiles
CREATE POLICY "Authenticated can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- providers
CREATE POLICY "Anyone authenticated can view providers" ON public.providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Provider can insert own" ON public.providers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'provider'));
CREATE POLICY "Provider can update own" ON public.providers FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- services: all authenticated can read, admin can manage
CREATE POLICY "Authenticated can view services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage services" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- service_requests
CREATE POLICY "Customer can create requests" ON public.service_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customer can view own requests" ON public.service_requests FOR SELECT TO authenticated USING (
  auth.uid() = customer_id 
  OR public.has_role(auth.uid(), 'provider') 
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Customer can update own requests" ON public.service_requests FOR UPDATE TO authenticated USING (auth.uid() = customer_id);

-- quotes
CREATE POLICY "Provider can create quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "Users can view relevant quotes" ON public.quotes FOR SELECT TO authenticated USING (
  auth.uid() = provider_id 
  OR EXISTS (SELECT 1 FROM public.service_requests WHERE id = request_id AND customer_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Provider can update own quotes" ON public.quotes FOR UPDATE TO authenticated USING (auth.uid() = provider_id);

-- jobs
CREATE POLICY "Users can view own jobs" ON public.jobs FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.quotes q 
    WHERE q.id = quote_id 
    AND (q.provider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.service_requests sr WHERE sr.id = q.request_id AND sr.customer_id = auth.uid()))
  )
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Users can update own jobs" ON public.jobs FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.quotes q 
    WHERE q.id = quote_id 
    AND (q.provider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.service_requests sr WHERE sr.id = q.request_id AND sr.customer_id = auth.uid()))
  )
);

-- messages
CREATE POLICY "Users can view job messages" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.jobs j 
    JOIN public.quotes q ON q.id = j.quote_id 
    WHERE j.id = job_id 
    AND (q.provider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.service_requests sr WHERE sr.id = q.request_id AND sr.customer_id = auth.uid()))
  )
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Users can send messages to own jobs" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.jobs j 
    JOIN public.quotes q ON q.id = j.quote_id 
    WHERE j.id = job_id 
    AND (q.provider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.service_requests sr WHERE sr.id = q.request_id AND sr.customer_id = auth.uid()))
  )
);

-- payments
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Seed services
INSERT INTO public.services (name, category, icon) VALUES
  ('House Cleaning', 'Home', 'home'),
  ('Plumbing', 'Home', 'wrench'),
  ('Electrical Repair', 'Home', 'zap'),
  ('Painting', 'Home', 'paintbrush'),
  ('Moving & Packing', 'Home', 'truck'),
  ('Landscaping', 'Outdoor', 'trees'),
  ('Photography', 'Events', 'camera'),
  ('Catering', 'Events', 'utensils'),
  ('DJ & Music', 'Events', 'music'),
  ('Event Planning', 'Events', 'calendar'),
  ('Tutoring', 'Education', 'book-open'),
  ('Personal Training', 'Health', 'dumbbell'),
  ('Car Wash', 'Auto', 'car'),
  ('Mechanic', 'Auto', 'settings'),
  ('Web Development', 'Tech', 'code'),
  ('Graphic Design', 'Tech', 'palette');
