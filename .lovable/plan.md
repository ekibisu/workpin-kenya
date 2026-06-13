## Fix work_threads status lifecycle

### Issue A — invalid "inquiry" status

**`src/components/dashboard/SubmitQuoteForm.tsx`**
- Change `status: "inquiry"` to `status: "quoted"` in the `work_threads` insert.

**`src/components/messaging/ConversationList.tsx`**
- Replace the single inquiry badge with status-specific badges:
  - `quoted` → "Quote sent" (secondary)
  - `active` → no badge
  - `completed` → "Completed" (outline, muted)
  - `reviewed` → "Reviewed" (outline, green text)
  - `disputed` → "Disputed" (destructive)

**`src/hooks/useConversations.ts`**
- No logic change needed (already passes through `status`), but verify no leftover `"inquiry"` literal exists.

### Issue B — status never advances past "active"

**`src/pages/Dashboard.tsx` (`handleConfirmCompletion`)**
- After updating `job_requests.status = "completed"`, also update the matching `work_threads` row to `status: "completed"` using `workThreadMap[jobRequestId]`.

**`src/components/dashboard/FeedbackDialog.tsx`**
- Add `workThreadId: string | null` prop (resolved by Dashboard from `workThreadMap[requestId]` — keep existing `workThreadMap` fallback lookup for safety).
- After inserting the review, update `work_threads.status = "reviewed"` for that thread.
- Update the `<FeedbackDialog>` usage in `Dashboard.tsx` to pass `workThreadId`.

**`src/components/dashboard/DisputeDialog.tsx`**
- After inserting the dispute, update `work_threads.status = "disputed"` using the existing `workThreadId` prop (already passed in).

### Scope
Frontend-only — no DB migration. Existing constraint already permits all target values.