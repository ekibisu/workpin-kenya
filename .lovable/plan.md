

# Phase C & D: Unified Dashboard + Business CRUD

## Phase C — Unified Dashboard

### Problem
Two separate 900+ and 650+ line dashboard pages (`Dashboard.tsx` and `ProviderDashboard.tsx`) with duplicated sidebar patterns, messaging, and settings. The role-based settings rendering in `Dashboard.tsx` (line 505) still checks `user_metadata.role`.

### Changes

**1. Merge sidebar tabs in `Dashboard.tsx`**

Add two new sidebar links between existing ones:
```text
Overview          (existing)
My Requests       (existing — jobs user posted)
My Businesses     (NEW — list user's businesses, open jobs, quotes received)
Messages          (existing — unified inbox)
Settings          (existing)
```

Route: `/dashboard/businesses` triggers the new "My Businesses" tab.

**2. Create `src/components/dashboard/BusinessesPanel.tsx`**

A new component that:
- Fetches `businesses` where `owner_id = user.id`
- If none: shows a "Create a Business" CTA card with description and button
- If businesses exist: lists each as a card showing business name, categories, rating, active status
- Each card has actions: "View Open Jobs", "Edit", and a link to business management
- "View Open Jobs" expands inline to show the open-requests logic currently in `ProviderDashboard.tsx` (filtered by that business's categories)
- Quote submission (from `ProviderDashboard`) moves into this panel, scoped per business
- "Create a Business" button (respects subscription tier limit)

**3. Migrate `ProviderDashboard.tsx` logic into `BusinessesPanel.tsx`**

Move the core data-fetching and quote-submission logic from `ProviderDashboard.tsx` into the new panel, parameterized by `businessId` instead of assuming a single provider profile.

**4. Merge settings in `Dashboard.tsx`**

Replace the role check at line 505 with a single unified settings component that combines:
- Notification preferences (from `ClientAccountSettings`)
- Change password (shared `ChangePasswordCard`)
- Account status controls
- If user has businesses: link to per-business settings

**5. Update `App.tsx`**

- Remove `/provider-dashboard` and `/provider-dashboard/*` routes
- Remove `/client-profile` route
- Remove duplicate `/dashboard` route (lines 52-59)
- Remove `/settings` route (settings lives inside `/dashboard/settings`)
- Remove `SettingsRedirect` import

**6. Update `Navbar.tsx`**

- Remove `isProviderDashboard` variable and all conditional logic using it
- Always show a single "Dashboard" link to `/dashboard`
- Remove conditional profile link branching in mobile menu

**7. Update `Profile.tsx`**

Currently renders `ProviderProfileCard` and `ProviderAccountSettings` in tabs. Refactor to show personal profile info for all users. If user has businesses, show them as a list below.

### Files changed in Phase C

| Action | File |
|--------|------|
| Create | `src/components/dashboard/BusinessesPanel.tsx` |
| Create | `src/components/dashboard/UnifiedSettings.tsx` |
| Edit | `src/pages/Dashboard.tsx` — add "My Businesses" tab, use unified settings |
| Edit | `src/App.tsx` — remove provider-dashboard routes, client-profile, settings redirect |
| Edit | `src/components/layout/Navbar.tsx` — remove role branching |
| Edit | `src/pages/Profile.tsx` — show personal profile + business list |
| Edit | `src/components/dashboard/SettingsRedirect.tsx` — delete or gut |

---

## Phase D — Business CRUD

### Changes

**8. Create `src/components/dashboard/CreateBusinessForm.tsx`**

A dialog/modal with fields:
- Business name (required)
- Bio / description
- Categories (multi-select from `services` table)
- Rate (KES) and rate type (hourly/fixed/project)
- M-Pesa phone for business payments
- Location (reuse `MapPicker`)

Before insert, check: `SELECT count(*) FROM businesses WHERE owner_id = user.id` against `profiles.subscription_tier` limits (free = 1, pro = 5).

Insert into `businesses` table with `owner_id = user.id`.

**9. Create `src/pages/BusinessManage.tsx`**

Route: `/business/:id` — a management page for a single business:
- Edit business details (name, bio, categories, rates, portfolio photos)
- View quotes received by this business
- View/manage fixed-price services
- View earnings (wallet balance, transaction history)
- Toggle business active/inactive

Reuses logic from `ProviderProfileSettings.tsx` and `ProviderDashboard.tsx`.

**10. Update `App.tsx`**

Add route:
```
/business/:id → <ProtectedRoute><BusinessManage /></ProtectedRoute>
```

**11. Update `BusinessesPanel.tsx`**

Wire "Edit" button on each business card to navigate to `/business/:id`.
Wire "Create a Business" button to open `CreateBusinessForm` dialog.

### Files changed in Phase D

| Action | File |
|--------|------|
| Create | `src/components/dashboard/CreateBusinessForm.tsx` |
| Create | `src/pages/BusinessManage.tsx` |
| Edit | `src/App.tsx` — add `/business/:id` route |
| Edit | `src/components/dashboard/BusinessesPanel.tsx` — wire create/edit actions |

---

## Implementation order

Phase C first (items 1-7), then Phase D (items 8-11). Each is a single implementation pass. Phase E (cleanup: delete `ProviderDashboard.tsx`, `ClientProfile.tsx`, `ClientAccountSettings.tsx`, `ProviderAccountSettings.tsx`, drop `profiles.role` column) follows after both are stable.

