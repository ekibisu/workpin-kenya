

# In-App Messaging System

## Overview
Add a real-time messaging feature so clients and hired providers can chat directly about a job. Messages appear in a slide-in drawer triggered from job cards on both dashboards.

## What Changes

### 1. Database: Create `direct_messages` Table
A new migration creates the table with RLS policies ensuring only the customer and the accepted provider for a request can read/write messages. Realtime is enabled so new messages appear instantly.

- Table columns: `id`, `request_id`, `sender_id`, `content`, `created_at`
- RLS SELECT policy: customer of the request OR provider with an accepted quote
- RLS INSERT policy: same participants, plus `sender_id` must match the authenticated user
- Realtime enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages`

### 2. New Component: `MessageDrawer`
**File: `src/components/messaging/MessageDrawer.tsx`**

A reusable Sheet (slide-in panel from the right) that:
- Accepts `requestId`, `recipientName`, `open`, and `onOpenChange` props
- Fetches existing messages ordered by `created_at` when opened
- Subscribes to realtime `INSERT` events on `direct_messages` filtered by `request_id`
- Displays messages in a scrollable area: own messages aligned right, others aligned left
- Includes a text input and send button at the bottom
- Auto-scrolls to the latest message on new arrivals

### 3. Customer Dashboard (`Dashboard.tsx`)
- Add state for `chatRequestId` and `chatRecipientName`
- On request cards with status `pending` or `completion_pending`, add a "Message" button next to the hired provider info
- Clicking opens the `MessageDrawer` with the provider's name
- Render the `MessageDrawer` component at the bottom of the page

### 4. Provider Dashboard (`ProviderDashboard.tsx`)
- Add state for `chatRequestId` and `chatRecipientName`
- Fetch customer names for pending requests by joining `service_requests.customer_id` with profiles
- On "Jobs Pending" cards, add a "Message Client" button
- Clicking opens the `MessageDrawer` with the customer's name
- Render the `MessageDrawer` component at the bottom of the page

---

## Technical Details

### Database Migration SQL
```sql
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND sr.customer_id = auth.uid())
    OR EXISTS (SELECT 1 FROM quotes q WHERE q.request_id = direct_messages.request_id AND q.provider_id = auth.uid() AND q.status = 'accepted')
  );

CREATE POLICY "Participants can send messages"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (SELECT 1 FROM service_requests sr WHERE sr.id = request_id AND sr.customer_id = auth.uid())
      OR EXISTS (SELECT 1 FROM quotes q WHERE q.request_id = direct_messages.request_id AND q.provider_id = auth.uid() AND q.status = 'accepted')
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
```

### Realtime Subscription Pattern (in MessageDrawer)
```typescript
const channel = supabase
  .channel(`dm-${requestId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'direct_messages',
    filter: `request_id=eq.${requestId}`,
  }, (payload) => {
    setMessages(prev => [...prev, payload.new]);
  })
  .subscribe();
```

### Files Created
- `src/components/messaging/MessageDrawer.tsx`

### Files Modified
- `src/pages/Dashboard.tsx` -- add Message button + MessageDrawer on hired job cards
- `src/pages/ProviderDashboard.tsx` -- add Message button + MessageDrawer on pending job cards, fetch customer names

