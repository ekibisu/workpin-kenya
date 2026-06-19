
DROP POLICY IF EXISTS "Business owner can update own quotes" ON public.quotes;

CREATE POLICY "Business owner can update own pending quotes"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = quotes.provider_id AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = quotes.provider_id AND b.owner_id = auth.uid()
    )
  );
