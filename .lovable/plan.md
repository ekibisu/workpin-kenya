

# Decline Requests and Quotes

## What Changes

### Professional Side -- "Not Interested" on Open Requests

- Add a `hiddenRequestIds` state (loaded from `localStorage`) to track requests the provider has dismissed
- Add a "Not Interested" button (with `XCircle` icon) next to "Send Quote" on each open request card
- Clicking it adds the request ID to `hiddenRequestIds`, saves to `localStorage`, and hides the card from the feed instantly
- No database changes needed -- this is a client-side preference stored locally

### Client Side -- "Decline Quote" and Auto-Reject Logic

- Add a "Decline" button next to the "Start Job" button on each quote card (only shown for quotes with `pending` status on `open` requests)
- **Decline Quote**: Updates that quote's status to `rejected` via `supabase.from("quotes").update({ status: "rejected" })`
- **Start Job (enhanced)**: When a client clicks "Start Job" on a quote:
  1. Update the selected quote's status to `accepted`
  2. Automatically update all *other* quotes for the same request to `rejected`
  3. Then update the request status to `pending` (existing behavior)
- Declined/rejected quotes show a "Rejected" badge instead of action buttons

### Database Considerations

No new tables or columns are needed. The `quotes` table already has a `status` column (default `pending`). Existing RLS policies don't allow customers to update quotes directly, so we need one new policy:

**New RLS policy on `quotes`:**
- Customers can update quote status for quotes on their own requests (to set `accepted`/`rejected`)

## Technical Details

### Migration SQL

```sql
CREATE POLICY "Customer can update quote status"
ON public.quotes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.service_requests
    WHERE service_requests.id = quotes.request_id
    AND service_requests.customer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.service_requests
    WHERE service_requests.id = quotes.request_id
    AND service_requests.customer_id = auth.uid()
  )
);
```

### ProviderDashboard.tsx Changes

- New state: `hiddenRequestIds` initialized from `localStorage` key `hidden_requests`
- New handler: `handleHideRequest(requestId)` -- adds to set, saves to localStorage, filters from display
- Filter `requests` list to exclude hidden IDs before rendering
- Add "Not Interested" ghost button on each open request card

### Dashboard.tsx Changes

- New state: `decliningQuoteId` for loading indicator
- New handler: `handleDeclineQuote(quoteId)` -- updates quote status to `rejected` in DB and local state
- Enhanced `handleStartJob(requestId)`:
  1. Find the accepted quote for this request
  2. Update that quote to `accepted`
  3. Update all other quotes for the same request to `rejected`
  4. Update request status to `pending`
  5. Update local state for all affected quotes
- Update quote card UI to show "Decline" button alongside "Start Job" for pending quotes on open requests
- Show "Rejected" badge for rejected quotes

### Files Modified

| File | Change |
|------|--------|
| `ProviderDashboard.tsx` | Add hidden requests logic and "Not Interested" button |
| `Dashboard.tsx` | Add decline quote, auto-reject on accept, updated quote card UI |
| Database migration | Add customer quote update policy |
