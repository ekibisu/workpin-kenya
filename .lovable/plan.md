
# Display Received Quotes on the Client Dashboard

The client dashboard currently shows "Quotes Received: -- Coming soon" in the stats and has no section to view quotes from providers. This change fetches quotes linked to the client's service requests and displays them prominently.

## What You'll See

1. **Stats card update** -- The "Quotes Received" stat will show the actual count of quotes instead of "--".

2. **New "Quotes Received" section** below "Your Requests" showing each quote with:
   - The service name and request description it's for
   - The provider's quoted price (in KES)
   - The provider's message (if any)
   - When the quote was submitted
   - The quote status (pending, accepted, etc.)

3. If no quotes exist yet, an empty state message is shown.

## What Changes

### Dashboard.tsx

**Data fetching:**
- After fetching service requests, also fetch quotes for those requests by querying the `quotes` table joined with `service_requests` (filtered by `customer_id = user.id`) and `profiles` (for provider name).
- Query: `supabase.from("quotes").select("id, price, message, status, created_at, request_id, provider_id, profiles!quotes_provider_id_fkey(full_name), service_requests!quotes_request_id_fkey(description, services(name))").eq("service_requests.customer_id", user.id)`
- Since Supabase filters on joined tables don't exclude rows, we'll instead use the already-fetched request IDs to filter: `.in("request_id", requestIds)`.

**Stats update:**
- Replace the hardcoded "--" and "Coming soon" with the actual quotes count.

**New UI section:**
- Add a "Quotes Received" card section after the "Your Requests" section.
- Each quote is rendered as a card showing the service name, price, provider name, message, and date.
- Uses the same design language (rounded-2xl borders, consistent spacing) as the existing request cards.

---

## Technical Details

**New interface:**
```typescript
interface Quote {
  id: string;
  price: number;
  message: string | null;
  status: string;
  created_at: string;
  request_id: string;
  provider_id: string;
  profiles: { full_name: string | null } | null;
  service_requests: { description: string; services: { name: string } | null } | null;
}
```

**Fetch logic (inside existing useEffect):**
1. Fetch service requests (existing).
2. Extract request IDs from the results.
3. If there are request IDs, fetch quotes with `.in("request_id", ids)` joining `profiles` and `service_requests(services(name))`.
4. Store in a new `quotes` state variable.

**Stats update:**
- `{ label: "Quotes Received", value: String(quotes.length), icon: TrendingUp, trend: "Across all requests" }`

**Quotes section UI:**
- Rendered below "Your Requests" in a similar bordered card container.
- Each quote card shows: service name, quoted price (KES), provider name, optional message, date, and a status badge.
- Empty state with a `TrendingUp` icon and "No quotes received yet" message.

**No database or RLS changes needed** -- the existing `quotes` SELECT policy already allows customers to view quotes on their own requests via the `service_requests.customer_id = auth.uid()` check.
