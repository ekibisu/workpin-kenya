

# Refactor: Unified User Model with Multi-Business Profiles

## Current Architecture (Problems)

The system forces a binary choice at signup: **client OR provider**. This is baked deeply into:

| Layer | How role is used |
|-------|-----------------|
| **Signup** (`Register.tsx`, `Auth.tsx`) | User picks "Client" or "Provider", stored in `profiles.role` and `user_metadata` |
| **Database triggers** | `handle_new_user` and `trg_sync_user_role` sync role to `user_roles` table |
| **Onboarding** (`Onboarding.tsx`) | Forks into `ClientForm` or `ProviderForm` based on `profiles.role` |
| **Routing** (`App.tsx`) | Separate `/dashboard` (client) and `/provider-dashboard` (provider) |
| **Navbar** (`Navbar.tsx`) | Shows different links based on `profiles.role` |
| **Settings** (`SettingsRedirect.tsx`, `Dashboard.tsx`) | Renders different settings components per role |
| **Profile pages** | `/profile` = provider, `/client-profile` = client — completely separate |
| **Tables** | `client_profiles` (1 per user) and `provider_profiles` (1 per user) — both keyed on `user_id` with unique constraint |

**Key limitation**: A provider cannot request services. A client cannot offer services. The `provider_profiles` table allows only ONE business per user (`user_id` unique constraint).

---

## Proposed Architecture

### Core Concept

```text
┌─────────────┐
│    User      │  ← Every person. Has a personal profile.
│  (profiles)  │     Can request services. Can create businesses.
└──────┬───────┘
       │ 1:N
       ▼
┌──────────────────┐
│ Business Profile  │  ← A service-offering entity.
│ (businesses)      │     Has its own name, categories, portfolio,
│                   │     slug, ratings, wallet, etc.
└──────────────────┘
```

- **No more client/provider role split.** Every user can request services AND create businesses.
- **`businesses` table** replaces `provider_profiles`, with `owner_id` instead of `user_id`, and NO unique constraint on `owner_id` (allowing multiple businesses per user).
- **`client_profiles`** merges into `profiles` (just add `mpesa_phone` and `location_name` columns to `profiles`).
- **Admin** remains a role in `user_roles` for elevated privileges — not a profile type.
- **Subscription tier** on `profiles` controls how many businesses a user can create.

### Database Changes

**Phase 1 — Schema migration:**

1. **Add columns to `profiles`:**
   - `mpesa_phone text` (from `client_profiles`)
   - `location_name text` (from `client_profiles`)
   - `lat double precision`, `lng double precision`
   - `subscription_tier text DEFAULT 'free'` (controls max businesses: free=1, pro=5, etc.)
   - Remove the `role` column (or deprecate — keep as nullable for backward compat during migration)

2. **Rename `provider_profiles` → `businesses`:**
   - Rename `user_id` → `owner_id`
   - Drop the unique constraint on `owner_id` (allow multiple businesses)
   - Add `is_active boolean DEFAULT true`
   - Keep all existing columns (business_name, bio, categories, portfolio_photos, etc.)

3. **Drop `client_profiles` table** (after migrating data into `profiles`).

4. **Update `user_roles` enum:**
   - Remove `customer` and `provider` values
   - Keep `admin` only (the only role that matters now)
   - Or add `'user'` as default if needed, but every authenticated user is a "user"

5. **Update foreign keys across tables:**
   - `quotes.provider_id` → rename concept to `business_id` (references `businesses.id` not `businesses.owner_id`)
   - `work_threads.provider_id` → `business_id`
   - `reviews.provider_id` → `business_id`
   - `job_requests.client_id` stays as `user_id` (the person requesting)
   - `wallet_transactions.provider_id` → `business_id`
   - `provider_wallets.provider_id` → `business_id`
   - `fixed_price_services.provider_id` → `business_id`

6. **Update triggers:**
   - `handle_new_user`: Remove role logic. Just create a `profiles` row.
   - `trg_sync_user_role`: Remove entirely (no more role syncing needed).

7. **Update RLS policies:**
   - Policies currently checking `provider_id = auth.uid()` need to change to check `owner_id` via a join to `businesses`
   - Example: `EXISTS (SELECT 1 FROM businesses WHERE id = quotes.business_id AND owner_id = auth.uid())`
   - Admin policies stay the same (use `has_role(auth.uid(), 'admin')`)

**Phase 2 — Data migration:**
- Copy `client_profiles.mpesa_phone` and `location_name` into corresponding `profiles` rows
- Rename `provider_profiles` to `businesses` and update the column name

### Frontend Changes

**Routing consolidation:**
- Merge `/dashboard` and `/provider-dashboard` into a single `/dashboard` with sections:
  - "My Requests" — jobs the user has posted
  - "My Businesses" — list of user's businesses, each expandable to see quotes, jobs, earnings
  - "Messages" — unified inbox
  - "Settings" — single settings page
- `/profile` — the user's personal profile (name, avatar, location, phone)
- `/business/:id` or `/business/:slug` — manage a specific business
- Remove `/client-profile` as a separate route

**Signup flow:**
- Remove the "Client or Provider?" choice from `Register.tsx` and `Auth.tsx`
- All users sign up the same way (name, email, password, phone)
- After signup, user lands on dashboard where they can "Create a Business" if they want to offer services

**Onboarding:**
- Simplify to a single flow: personal info + location + M-Pesa phone
- "Create a Business" becomes a separate action from the dashboard (not part of signup onboarding)

**Navbar:**
- Remove role-based branching
- Show: Dashboard, Profile, and if user has businesses, a "My Businesses" dropdown

**Business creation flow:**
- New page/modal: "Create a Business"
- Fields: business name, bio, slug, categories, rates, portfolio
- Check subscription tier to enforce max business count

**Settings:**
- Single settings page for all users
- Notification preferences, password change, account status
- Per-business settings accessible from business management page

### Files Affected

| Category | Files |
|----------|-------|
| **Database** | 1 large migration (rename table, add columns, update FKs, update RLS, update triggers) |
| **Auth/Signup** | `Register.tsx`, `Auth.tsx`, `AuthContext.tsx` |
| **Onboarding** | `Onboarding.tsx` (simplify to single flow) |
| **Routing** | `App.tsx` (merge dashboard routes) |
| **Dashboards** | `Dashboard.tsx`, `ProviderDashboard.tsx` → merge into unified `Dashboard.tsx` |
| **Profiles** | `Profile.tsx`, `ClientProfile.tsx` → merge; `ProviderProfileCard.tsx` → `BusinessProfileCard.tsx` |
| **Navigation** | `Navbar.tsx`, `SettingsRedirect.tsx` |
| **Settings** | `ClientAccountSettings.tsx`, `ProviderAccountSettings.tsx` → merge |
| **Provider pages** | `ProviderLanding.tsx`, `Providers.tsx` → update queries to use `businesses` table |
| **Hooks** | `useNewSchemaQueries.ts`, `useServices.ts`, `useConversations.ts` |
| **Components** | `QuotesPanel.tsx`, `ConversationList.tsx`, `MessageDrawer.tsx` |

### Implementation Order

This is too large for a single pass. Recommended phased approach:

1. **Phase A — Database migration** (schema changes, data migration, updated RLS)
2. **Phase B — Remove role from signup** (Register, Auth, triggers, onboarding simplification)
3. **Phase C — Unified dashboard** (merge client + provider dashboards)
4. **Phase D — Business CRUD** (create/edit/list businesses from dashboard)
5. **Phase E — Cleanup** (remove dead code, old routes, old components)

Each phase should be a separate implementation pass to keep changes manageable and testable.

### Admin Capabilities

Admins are identified via `user_roles` table with `role = 'admin'`. No changes to the mechanism — just ensure admin policies on all tables allow full CRUD. Admin UI (managing accounts, adding services) would be a separate future feature built on top of this refactored foundation.

