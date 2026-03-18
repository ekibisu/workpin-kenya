

# Enable RLS on Flagged Tables

## Overview
Add Row Level Security and ownership-based policies to the 6 flagged tables. Each table gets policies that match existing patterns in the codebase.

## Policy Design

### 1. bookings
- No direct user_id column; linked via `work_thread_id` to `work_threads` (which has `client_id` and `provider_id`)
- **SELECT**: Thread participants (client or provider) can view bookings
- **INSERT**: Thread participants can create bookings
- **UPDATE**: Thread participants can update bookings

### 2. disputes
- Has `filed_by_id` and `work_thread_id`
- **SELECT**: The filer and thread participants can view disputes
- **INSERT**: Thread participants can file disputes (`filed_by_id = auth.uid()`)
- **UPDATE**: Admins only (dispute resolution)

### 3. fixed_price_services
- Has `provider_id` which equals `auth.uid()` directly
- **SELECT**: Anyone authenticated can view active services (public listing)
- **INSERT/UPDATE/DELETE**: Only the owning provider (`provider_id = auth.uid()`)

### 4. provider_templates
- Has `provider_id` which equals `auth.uid()`
- **ALL**: Only the owning provider (`provider_id = auth.uid()`)

### 5. provider_wallets
- Has `provider_id` which equals `auth.uid()`
- **SELECT**: Only the owning provider
- **INSERT/UPDATE**: Only the owning provider (or system via service role)

### 6. wallet_transactions
- Has `provider_id` which equals `auth.uid()`
- **SELECT**: Only the owning provider
- **INSERT**: Only the owning provider (or system via service role)

## Technical Details

A single database migration will:

1. Enable RLS on all 6 tables
2. Create policies using patterns consistent with existing codebase (e.g., subqueries against `work_threads` for participant checks, direct `provider_id = auth.uid()` for provider-owned tables)

```sql
-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_price_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- bookings: thread participants can manage
CREATE POLICY "Thread participants can view bookings"
ON public.bookings FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM work_threads wt
    WHERE wt.id = bookings.work_thread_id
    AND (wt.client_id = auth.uid() OR wt.provider_id = auth.uid())
  )
);

CREATE POLICY "Thread participants can create bookings"
ON public.bookings FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM work_threads wt
    WHERE wt.id = bookings.work_thread_id
    AND (wt.client_id = auth.uid() OR wt.provider_id = auth.uid())
  )
);

CREATE POLICY "Thread participants can update bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM work_threads wt
    WHERE wt.id = bookings.work_thread_id
    AND (wt.client_id = auth.uid() OR wt.provider_id = auth.uid())
  )
);

-- disputes: participants can view/file, admins can update
CREATE POLICY "Participants can view disputes"
ON public.disputes FOR SELECT TO authenticated
USING (
  filed_by_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM work_threads wt
    WHERE wt.id = disputes.work_thread_id
    AND (wt.client_id = auth.uid() OR wt.provider_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Participants can file disputes"
ON public.disputes FOR INSERT TO authenticated
WITH CHECK (
  filed_by_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM work_threads wt
    WHERE wt.id = disputes.work_thread_id
    AND (wt.client_id = auth.uid() OR wt.provider_id = auth.uid())
  )
);

CREATE POLICY "Admins can update disputes"
ON public.disputes FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- fixed_price_services: public read, provider write
CREATE POLICY "Anyone can view active services"
ON public.fixed_price_services FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Providers manage own services"
ON public.fixed_price_services FOR INSERT TO authenticated
WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers update own services"
ON public.fixed_price_services FOR UPDATE TO authenticated
USING (provider_id = auth.uid());

CREATE POLICY "Providers delete own services"
ON public.fixed_price_services FOR DELETE TO authenticated
USING (provider_id = auth.uid());

-- provider_templates: provider-only
CREATE POLICY "Providers manage own templates"
ON public.provider_templates FOR ALL TO authenticated
USING (provider_id = auth.uid())
WITH CHECK (provider_id = auth.uid());

-- provider_wallets: provider-only read/write
CREATE POLICY "Providers view own wallet"
ON public.provider_wallets FOR SELECT TO authenticated
USING (provider_id = auth.uid());

CREATE POLICY "Providers manage own wallet"
ON public.provider_wallets FOR INSERT TO authenticated
WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers update own wallet"
ON public.provider_wallets FOR UPDATE TO authenticated
USING (provider_id = auth.uid());

-- wallet_transactions: provider-only
CREATE POLICY "Providers view own transactions"
ON public.wallet_transactions FOR SELECT TO authenticated
USING (provider_id = auth.uid());

CREATE POLICY "Providers create own transactions"
ON public.wallet_transactions FOR INSERT TO authenticated
WITH CHECK (provider_id = auth.uid());
```

No code changes are needed -- the application already queries these tables through the existing hooks which filter by the authenticated user's ID.

