## Group ConversationList by thread status

### 1. `src/hooks/useConversations.ts`
- Extend the job_requests fetch to also select `status`. Build `jobStatusMap[jr.id] = jr.status`.
- Add `job_request_status: string | null` to the `Conversation` interface and populate it from the map.

### 2. `src/components/messaging/ConversationList.tsx`
- Determine viewer side per conversation: `isClient = conv.client_id === user.id` (use `useAuth()`).
- Bucket conversations into:
  - **Disputed** — `thread_status === "disputed"` (header has red `Flag` icon from lucide-react).
  - **Awaiting your response** — clients only, when `thread_status === "quoted"` OR `job_request_status === "completion_pending"`.
  - **Active jobs** — `thread_status === "active"`, plus `quoted` for providers (so providers still see their open quotes here).
  - **Completed** — `thread_status` in `["completed","reviewed"]`. Rendered inside a `<Collapsible>` (from `@/components/ui/collapsible`), trigger shows count, default `open={false}`.
- Hide any section whose bucket is empty. Render the existing conversation row markup unchanged within each bucket.
- Reuse the existing inline status-badge map (quoted / completed / reviewed / disputed) introduced in the previous change — no new tokens.
- Empty state (no conversations at all) keeps the current centered placeholder.

### Notes
- Frontend-only; no migration. `Collapsible` already exists in the shadcn set.
- Sorting within each bucket preserves the existing `updated_at DESC` order coming from the hook.