

# Redesign QuotesPanel to Compact Collapsible Accordion

## Overview
Replace the current card-based quotes display with a compact accordion system. Each quote becomes a thin ~56px row that expands on click to reveal details and actions. Only one quote expands at a time.

## Changes

### 1. Rewrite `src/components/dashboard/QuotesPanel.tsx`

**Header section:**
- "QUOTES" label with green circular badge showing count
- Filter row: "All" / "Pending" toggle tabs
- Sort dropdown: Lowest Price, Highest Price, Highest Rating, Most Recent
- View toggle icons: compact (list) vs card (grid) — compact is default

**Compact row (collapsed, ~56px):**
- Left: colored avatar circle with initials, provider name, star rating + job count (e.g. "★4.8 · 87 jobs")
- Right: bold green price (KES X,XXX), small ChevronDown arrow
- Declined quotes shown with reduced opacity

**Expanded state (accordion content):**
- Provider message in a light box with green left border
- Relative timestamp ("Quoted: 2 hours ago") using `formatDistanceToNow` from date-fns
- Action buttons: Message (ghost), Hire (primary green), Decline (text link)
- On mobile (<640px): stack Message and Hire buttons vertically, min-h 44px for tap targets

**Accordion behavior:**
- Use Radix Accordion with `type="single"` + `collapsible` so only one quote opens at a time
- Smooth CSS transition via existing `animate-accordion-down` / `animate-accordion-up`

**Empty filter state:**
- Mailbox icon + "No quotes match your filter" message when filtered results are empty

**Card view toggle:**
- When "card" view is selected, render the current card layout (preserve existing markup)
- Store view preference in component state (no persistence needed)

### 2. Extend `QuoteData` interface

Add optional fields to support rating display:
```typescript
interface QuoteData {
  // ...existing fields
  provider_profiles?: {
    avg_rating: number | null;
    total_reviews: number | null;
  } | null;
}
```

### 3. Update quote fetching in `src/pages/Dashboard.tsx`

Extend the quotes query to join `provider_profiles`:
```typescript
.select("..., provider_profiles!quotes_provider_id_fkey(avg_rating, total_reviews)")
```

This provides rating data for the compact row display. Update the `Quote` interface to include the new fields.

### 4. Add "highest_rating" sort option

Add `"rating"` to the `SortOption` type and sorting logic, sorting by `provider_profiles.avg_rating` descending.

### 5. Real-time quote subscription

In `Dashboard.tsx`, add a Supabase Realtime subscription on the `quotes` table filtered by the user's request IDs. When a new quote INSERT event fires:
- Fetch the full quote row (with joins)
- Append to local `quotes` state
- Show a toast: "New quote received"

### Files changed

| Action | File |
|--------|------|
| Rewrite | `src/components/dashboard/QuotesPanel.tsx` |
| Edit | `src/pages/Dashboard.tsx` — extend query + add realtime subscription |

No database migrations needed. The `provider_profiles` table already has `avg_rating` and `total_reviews` columns, and the foreign key relationship exists via `provider_id`.

