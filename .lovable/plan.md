

# Phase B and Beyond: Remove Role Split, Unify Flows

## Status of Phase A (Completed)
Phase A (database migration) is done: `provider_profiles` renamed to `businesses` with `owner_id`, `client_profiles` merged into `profiles`, RLS policies updated, triggers updated.

## What Phase B Must Fix

The role split is still deeply embedded in the frontend. Here is every place it persists:

| Problem | File(s) |
|---------|---------|
| Signup has Client/Provider toggle + sends `role` in metadata | `Register.tsx`, `Auth.tsx` |
| Login routes to `/provider-dashboard` vs `/dashboard` based on `profiles.role` | `Auth.tsx` (lines 73-76) |
| Onboarding forks into `ClientForm` or `ProviderForm` based on `profiles.role` | `Onboarding.tsx` (line 632) |
| Dashboard settings check `user?.user_metadata?.role` | `Dashboard.tsx` (line 505) |
| `SettingsRedirect` checks `user?.role` (always undefined now) | `SettingsRedirect.tsx` (line 8) |
| Navbar mobile menu shows different profile links based on `hasBusiness` | `Navbar.tsx` (lines 186-194) |
| CTA/Footer link to `?role=provider` signup | `CTASection.tsx`, `HeroSection.tsx`, `Footer.tsx` |
| `app_role` enum still has `customer` and `provider` values | Database |
| ProviderDashboard is a separate 655-line page | `ProviderDashboard.tsx` |

---

## Plan

### Phase B — Remove role from signup and login routing

**1. `Register.tsx`**: Remove the Client/Provider toggle and `role` state. Remove `role` from `signUp` metadata. All users sign up the same way (name, email, password, phone). After signup, navigate to `/dashboard`.

**2. `Auth.tsx`**: Remove the role toggle from the signup form (lines 278-305). Remove `role` from signup metadata (line 110). In login handler, remove role-based routing (lines 73-76) — always navigate to `/dashboard` (or `/onboarding` if incomplete).

**3. `Onboarding.tsx`**: Replace the `ClientForm`/`ProviderForm` fork with a single unified form:
- Steps: "Personal Info" (name, location) → "Payment" (M-Pesa phone)
- No business creation during onboarding — that moves to the dashboard
- Save to `profiles` table only, set `onboarding_complete = true`

**4. `CTASection.tsx`, `HeroSection.tsx`, `Footer.tsx`**: Change `?role=provider` links to just go to `/register` or a future "Create a Business" page.

**5. Database migration**: Update `handle_new_user` trigger to stop reading `role` from metadata. Remove `trg_sync_user_role` trigger if still present.

### Phase C — Unified Dashboard

**6. Merge `Dashboard.tsx` and `ProviderDashboard.tsx`** into a single `/dashboard` with sidebar tabs:
- "My Requests" — jobs the user has posted (existing client dashboard content)
- "My Businesses" — if user has businesses, show a list; each links to business management. If none, show "Create a Business" CTA.
- "Messages" — unified inbox (already shared component)
- "Settings" — single settings page (merge `ClientAccountSettings` + `ProviderAccountSettings`)

**7. `SettingsRedirect.tsx`**: Remove role check. Render a single merged settings component.

**8. `App.tsx`**: Remove `/provider-dashboard` routes. Remove `/client-profile` route. Keep `/dashboard` and `/dashboard/*`.

**9. `Navbar.tsx`**: Remove `isProviderDashboard` logic and the conditional profile links in mobile menu. Always show "My Profile" linking to `/profile`.

### Phase D — Business CRUD from Dashboard

**10. New component `CreateBusinessForm`**: A modal/page accessible from the "My Businesses" tab in the dashboard. Fields: business name, bio, slug, categories, rates, M-Pesa phone, portfolio. Check `profiles.subscription_tier` to enforce max business count (free = 1).

**11. Business management page** at `/business/:id`: Edit business details, view quotes received by that business, manage fixed-price services, see earnings.

**12. Update `ProviderDashboard` logic** (quote submission, open jobs view) to become a sub-view within business management — the provider sees open jobs filtered by their business's categories.

### Phase E — Cleanup

**13. Delete dead files**: `ProviderDashboard.tsx`, `ClientProfile.tsx`, `ClientAccountSettings.tsx`, `ProviderAccountSettings.tsx` (after merging).

**14. Update `app_role` enum**: Remove `customer` and `provider`, keep only `admin`. (Requires migration since enum values in use may need data cleanup first.)

**15. Drop `profiles.role` column** (or leave nullable, no code reads it anymore).

---

## Implementation Priority

I recommend implementing **Phase B first** (items 1-5) as a single pass. This is the most critical — it stops the broken role-based branching. Phases C-E can follow in subsequent passes.

### Files changed in Phase B

| Action | File |
|--------|------|
| Edit | `src/pages/Register.tsx` — remove role toggle, remove role from metadata |
| Edit | `src/pages/Auth.tsx` — remove role toggle, remove role-based login routing |
| Edit | `src/pages/Onboarding.tsx` — replace with single unified form |
| Edit | `src/components/home/CTASection.tsx` — update link |
| Edit | `src/components/home/HeroSection.tsx` — update link |
| Edit | `src/components/layout/Footer.tsx` — update link |
| Migration | Update `handle_new_user` trigger to not read role from metadata |

