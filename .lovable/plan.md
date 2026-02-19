

# Professional Profile Sidebar on Provider Dashboard

## Overview
Add a right-hand sidebar (approx 300px) next to the "Open Service Requests" section in the Provider Dashboard. It contains a "Professional Profile" card showing the provider's average rating, total reviews, rating breakdown, and quick stats. On mobile, the sidebar stacks below the main content.

## What Changes

### 1. New Component: `ProviderProfileCard.tsx`
**File: `src/components/provider/ProviderProfileCard.tsx`**

A self-contained card component that:
- Accepts a `userId` prop (the current provider's user ID)
- Fetches the provider's record from `providers` table (rating, total_reviews)
- Fetches all reviews for this provider from the `reviews` table to compute the 1-5 star breakdown
- Displays:
  - **Average Rating**: Large bold number + 5 star icons (filled with brand green `#059669`, unfilled gray)
  - **Total Reviews**: Subtext like "Based on 24 reviews"
  - **Rating Breakdown**: 5 horizontal progress bars (5-star to 1-star) showing count/percentage per level
  - **Quick Stats**: Badges for "Response Time" (placeholder `< 2 hrs`) and "Completion Rate" (placeholder `98%`) since these aren't tracked in the DB yet
- Styled with `rounded-xl border border-gray-100 bg-white` matching existing cards

### 2. Update Provider Dashboard Layout
**File: `src/pages/ProviderDashboard.tsx`**

- Wrap the existing `<main>` content and a new right sidebar in a flex container with responsive behavior:
  - Desktop (`lg:`): side-by-side layout, main content takes remaining space, sidebar is `w-[300px] shrink-0`
  - Mobile: sidebar stacks below main content using `flex-col lg:flex-row`
- Render `<ProviderProfileCard userId={user.id} />` inside the right sidebar

### Files Created
- `src/components/provider/ProviderProfileCard.tsx`

### Files Modified
- `src/pages/ProviderDashboard.tsx` -- wrap main area in flex layout, add right sidebar with profile card

---

## Technical Details

### Data Fetching (inside ProviderProfileCard)
```text
1. Query providers table: SELECT rating, total_reviews WHERE user_id = userId
2. Query reviews table: SELECT rating WHERE provider_id = userId
3. Compute breakdown: count reviews per star level (1-5)
4. Display using Progress component for each bar
```

### Layout Change in ProviderDashboard
```text
Before:
  <main className="flex-1 ...">
    ...content...
  </main>

After:
  <main className="flex-1 bg-background">
    <div className="flex flex-col lg:flex-row gap-6 p-6 lg:p-8">
      <div className="flex-1 min-w-0">
        ...existing content...
      </div>
      <aside className="w-full lg:w-[300px] shrink-0">
        <ProviderProfileCard userId={user.id} />
      </aside>
    </div>
  </main>
```

### Star Rating Display
- Uses 5 `Star` icons from lucide-react
- Filled stars: `fill-[#059669] text-[#059669]`
- Empty stars: `fill-gray-200 text-gray-200`
- Supports partial fill via rounding to nearest half

### Quick Stats (Placeholders)
Response Time and Completion Rate are displayed as static placeholders since the database doesn't currently track these metrics. They can be wired up later when the data becomes available.
