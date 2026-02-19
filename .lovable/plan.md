

# Hide Client Profile Link on Provider Dashboard Pages

## Overview
Conditionally hide the "Client Profile" link in the Navbar dropdown when the user is on provider dashboard routes (`/provider-dashboard`).

## What Changes

### File: `src/components/layout/Navbar.tsx`

- Use the existing `location.pathname` to detect if the current route starts with `/provider-dashboard`
- Add a boolean: `const isProviderDashboard = location.pathname.startsWith("/provider-dashboard")`
- Wrap both "Client Profile" links (desktop dropdown on line 77-81, mobile menu on line 146-148) in a condition: only render when `!isProviderDashboard`

No new files, no other changes needed.

