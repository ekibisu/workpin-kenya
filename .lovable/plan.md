

# Unread Message Count Badge

## Overview
Add a red badge showing the number of unread messages next to the "Messages" sidebar link in both the Customer Dashboard and Provider Dashboard. This requires tracking when each user last read messages for each conversation.

## What Changes

### 1. Database: Create `conversation_read_status` Table
A small table to track when each user last viewed messages for a given request. Unread count = messages received after `last_read_at`.

```sql
CREATE TABLE public.conversation_read_status (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_id)
);

ALTER TABLE public.conversation_read_status ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own read status
CREATE POLICY "Users can manage own read status"
  ON public.conversation_read_status FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 2. New Hook: `useUnreadMessageCount`
Create `src/hooks/useUnreadMessageCount.ts` that:
- Fetches all `direct_messages` where the user is a participant (customer or accepted provider) and `sender_id != user.id`
- Fetches `conversation_read_status` rows for the user
- Counts messages with `created_at > last_read_at` (or all messages if no read status exists for that request)
- Subscribes to realtime inserts on `direct_messages` to increment the count live
- Returns the total unread count as a number

### 3. Update `MessageDrawer` to Mark Messages as Read
When the drawer opens for a request, upsert `conversation_read_status` with `last_read_at = now()` for the current user and request. This clears the unread count for that conversation.

### 4. Update Both Dashboard Sidebars
In both `Dashboard.tsx` and `ProviderDashboard.tsx`:
- Call `useUnreadMessageCount()` to get the count
- Render a small red `Badge` next to the "Messages" sidebar link when count > 0

---

## Technical Details

### Unread Count Query Logic
```text
1. Get all request_ids where user is a participant
   - Customer: service_requests.customer_id = user.id AND status IN ('pending','completion_pending')
   - Provider: quotes.provider_id = user.id AND quotes.status = 'accepted'
2. For each request_id, get last_read_at from conversation_read_status (default to epoch if none)
3. Count direct_messages where request_id IN (...) AND sender_id != user.id AND created_at > last_read_at
```

### Mark-as-Read (in MessageDrawer)
```typescript
await supabase
  .from("conversation_read_status")
  .upsert({ user_id: user.id, request_id: requestId, last_read_at: new Date().toISOString() });
```

### Badge Rendering (sidebar)
```text
Messages [3]   <-- red circle badge when count > 0
```

### Files Created
- `src/hooks/useUnreadMessageCount.ts`

### Files Modified
- `src/components/messaging/MessageDrawer.tsx` -- upsert read status on open
- `src/pages/Dashboard.tsx` -- use hook, render badge on Messages link
- `src/pages/ProviderDashboard.tsx` -- use hook, render badge on Messages link

