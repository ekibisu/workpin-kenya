-- Pending subscription payments (awaiting Daraja callback)
CREATE TABLE public.pending_subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  period text NOT NULL CHECK (period IN ('monthly','annual')),
  amount_kes integer NOT NULL,
  checkout_request_id text NOT NULL UNIQUE,
  initiated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pending_subscription_payments TO authenticated;
GRANT ALL ON public.pending_subscription_payments TO service_role;

ALTER TABLE public.pending_subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own pending"
ON public.pending_subscription_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = pending_subscription_payments.business_id
      AND b.owner_id = auth.uid()
  )
);

-- In-app notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'generic',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;