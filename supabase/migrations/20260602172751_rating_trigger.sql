-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-update avg_rating and total_reviews on businesses
-- whenever a review is inserted, updated, or deleted
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_business_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  -- For DELETE, use OLD; for INSERT/UPDATE, use NEW
  v_business_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.provider_id ELSE NEW.provider_id END;

  UPDATE businesses
  SET
    avg_rating    = (
      SELECT COALESCE(ROUND(AVG(rating::numeric), 2), 0)
      FROM reviews
      WHERE provider_id = v_business_id AND rating IS NOT NULL
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE provider_id = v_business_id AND rating IS NOT NULL
    )
  WHERE id = v_business_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_business_rating ON public.reviews;
CREATE TRIGGER trg_update_business_rating
  AFTER INSERT OR UPDATE OF rating OR DELETE
  ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_rating();
