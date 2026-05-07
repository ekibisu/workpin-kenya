# Sprint B + Sprint C: Trust, Reliability & Launch Prep

Closing the open trust and legal items so the marketplace is safe to take live before we wire payments.

## Sprint B — Trust & Reliability

### 1. Fix reviews foreign key (DB migration)
Current state: `reviews.provider_id` references `profiles(id)`, but in our unified model reviews are written **about a business**. Inserting a review with a business id silently fails the FK. Also `reviews_request_id_fkey` is a duplicate of `reviews_work_thread_fk`.

Migration:
- Drop `reviews_provider_id_fkey`, recreate it pointing to `businesses(id) ON DELETE CASCADE`.
- Drop the redundant `reviews_request_id_fkey`.

### 2. Update ProviderLanding reviews query
- `src/pages/ProviderLanding.tsx` line 126: change FK alias from `reviews_customer_id_fkey` to `reviews_client_id_fkey` (the actual constraint name) so the join returns the client's name instead of erroring silently.

### 3. Enforce subscription limits at the edges
- `src/pages/BusinessProfileWizard.tsx` (Services + Gallery steps): block "Add" when `business_services.count >= limits.max_services` or `business_gallery.count >= limits.max_gallery`. Show inline upsell card linking to `/pricing`.
- `src/components/dashboard/ProviderJobFeed.tsx`: count quotes submitted by the owner's businesses this calendar month; if `>= limits.max_quotes_per_month`, disable the "Quote" button per row and surface an upsell banner. Use the existing `useSubscriptionLimits` hook.

### 4. Google OAuth on Auth page
- `src/pages/Auth.tsx`: add a "Continue with Google" button (above the email/password form on both Login and Signup tabs). Calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/dashboard` }})`.
- `src/pages/Register.tsx`: same button at top of form.
- No code change needed for the Google provider itself — Lovable Cloud Auth handles it; if the user hasn't enabled Google in Auth settings yet, we will note it in the response so they can flip the toggle.

## Sprint C — Launch Prep

### 5. Terms of Service + Privacy Policy pages
- `src/pages/Terms.tsx` — boilerplate ToS scoped to a Kenya-incorporated marketplace operating in KE/UG/TZ/RW (account, acceptable use, payments via mobile money, dispute resolution placeholder, governing law).
- `src/pages/Privacy.tsx` — what we collect (profile, location, mobile-money phone), how we use it, third parties (Lovable Cloud, payment providers), user rights, retention.
- Wire both into `src/App.tsx` as public routes `/terms` and `/privacy`.
- `src/components/layout/Footer.tsx`: ensure links exist (replace any "#" placeholders).
- Register/Auth already reference these pages — they'll resolve once routes exist.

### 6. Email verification gate
- `src/pages/Auth.tsx` `handleLogin`: after `signInWithPassword`, check `data.user.email_confirmed_at`. If null, sign the user out and show "Please verify your email — we sent a link to {email}. Resend?" with a resend action calling `supabase.auth.resend({ type: 'signup', email })`.
- Continue to allow Google OAuth users (they're verified by Google).

## Out of Scope
- Persisting `UnifiedSettings.tsx` preferences (small follow-up; not blocking payments)
- Sprint C.5 leftovers (UGX/TZS/RWF price seeds, wizard country picker) — separate task
- Sprint D payment integration

## Files to Create
- `src/pages/Terms.tsx`
- `src/pages/Privacy.tsx`

## Files to Modify
- `src/pages/ProviderLanding.tsx` (review query alias)
- `src/pages/BusinessProfileWizard.tsx` (services/gallery limits)
- `src/components/dashboard/ProviderJobFeed.tsx` (quote-per-month limit)
- `src/pages/Auth.tsx` (Google button + email verification gate)
- `src/pages/Register.tsx` (Google button)
- `src/components/layout/Footer.tsx` (Terms/Privacy links)
- `src/App.tsx` (new routes)

## Database Migration
One migration: repoint `reviews.provider_id` FK to `businesses`, drop redundant `reviews_request_id_fkey`.

## Acceptance
- Reviews can be inserted for a business id without FK errors; ProviderLanding shows reviewer names.
- Free-tier user cannot add a 4th service or 6th gallery item; sees upsell.
- Free-tier provider cannot submit a 6th quote in the same month; sees upsell.
- Auth and Register both show "Continue with Google".
- Unverified email users are blocked at login with a resend link.
- `/terms` and `/privacy` render real content (linked from Auth, Register, Footer).
