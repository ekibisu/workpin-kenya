
CREATE OR REPLACE FUNCTION public.track_profile_view(biz_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profile_views (business_id, viewed_at, view_count)
  VALUES (biz_id, CURRENT_DATE, 1)
  ON CONFLICT (business_id, viewed_at)
  DO UPDATE SET view_count = profile_views.view_count + 1;
END;
$$;
