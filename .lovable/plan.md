

# Wire Up "Start Job" Button to Change Request Status

When a client clicks "Start Job" on a quote in the "Quotes Received" section, the corresponding service request will be updated from "open" to "pending" status.

## What You'll See

- Clicking "Start Job" on a quote will update the linked service request's status to "pending".
- The button will show a loading spinner while the update is in progress.
- A success toast will confirm the action.
- The request card in "Your Requests" will immediately reflect the new "pending" status.
- The quote's "Start Job" button will be disabled/hidden after the job is started.

## What Changes

### Dashboard.tsx

1. **Add a `handleStartJob` function** that:
   - Takes the quote's `request_id`
   - Calls `supabase.from("service_requests").update({ status: "pending" }).eq("id", request_id)`
   - On success, updates local `requests` state to reflect the new status
   - Shows a success or error toast

2. **Wire the "Start Job" button** to call `handleStartJob(quote.request_id)` on click.

3. **Add a loading state** (`startingJobId: string | null`) to show a spinner on the clicked button.

4. **Conditionally render the button**: Only show "Start Job" if the linked request is still "open". If the request is "pending" or later, show a disabled "Job Started" indicator instead.

### No Database Changes Needed

The existing RLS policy on `service_requests` already allows customers to update their own requests (`auth.uid() = customer_id` for UPDATE). The `status` column is a text field with no constraints beyond the default value.

---

## Technical Details

**New handler:**
```typescript
const handleStartJob = async (requestId: string) => {
  setStartingJobId(requestId);
  const { error } = await supabase
    .from("service_requests")
    .update({ status: "pending" })
    .eq("id", requestId);
  setStartingJobId(null);
  if (error) {
    toast({ title: "Error", description: "Could not start job.", variant: "destructive" });
    return;
  }
  setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "pending" } : r));
  toast({ title: "Job started!", description: "The request status has been updated." });
};
```

**Button logic per quote:**
- Look up the request status from local state using `quote.request_id`
- If status is "open": show active "Start Job" button
- Otherwise: show disabled "Job Started" badge

**New state:** `startingJobId: string | null` for per-button loading indicator.

