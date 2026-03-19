

# Delete Open Requests + Remove Budget Option

## Changes

### 1. Add "Delete Request" button to Dashboard (`src/pages/Dashboard.tsx`)

- Add a delete button (with Trash icon) next to the existing "Edit request" link for requests with `status === "open"`
- Add confirmation via AlertDialog before deleting
- On confirm: call `supabase.from("job_requests").delete().eq("id", reqId)` — but RLS currently blocks DELETE. Need a new RLS policy.
- Remove the request from local state on success
- Add state for `deletingRequestId` to show loading spinner

### 2. Add DELETE RLS policy (migration)

The `job_requests` table currently has no DELETE policy. Add one:
```sql
CREATE POLICY "Client can delete own open requests"
ON public.job_requests
FOR DELETE
TO authenticated
USING (auth.uid() = client_id AND status = 'open');
```

### 3. Remove budget from RequestService wizard (`src/pages/RequestService.tsx`)

- Rename step 3 label from "Location & Budget" to "Location"
- Remove `budgetMin`/`budgetMax` state variables and the budget input fields from step 3
- Remove budget from the review step (step 4)
- Stop sending `budget_min_kes`/`budget_max_kes` in the insert call (send `null`)
- Remove `Banknote` import if no longer used

### 4. Remove budget from Dashboard edit dialog (`src/pages/Dashboard.tsx`)

- Remove `editBudgetMin`/`editBudgetMax` state and the budget fields from the edit dialog (lines 713-733)
- Remove budget from `handleSaveEdit` and `openEditDialog`
- Remove budget display from the request list item (line 452)
- Remove `Banknote` from imports if unused

### 5. Remove budget from ProviderDashboard (`src/pages/ProviderDashboard.tsx`)

- Remove budget display from open requests and pending jobs cards
- Remove `budget_min_kes` from the select queries
- Remove `Banknote` import if unused

## Files Changed

| File | Change |
|---|---|
| Migration SQL | Add DELETE policy on `job_requests` for open requests |
| `src/pages/Dashboard.tsx` | Add delete button + confirmation; remove all budget UI |
| `src/pages/RequestService.tsx` | Remove budget fields, state, and review display |
| `src/pages/ProviderDashboard.tsx` | Remove budget display from request cards |

