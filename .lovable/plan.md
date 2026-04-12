

# WorkPin: System Assessment, Feature Roadmap & Monetization Strategy

## Where We Are Today

### Built and Functional
- **Authentication**: Email signup/login, password reset, onboarding flow
- **Service Catalog**: 20 services organized by archetype with icons, categories, and search
- **Job Request Flow**: Multi-step request form with archetype-specific questions, image uploads, location
- **Quoting System**: Providers submit quotes on requests; clients accept/decline; work threads created
- **Business Profiles**: 6-step wizard (basics, services, gallery, credentials, FAQs, contact), logo upload, hero image, public `/pro/:slug` landing page with SEO metadata and JSON-LD
- **Dashboard**: Unified view for requests, quotes, messaging, businesses, settings
- **Provider Directory**: `/providers` listing with search, location filter, rating filter
- **Messaging**: Real-time work thread messaging between clients and providers
- **Profile Completeness**: Scoring system encouraging providers to fill out profiles
- **Database**: 20 tables with comprehensive RLS policies, PostGIS for geo queries

### Current Data (Test State)
8 profiles, 5 businesses, 20 services, 6 job requests, 6 quotes, 0 reviews, 0 payments, 0 messages sent

### What's Missing or Incomplete
1. **Payments**: M-Pesa STK Push edge function exists but no end-to-end payment flow in the UI
2. **Reviews**: Table exists but no reviews submitted yet; no aggregation trigger updating `avg_rating`
3. **Notifications**: No email/SMS notifications (Africa's Talking integration planned but not built)
4. **Subscription/Monetization**: `subscription_tier` on profiles and `subscription_status` on businesses exist as text columns but have zero enforcement, no paywall, no tier benefits
5. **Admin Panel**: No admin dashboard for managing users, disputes, or platform data
6. **Dispute Resolution**: Tables exist, no UI
7. **Provider Matching**: `match_providers` function exists in DB but not wired into any UI
8. **Analytics/Insights**: No provider dashboard showing views, quote conversion, earnings

---

## Monetization Model: Provider Subscription Tiers

### Tier Structure

```text
┌────────────┬───────────┬──────────────┬──────────────┐
│  Feature   │   Free    │  Pro (KES    │  Premium     │
│            │           │  999/mo)     │  (KES 2,499) │
├────────────┼───────────┼──────────────┼──────────────┤
│ Businesses │    1      │     3        │   Unlimited  │
│ Services   │    3      │    10        │   Unlimited  │
│ Gallery    │    5 imgs │    25 imgs   │   Unlimited  │
│ Profile    │  Basic    │  Full + SEO  │  Full + SEO  │
│ Quotes/mo  │    5      │    30        │   Unlimited  │
│ Badge      │   None    │   "Pro"      │  "Premium"   │
│ Analytics  │   None    │   Basic      │   Full       │
│ Priority   │   None    │   Boosted    │   Top spot   │
│ Messaging  │   Basic   │   Templates  │  Templates   │
│ Support    │  Community│   Email      │   Priority   │
└────────────┴───────────┴──────────────┴──────────────┘
```

### Payment: M-Pesa recurring via STK Push (monthly) or discounted annual

---

## Roadmap to Public Release

### Phase 1: Revenue Foundation (Sprint 1 — ~1 week)
**Goal**: Enable providers to pay and get visible value immediately

1. **Subscription Tiers Table + Enforcement**
   - Create `subscription_plans` table (id, name, price_monthly_kes, price_annual_kes, limits JSON)
   - Add enforcement checks in CreateBusinessForm, wizard (gallery/service counts), and quote submission
   - Show upgrade prompts when limits are hit

2. **M-Pesa Subscription Payment Flow**
   - Wire the existing `mpesa-stk-push` edge function into a subscription checkout UI
   - Create `/pricing` page with tier comparison
   - Add subscription status badge on provider profiles and directory cards

3. **Pro/Premium Profile Badges**
   - Render verified + tier badges on `/pro/:slug` and `/providers` cards
   - Higher-tier profiles sort higher in directory listing

### Phase 2: Trust & Conversion (Sprint 2 — ~1 week)
**Goal**: Make the marketplace trustworthy enough for real transactions

4. **Review System Completion**
   - Build review submission UI post-job-completion
   - Create DB trigger to auto-update `businesses.avg_rating` and `total_reviews`
   - Display reviews on provider landing pages (UI exists, needs data flow)

5. **Notification System**
   - Edge function for email notifications (new quote, quote accepted, job complete)
   - SMS via Africa's Talking for critical events (quote accepted, payment received)

6. **Provider Analytics Dashboard**
   - Profile views counter (increment on `/pro/:slug` load)
   - Quote conversion rate, response time tracking
   - Monthly summary card on provider dashboard

### Phase 3: Polish & Launch (Sprint 3 — ~1 week)
**Goal**: Production-ready for public users

7. **Admin Panel**
   - View/manage users, businesses, disputes, payments
   - Approve/reject provider verification
   - Service catalog management

8. **SEO & Discovery**
   - Sitemap generation for all active `/pro/:slug` pages
   - Category landing pages (`/services/plumbing`)
   - Meta tags, Open Graph images

9. **Mobile UX Polish**
   - Responsive audit of all pages
   - PWA manifest + offline fallback
   - Bottom nav for logged-in mobile users

10. **Launch Checklist**
    - Custom domain setup
    - Terms of Service / Privacy Policy pages
    - Error tracking (Sentry or similar)
    - Rate limiting on auth and quote submission

---

## Technical Implementation Details

### New Database Objects
| Object | Purpose |
|--------|---------|
| `subscription_plans` table | Define tier names, prices, feature limits as JSON |
| `business_subscriptions` table | Track active subscription per business (plan_id, status, expires_at, mpesa_receipt) |
| `profile_views` table | Track daily view counts per business for analytics |
| Trigger on `reviews` | Auto-recompute `businesses.avg_rating` on INSERT/UPDATE |
| RLS on new tables | Standard owner-access patterns |

### New Pages/Components
| Route/Component | Purpose |
|-----------------|---------|
| `/pricing` | Public pricing comparison page with CTA |
| `/subscribe/:planId` | M-Pesa checkout flow for subscription |
| Provider Analytics tab | Dashboard tab showing views, conversion, earnings |
| Admin routes (`/admin/*`) | Admin panel (users, businesses, disputes) |
| `/terms`, `/privacy` | Legal pages |

### Key Files Modified
| File | Change |
|------|--------|
| `CreateBusinessForm.tsx` | Enforce tier business count limits |
| `BusinessProfileWizard.tsx` | Enforce gallery/service count limits per tier |
| `Providers.tsx` | Sort by subscription tier, show badges |
| `ProviderLanding.tsx` | Show tier badge, track profile views |
| `Dashboard.tsx` | Add analytics tab for providers |
| `Navbar.tsx` | Add "Pricing" link |

### Estimated Effort
- Phase 1: 5-7 working sessions
- Phase 2: 4-6 working sessions  
- Phase 3: 5-7 working sessions
- **Total to public launch: ~3 weeks of focused building**

---

## Recommended Next Step

Start with Phase 1, Step 1: Create the subscription plans table and enforce tier limits. This gives you a paywall to test immediately, even before M-Pesa checkout is wired up (you can manually set a business to "pro" tier to test the experience).

