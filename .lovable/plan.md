# Sprint C.5: Geography & Localization

Adds country-aware data model and UI so the marketplace can support multiple East African countries before we wire up Paystack/Pesapal in Sprint D.

## Scope (based on your answers)

- Launch countries: **Kenya, Uganda, Tanzania, Rwanda** (expandable later via seed-only changes)
- Users **can switch viewing country freely** — they see their home country by default but can browse other launch countries
- **Country-only on day 1** — regions table exists but stays empty until per-country onboarding
- Pesapal will cover all 4 launch countries (M-Pesa KE, MTN/Airtel UG, M-Pesa TZ, MTN RW), so payment provider routing in Sprint D will be simple

## Database Changes (one migration)

**New tables**
- `countries` — `code` (PK, e.g. `KE`), `name`, `currency_code` (`KES`/`UGX`/`TZS`/`RWF`), `dial_code` (`+254`...), `phone_regex`, `default_payment_provider` (`pesapal`), `flag_emoji`, `is_active`, `sort_order`
- `regions` — `id`, `country_code` (FK), `name`, `kind` (`county`/`district`/`province`), `is_active`. Empty at launch; populated as we onboard each country.

**Column additions**
- `profiles`: `country_code` (default `KE`, NOT NULL after backfill), `region_id` (nullable)
- `businesses`: `country_code` (NOT NULL after backfill), `region_id` (nullable), `service_country_codes text[]` (defaults to `[country_code]` — for cross-border providers later)
- `job_requests`: `country_code` (NOT NULL after backfill), `region_id` (nullable)
- `subscription_plans`: `prices jsonb` keyed by currency, e.g. `{"KES":{"monthly":500,"annual":5000},"UGX":{...}}`. Existing `price_monthly_kes`/`price_annual_kes` columns stay during transition; UI reads from `prices` with KES fallback.

**Indexes**: `(country_code)` on `businesses`, `job_requests`; `(country_code, region_id)` composite on both.

**Backfill**: every existing row gets `country_code = 'KE'`.

**Seed**: insert KE/UG/TZ/RW rows into `countries`. No regions yet.

**RLS**: existing policies continue to work — country filtering is done in queries, not RLS (any authenticated user may read businesses/job_requests across countries; the UI applies the active-country filter).

## Frontend Changes

**New components**
- `src/components/CountrySelect.tsx` — flag + name dropdown, fed by `useCountries()` hook
- `src/components/RegionSelect.tsx` — disabled when `regions` empty for the selected country (shows "Region selection coming soon")
- `src/contexts/CountryContext.tsx` — holds `activeCountry` (defaults to `profile.country_code`, persisted to `localStorage` as `workpin.activeCountry`); exposes setter used by the navbar switcher
- `src/hooks/useCountries.ts`, `src/hooks/useRegions.ts`

**Onboarding & registration**
- `src/pages/Register.tsx` — add CountrySelect before phone; phone input adopts country `dial_code` and `phone_regex`; remove the hardcoded 🇰🇪 / +254 / "Find services across Kenya" copy
- `src/pages/Onboarding.tsx` — capture `country_code` (+ optional region) and write to `profiles`

**Business creation**
- `src/components/dashboard/CreateBusinessForm.tsx` — add CountrySelect (defaults to owner's country); submit writes `country_code` and `service_country_codes = [country_code]`
- `src/pages/BusinessProfileWizard.tsx` — surface the same in the Basics step; allow editing `service_country_codes` (multi-select) for providers who cover more than one country

**Browsing & filtering** (apply `country_code = activeCountry` filter)
- `src/pages/Providers.tsx`
- `src/pages/Services.tsx`
- `src/pages/RequestService.tsx` (sets `country_code` from active country on insert)
- `src/components/dashboard/ProviderJobFeed.tsx` — filter to jobs in any country listed in the provider's `service_country_codes`
- `src/components/home/ServiceCategories.tsx` and any other landing surfaces that count/show businesses

**Navbar / global**
- `src/components/layout/Navbar.tsx` — add a compact country switcher (flag + code) that updates `CountryContext` and triggers a refetch of country-scoped queries

**Pricing**
- `src/pages/Pricing.tsx` — read `subscription_plans.prices[currency]` based on active country's currency; fall back to KES values if a currency block is missing

## Documentation Updates

- Update `/mnt/documents/WorkPin_Payment_Analysis.md` — confirm Sprint C.5 is the prerequisite for the Paystack/Pesapal pivot; note that all 4 launch countries route to Pesapal, so Paystack is not required at launch but the abstraction stays so we can add NG/GH/ZA later
- Update `/mnt/documents/WorkPin_PrePayment_Roadmap.md` — insert Sprint C.5 between Sprint C and Sprint D, mark Geography as the gating dependency, and refresh the "remaining work" checklist

## Out of Scope (deferred to later sprints)
- Region data for any country (added per-country as we onboard)
- Paystack/Pesapal edge functions (Sprint D)
- Translation/i18n of UI copy (English only at launch)
- Per-country tax/VAT handling

## Files to Create
`src/components/CountrySelect.tsx`, `src/components/RegionSelect.tsx`, `src/contexts/CountryContext.tsx`, `src/hooks/useCountries.ts`, `src/hooks/useRegions.ts`

## Files to Modify
`src/App.tsx` (wrap with CountryProvider), `src/pages/Register.tsx`, `src/pages/Onboarding.tsx`, `src/pages/Pricing.tsx`, `src/pages/Providers.tsx`, `src/pages/Services.tsx`, `src/pages/RequestService.tsx`, `src/pages/BusinessProfileWizard.tsx`, `src/components/dashboard/CreateBusinessForm.tsx`, `src/components/dashboard/ProviderJobFeed.tsx`, `src/components/layout/Navbar.tsx`

## Acceptance Criteria
- New user from Kampala can register, pick Uganda + a UG phone format, and only sees UG businesses/jobs by default
- Existing KE users see no behavioural change (their `country_code` is backfilled to `KE`)
- Any user can flip the navbar country switcher and see Providers/Services/Jobs refilter
- Pricing page shows UGX/TZS/RWF/KES amounts depending on the active country, falling back to KES
- Sprint D (Paystack/Pesapal) can begin immediately after this ships, with `profiles.country_code` driving provider selection
