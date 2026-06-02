ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS verification_id_url text,
  ADD COLUMN IF NOT EXISTS verification_submitted_at timestamptz;

ALTER TABLE public.disputes
  ADD COLUMN IF NOT EXISTS admin_note text;

ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS admin_note text;
