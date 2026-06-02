-- ─────────────────────────────────────────────────────────────────────────────
-- Escrow hold and release functions
-- Called by the mpesa-callback Edge Function after payment confirmation
-- ─────────────────────────────────────────────────────────────────────────────

-- ── hold_payment ──────────────────────────────────────────────────────────────
-- Called when client initiates checkout (payment status = pending → held)
-- Increments provider pending balance so they can see money is coming

CREATE OR REPLACE FUNCTION public.hold_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment  payments%ROWTYPE;
  v_provider uuid;
BEGIN
  -- Fetch the payment
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;

  -- Get provider_id from the work_thread
  SELECT provider_id INTO v_provider
  FROM work_threads
  WHERE id = v_payment.work_thread_id;

  IF v_provider IS NULL THEN
    RAISE EXCEPTION 'No work_thread found for payment %', p_payment_id;
  END IF;

  -- Set payment to held
  UPDATE payments SET status = 'held' WHERE id = p_payment_id;

  -- Upsert provider wallet, increment pending balance
  INSERT INTO provider_wallets (provider_id, available_balance_kes, pending_balance_kes, updated_at)
  VALUES (v_provider, 0, v_payment.amount_kes, now())
  ON CONFLICT (provider_id) DO UPDATE
    SET pending_balance_kes = provider_wallets.pending_balance_kes + EXCLUDED.pending_balance_kes,
        updated_at = now();
END;
$$;

-- ── release_escrow ─────────────────────────────────────────────────────────────
-- Called by admin or auto-trigger when job_requests.status → 'completed'
-- Moves money from pending to available, minus 5% platform fee

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
  -- Fetch and validate payment
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;
  IF v_payment.status NOT IN ('paid', 'held') THEN
    RAISE EXCEPTION 'Cannot release payment % with status %', p_payment_id, v_payment.status;
  END IF;

  -- Get provider from work_thread
  SELECT provider_id INTO v_provider
  FROM work_threads
  WHERE id = v_payment.work_thread_id;

  IF v_provider IS NULL THEN
    RAISE EXCEPTION 'No work_thread found for payment %', p_payment_id;
  END IF;

  -- Calculate split
  v_platform_fee := round(v_payment.amount_kes * 0.05, 2);
  v_provider_cut := v_payment.amount_kes - v_platform_fee;

  -- Mark payment released
  UPDATE payments SET status = 'released' WHERE id = p_payment_id;

  -- Move from pending → available in wallet
  INSERT INTO provider_wallets (provider_id, available_balance_kes, pending_balance_kes, updated_at)
  VALUES (v_provider, v_provider_cut, 0, now())
  ON CONFLICT (provider_id) DO UPDATE
    SET available_balance_kes = provider_wallets.available_balance_kes + v_provider_cut,
        pending_balance_kes   = GREATEST(0, provider_wallets.pending_balance_kes - v_payment.amount_kes),
        updated_at            = now();

  -- Record provider credit transaction
  INSERT INTO wallet_transactions (provider_id, type, amount_kes, mpesa_receipt, description)
  VALUES (
    v_provider,
    'credit',
    v_provider_cut,
    v_payment.mpesa_receipt_number,
    'Job payment released'
  );

  -- Record platform fee debit (for accounting)
  INSERT INTO wallet_transactions (provider_id, type, amount_kes, mpesa_receipt, description)
  VALUES (
    v_provider,
    'platform_fee',
    v_platform_fee,
    v_payment.mpesa_receipt_number,
    'WorkPin platform fee (5%)'
  );
END;
$$;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.hold_payment(uuid)    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_escrow(uuid)  TO authenticated, service_role;

-- ── Auto-release trigger ───────────────────────────────────────────────────────
-- When a job_request moves to 'completed', automatically release escrow

CREATE OR REPLACE FUNCTION public.auto_release_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  -- Only fire when status changes TO 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Find the paid/held payment for this job's work thread
    SELECT p.id INTO v_payment_id
    FROM payments p
    JOIN work_threads wt ON wt.id = p.work_thread_id
    WHERE wt.job_request_id = NEW.id
      AND p.status IN ('paid', 'held')
    LIMIT 1;

    IF v_payment_id IS NOT NULL THEN
      PERFORM public.release_escrow(v_payment_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_release_escrow ON public.job_requests;
CREATE TRIGGER trg_auto_release_escrow
  AFTER UPDATE OF status ON public.job_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_release_on_completion();
