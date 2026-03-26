

# Fix: Handle Missing Provider Profile Gracefully

## Problem
When a user with role "provider" visits `/profile`, the `ProviderProfileCard` fetches their `profiles` row (which exists) but their `provider_profiles` row may not exist yet (e.g., they haven't completed onboarding, or the row was never created). The code checks `if (!data)` but not `if (!data.provider_profiles)`, so it proceeds to access `prov.business_name` on `null`, crashing the app.

## Fix

### In `src/components/provider/ProviderProfileCard.tsx`

**1. Add an "empty profile" state after line 169:**
After the `if (!data)` check, add a check for `if (!data.provider_profiles)`. When triggered, render a friendly setup card instead of crashing:
- Heading: "Complete Your Professional Profile"
- Message explaining they need to set up their provider profile
- A "Set Up Profile" button that either navigates to `/onboarding` or shows inline form fields

**2. Add null-safe access throughout the component:**
Change all `prov.business_name`, `prov.bio`, `prov.categories`, etc. to use optional chaining (`prov?.business_name`) as a safety net, even though the empty-state guard should prevent reaching that code.

### In `src/pages/Profile.tsx`

**3. Add a fallback in the Profile page:**
If the provider profile doesn't exist, show a prompt within the "Public Profile" tab directing the user to complete setup, rather than rendering a broken `ProviderProfileCard`.

## Files Changed

| File | Change |
|------|--------|
| `src/components/provider/ProviderProfileCard.tsx` | Add null guard for missing `provider_profiles`, render setup prompt, add optional chaining throughout |
| `src/pages/Profile.tsx` | No structural changes needed — the fix lives in the child component |

No database changes needed.

