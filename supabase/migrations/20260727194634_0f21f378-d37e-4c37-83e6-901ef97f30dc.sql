DROP POLICY IF EXISTS "Provider can update request status" ON public.job_requests;

CREATE POLICY "Provider can update request status"
ON public.job_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quotes q
    JOIN public.businesses b ON b.id = q.provider_id
    WHERE q.request_id = job_requests.id
      AND q.status = 'accepted'
      AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quotes q
    JOIN public.businesses b ON b.id = q.provider_id
    WHERE q.request_id = job_requests.id
      AND q.status = 'accepted'
      AND b.owner_id = auth.uid()
  )
);