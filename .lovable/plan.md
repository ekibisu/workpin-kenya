

# Fix: Providers See Only Requests Matching Their Services

## Problem

In `ProviderDashboard.tsx` (lines 112-114), when a provider has no matching categories or the category-to-service name lookup returns zero matches, the filter is skipped entirely — showing **all** open requests instead of **none**.

```typescript
// Current: skips filter when no matches → shows everything
if (matchingServiceIds.length > 0) {
  openReqQuery.in("service_id", matchingServiceIds);
}
```

## Fix

When `matchingServiceIds` is empty, the provider should see zero open requests — not all of them. Change the logic so that if the provider has categories but none matched, or has no categories at all, the query returns nothing.

### File: `src/pages/ProviderDashboard.tsx`

Replace the conditional filter block (lines 111-114) with:

```typescript
// If provider has no matching services, return empty results
if (matchingServiceIds.length === 0) {
  setRequests([]);
  // still fetch pending jobs and quotes below
} else {
  openReqQuery.in("service_id", matchingServiceIds);
}
```

Then wrap the open requests result assignment so it only processes `reqRes.data` when `matchingServiceIds.length > 0`, otherwise keeps the empty array.

This is a single-line logic change — no schema or migration needed.

