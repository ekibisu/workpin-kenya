ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS lat numeric;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS lng numeric;

CREATE OR REPLACE FUNCTION public.search_providers(
  p_category    text    DEFAULT NULL,
  p_lat         numeric DEFAULT NULL,
  p_lng         numeric DEFAULT NULL,
  p_radius_km   numeric DEFAULT 50,
  p_min_rating  numeric DEFAULT 0,
  p_country     text    DEFAULT 'KE',
  p_limit       int     DEFAULT 24,
  p_offset      int     DEFAULT 0
)
RETURNS TABLE (
  id uuid, business_name text, bio text, categories text[],
  avg_rating numeric, total_reviews int, is_verified boolean,
  location_name text, rate_kes numeric, rate_type text,
  username text, logo_url text, subscription_status text,
  owner_full_name text, owner_avatar_url text,
  distance_km numeric
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.business_name, b.bio, b.categories,
         b.avg_rating, b.total_reviews, b.is_verified,
         b.location_name, b.rate_kes::numeric, b.rate_type,
         b.username, b.logo_url, b.subscription_status,
         p.full_name, p.avatar_url,
         CASE WHEN p_lat IS NOT NULL AND b.lat IS NOT NULL
           THEN round((ST_Distance(
             ST_SetSRID(ST_MakePoint(b.lng::float8, b.lat::float8), 4326)::geography,
             ST_SetSRID(ST_MakePoint(p_lng::float8, p_lat::float8), 4326)::geography
           )/1000)::numeric, 1)
         ELSE NULL END AS distance_km
  FROM public.businesses b
  JOIN public.profiles p ON p.id = b.owner_id
  WHERE b.is_active = true
    AND (p_category IS NULL OR b.categories @> ARRAY[p_category])
    AND (b.service_country_codes @> ARRAY[p_country]
         OR b.country_code = p_country)
    AND (p_min_rating = 0 OR COALESCE(b.avg_rating, 0) >= p_min_rating)
    AND (p_lat IS NULL OR b.lat IS NULL OR
         ST_DWithin(
           ST_SetSRID(ST_MakePoint(b.lng::float8, b.lat::float8), 4326)::geography,
           ST_SetSRID(ST_MakePoint(p_lng::float8, p_lat::float8), 4326)::geography,
           p_radius_km * 1000))
  ORDER BY b.subscription_status DESC NULLS LAST,
           COALESCE(b.avg_rating, 0) DESC,
           distance_km ASC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_providers(text, numeric, numeric, numeric, numeric, text, int, int) TO anon, authenticated;