-- ─────────────────────────────────────────────────────────────────────────────
-- Payout requests table
-- Providers request withdrawals to their M-Pesa; admin approves via admin panel
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payout_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid        NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount_kes   numeric     NOT NULL CHECK (amount_kes > 0),
  mpesa_phone  text        NOT NULL,
  status       text        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','processing','paid','rejected')),
  admin_note   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Provider can insert and read their own requests
CREATE POLICY "Provider manages own payout requests"
  ON public.payout_requests FOR ALL TO authenticated
  USING (
    provider_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    provider_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- Admin can do everything
CREATE POLICY "Admin manages all payout requests"
  ON public.payout_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add verification columns to businesses if not already present
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS verification_id_url          text,
  ADD COLUMN IF NOT EXISTS verification_submitted_at    timestamptz;
