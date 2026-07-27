CREATE OR REPLACE FUNCTION public.is_accepted_provider_for_request(_request_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quotes q
    JOIN public.businesses b ON b.id = q.provider_id
    WHERE q.request_id = _request_id
      AND q.status = 'accepted'
      AND b.owner_id = _user_id
  )
$$;

REVOKE ALL ON FUNCTION public.is_accepted_provider_for_request(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_accepted_provider_for_request(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Provider can update request status" ON public.job_requests;

CREATE POLICY "Provider can update request status"
ON public.job_requests
FOR UPDATE
TO authenticated
USING (public.is_accepted_provider_for_request(id, auth.uid()))
WITH CHECK (public.is_accepted_provider_for_request(id, auth.uid()));