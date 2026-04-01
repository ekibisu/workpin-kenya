
-- 1. Add new columns to businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS years_experience integer,
  ADD COLUMN IF NOT EXISTS certifications text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{English}',
  ADD COLUMN IF NOT EXISTS service_area_description text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text;

-- 2. Create business_services table
CREATE TABLE public.business_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  custom_name text NOT NULL,
  description text,
  price_kes integer,
  price_type text DEFAULT 'starting_at',
  duration_estimate text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active business services"
  ON business_services FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Business owners manage own services"
  ON business_services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_services.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_services.business_id AND b.owner_id = auth.uid()));

-- 3. Create business_gallery table
CREATE TABLE public.business_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  thumbnail_url text,
  caption text,
  alt_text text,
  category text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gallery"
  ON business_gallery FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Business owners manage own gallery"
  ON business_gallery FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_gallery.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_gallery.business_id AND b.owner_id = auth.uid()));

-- 4. Create business_faqs table
CREATE TABLE public.business_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view FAQs"
  ON business_faqs FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Business owners manage own FAQs"
  ON business_faqs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_faqs.business_id AND b.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_faqs.business_id AND b.owner_id = auth.uid()));
