CREATE POLICY "Provider can update request status"
ON public.service_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.request_id = service_requests.id
    AND quotes.provider_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.request_id = service_requests.id
    AND quotes.provider_id = auth.uid()
  )
);