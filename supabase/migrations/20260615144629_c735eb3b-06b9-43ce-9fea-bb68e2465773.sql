
-- Drop old FKs (currently pointing at profiles) so we can remap data
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_provider_id_fkey;
ALTER TABLE public.work_threads DROP CONSTRAINT IF EXISTS work_threads_provider_id_fkey;
ALTER TABLE public.provider_wallets DROP CONSTRAINT IF EXISTS provider_wallets_provider_id_fkey;
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_provider_id_fkey;
ALTER TABLE public.fixed_price_services DROP CONSTRAINT IF EXISTS fixed_price_services_provider_id_fkey;
ALTER TABLE public.provider_templates DROP CONSTRAINT IF EXISTS provider_templates_provider_id_fkey;

-- Remap stale provider_id values (profile ids) to their owner's business id
UPDATE public.quotes q
SET provider_id = b.id
FROM public.businesses b
WHERE b.owner_id = q.provider_id
  AND q.provider_id NOT IN (SELECT id FROM public.businesses);

UPDATE public.work_threads wt
SET provider_id = b.id
FROM public.businesses b
WHERE b.owner_id = wt.provider_id
  AND wt.provider_id NOT IN (SELECT id FROM public.businesses);

UPDATE public.provider_wallets pw
SET provider_id = b.id
FROM public.businesses b
WHERE b.owner_id = pw.provider_id
  AND pw.provider_id NOT IN (SELECT id FROM public.businesses);

UPDATE public.wallet_transactions wtx
SET provider_id = b.id
FROM public.businesses b
WHERE b.owner_id = wtx.provider_id
  AND wtx.provider_id NOT IN (SELECT id FROM public.businesses);

UPDATE public.fixed_price_services fps
SET provider_id = b.id
FROM public.businesses b
WHERE b.owner_id = fps.provider_id
  AND fps.provider_id NOT IN (SELECT id FROM public.businesses);

UPDATE public.provider_templates pt
SET provider_id = b.id
FROM public.businesses b
WHERE b.owner_id = pt.provider_id
  AND pt.provider_id NOT IN (SELECT id FROM public.businesses);

-- Add correct FKs pointing at businesses(id)
ALTER TABLE public.quotes ADD CONSTRAINT quotes_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.work_threads ADD CONSTRAINT work_threads_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.provider_wallets ADD CONSTRAINT provider_wallets_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.fixed_price_services ADD CONSTRAINT fixed_price_services_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.provider_templates ADD CONSTRAINT provider_templates_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Replace broken payments RLS policy
DROP POLICY IF EXISTS "Provider reads payment for their thread" ON public.payments;
CREATE POLICY "Provider reads payment for their thread"
  ON public.payments FOR SELECT TO authenticated
  USING (
    work_thread_id IN (
      SELECT wt.id FROM public.work_threads wt
      JOIN public.businesses b ON b.id = wt.provider_id
      WHERE b.owner_id = auth.uid()
    )
  );

-- Drop superseded dead policies
DROP POLICY IF EXISTS "Owner reads own wallet" ON public.provider_wallets;
DROP POLICY IF EXISTS "Provider reads own transactions" ON public.wallet_transactions;
