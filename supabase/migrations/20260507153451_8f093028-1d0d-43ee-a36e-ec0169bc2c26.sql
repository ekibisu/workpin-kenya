
-- COUNTRIES
CREATE TABLE public.countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  dial_code TEXT NOT NULL,
  phone_regex TEXT NOT NULL,
  default_payment_provider TEXT NOT NULL DEFAULT 'pesapal',
  flag_emoji TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active countries" ON public.countries
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage countries" ON public.countries
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- REGIONS
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'region',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, name)
);
CREATE INDEX idx_regions_country ON public.regions(country_code);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active regions" ON public.regions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins manage regions" ON public.regions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- SEED COUNTRIES
INSERT INTO public.countries (code, name, currency_code, dial_code, phone_regex, default_payment_provider, flag_emoji, sort_order) VALUES
  ('KE', 'Kenya',    'KES', '+254', '^(\+?254|0)?[17]\d{8}$',     'pesapal', '🇰🇪', 1),
  ('UG', 'Uganda',   'UGX', '+256', '^(\+?256|0)?[37]\d{8}$',     'pesapal', '🇺🇬', 2),
  ('TZ', 'Tanzania', 'TZS', '+255', '^(\+?255|0)?[67]\d{8}$',     'pesapal', '🇹🇿', 3),
  ('RW', 'Rwanda',   'RWF', '+250', '^(\+?250|0)?7[2389]\d{7}$',  'pesapal', '🇷🇼', 4);

-- PROFILES
ALTER TABLE public.profiles
  ADD COLUMN country_code TEXT REFERENCES public.countries(code),
  ADD COLUMN region_id UUID REFERENCES public.regions(id);
UPDATE public.profiles SET country_code = 'KE' WHERE country_code IS NULL;
ALTER TABLE public.profiles ALTER COLUMN country_code SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN country_code SET DEFAULT 'KE';

-- BUSINESSES
ALTER TABLE public.businesses
  ADD COLUMN country_code TEXT REFERENCES public.countries(code),
  ADD COLUMN region_id UUID REFERENCES public.regions(id),
  ADD COLUMN service_country_codes TEXT[] NOT NULL DEFAULT '{}';
UPDATE public.businesses SET country_code = 'KE' WHERE country_code IS NULL;
UPDATE public.businesses SET service_country_codes = ARRAY['KE'] WHERE service_country_codes = '{}';
ALTER TABLE public.businesses ALTER COLUMN country_code SET NOT NULL;
ALTER TABLE public.businesses ALTER COLUMN country_code SET DEFAULT 'KE';
CREATE INDEX idx_businesses_country ON public.businesses(country_code);
CREATE INDEX idx_businesses_country_region ON public.businesses(country_code, region_id);
CREATE INDEX idx_businesses_service_countries ON public.businesses USING GIN(service_country_codes);

-- JOB REQUESTS
ALTER TABLE public.job_requests
  ADD COLUMN country_code TEXT REFERENCES public.countries(code),
  ADD COLUMN region_id UUID REFERENCES public.regions(id);
UPDATE public.job_requests SET country_code = 'KE' WHERE country_code IS NULL;
ALTER TABLE public.job_requests ALTER COLUMN country_code SET NOT NULL;
ALTER TABLE public.job_requests ALTER COLUMN country_code SET DEFAULT 'KE';
CREATE INDEX idx_job_requests_country ON public.job_requests(country_code);
CREATE INDEX idx_job_requests_country_region ON public.job_requests(country_code, region_id);

-- SUBSCRIPTION PLANS multi-currency
ALTER TABLE public.subscription_plans
  ADD COLUMN prices JSONB NOT NULL DEFAULT '{}'::jsonb;
UPDATE public.subscription_plans
  SET prices = jsonb_build_object('KES', jsonb_build_object('monthly', price_monthly_kes, 'annual', price_annual_kes))
  WHERE prices = '{}'::jsonb;
