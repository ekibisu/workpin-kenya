

# Improve Per-Service Pricing Clarity in Wizard

## Problem
The wizard's Step 2 (Services) already has per-service pricing fields — Price (KES), Price Type, and Duration — but they're presented in a cramped 3-column grid with minimal labels. Users don't understand these are per-service prices that will display on their public profile.

## Changes

### 1. `src/pages/BusinessProfileWizard.tsx` — Clarify service pricing UI
- Update the step description from generic text to: **"Add the services you offer. Each service gets its own pricing shown on your profile."**
- Add a small section heading above the pricing grid: **"Pricing & Duration"** with helper text like "Set the price clients see for this service"
- Improve the Price Type labels to be more human-readable: "Starting at" → "Starting from", keep "Fixed", "Per hour", "Get quote"
- Add placeholder text improvements: Price → "e.g. 3,000", Duration → "e.g. 2-3 hours"
- On mobile, change the 3-column grid to a 2+1 layout (`grid-cols-2` for price+type, full-width for duration) for better readability
- Add a subtle info badge next to "Price Type" explaining what each option means

### 2. `src/pages/ProviderLanding.tsx` — No changes needed
Per-service pricing already displays correctly with `priceLabel()` and duration. No modifications required.

## Files

| File | Change |
|------|--------|
| `src/pages/BusinessProfileWizard.tsx` | Better labels, helper text, and responsive layout for per-service pricing fields |

No database changes needed.

