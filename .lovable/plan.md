

# Wire Up the "Send Quote" Button

The "Send Quote" button on the provider dashboard is currently non-functional -- it has no click handler or form behind it. This plan adds a quote submission dialog so providers can enter a price and message for each job request.

## What You'll See

When a provider clicks "Send Quote" on a request card, a dialog pops up with:
- A **price field** (required, numeric, in KES)
- A **message field** (optional textarea for additional details)
- A **Submit** button that saves the quote and shows a success toast

Once submitted, the button changes to "Quote Sent" (disabled) so the provider knows they've already quoted on that job.

## What Changes

### 1. Quote Dialog (ProviderDashboard.tsx)
- Add a Dialog triggered by the "Send Quote" button containing a small form with price (number input) and message (textarea) fields.
- On submit, insert a row into the `quotes` table with `provider_id` set to `auth.uid()`, `request_id` set to the job's ID, the entered `price`, and optional `message`.
- After a successful insert, show a success toast and mark that request as "quoted" in local state so the button is disabled.
- On load, fetch any existing quotes by the current provider to pre-disable buttons for already-quoted requests.

### 2. No Database Changes Needed
The `quotes` table and its RLS policies already exist:
- **INSERT policy**: `auth.uid() = provider_id` -- providers can create quotes as themselves.
- **SELECT policy**: providers can view their own quotes.

No migration is required.

---

## Technical Details

**State additions in `ProviderDashboard.tsx`:**
- `quotedRequestIds: Set<string>` -- tracks which requests the provider has already quoted on (fetched on mount + updated on submit).
- `quoteDialogRequestId: string | null` -- controls which request's quote dialog is open.
- `quotePrice: string` and `quoteMessage: string` -- form field state.
- `submittingQuote: boolean` -- loading state for the submit button.

**On mount:** Query `quotes` table filtered by `provider_id = user.id` to populate `quotedRequestIds`.

**On submit:** Insert into `quotes` with `{ provider_id: user.id, request_id, price: Number(quotePrice), message: quoteMessage || null }`. On success, add the request ID to `quotedRequestIds` and close the dialog.

**UI:** The "Send Quote" button becomes "Quote Sent" (disabled, muted style) for already-quoted requests.

