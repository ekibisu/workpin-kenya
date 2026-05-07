## Goal

Close out remaining pre-Sprint-D work so payment provider routing, multi-currency pricing, and per-country service coverage are ready when Sprint D begins.

## Scope

Three small workstreams remain. Each is independent and can land in one pass.

### 1. Seed multi-currency subscription prices

Currently `subscription_plans.prices` only has KES values. Pesapal/Paystack will charge in the buyer's local currency, so every active plan needs UGX, TZS, and RWF amounts before the checkout edge function can read them.

- Update `subscription_plans.prices` (jsonb) for each active plan (Free, Pro, Premium) to include:
  ```
  {
    "KES": { "monthly": ..., "annual": ... },
    "UGX": { "monthly": ..., "annual": ... },
    "TZS": { "monthly": ..., "annual": ... },
    "RWF": { "monthly": ..., "annual": ... }
  }
  ```
- Use rough FX equivalents of the existing KES prices, rounded to clean local-currency amounts (e.g. nearest 1,000 UGX, 500 TZS, 500 RWF).
- Update `Pricing.tsx` and any plan-rendering component to read the price for the current `country.currency_code` from `prices` (with KES fallback).

### 2. Country multi-select in BusinessProfileWizard

Providers can already set a primary `country_code`, but `businesses.service_country_codes` (the array of countries they actually serve) is still empty for most records. This is what filters the Job Feed across borders.

- Add a multi-select control in the Location step of `src/pages/BusinessProfileWizard.tsx` populated from `useCountries()`.
- Default the selection to `[country_code]` for new businesses.
- Persist to `businesses.service_country_codes` on save.
- Show the same control in the existing edit-business flow so current providers can backfill.

### 3. UnifiedSettings preferences

Finish the deferred Sprint C item: a Preferences card on `src/pages/UnifiedSettings.tsx` so users can change their default country/region (writes to `profiles.country_code` / `profiles.region_id`) and notification toggles. This also gives clients a way to switch country without going through the navbar each session.

## Explicitly out of scope

- **Region seed data per country** — confirmed deferred; regions are added as providers onboard.
- **Sprint D itself** (Pesapal/Paystack edge functions, `payments`/`business_subscriptions` schema additions, `app_config`, `/subscribe/:plan`, `/payments/return`, secrets) — handled in the next plan once the above is shipped.

## Technical notes

- Price seeding is data-only — use the insert tool with `UPDATE subscription_plans SET prices = ...`, no migration needed.
- `service_country_codes` already exists on `businesses` (text[], default `{}`), so no schema change for workstream 2.
- No new tables, no new RLS policies, no new edge functions in this batch.

## Deliverable

After this lands, every prerequisite the Sprint D plan depends on (country on profile, multi-currency plan prices, provider service-country coverage, user-controllable country preference) is in place, and Sprint D can start cleanly.

---

## Status: Shipped

- ✅ Seeded UGX/TZS/RWF prices on Free/Pro/Premium in `subscription_plans.prices`. `Pricing.tsx` already reads currency-aware values from `useActiveCountry`.
- ✅ Added `CountryMultiSelect` and wired primary-country + service-countries pickers into `BusinessProfileWizard.tsx` (Basics step), persisted to `businesses.country_code` and `businesses.service_country_codes`.
- ✅ Created `src/pages/Settings.tsx` (`/settings`) with country + region preference card writing to `profiles.country_code` / `profiles.region_id`, syncs `useActiveCountry`. Linked from `Profile.tsx`.

Sprint D (Pesapal + Paystack) is now unblocked.
