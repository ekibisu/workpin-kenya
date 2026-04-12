
-- Subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  price_monthly_kes numeric NOT NULL DEFAULT 0,
  price_annual_kes numeric NOT NULL DEFAULT 0,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Business subscriptions table
CREATE TABLE public.business_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  period text NOT NULL DEFAULT 'monthly',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  mpesa_receipt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners view own subscriptions"
  ON public.business_subscriptions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = business_subscriptions.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Admins manage subscriptions"
  ON public.business_subscriptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Profile views for analytics
CREATE TABLE public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  viewed_at date NOT NULL DEFAULT CURRENT_DATE,
  view_count integer NOT NULL DEFAULT 1,
  UNIQUE(business_id, viewed_at)
);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert profile views"
  ON public.profile_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Business owners view own analytics"
  ON public.profile_views FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = profile_views.business_id AND b.owner_id = auth.uid()
  ));

CREATE POLICY "Admins view all analytics"
  ON public.profile_views FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Review aggregation trigger
CREATE OR REPLACE FUNCTION public.update_business_review_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE businesses
  SET avg_rating = (
    SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0)
    FROM reviews WHERE provider_id = NEW.provider_id AND rating IS NOT NULL
  ),
  total_reviews = (
    SELECT COUNT(*) FROM reviews WHERE provider_id = NEW.provider_id
  )
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_business_review_stats
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_review_stats();

-- Seed the three plans
INSERT INTO public.subscription_plans (name, price_monthly_kes, price_annual_kes, limits, features, sort_order)
VALUES
  ('Free', 0, 0,
   '{"max_businesses": 1, "max_services": 3, "max_gallery": 5, "max_quotes_per_month": 5}'::jsonb,
   '["1 Business profile", "3 Services listed", "5 Gallery images", "5 Quotes per month"]'::jsonb,
   0),
  ('Pro', 999, 9990,
   '{"max_businesses": 3, "max_services": 10, "max_gallery": 25, "max_quotes_per_month": 30}'::jsonb,
   '["3 Business profiles", "10 Services per business", "25 Gallery images", "30 Quotes per month", "Pro badge", "Priority in search", "Basic analytics"]'::jsonb,
   1),
  ('Premium', 2499, 24990,
   '{"max_businesses": -1, "max_services": -1, "max_gallery": -1, "max_quotes_per_month": -1}'::jsonb,
   '["Unlimited businesses", "Unlimited services", "Unlimited gallery", "Unlimited quotes", "Premium badge", "Top search placement", "Full analytics", "Priority support"]'::jsonb,
   2);
