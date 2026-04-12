

# Save Payment Analysis + System Gap Analysis & Pre-Payment Roadmap

## Task 1: Save Payment Analysis Document

Save the Kenya payment infrastructure analysis from the previous conversation as `/mnt/documents/WorkPin_Payment_Analysis.md` for future reference.

## Task 2: System Gap Analysis

After thorough investigation of the codebase, here are the critical missing pieces that must be addressed **before** implementing payments:

### Critical Gaps

```text
┌─────────────────────────────────┬──────────┬─────────────────────────────────────┐
│ Gap                             │ Severity │ Why It Blocks Payments              │
├─────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ No provider quote submission UI │ CRITICAL │ Core loop broken — providers can't  │
│                                 │          │ respond to job requests             │
├─────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ No provider job feed/browse     │ CRITICAL │ Providers can't discover open jobs  │
│                                 │          │ to quote on                         │
├─────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ No edge functions deployed      │ HIGH     │ Zero backend functions exist —      │
│                                 │          │ supabase/functions/ is empty        │
├─────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Settings don't persist          │ HIGH     │ Notification prefs, account status  │
│                                 │          │ are local state only                │
├─────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ No Google OAuth                 │ MEDIUM   │ Kenya users expect social login     │
├─────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Review trigger exists but no    │ MEDIUM   │ Trust system incomplete — ratings   │
│ review submission flow tested   │          │ don't aggregate                     │
├─────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ Subscription enforcement absent │ MEDIUM   │ useSubscriptionLimits hook exists   │
│                                 │          │ but nothing calls it to block       │
├─────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ No email verification flow      │ LOW      │ Users can sign up with fake emails  │
├─────────────────────────────────┼──────────┼─────────────────────────────────────┤
│ No Terms of Service / Privacy   │ LOW      │ Required for payment processing     │
└─────────────────────────────────┴──────────┴─────────────────────────────────────┘
```

### Detailed Findings

**1. Provider Core Loop is Broken (CRITICAL)**
- The Dashboard only shows the **client** perspective: "My Requests" with quotes received
- There is **no UI for providers to browse open job requests** or submit quotes
- `quotes` table INSERT requires `provider_id` to be a business the user owns (RLS is correct), but no page exists to do this
- This means the marketplace has zero functional supply-side flow

**2. No Edge Functions Exist**
- `supabase/functions/` directory is completely empty
- The M-Pesa STK Push function referenced in docs was never created
- No webhook handlers, no notification functions, no server-side logic exists

**3. Settings Are Cosmetic**
- `UnifiedSettings.tsx` manages notification preferences and account status in React state only — toggling checkboxes or deactivating does nothing in the database

**4. Subscription Limits Not Enforced**
- `useSubscriptionLimits` hook exists and works, but `CreateBusinessForm`, `BusinessProfileWizard`, and quote submission don't check it

**5. Review Flow Exists but Untested**
- Dashboard has a feedback dialog that inserts into `reviews`, and a trigger auto-updates `avg_rating`
- But the foreign key reference in ProviderLanding line 126 uses `profiles!reviews_customer_id_fkey` which likely fails since the column is `client_id`

---

## Pre-Payment Roadmap

### Sprint A: Fix the Core Loop (Must Do First)

| # | Task | Effort |
|---|------|--------|
| A1 | **Provider Job Feed** — New dashboard tab showing open `job_requests` that match provider's service categories, with location/budget details | 1 session |
| A2 | **Quote Submission UI** — Form for providers to submit price, message, timeline on a job request; creates quote + inquiry work thread | 1 session |
| A3 | **Provider Dashboard View** — Show provider's sent quotes (pending/accepted/declined), active jobs, and earnings summary | 1 session |

### Sprint B: Trust & Reliability

| # | Task | Effort |
|---|------|--------|
| B1 | **Review System Verification** — Fix FK reference, test end-to-end review submission, verify trigger updates `avg_rating` | 0.5 session |
| B2 | **Subscription Limit Enforcement** — Wire `useSubscriptionLimits` into CreateBusinessForm (business count), BusinessProfileWizard (services/gallery count), and quote submission (monthly cap) | 1 session |
| B3 | **Google OAuth** — Add Google sign-in button to Auth page | 0.5 session |
| B4 | **Settings Persistence** — Store notification preferences in profiles or a new `user_preferences` table; wire account deactivation to `profiles.is_active` or similar | 1 session |

### Sprint C: Legal & Launch Prep

| # | Task | Effort |
|---|------|--------|
| C1 | **Terms of Service & Privacy Policy** — Static pages at `/terms` and `/privacy` (required before accepting payments) | 0.5 session |
| C2 | **Email Verification** — Ensure email confirmation is required before dashboard access | 0.5 session |

### Then: Payment Integration (Sprint D)
Only after Sprints A-C are complete should payment infrastructure be built.

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `/mnt/documents/WorkPin_Payment_Analysis.md` | Save payment infrastructure analysis |
| `src/pages/Dashboard.tsx` | Add provider job feed tab + quote submission |
| `src/components/dashboard/ProviderJobFeed.tsx` | New: browse open job requests |
| `src/components/dashboard/SubmitQuoteForm.tsx` | New: quote submission dialog |
| `src/components/dashboard/ProviderQuotesPanel.tsx` | New: provider's outgoing quotes view |
| `src/components/dashboard/BusinessesPanel.tsx` | Enforce subscription business count limit |
| `src/pages/BusinessProfileWizard.tsx` | Enforce service/gallery limits |
| `src/pages/ProviderLanding.tsx` | Fix review FK reference |
| `src/components/dashboard/UnifiedSettings.tsx` | Persist to database |
| `src/pages/Auth.tsx` | Add Google OAuth button |
| `src/pages/Terms.tsx` | New: Terms of Service |
| `src/pages/Privacy.tsx` | New: Privacy Policy |
| `src/App.tsx` | Add new routes |

No database migrations needed for Sprint A (tables exist). Sprint B may need a `user_preferences` table.

