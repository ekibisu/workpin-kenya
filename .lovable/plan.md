

# WorkPin Kenya — System Audit and Gap Analysis

## Current State Summary

The application has a solid foundation with most core marketplace features partially or fully built:

### What Works (Built)
1. **Authentication** — Email/password signup with client/provider role selection, auto-role assignment via DB trigger, role-based routing
2. **Service catalog** — ~60+ Kenya-specific services across 5 archetypes (home maintenance, lifestyle, events, professional, outdoor), stored in `services` table with archetype grouping
3. **Job request flow** — 4-step wizard (Pick Service → TED Questions → Location/Budget → Review), saves to `job_requests` with image uploads to storage
4. **Client dashboard** — Shows requests, received quotes, stat cards, quote accept/decline, job completion confirmation, review submission, messaging
5. **Provider dashboard** — Shows open jobs, sent quotes, "Jobs Pending" section, quote submission, mark-complete, messaging
6. **Messaging** — Real-time chat via `messages` table with Supabase Realtime, slide-in drawer, unread badge tracking
7. **Quoting system** — Providers submit price offers, clients accept/decline, accepted quote auto-rejects others
8. **Job lifecycle** — open → pending → completion_pending → completed with verified completion flow
9. **Onboarding** — Multi-step forms for both clients and providers (services, rates, M-Pesa phone)
10. **Database** — Comprehensive schema with RLS policies on all tables

### Critical Build Errors (Must Fix First)

There are **6 TypeScript compilation errors** preventing the app from building:

1. **`TedQuestionForm.tsx` line 91** — The `previews` state type doesn't include `error` property. The type needs to be `{ url: string; uploading: boolean; error?: boolean }[]`.

2. **`MessageDrawer.tsx` line 53** — The DB `messages` table has `body` (not `content`) and requires `job_id`. The component's `Message` interface expects `content` but the DB returns `body`. The insert also uses `content` instead of `body` and omits the required `job_id`.

3. **`useNewSchemaQueries.ts` line 7** — References `Tables<"bookings">` but `bookings` doesn't exist in the generated types. The DB has the table, but the types file is out of sync OR the table was created after the last type generation.

4. **`useNewSchemaQueries.ts` lines 64-65** — Cascading errors from the bookings type issue.

### What's Missing for a Thumbtack-like MVP

#### High Priority (Core Flow Gaps)

1. **Messages table schema mismatch** — The `messages` table in the DB has columns `body`, `job_id`, `read_at`, `type` but the RLS policies reference `work_thread_id`. The code writes `content` and `work_thread_id`. Need a migration to align the DB columns with what the code expects (rename `body` → `content`, make `work_thread_id` required, drop or make `job_id` nullable).

2. **Work thread creation on quote acceptance** — When a client accepts a quote ("Start Job"), the code updates quote status and job_request status but never creates a `work_thread` record. Without this, messaging between client and provider won't work after job start. Need to insert into `work_threads` with `client_id`, `provider_id`, and `job_request_id`, and store the thread ID on the quote.

3. **Provider filtering by service match** — The provider dashboard shows ALL open requests to ALL providers. Providers should only see requests matching their registered service categories. Need to filter `job_requests` by comparing `service_id` against the provider's `categories` array in `provider_profiles`.

4. **No notification system** — Providers aren't notified when new matching requests are posted. Clients aren't notified when quotes arrive. Africa's Talking SMS integration is planned but not built.

#### Medium Priority (Trust and Usability)

5. **Provider profile public page** — No route for clients to view a provider's profile, portfolio photos, reviews, and ratings before accepting a quote. The `Providers.tsx` page exists but is a listing page.

6. **Review aggregation** — Reviews are stored but `avg_rating` and `total_reviews` on `provider_profiles` aren't updated via trigger. Need a DB trigger to recalculate on review insert.

7. **Search and discovery** — No search functionality on the services or providers pages. No geo-based provider matching (the `match_providers` PostGIS function may or may not exist).

8. **M-Pesa payments** — Edge function `mpesa-stk-push` is referenced in the build plan but the `supabase/functions` directory doesn't exist. No payment flow is wired up.

#### Lower Priority (Scale and Polish)

9. **`useNewSchemaQueries.ts` cleanup** — This file references tables that don't exist in types (`bookings`). Either generate fresh types or remove dead code.

10. **Conversation list** — The `useConversations` hook queries `work_threads` but the thread creation gap (item 2) means conversations won't populate.

11. **Provider wallet/earnings** — Tables exist but no UI for providers to see earnings or request payouts.

12. **Dispute system** — Table exists with RLS but no UI to file or manage disputes.

13. **Fixed-price services / Quick Pin booking** — Tables exist but no UI for providers to list fixed-price offerings or for clients to book instantly.

## Recommended Implementation Order

### Phase 1: Fix Build Errors (Immediate)
- Fix `TedQuestionForm.tsx` type error (add `error?: boolean` to state type)
- Fix `MessageDrawer.tsx` to use `body` instead of `content` (or migrate DB column)
- Fix `useNewSchemaQueries.ts` — remove `bookings` type reference or regenerate types
- Migrate `messages` table: rename `body` → `content`, make `job_id` nullable

### Phase 2: Complete Core Loop (Makes the app functional)
- Create `work_thread` on quote acceptance, store thread ID on quote
- Wire messaging to use work threads properly
- Filter provider dashboard to show only matching service requests
- Add provider profile detail page (public view)

### Phase 3: Trust and Payments
- Add review aggregation trigger
- Build M-Pesa STK Push edge function
- Add SMS notifications via Africa's Talking
- Build search/filter on services and providers pages

### Phase 4: Advanced Features
- Dispute filing UI
- Provider wallet and earnings dashboard
- Fixed-price services and instant booking
- Geo-based provider matching

## Technical Details

```text
Current table alignment issues:

messages table (DB)          vs   Code expects
─────────────────────────         ─────────────
body: text (required)             content: string
job_id: uuid (required)           (not used)
work_thread_id: uuid (nullable)   work_thread_id: string (required)
read_at: timestamp (nullable)     (not used)
type: text                        (not used)

Fix: DB migration to rename body→content, make job_id nullable,
     make work_thread_id NOT NULL
```

The `bookings` table exists in the actual database (confirmed by RLS policies in context) but is missing from the auto-generated `types.ts` — a type regeneration would fix this.

