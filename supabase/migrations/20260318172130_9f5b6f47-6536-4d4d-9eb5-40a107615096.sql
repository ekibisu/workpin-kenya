
-- Unique index on username for SEO slugs
CREATE UNIQUE INDEX IF NOT EXISTS provider_profiles_username_unique
  ON public.provider_profiles (username)
  WHERE username IS NOT NULL;

-- Allow anonymous + authenticated to browse provider profiles
DROP POLICY IF EXISTS "Anyone authenticated can view providers" ON public.provider_profiles;
CREATE POLICY "Anyone can view provider profiles"
  ON public.provider_profiles FOR SELECT
  TO anon, authenticated USING (true);

-- Allow anonymous + authenticated to view basic profile info (name, avatar)
DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;
CREATE POLICY "Anyone can view basic profiles"
  ON public.profiles FOR SELECT
  TO anon, authenticated USING (true);

-- Allow anonymous to view reviews on landing pages
DROP POLICY IF EXISTS "Authenticated can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  TO anon, authenticated USING (true);
