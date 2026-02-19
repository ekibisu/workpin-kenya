

# Relocate Profile Card, Add User Dropdown, Refine Dashboard

## Overview
Three structural changes: move the Professional Profile card to a dedicated Profile page, replace the navbar's "Log out" button with a user dropdown menu, and clean up the Provider Dashboard layout after removing the sidebar.

## 1. New Profile Page

**File: `src/pages/Profile.tsx`**

- A new protected page at `/profile`
- Renders `Navbar`, the existing `ProviderProfileCard` component (passing `user.id`), and `Footer`
- Clean centered layout with max-width container
- Consistent styling with other pages

## 2. Update Navbar with User Dropdown

**File: `src/components/layout/Navbar.tsx`**

When user is logged in, replace the "Dashboard" button + "Log out" button with a single dropdown menu:

- **Trigger**: An avatar icon (using the `Avatar` component with a `User` icon fallback) or the user's email
- **Dropdown items**:
  - "View Profile" -- links to `/profile`
  - "Dashboard" -- links to `/dashboard`
  - "Account Settings" -- links to `/dashboard/settings`
  - Separator
  - "Log out" -- calls `signOut()`
- Uses existing `DropdownMenu` components from `src/components/ui/dropdown-menu.tsx`
- Mobile menu updated similarly: replace standalone buttons with the same links

## 3. Refine Provider Dashboard Layout

**File: `src/pages/ProviderDashboard.tsx`**

- Remove the `ProviderProfileCard` import and the right-hand `<aside>` sidebar
- Remove the flex-row wrapper (`flex-col lg:flex-row`) since the sidebar is gone
- The main content area will use full width, giving cards more breathing room

## 4. Add Route for Profile Page

**File: `src/App.tsx`**

- Add route: `<Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />`

## Files Created
- `src/pages/Profile.tsx`

## Files Modified
- `src/App.tsx` -- add `/profile` route
- `src/components/layout/Navbar.tsx` -- replace logout button with user dropdown
- `src/pages/ProviderDashboard.tsx` -- remove profile card sidebar, simplify layout

