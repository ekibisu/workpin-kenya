

# Fix: Quotes Not Loading — Invalid Foreign Key Join

## Root Cause

The quotes query uses `provider_profiles!quotes_provider_id_fkey(avg_rating, total_reviews)` but the FK `quotes_provider_id_fkey` points to the `profiles` table, not `provider_profiles`. There is no direct FK between `quotes` and `provider_profiles` — the `provider_profiles` table links via `user_id`, not through the quotes table.

The API returns 400: "Could not find a relationship between 'quotes' and 'provider_profiles' in the schema cache."

## Fix

In `src/pages/Dashboard.tsx`, remove the `provider_profiles` join from the quotes query. Instead, fetch provider ratings in a separate step by querying `provider_profiles` using the `provider_id` values from the quotes results, then merge the data.

### Changes to `src/pages/Dashboard.tsx`

**Step 1 — Fix the quotes select query** (lines ~370 and ~399):
Remove `provider_profiles!quotes_provider_id_fkey(avg_rating, total_reviews)` from the select string. Keep the rest unchanged.

**Step 2 — After fetching quotes, fetch provider ratings separately**:
```typescript
// Get unique provider IDs from quotes
const providerIds = [...new Set(quotesData.map(q => q.provider_id))];
// Fetch their ratings
const { data: providerRatings } = await supabase
  .from("provider_profiles")
  .select("user_id, avg_rating, total_reviews")
  .in("user_id", providerIds);
// Merge into quotes
const enrichedQuotes = quotesData.map(q => ({
  ...q,
  provider_profiles: providerRatings?.find(p => p.user_id === q.provider_id) ?? null
}));
```

Apply the same pattern to both the initial fetch (~line 370) and the realtime fetch (~line 399).

### Files changed

| File | Change |
|------|--------|
| `src/pages/Dashboard.tsx` | Remove invalid FK join, fetch provider ratings separately and merge |

No database changes needed.

