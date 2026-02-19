

# Show "Professional Profile" on Provider Dashboard Dropdown

## Problem
The navbar dropdown currently only hides "Client Profile" on provider dashboard pages but doesn't replace it with "Professional Profile". The dropdown needs to swap between the two profile links depending on which dashboard context the user is in.

## What Changes

### File: `src/components/layout/Navbar.tsx`

**Desktop dropdown (lines 79-85):**
- Keep the existing `!isProviderDashboard` condition for "Client Profile"
- Add a new block: when `isProviderDashboard` is true, show "Professional Profile" linking to `/profile`

**Mobile menu (lines 150-154):**
- Same logic: show "Client Profile" when NOT on provider dashboard, show "Professional Profile" when on provider dashboard

### Result
```text
On client pages:         On provider dashboard:
- Client Profile         - Professional Profile
- Dashboard              - Dashboard
- Account Settings       - Account Settings
- Log out                - Log out
```

## No New Files
Only `src/components/layout/Navbar.tsx` is modified.

