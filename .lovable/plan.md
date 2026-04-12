

# Reorder Pricing Features — Move Business Count to End

## What
Update the `subscription_plans` rows to reorder the `features` arrays so high-value items (services, gallery, quotes, badges) lead, and business profile count moves to the bottom of each list.

## How
Single data operation using the insert tool (UPDATE statements) — no schema migration needed, no code changes needed since `Pricing.tsx` renders features dynamically from the DB.

### Updates

**Free tier features** (reordered):
1. "3 Services listed"
2. "5 Gallery images"  
3. "5 Quotes per month"
4. "Basic profile"
5. "1 Business profile"

**Pro tier features** (reordered):
1. "10 Services listed"
2. "25 Gallery images"
3. "30 Quotes per month"
4. "Pro badge on profile"
5. "Priority in search results"
6. "Basic analytics"
7. "Up to 3 Business profiles"

**Premium tier features** (reordered):
1. "Unlimited services"
2. "Unlimited gallery images"
3. "Unlimited quotes"
4. "Premium badge on profile"
5. "Top search placement"
6. "Full analytics dashboard"
7. "Priority support"
8. "Unlimited business profiles"

## Files
| Action | Target |
|--------|--------|
| Data UPDATE | `subscription_plans` — reorder features arrays for all 3 tiers |

No code or schema changes required.

