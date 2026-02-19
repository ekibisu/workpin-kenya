

# Messaging System for Client-Provider Communication

## Overview

Add a real-time chat system that lets clients and providers message each other directly from quote cards. Clicking a "Message" button opens a chat drawer filtered to that specific request and user pair.

## Database Changes

### Alter the existing `messages` table

The current `messages` table references `job_id`, which isn't used in the active workflow. We'll create a new dedicated table `direct_messages` to avoid breaking existing schema:

- `id` (UUID, primary key)
- `sender_id` (UUID, references profiles)
- `receiver_id` (UUID, references profiles)
- `request_id` (UUID, references service_requests)
- `content` (text, not null)
- `created_at` (timestamptz, default now())

**RLS Policies:**
- SELECT: Users can read messages where they are sender or receiver
- INSERT: Users can send messages where `sender_id = auth.uid()`

**Realtime:** Enable realtime on `direct_messages` so new messages appear instantly.

## UI Changes

### 1. New ChatDrawer Component (`src/components/ChatDrawer.tsx`)

A reusable drawer component that:
- Accepts `requestId`, `otherUserId`, `otherUserName`, and `isOpen`/`onClose` props
- Fetches messages filtered by `request_id` where the current user is sender or receiver AND the other party matches
- Displays messages in a scrollable list (own messages right-aligned, other's left-aligned)
- Has a text input + send button at the bottom
- Subscribes to realtime updates for new messages

### 2. Client Dashboard (`src/pages/Dashboard.tsx`)

- Add a `MessageCircle` icon button to each quote card in the "Quotes Received" section
- Clicking opens the ChatDrawer with `requestId = quote.request_id`, `otherUserId = quote.provider_id`, `otherUserName = quote.profiles.full_name`

### 3. Provider Dashboard (`src/pages/ProviderDashboard.tsx`)

- Add a `MessageCircle` icon button to each pending job card
- Need to fetch the `customer_id` from service_requests to know who to message
- Clicking opens the ChatDrawer with `requestId = req.id`, `otherUserId = req.customer_id`

## Technical Details

### New migration SQL

```sql
CREATE TABLE public.direct_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  receiver_id UUID NOT NULL REFERENCES public.profiles(id),
  request_id UUID NOT NULL REFERENCES public.service_requests(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
ON public.direct_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.direct_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
```

### ChatDrawer component structure

- Uses the `Sheet` component (slide-in from right)
- `useEffect` to fetch messages on open and subscribe to realtime inserts
- Messages sorted by `created_at` ascending
- Auto-scroll to bottom on new messages
- Send handler inserts into `direct_messages` with sender_id, receiver_id, request_id, content

### Data fetching adjustments

- **ProviderDashboard**: Update the service_requests query to also select `customer_id` so we know who to message
- **Dashboard**: Already has `provider_id` from quote data -- no changes needed for data

### Files to create/modify

| File | Action |
|------|--------|
| `src/components/ChatDrawer.tsx` | Create -- reusable chat drawer component |
| `src/pages/Dashboard.tsx` | Edit -- add Message button to quote cards |
| `src/pages/ProviderDashboard.tsx` | Edit -- add Message button to pending cards, fetch customer_id |
| Database migration | Create -- `direct_messages` table with RLS and realtime |

