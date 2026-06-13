## Guard escrow release while a dispute is open

### 1. Migration `supabase/migrations/TIMESTAMP_dispute_guard.sql`

Recreate `public.release_escrow(p_payment_id uuid)` identical to the existing version in `20260602172750_escrow_release.sql`, but with an open-dispute guard inserted right after the `SELECT * INTO v_payment` block:

```sql
IF EXISTS (
  SELECT 1 FROM disputes
  WHERE work_thread_id = v_payment.work_thread_id
    AND status IN ('open', 'investigating')
) THEN
  RAISE EXCEPTION 'Cannot release payment: an open dispute exists for this job';
END IF;
```

Also add a new `public.refund_payment(p_payment_id uuid)`:

- Fetch payment; require current status in `('paid','held')`.
- `UPDATE payments SET status = 'refunded' WHERE id = p_payment_id`.
- Decrement `provider_wallets.pending_balance_kes` by `v_payment.amount_kes` (floored at 0) so the held amount no longer shows as incoming.
- Do NOT credit `available_balance_kes`. No `wallet_transactions` credit row (optionally insert a `'refund'` debit-style row for audit — will include a zero-amount note row referencing the payment so admins have a trail).
- `SECURITY DEFINER`, `SET search_path = public`.
- `GRANT EXECUTE ON FUNCTION public.refund_payment(uuid) TO authenticated, service_role`.

No table schema changes.

### 2. Client dashboard — block confirmation while disputed

`src/pages/Dashboard.tsx`:
- Add a `useQuery` keyed `["open_disputes", user.id, threadIds]` that selects `id, work_thread_id` from `disputes` where `work_thread_id` is in the current `workThreadMap` values AND `status IN ('open','investigating')`. Refetches when requests/quotes invalidate.
- Build `openDisputeRequestIds: Set<string>` by mapping back through `workThreadMap`.
- Pass `openDisputeRequestIds` to `<RequestsTab />`.

`src/components/dashboard/RequestsTab.tsx`:
- Add `openDisputeRequestIds: Set<string>` to props.
- Inside the `req.status === "completion_pending"` block, if `openDisputeRequestIds.has(req.id)`, render an info card instead of the Yes/Not Yet buttons:

  > "This job has a pending dispute. Our team will follow up once it's resolved."

### 3. Admin DisputesTab resolution actions

`src/pages/Admin.tsx` `DisputesTab`:
- Extend the dispute query to also pull the `payment` for each dispute's `work_thread_id` (`payments` select `id, status, amount_kes` where `work_thread_id` matches; pick the latest `held`/`paid` row). Attach as `row.payment`.
- In the expanded row, alongside the existing Status / Admin note / Save controls, add two action buttons (shown only if `row.payment` exists and its status is `held` or `paid`):
  - **Refund client** → confirm dialog → call `supabase.rpc("refund_payment", { p_payment_id: row.payment.id })`, then `UPDATE disputes SET status='resolved', admin_note=<current>` for that row, toast + invalidate.
  - **Release to provider** → confirm dialog → first `UPDATE disputes SET status='resolved'` (so the guard passes), then `supabase.rpc("release_escrow", { p_payment_id: row.payment.id })`, toast + invalidate. Surface RPC errors via toast.
- Buttons disabled while a per-row `actionBusyId` matches; reuse existing `savingId` pattern.

### Notes
- Frontend uses existing `supabase.rpc` typing; `release_escrow` is already typed, `refund_payment` will appear in regenerated types after migration runs.
- No changes to `auto_release_on_completion` trigger — it now correctly throws if a dispute is open, which is the desired loud failure.