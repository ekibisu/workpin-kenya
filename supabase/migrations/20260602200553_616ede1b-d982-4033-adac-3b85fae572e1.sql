-- 1. provider_wallets: only owner can read their own wallet
DROP POLICY IF EXISTS "Provider can view own wallet" ON provider_wallets;
DROP POLICY IF EXISTS "Owner reads own wallet" ON provider_wallets;
CREATE POLICY "Owner reads own wallet"
  ON provider_wallets FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

DROP POLICY IF EXISTS "Admin reads all wallets" ON provider_wallets;
CREATE POLICY "Admin reads all wallets"
  ON provider_wallets FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. wallet_transactions: only the provider reads their own
DROP POLICY IF EXISTS "Provider can view own transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Provider reads own transactions" ON wallet_transactions;
CREATE POLICY "Provider reads own transactions"
  ON wallet_transactions FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

-- 3. payments: provider of the work_thread reads theirs
DROP POLICY IF EXISTS "Provider reads payment for their thread" ON payments;
CREATE POLICY "Provider reads payment for their thread"
  ON payments FOR SELECT TO authenticated
  USING (
    work_thread_id IN (
      SELECT id FROM work_threads WHERE provider_id = auth.uid()
    )
  );

-- 4. disputes: existing policies already cover parties + admin (verified, no changes needed)
