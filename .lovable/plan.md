

# In-App Messaging System

## Overview
Add a real-time messaging feature that lets clients and hired providers communicate directly about a job. Messages are accessed via a slide-in drawer (Sheet) triggered from quote/job cards on both dashboards.

## What Changes

### 1. Database: Create `direct_messages` Table
A new table to store messages tied to a service request between the customer and the accepted provider.

```sql
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Only the customer or the hired provider for the request can read messages
CREATE POLICY "Participants can view messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = direct_messages.request_id
        AND sr.customer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.request_id = direct_messages.request_id
        AND q.provider_id = auth.uid()
        AND q.status = 'accepted'
    )
  );

-- Only participants can send messages
CREATE POLICY "Participants can send messages"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (
        SELECT 1 FROM service_requests sr
        WHERE sr.id = direct_messages.request_id
          AND sr.customer_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM quotes q
        WHERE q.request_id = direct_messages.request_id
          AND q.provider_id = auth.uid()
          AND q.status = 'accepted'
      )
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
```

### 2. New Component: `MessageDrawer`
Create `src/components/messaging/MessageDrawer.tsx` -- a reusable Sheet component that:
- Takes `requestId`, `recipientName`, and `open/onOpenChange` props
- Fetches existing messages for the request on open
- Subscribes to realtime inserts on `direct_messages` filtered by `request_id`
- Displays messages in a scrollable area with sender alignment (own messages right, other left)
- Has a text input and send button at the bottom
- Shows timestamps and sender names
- Auto-scrolls to the latest message

### 3. Customer Dashboard Updates (`Dashboard.tsx`)
- Import `MessageDrawer` and `MessageCircle` icon
- Add state for `chatRequestId` and `chatRecipientName`
- On request cards with status `pending` or `completion_pending`, add a "Message" button next to the hired provider name
- Clicking opens the `MessageDrawer` with the request ID and provider name

### 4. Provider Dashboard Updates (`ProviderDashboard.tsx`)
- Import `MessageDrawer`
- Add state for `chatRequestId` and `chatRecipientName`
- On "Jobs Pending" cards, add a "Message Client" button
- Need to fetch the customer name for pending requests (join with profiles via `service_requests.customer_id`)
- Clicking opens the `MessageDrawer`

---

## Technical Details

### MessageDrawer Component Structure
```text
Sheet (side="right", ~400px wide)
+-- SheetHeader: "Chat with {recipientName}"
+-- ScrollArea: message list
|   +-- Each message bubble:
|       - Aligned right if sender_id === current user
|       - Aligned left otherwise
|       - Shows content + timestamp
+-- Footer: input + send button
```

### Realtime Subscription Pattern
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

### Data Flow
- Messages are fetched with `SELECT * FROM direct_messages WHERE request_id = ? ORDER BY created_at ASC`
- New messages are inserted and instantly appear via the realtime subscription
- The sender sees their message immediately (optimistic or via realtime echo)
- RLS ensures only the customer and hired provider can read/write messages for a given request

### Files Created
- `src/components/messaging/MessageDrawer.tsx`

### Files Modified
- `src/pages/Dashboard.tsx` -- add Message button on hired job cards
- `src/pages/ProviderDashboard.tsx` -- add Message button on pending job cards, fetch customer names

