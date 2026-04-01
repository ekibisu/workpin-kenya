
-- ============================================================
-- PHASE A: Unified User Model Migration
-- ============================================================

-- 1. Add personal fields to profiles (from client_profiles)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mpesa_phone text,
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free';

-- 2. Migrate client_profiles data into profiles
UPDATE public.profiles p
SET
  mpesa_phone = cp.mpesa_phone,
  location_name = cp.location_name,
  lat = cp.lat,
  lng = cp.lng
FROM public.client_profiles cp
WHERE cp.user_id = p.id
  AND (cp.mpesa_phone IS NOT NULL OR cp.location_name IS NOT NULL OR cp.lat IS NOT NULL);

-- 3. Drop client_profiles table
DROP TABLE IF EXISTS public.client_profiles;

-- 4. Rename provider_profiles → businesses
ALTER TABLE public.provider_profiles RENAME TO businesses;

-- 5. Rename user_id → owner_id
ALTER TABLE public.businesses RENAME COLUMN user_id TO owner_id;

-- 6. Drop unique constraint on owner_id (allow multiple businesses per user)
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS providers_user_id_key;

-- 7. Add is_active column to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 8. Make profiles.role nullable and set default to 'user' (deprecated column)
ALTER TABLE public.profiles ALTER COLUMN role DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT NULL;

-- 9. Rename FK constraint for clarity
ALTER TABLE public.businesses RENAME CONSTRAINT providers_user_id_fkey TO businesses_owner_id_fkey;
ALTER TABLE public.businesses RENAME CONSTRAINT providers_pkey TO businesses_pkey;
ALTER TABLE public.businesses RENAME CONSTRAINT provider_profiles_username_key TO businesses_username_key;
ALTER TABLE public.businesses RENAME CONSTRAINT provider_profiles_rate_type_check TO businesses_rate_type_check;

-- ============================================================
-- 10. Update RLS on businesses (was provider_profiles)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view provider profiles" ON public.businesses;
DROP POLICY IF EXISTS "Provider can insert own" ON public.businesses;
DROP POLICY IF EXISTS "Provider can update own" ON public.businesses;

CREATE POLICY "Anyone can view active businesses"
  ON public.businesses FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Owners can insert own businesses"
  ON public.businesses FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own businesses"
  ON public.businesses FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Admins full access to businesses"
  ON public.businesses FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 11. Update RLS on quotes
-- ============================================================
-- Drop old provider-based insert policy
DROP POLICY IF EXISTS "Provider can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Provider can update own quotes" ON public.quotes;

-- Recreate: business owner can create/update quotes
CREATE POLICY "Business owner can create quotes"
  ON public.quotes FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = quotes.provider_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Business owner can update own quotes"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = quotes.provider_id AND b.owner_id = auth.uid()
  ));

-- Update SELECT policy to use business ownership
DROP POLICY IF EXISTS "Users can view relevant quotes" ON public.quotes;
CREATE POLICY "Users can view relevant quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = quotes.provider_id AND b.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.job_requests jr WHERE jr.id = quotes.request_id AND jr.client_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================================
-- 12. Update RLS on provider_wallets (provider_id = business id)
-- ============================================================
DROP POLICY IF EXISTS "Providers manage own wallet" ON public.provider_wallets;
DROP POLICY IF EXISTS "Providers update own wallet" ON public.provider_wallets;
DROP POLICY IF EXISTS "Providers view own wallet" ON public.provider_wallets;

CREATE POLICY "Business owners manage own wallet"
  ON public.provider_wallets FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = provider_wallets.provider_id AND b.owner_id = auth.uid()));

CREATE POLICY "Business owners update own wallet"
  ON public.provider_wallets FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = provider_wallets.provider_id AND b.owner_id = auth.uid()));

CREATE POLICY "Business owners view own wallet"
  ON public.provider_wallets FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = provider_wallets.provider_id AND b.owner_id = auth.uid()));

-- ============================================================
-- 13. Update RLS on wallet_transactions
-- ============================================================
DROP POLICY IF EXISTS "Providers create own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Providers view own transactions" ON public.wallet_transactions;

CREATE POLICY "Business owners create own transactions"
  ON public.wallet_transactions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = wallet_transactions.provider_id AND b.owner_id = auth.uid()));

CREATE POLICY "Business owners view own transactions"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = wallet_transactions.provider_id AND b.owner_id = auth.uid()));

-- ============================================================
-- 14. Update RLS on fixed_price_services
-- ============================================================
DROP POLICY IF EXISTS "Providers manage own services" ON public.fixed_price_services;
DROP POLICY IF EXISTS "Providers update own services" ON public.fixed_price_services;
DROP POLICY IF EXISTS "Providers delete own services" ON public.fixed_price_services;

CREATE POLICY "Business owners manage own services"
  ON public.fixed_price_services FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = fixed_price_services.provider_id AND b.owner_id = auth.uid()));

CREATE POLICY "Business owners update own services"
  ON public.fixed_price_services FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = fixed_price_services.provider_id AND b.owner_id = auth.uid()));

CREATE POLICY "Business owners delete own services"
  ON public.fixed_price_services FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = fixed_price_services.provider_id AND b.owner_id = auth.uid()));

-- ============================================================
-- 15. Update RLS on provider_templates
-- ============================================================
DROP POLICY IF EXISTS "Providers manage own templates" ON public.provider_templates;

CREATE POLICY "Business owners manage own templates"
  ON public.provider_templates FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = provider_templates.provider_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = provider_templates.provider_id AND b.owner_id = auth.uid()));

-- ============================================================
-- 16. Update RLS on job_requests (remove provider role check)
-- ============================================================
DROP POLICY IF EXISTS "Customer can view own requests" ON public.job_requests;

CREATE POLICY "Users can view relevant requests"
  ON public.job_requests FOR SELECT
  TO authenticated
  USING (
    auth.uid() = client_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.owner_id = auth.uid() AND b.is_active = true)
  );

-- ============================================================
-- 17. Update handle_new_user trigger — remove role logic
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, phone, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.phone,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  );
  RETURN NEW;
END;
$function$;

-- 18. Drop the role sync trigger (no longer needed)
DROP TRIGGER IF EXISTS trg_sync_user_role ON public.profiles;
DROP FUNCTION IF EXISTS public.sync_user_role();

-- ============================================================
-- 19. Update work_threads RLS to use business ownership for provider side
-- ============================================================
DROP POLICY IF EXISTS "Participants view their threads" ON public.work_threads;
DROP POLICY IF EXISTS "Participants update their threads" ON public.work_threads;

CREATE POLICY "Participants view their threads"
  ON public.work_threads FOR SELECT
  TO public
  USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = work_threads.provider_id AND b.owner_id = auth.uid())
  );

CREATE POLICY "Participants update their threads"
  ON public.work_threads FOR UPDATE
  TO public
  USING (
    client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = work_threads.provider_id AND b.owner_id = auth.uid())
  );
