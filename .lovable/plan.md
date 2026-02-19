

# Two Profile Pages: Client Profile and Professional Profile

## Overview
Create two separate profile pages -- one for clients and one for professionals (providers). The existing `/profile` page with `ProviderProfileCard` stays as the professional profile. A new client profile page is added with user details instead of ratings/metrics.

## What Changes

### 1. New Client Profile Page
**File: `src/pages/ClientProfile.tsx`**

A new page at `/client-profile` with:
- Page title: "Client Profile"
- A `ClientProfileCard` component showing:
  - User avatar (circle with User icon, brand green background)
  - Full name and email from the `profiles` table
  - **Client Details grid** (2 columns desktop, 1 column mobile):
    - **Location**: MapPin icon, placeholder "Nairobi, Kenya"
    - **Member Since**: Calendar icon, formatted `created_at` date
    - **Industry**: Briefcase icon, placeholder "Not specified"
    - **Contact Email**: Mail icon, user's email
  - Styled with `rounded-xl border border-border bg-card` and brand green icon accents

### 2. New Component: `ClientProfileCard.tsx`
**File: `src/components/profile/ClientProfileCard.tsx`**

- Accepts `userId` prop
- Fetches from `profiles` table: `full_name`, `email`, `phone`, `avatar_url`, `created_at`
- Renders user header row + separator + details grid
- Responsive: `grid-cols-1 sm:grid-cols-2` for details

### 3. Rename Professional Profile Page Title
**File: `src/pages/Profile.tsx`**

- Change heading from "My Profile" to "Professional Profile"
- Keep `ProviderProfileCard` as-is (ratings, breakdown, stats)

### 4. Update Navbar Dropdown
**File: `src/components/layout/Navbar.tsx`**

- Change "View Profile" link to show two options:
  - "Client Profile" linking to `/client-profile`
  - "Professional Profile" linking to `/profile`

### 5. Add Route
**File: `src/App.tsx`**

- Add: `<Route path="/client-profile" element={<ProtectedRoute><ClientProfile /></ProtectedRoute>} />`

## Files Created
- `src/pages/ClientProfile.tsx`
- `src/components/profile/ClientProfileCard.tsx`

## Files Modified
- `src/pages/Profile.tsx` -- update heading to "Professional Profile"
- `src/components/layout/Navbar.tsx` -- split "View Profile" into two links
- `src/App.tsx` -- add `/client-profile` route

## Technical Details

### ClientProfileCard Data Fetching
```text
Query: supabase.from("profiles").select("full_name, email, phone, avatar_url, created_at").eq("id", userId).maybeSingle()
```

### Navbar Dropdown Structure (updated)
```text
Client Profile     -> /client-profile
Professional Profile -> /profile
Dashboard          -> /dashboard
Account Settings   -> /dashboard/settings
---
Log out
```

### Responsive Layout
Both profile pages use the same container: `container max-w-lg py-10` for a clean centered layout on all screen sizes. The client details grid uses `grid-cols-1 sm:grid-cols-2 gap-4`.

