
# Add "Complete" Button to Pending Jobs in Provider Dashboard

## What You'll See

- Each job card in the "Jobs Pending" section will have a "Mark Complete" button at the bottom.
- Clicking it shows a loading spinner, updates the service request status from "pending" to "completed", and shows a success toast.
- The job card is removed from the pending list immediately after completion.

## What Changes

### ProviderDashboard.tsx

1. **New state**: `completingJobId: string | null` to track which job is being completed (for per-button loading).

2. **New handler** `handleCompleteJob(requestId)`:
   - Updates the service request status to `"completed"` via `supabase.from("service_requests").update({ status: "completed" }).eq("id", requestId)`.
   - On success, removes the request from `pendingRequests` state and shows a success toast.
   - On error, shows an error toast.

3. **UI update**: Add a "Mark Complete" button (with `CheckCircle` icon) at the bottom of each pending job card, after the metadata row (location/budget/date). The button shows a spinner when that specific job is being completed.

### No Database Changes Needed

The provider doesn't own the `service_requests` row (the customer does), so the existing RLS UPDATE policy (`auth.uid() = customer_id`) would block the provider. However, since the "Start Job" flow already uses the customer's update permission, we need to add an RLS policy allowing providers to update the status of requests they have quoted on.

**New RLS policy on `service_requests`:**
```sql
CREATE POLICY "Provider can update request status"
ON service_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM quotes
    WHERE quotes.request_id = service_requests.id
    AND quotes.provider_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes
    WHERE quotes.request_id = service_requests.id
    AND quotes.provider_id = auth.uid()
  )
);
```

This ensures only providers who have submitted a quote for a given request can update it.
