

# Decline Requests and Quotes Implementation

## Overview

Implement the ability for providers to dismiss open requests and for clients to decline quotes, with automatic rejection of competing quotes when a job is started.

## Step 1: Database Migration

Add an RLS policy so customers can update quote statuses (to `accepted`/`rejected`) for quotes on their own requests.

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

## Step 2: Provider Dashboard -- "Not Interested" Button

**File: `src/pages/ProviderDashboard.tsx`**

- Add `hiddenRequestIds` state initialized from `localStorage` key `hidden_requests`
- Add `handleHideRequest(requestId)` handler that adds the ID to the set, persists to `localStorage`, and removes the card
- Filter `requests` to exclude hidden IDs before rendering
- Add a ghost "Not Interested" button (with `XCircle` icon) next to the existing "Send Quote" button on each open request card

## Step 3: Client Dashboard -- Decline Quote and Auto-Reject

**File: `src/pages/Dashboard.tsx`**

- Add `decliningQuoteId` state for loading indicator
- Add `handleDeclineQuote(quoteId)` -- updates quote status to `rejected` in DB and updates local `quotes` state
- Enhance `handleStartJob(requestId, selectedQuoteId)`:
  1. Update the selected quote to `accepted`
  2. Update all other quotes for the same request to `rejected`
  3. Update the service request status to `pending`
  4. Refresh local state for all affected quotes and the request
- On each quote card (for pending quotes on open requests):
  - Show "Start Job" and "Decline" buttons side by side
  - Pass the specific `quote.id` when clicking "Start Job"
- For rejected quotes: show a red "Rejected" badge instead of action buttons
- For accepted quotes: show a green "Accepted" badge

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| Database migration | New RLS policy on `quotes` for customer updates |
| `src/pages/ProviderDashboard.tsx` | Hidden requests via localStorage + "Not Interested" button |
| `src/pages/Dashboard.tsx` | Decline quote, auto-reject on accept, updated quote card UI |

### Key State Changes

- **ProviderDashboard**: `hiddenRequestIds: Set<string>` from localStorage
- **Dashboard**: `decliningQuoteId: string | null` for button loading state

### Quote Card Status Display

- `pending` on `open` request: Show "Start Job" + "Decline" buttons
- `rejected`: Show red "Rejected" badge
- `accepted`: Show green "Accepted" badge  
- Any quote on non-open request: Show "Job Started" badge (existing behavior)

