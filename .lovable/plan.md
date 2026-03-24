

# Two-Way Communication: Requests → Quotes → Messages

## Current State

**What works:**
- Messaging via `work_threads` + `messages` table — but only AFTER a client accepts a quote (which creates the work thread)
- `ConversationList` + `MessageDrawer` components handle the inbox UI
- Unread count tracking via `conversation_read_status`

**What's broken:**
1. **No pre-hire communication** — providers send quotes blindly; clients can't ask questions before accepting
2. **Conversation list query fails** (400 error) — the `useConversations` hook uses a bad FK hint `job_requests_service_id_fkey` that doesn't exist in the schema cache
3. **`direct_messages` table exists but is unused** — it was designed for pre-thread messaging but never wired up

## Proposed Flow

```text
Client posts request
       │
       ▼
Provider sees request → sends quote (with message)
       │
       ▼
Client sees quote → clicks "Ask a Question" or "Message Provider"
       │
       ▼
Opens MessageDrawer for that quote/request context
(uses work_threads with status "inquiry" — no job started yet)
       │
       ▼
Client accepts quote → thread status changes to "active"
       │
       ▼
Ongoing messaging continues in same thread
```

## Plan

### 1. Fix broken conversation list query
**File:** `src/hooks/useConversations.ts`
- Remove the nested `services!job_requests_service_id_fkey(name)` join that causes the 400 error
- Instead, fetch service name via a separate query on `job_requests` → `services`, or simplify to just fetch the thread metadata without the deep join

### 2. Create work thread on quote submission (inquiry mode)
**File:** `src/pages/ProviderDashboard.tsx`
- When a provider submits a quote via `handleSubmitQuote`, also create a `work_thread` with `status: 'inquiry'` linking client, provider, and job_request
- Store the `work_thread_id` on the quote record
- This enables messaging before the job is accepted

### 3. Add "Message Provider" button on client quote cards
**File:** `src/pages/Dashboard.tsx`
- For each pending quote in the inline quotes section, add a "Message" button next to Start Job / Decline
- Clicking it opens `MessageDrawer` using the quote's `work_thread_id`
- For accepted quotes, the existing message button continues to work

### 4. Add "Message Client" on provider open request cards
**File:** `src/pages/ProviderDashboard.tsx`  
- After a provider sends a quote, change the "Quote Sent" disabled button to show a "Message Client" option
- Opens `MessageDrawer` using the work_thread created with the quote

### 5. Update handleStartJob to reuse inquiry thread
**File:** `src/pages/Dashboard.tsx`
- When client accepts a quote, instead of creating a NEW work_thread, update the existing inquiry thread's status from `'inquiry'` to `'active'`
- This preserves the conversation history from pre-hire discussions

### 6. Include inquiry threads in conversation list
**File:** `src/hooks/useConversations.ts`
- The existing query already fetches all work_threads for the user — inquiry threads will automatically appear
- Add a status indicator (e.g., "Inquiry" vs "Active Job") to conversation items

**File:** `src/components/messaging/ConversationList.tsx`
- Show thread status badge (inquiry / active / completed) next to each conversation

### No migrations needed
The `work_threads` table already supports arbitrary `status` text values and has all needed columns (`client_id`, `provider_id`, `job_request_id`). The `quotes` table already has a `work_thread_id` column.

