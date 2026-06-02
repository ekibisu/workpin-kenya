
## Goal

Add three edge functions to `supabase/functions/` so they auto-deploy to Lovable Cloud:

1. `mpesa-stk` — initiates Safaricom Daraja STK Push for both subscription upgrades and job/quote payments
2. `mpesa-callback` — public webhook that Daraja calls; reconciles payment and updates either `payments` or `business_subscriptions`
3. `send-notification` — fan-out helper that sends email (Resend), SMS (Africa's Talking), and/or writes an in-app row

## Functions

### 1. `mpesa-stk` (JWT-verified)

- POST body validated with Zod:
  ```
  { purpose: "subscription" | "payment",
    amount_kes: number,
    phone: string,                // E.164 or 07XX, normalised to 2547XXXXXXXX
    reference: string,            // business_id (subscription) or work_thread_id (payment)
    plan_id?: string,             // required when purpose=subscription
    period?: "monthly" | "annual" // required when purpose=subscription
  }
  ```
- Validates the caller's JWT via `supabase.auth.getUser()` (anon client + Authorization header).
- Gets Daraja OAuth token (`/oauth/v1/generate?grant_type=client_credentials`).
- Generates timestamp + password (`Base64(shortcode+passkey+timestamp)`).
- Calls `mpesa/stkpush/v1/processrequest` with `CallbackURL` pointing to `${VITE_SUPABASE_URL}/functions/v1/mpesa-callback`.
- Inserts a pending row keyed by `CheckoutRequestID`:
  - `purpose=payment` → `payments` (existing table) with `client_id`, `work_thread_id`, `amount_kes`, `mpesa_checkout_request_id`, `status='pending'`.
  - `purpose=subscription` → new `pending_subscription_payments` table (see migration below) carrying `business_id`, `plan_id`, `period`, `amount_kes`, `checkout_request_id`.
- Returns `{ checkout_request_id, merchant_request_id }`.

### 2. `mpesa-callback` (public, `verify_jwt = false` via `supabase/config.toml`)

- Accepts Daraja `Body.stkCallback` payload, no JWT.
- Looks up `CheckoutRequestID` in `payments` then `pending_subscription_payments` (uses service role client to bypass RLS).
- On `ResultCode === 0`:
  - `payments`: update `status='paid'`, store `mpesa_receipt_number`; trigger `send-notification` to client + provider.
  - subscription: insert `business_subscriptions` row (`status='active'`, `started_at=now`, `expires_at=now + period`, `mpesa_receipt`), update `businesses.subscription_status`, delete the pending row.
- On non-zero code: mark `status='failed'` (payments) or delete pending row; send failure notification.
- Always returns `{ ResultCode: 0, ResultDesc: "Accepted" }` so Daraja stops retrying.

### 3. `send-notification` (JWT-verified for client calls; callable from other functions with service-role key)

- POST body:
  ```
  { user_id?: string,        // for in-app + lookup of email/phone
    to_email?: string,
    to_phone?: string,
    channels: ("email"|"sms"|"in_app")[],
    subject?: string,
    message: string,
    template?: "payment_success"|"payment_failed"|"quote_received"|"generic",
    data?: Record<string, unknown>
  }
  ```
- Email: Resend connector via `https://connector-gateway.lovable.dev/resend/emails` (uses `LOVABLE_API_KEY` + `RESEND_API_KEY`).
- SMS: Africa's Talking REST (`https://api.africastalking.com/version1/messaging`) with `AT_USERNAME` + `AT_API_KEY`.
- In-app: insert into new `notifications` table (see migration); frontend subscribes via Realtime.
- Returns per-channel `{ ok, error? }` map. Never throws on a single channel failure.

## Database migration (one SQL block)

```sql
-- 1) Pending subscription payments (created before Daraja confirms)
CREATE TABLE public.pending_subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  period text NOT NULL CHECK (period IN ('monthly','annual')),
  amount_kes integer NOT NULL,
  checkout_request_id text NOT NULL UNIQUE,
  initiated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pending_subscription_payments TO authenticated;
GRANT ALL    ON public.pending_subscription_payments TO service_role;
ALTER TABLE public.pending_subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own pending" ON public.pending_subscription_payments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_id = auth.uid())
  );

-- 2) In-app notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'generic',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 3) Allow callback to update payments (currently no UPDATE policy; service role bypasses RLS, no policy needed)
```

## Secrets to add (one prompt)

- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_ENV` (`sandbox` or `production`)
- `AT_USERNAME`
- `AT_API_KEY`

Resend is wired via the standard Resend connector (separate `connect` call → user picks the connection).

## `supabase/config.toml` addition

```toml
[functions.mpesa-callback]
verify_jwt = false
```

`mpesa-stk` and `send-notification` use the default (JWT-validated in code).

## Out of scope

- Frontend hooks/components that call these functions (will be a follow-up after Sprint D UI plan).
- Pesapal/Paystack routing (deferred — Daraja-only for KE shortcode).
- Notification templates beyond plain HTML/text strings.
- Wallet/payout settlement logic.

## Deliverable

Three deployed edge functions, two new tables with RLS, secrets requested, callback URL ready to register in the Daraja dashboard:
```
https://<project>.supabase.co/functions/v1/mpesa-callback
```
