

# Quotes Section Refactor — Price-First Cards with Sorting & Status Filters

## Current State

The quotes section is a flat list of small cards inside each request's right column. Each card shows provider name, price, status badge, date, message, and action buttons all crammed together. As quote count grows, this becomes hard to scan.

## Wireframe

```text
┌─────────────────────────────────────────────────────────────┐
│  QUOTES  ┌───┐   Sort by: ┌──────────────┐                 │
│           │ 3 │            │ Lowest Price ▼│                 │
│           └───┘            └──────────────┘                 │
│  ┌─────────┬──────────┬──────────┐                          │
│  │ All (3) │Pending(2)│Declined(1│                          │
│  └─────────┴──────────┴──────────┘                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  KES 4,500              ┌─────────┐  ┌──────────────┐  │ │
│  │  ┌──┐ John Mwangi       │ Message │  │  Hire  ✓     │  │ │
│  │  │AV│ ★ 4.8 · 12 jobs   └─────────┘  └──────────────┘  │ │
│  │  └──┘                                                   │ │
│  │  "I can fix this within 2 hours..."   ● Pending         │ │
│  │  Quoted: Mar 22, 2026                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  KES 6,000              ┌─────────┐  ┌──────────────┐  │ │
│  │  ┌──┐ Jane Achieng      │ Message │  │  Hire  ✓     │  │ │
│  │  │AV│ ★ 4.5 · 8 jobs    └─────────┘  └──────────────┘  │ │
│  │  └──┘                                                   │ │
│  │  "Available tomorrow morning..."      ● Pending         │ │
│  │  Quoted: Mar 23, 2026                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────── ┐ │
│  │  KES 3,200                                    Declined │ │
│  │  ┌──┐ Peter Ochieng                                    │ │
│  │  │AV│ ★ 3.9 · 3 jobs                                  │ │
│  │  └──┘                                                  │ │
│  │  "I have experience with this type..."                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

- **Price-first**: KES amount is the most prominent element (large, bold, primary color) — aligns with Kenya market behavior
- **Pill badge count**: "QUOTES (3)" header with a colored pill badge
- **Sort dropdown**: "Sort by: Lowest Price" / "Highest Price" / "Newest" — defaults to Lowest Price
- **Status filter tabs**: All / Pending / Shortlisted / Declined — uses existing `TabsList` component
- **Provider mini-profile**: Avatar + name + rating + job count on one line
- **Action buttons right-aligned**: "Message" (outline) and "Hire" (primary) only for pending quotes
- **Declined quotes muted**: Reduced opacity, no action buttons, status shown as text badge

## Technical Plan

### 1. Extract `QuotesPanel` component
**New file:** `src/components/dashboard/QuotesPanel.tsx`

- Accepts `quotes[]`, `requestStatus`, action handlers (`onHire`, `onDecline`, `onMessage`)
- Internal state: `sortBy` ("price_asc" | "price_desc" | "newest"), `filterStatus` ("all" | "pending" | "declined")
- Sorts and filters quotes before rendering
- Uses existing `Tabs`, `TabsList`, `TabsTrigger`, `Select`, `Badge`, `Avatar`, `Button` components

### 2. Quote card sub-component
Inside `QuotesPanel`, each quote card renders:
- **Row 1**: Price (large bold) + action buttons (right-aligned)
- **Row 2**: Avatar + provider name + rating/jobs count
- **Row 3**: Quote message (italic, truncated)
- **Row 4**: Date + status dot

### 3. Update Dashboard.tsx
**File:** `src/pages/Dashboard.tsx` (lines 649-732)

- Replace the inline quotes `<div>` block with `<QuotesPanel>`
- Pass through existing quote data and handler functions
- Remove the old quotes rendering code

### 4. No database or migration changes needed
All data (`quotes.price_kes`, `quotes.status`, `quotes.message`, `profiles.full_name`) already exists.

