

# Sprint A: Provider Job Feed + Quote Submission

## Goal
Complete the supply-side loop so providers with a business can browse open job requests and submit quotes — making the marketplace functional end-to-end.

## Current State
- Dashboard is client-only: shows "My Requests" + incoming quotes
- Sidebar has: Overview, My Requests, My Businesses, Messages, Settings
- `job_requests` RLS already allows SELECT for users who own an active business
- `quotes` RLS already allows INSERT for business owners
- `work_threads` INSERT is open to any authenticated user
- No provider-facing feed or quote form exists

## What We Build

### 1. Provider Job Feed (`src/components/dashboard/ProviderJobFeed.tsx`)
A new dashboard tab showing open job requests available to quote on.

- Query `job_requests` with `status = 'open'` and join `services(name, archetype)`
- Optionally filter by categories matching the provider's `businesses.categories`
- Each card shows: service name, parsed description summary, location, time posted, image count, quote count
- "Submit Quote" button opens the quote form dialog
- Empty state: "No open requests match your services right now"

### 2. Quote Submission Dialog (`src/components/dashboard/SubmitQuoteForm.tsx`)
A dialog/sheet for providers to submit a quote on a job request.

- Fields: price (KES), message, timeline estimate
- Provider selects which of their businesses to quote from (dropdown, auto-selected if only one)
- On submit:
  1. Create a `work_thread` with `client_id` from the job request, `provider_id` = selected business ID, `job_request_id`, `status: 'inquiry'`
  2. Insert into `quotes` with `provider_id`, `request_id`, `price_kes`, `message`, `timeline`, `work_thread_id`
- Success toast + close dialog
- Prevent duplicate quotes (check if business already quoted on this request)

### 3. Provider Outgoing Quotes View (`src/components/dashboard/ProviderQuotesPanel.tsx`)
Shows quotes the provider has sent, grouped by status.

- Query `quotes` where `provider_id` IN user's business IDs, join `job_requests(description, services(name))` and `profiles(full_name)` for client info
- Show: service name, price quoted, status badge (pending/accepted/declined), date, "Message" button if work_thread exists
- Sort by newest first

### 4. Dashboard Integration (`src/pages/Dashboard.tsx`)
- Add "Job Feed" and "My Quotes" to `sideLinks` (with `Search` and `Send` icons)
- Add route detection: `isJobFeedTab`, `isMyQuotesTab`
- Render `ProviderJobFeed` and `ProviderQuotesPanel` in the main content switch
- Only show these tabs if user owns at least one active business (query on mount)

## Files

| Action | File | Change |
|--------|------|--------|
| Create | `src/components/dashboard/ProviderJobFeed.tsx` | Job request browser with filters and quote trigger |
| Create | `src/components/dashboard/SubmitQuoteForm.tsx` | Quote submission dialog with business selector |
| Create | `src/components/dashboard/ProviderQuotesPanel.tsx` | Outgoing quotes list with status tracking |
| Edit | `src/pages/Dashboard.tsx` | Add 2 sidebar links, route detection, conditional rendering, business ownership check |

## No Database Changes Required
All tables (`job_requests`, `quotes`, `work_threads`) and RLS policies already support this flow.

## Technical Notes
- `quotes.provider_id` is a business ID (not user ID) — the form must use the business ID
- `work_threads.provider_id` is also a business ID — same mapping
- Reuse `parseDescriptionSummary()` from Dashboard for displaying job descriptions
- Reuse avatar color/initials helpers from `QuotesPanel`
- Use `format(new Date(...), 'MMM d')` for dates (already imported in Dashboard)

