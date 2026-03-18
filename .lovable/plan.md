

# Why Slugs Aren't Being Used

## Findings

The code is correct — both the `ProviderLanding` page and `Providers` directory are properly wired to use slugs. The issue is simply that **both existing providers have `username: null`** in the database.

From the network requests:
- "Nairobi Tech Solutions" → `username: null`
- "Kamau Plumb & Fix" → `username: null`

These providers were created **before** the slug system was added to onboarding. The onboarding code now generates and saves slugs correctly (line 360: `username: finalSlug || null`), but it only runs for **new** provider signups.

The `Providers.tsx` card links use `provider.username || provider.user_id` as fallback, so clicking a card passes the UUID. The `ProviderLanding` page tries `username` first, falls back to `user_id` — so profiles still load, just with ugly UUID URLs.

## Fix

**One migration** to backfill slugs for existing providers that have `username IS NULL`:

```sql
-- Backfill slugs for existing providers
UPDATE public.provider_profiles
SET username = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(business_name, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  )
)
WHERE username IS NULL;
```

This generates slugs like `nairobi-tech-solutions` and `kamau-plumb--fix` from existing business names. A cleaner approach is a small SQL function or doing it in an edge function, but the simplest path is a one-time migration.

Alternatively, we could add a settings button in the provider dashboard to let existing providers set/edit their slug manually.

## Recommended Approach

1. **Database migration**: Backfill `username` for the 2 existing providers using their `business_name` + `location_name`
2. **No code changes needed** — the slug system in onboarding, directory, and landing pages already works correctly

| Item | Status |
|---|---|
| Slug generation utility (`slugify.ts`) | Working |
| Onboarding saves slug | Working |
| `/providers` links use slug | Working (falls back to UUID when null) |
| `/pro/:slug` resolves by username then UUID | Working |
| Existing providers have slugs | **Missing — needs backfill** |

