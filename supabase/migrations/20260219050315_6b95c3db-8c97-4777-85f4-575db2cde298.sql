CREATE POLICY "Customer can update quote status"
ON public.quotes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.service_requests
    WHERE service_requests.id = quotes.request_id
    AND service_requests.customer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.service_requests
    WHERE service_requests.id = quotes.request_id
    AND service_requests.customer_id = auth.uid()
  )
);