
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_provider_id_fkey;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_request_id_fkey;
