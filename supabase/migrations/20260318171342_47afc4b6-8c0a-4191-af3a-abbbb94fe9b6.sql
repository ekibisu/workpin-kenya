DROP POLICY IF EXISTS "Authenticated can view services" ON public.services;

CREATE POLICY "Anyone can view active services"
  ON public.services
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);