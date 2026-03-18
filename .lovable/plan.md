

# Phase 2: Work Thread Creation & Core Loop Completion

## What needs to happen

When a client accepts a quote ("Start Job" in `Dashboard.tsx` line ~110), the system currently updates quote/job statuses but **never creates a `work_thread` record**. Without this, messaging, reviews, and the entire post-hire workflow are broken.

## Changes

### 1. Create `work_thread` on quote acceptance (Dashboard.tsx)

In the `handleStartJob` function (~line 110-146), after accepting the quote and declining others, insert a new `work_thread` record linking the client, provider, and job request. Then update the accepted quote's `work_thread_id` with the new thread ID.

```text
Current flow:                    New flow:
1. Accept quote                  1. Accept quote
2. Decline other quotes          2. Decline other quotes
3. Update job → "pending"        3. Insert work_thread (client_id, provider_id, job_request_id)
4. Done                          4. Update quote with work_thread_id
                                 5. Update job → "pending"
                                 6. Done
```

The accepted quote's `provider_id` is already available from the quotes state array. The `client_id` is `user.id`.

### 2. Filter provider dashboard by service match (ProviderDashboard.tsx)

Currently line 78-81 fetches ALL open `job_requests`. Change this to:
- First fetch the provider's `categories` array from `provider_profiles`
- Then fetch the service IDs that match those categories from `services`
- Filter `job_requests` to only those with matching `service_id`

### 3. Wire provider "Message Client" to use work_threads (ProviderDashboard.tsx)

The provider dashboard's "Message Client" button needs to look up the `work_thread` for the pending job to open the `MessageDrawer` with the correct `workThreadId`.

### 4. Fix review submission to use work_thread_id (Dashboard.tsx)

The `reviews` table requires `work_thread_id`. The current feedback submission likely doesn't have access to the thread ID. After creating work threads in step 1, store the thread ID so it can be passed when submitting reviews on job completion.

## Files to modify
- `src/pages/Dashboard.tsx` — Add work_thread insert in `handleStartJob`, pass thread ID to review submission
- `src/pages/ProviderDashboard.tsx` — Filter open requests by provider's service categories, look up work_thread for messaging
- No database migrations needed — all tables and RLS policies already exist

