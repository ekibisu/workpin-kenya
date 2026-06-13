-- ── release_escrow (with open-dispute guard) ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.release_escrow(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment       payments%ROWTYPE;
  v_provider      uuid;
  v_provider_cut  numeric;
  v_platform_fee  numeric;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM disputes
    WHERE work_thread_id = v_payment.work_thread_id
      AND status IN ('open', 'investigating')
  ) THEN
    RAISE EXCEPTION 'Cannot release payment: an open dispute exists for this job';
  END IF;

  IF v_payment.status NOT IN ('paid', 'held') THEN
    RAISE EXCEPTION 'Cannot release payment % with status %', p_payment_id, v_payment.status;
  END IF;

  SELECT provider_id INTO v_provider
  FROM work_threads
  WHERE id = v_payment.work_thread_id;

  IF v_provider IS NULL THEN
    RAISE EXCEPTION 'No work_thread found for payment %', p_payment_id;
  END IF;

  v_platform_fee := round(v_payment.amount_kes * 0.05, 2);
  v_provider_cut := v_payment.amount_kes - v_platform_fee;

  UPDATE payments SET status = 'released' WHERE id = p_payment_id;

  INSERT INTO provider_wallets (provider_id, available_balance_kes, pending_balance_kes, updated_at)
  VALUES (v_provider, v_provider_cut, 0, now())
  ON CONFLICT (provider_id) DO UPDATE
    SET available_balance_kes = provider_wallets.available_balance_kes + v_provider_cut,
        pending_balance_kes   = GREATEST(0, provider_wallets.pending_balance_kes - v_payment.amount_kes),
        updated_at            = now();

  INSERT INTO wallet_transactions (provider_id, type, amount_kes, mpesa_receipt, description)
  VALUES (
    v_provider,
    'credit',
    v_provider_cut,
    NULL,
    'Escrow release for payment ' || p_payment_id::text
  );
END;
$$;

-- ── refund_payment ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refund_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment  payments%ROWTYPE;
  v_provider uuid;
BEGIN
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;
  IF v_payment.status NOT IN ('paid', 'held') THEN
    RAISE EXCEPTION 'Cannot refund payment % with status %', p_payment_id, v_payment.status;
  END IF;

  SELECT provider_id INTO v_provider
  FROM work_threads
  WHERE id = v_payment.work_thread_id;

  UPDATE payments SET status = 'refunded' WHERE id = p_payment_id;

  IF v_provider IS NOT NULL THEN
    UPDATE provider_wallets
       SET pending_balance_kes = GREATEST(0, pending_balance_kes - v_payment.amount_kes),
           updated_at          = now()
     WHERE provider_id = v_provider;

    INSERT INTO wallet_transactions (provider_id, type, amount_kes, mpesa_receipt, description)
    VALUES (
      v_provider,
      'refund',
      v_payment.amount_kes,
      NULL,
      'Refund issued for payment ' || p_payment_id::text
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_payment(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_escrow(uuid) TO authenticated, service_role;