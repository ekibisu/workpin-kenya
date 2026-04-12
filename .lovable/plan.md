

# Add Business Profile Avatar/Logo

## Problem
Businesses have no dedicated avatar or logo. Both the Providers listing and the `/pro/:slug` landing page fall back to `profiles.avatar_url` (the owner's personal avatar), which is usually null — resulting in plain initials in a green square. There's no `logo_url` column on the `businesses` table and no way to upload one in the wizard.

## Changes

### 1. Database Migration
Add a `logo_url` column to `businesses`:
```sql
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url text;
```

### 2. Business Profile Wizard (`src/pages/BusinessProfileWizard.tsx`)
- In Step 1 (Basics), add a logo/avatar upload area — a clickable square with camera icon that uploads via `useMediaUpload` and saves to `businesses.logo_url`
- Show a preview of the uploaded logo with a "Change" overlay on hover

### 3. Provider Landing Page (`src/pages/ProviderLanding.tsx`)
- Update the avatar block (line 199–202) to check `provider.logo_url` first, then `profileData?.avatar_url`, then initials fallback

### 4. Providers Listing (`src/pages/Providers.tsx`)
- Same priority chain for the card avatar (line 192–200): `provider.logo_url` → `profileData?.avatar_url` → initials

### 5. Provider Profile Settings (`src/components/provider/settings/ProviderProfileSettings.tsx`)
- Add logo upload option in the settings form

## Files

| Action | File |
|--------|------|
| Migration | Add `logo_url` to `businesses` |
| Edit | `src/pages/BusinessProfileWizard.tsx` — logo upload in Step 1 |
| Edit | `src/pages/ProviderLanding.tsx` — use `logo_url` for avatar |
| Edit | `src/pages/Providers.tsx` — use `logo_url` for card avatar |
| Edit | `src/components/provider/settings/ProviderProfileSettings.tsx` — logo upload |

