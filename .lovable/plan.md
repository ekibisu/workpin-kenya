

# SEO-Friendly Provider Slugs

## Approach

Use the existing `username` column on `provider_profiles` to store an auto-generated, URL-friendly slug derived from the business name (e.g. `mwangi-plumbing-nairobi`). The public route becomes `/pro/mwangi-plumbing-nairobi` instead of `/pro/:id`.

## Database Changes

### 1. Add unique index on `username`

```sql
CREATE UNIQUE INDEX IF NOT EXISTS provider_profiles_username_unique
  ON public.provider_profiles (username)
  WHERE username IS NOT NULL;
```

### 2. Add public RLS policy for `provider_profiles` and `profiles`

Anonymous users need to browse providers and view landing pages:

```sql
-- Provider profiles: public read
CREATE POLICY "Anyone can view provider profiles"
  ON public.provider_profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone authenticated can view providers" ON public.provider_profiles;

-- Profiles: public read for name/avatar (needed for provider cards)
CREATE POLICY "Anyone can view basic profiles"
  ON public.profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can view all profiles" ON public.profiles;
```

## Frontend Changes

### 1. Slug utility (`src/lib/slugify.ts`)

A function that converts business name + location into a URL slug:
- `"Mwangi Plumbing"` + `"Westlands, Nairobi"` → `mwangi-plumbing-westlands`
- Strips special characters, lowercases, dedupes hyphens
- On collision (checked via DB query), appends `-2`, `-3`, etc.

### 2. Onboarding (`src/pages/Onboarding.tsx`)

- Auto-generate slug from `businessName` on blur
- Show a preview: "Your public URL: workpin.app/pro/mwangi-plumbing-westlands"
- Allow manual editing with real-time uniqueness check
- Save slug to `provider_profiles.username` during `handleSave`

### 3. Provider directory (`src/pages/Providers.tsx`)

- Replace `mockProviders` with a Supabase query joining `provider_profiles` + `profiles`
- Each card links to `/pro/:slug` using the `username` field
- Keep existing filter UI (search, location, rating) operating on real data

### 4. Provider landing page (`src/pages/ProviderLanding.tsx` — new)

- Route: `/pro/:slug` (public, no auth required)
- Fetch provider by `username` column
- Sections: hero with cover photo, bio, services (categories as badges), portfolio gallery, business hours, reviews from `reviews` table, and CTAs ("Request a Quote" → `/request?provider=userId`, "Book Now")
- SEO: Set `document.title` and meta description dynamically

### 5. Routing (`src/App.tsx`)

- Add public route: `<Route path="/pro/:slug" element={<ProviderLanding />} />`

## Files Changed

| File | Change |
|---|---|
| New migration | Unique index on `username`, public RLS on `provider_profiles` + `profiles` |
| `src/lib/slugify.ts` (new) | Slug generation + uniqueness check utility |
| `src/pages/Onboarding.tsx` | Auto-generate slug, preview URL, save to `username` |
| `src/pages/Providers.tsx` | Replace mock data with DB query, link cards to `/pro/:slug` |
| `src/pages/ProviderLanding.tsx` (new) | Public landing page fetched by slug |
| `src/App.tsx` | Add `/pro/:slug` route |

