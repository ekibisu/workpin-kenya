
DROP POLICY IF EXISTS "Thread participants view messages" ON public.messages;
DROP POLICY IF EXISTS "Thread participants insert messages" ON public.messages;

CREATE POLICY "Thread participants view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_threads wt
      WHERE wt.id = messages.work_thread_id
        AND (
          wt.client_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = wt.provider_id AND b.owner_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Thread participants insert messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.work_threads wt
      WHERE wt.id = messages.work_thread_id
        AND (
          wt.client_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.businesses b
            WHERE b.id = wt.provider_id AND b.owner_id = auth.uid()
          )
        )
    )
  );
