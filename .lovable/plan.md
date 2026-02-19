

# Real-Time Updates for Dashboards

## Overview
Add Supabase Realtime subscriptions to both the Customer Dashboard and Provider Dashboard so that quote and request status changes appear instantly without needing a page refresh.

## What Changes

### 1. Enable Realtime on Tables (Database Migration)
Run a SQL migration to add the `service_requests` and `quotes` tables to the Supabase realtime publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
```

### 2. Customer Dashboard (`src/pages/Dashboard.tsx`)
Add a `useEffect` that subscribes to two realtime channels after the initial data load:

- **`service_requests` changes** -- listen for `UPDATE` events where `customer_id` matches the current user. On change, update the matching request in local state (e.g. status going from `pending` to `completion_pending`).
- **`quotes` changes** -- listen for `INSERT` and `UPDATE` events on quotes whose `request_id` is in the user's requests list. On insert, add the new quote to local state. On update, patch the matching quote's status/price.

Cleanup: unsubscribe from channels on component unmount.

### 3. Provider Dashboard (`src/pages/ProviderDashboard.tsx`)
Add a `useEffect` that subscribes to:

- **`service_requests` changes** -- listen for `INSERT` (new open requests appear) and `UPDATE` events. When a request transitions to `open`, add it to the open list. When it transitions to `pending`/`completion_pending`, move it to the pending list. When it becomes `completed`, remove from pending.
- **`quotes` changes** -- listen for `UPDATE` events where `provider_id` matches the current user. Update the `quotedRequestIds` and `rejectedRequestIds` sets when a quote is accepted or rejected by a client.

Cleanup: unsubscribe on unmount.

---

## Technical Details

### Realtime subscription pattern (used in both dashboards):
```typescript
useEffect(() => {
  if (!user) return;

  const channel = supabase
    .channel('dashboard-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'service_requests',
    }, (payload) => {
      // Handle INSERT, UPDATE based on payload.eventType
      // Update local state accordingly
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'quotes',
    }, (payload) => {
      // Handle INSERT, UPDATE
      // Refetch related data or patch local state
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [user, /* relevant dependencies */]);
```

### Key considerations:
- **RLS applies to realtime** -- users will only receive events for rows they have SELECT access to, so existing policies are sufficient.
- For quotes on the customer dashboard, when a new quote arrives via realtime INSERT, we'll need to fetch the joined profile/service data with a follow-up query since the realtime payload only contains the raw row.
- State updates use functional `setState` to avoid stale closure issues.
- Each dashboard gets its own uniquely-named channel to avoid conflicts.
