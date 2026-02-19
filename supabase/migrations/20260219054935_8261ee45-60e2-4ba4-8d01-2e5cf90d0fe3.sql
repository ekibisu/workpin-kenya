
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND sr.customer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM quotes q WHERE q.request_id = direct_messages.request_id AND q.provider_id = auth.uid() AND q.status = 'accepted')
  );

CREATE POLICY "Participants can send messages"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND sr.customer_id = auth.uid())
      OR EXISTS (SELECT 1 FROM quotes q WHERE q.request_id = direct_messages.request_id AND q.provider_id = auth.uid() AND q.status = 'accepted')
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
