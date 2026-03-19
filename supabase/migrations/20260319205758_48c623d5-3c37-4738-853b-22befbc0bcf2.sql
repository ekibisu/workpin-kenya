CREATE POLICY "Client can delete own open requests"
ON public.job_requests
FOR DELETE
TO authenticated
USING (auth.uid() = client_id AND status = 'open');