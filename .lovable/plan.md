

# Media System Implementation Plan

## Overview

Replace the current broken image system (missing `avatars_pro` bucket, no error handling, scattered upload logic) with a centralized media management system using a single `media` storage bucket, a `media_files` tracking table, client-side compression, and SEO-friendly paths.

## Adaptations from the Provided Guide

The guide references `public.providers(id)` — this table does not exist. The project uses `provider_profiles` with `user_id` as the primary identifier. The `moddatetime` extension is not installed, so we will use a plain trigger function for `updated_at`. The `has_role` function already exists and uses the `app_role` enum — no need to recreate it.

---

## Step 1: Database Migration

Create the `media` storage bucket and `media_files` table with RLS.

**Storage bucket:**
- Create `media` bucket (public, 5MB limit)
- RLS: anyone can SELECT, authenticated can INSERT, owners can UPDATE/DELETE

**`media_files` table** (adapted from guide):
- `provider_id UUID` references `provider_profiles(user_id)` instead of `providers(id)`
- Use a custom trigger function for `updated_at` instead of `moddatetime`
- All columns as specified in guide Section 2

**RLS policies** (from guide Section 9):
- Authenticated users read non-deleted media or their own
- Users insert with `uploaded_by = auth.uid()`
- Users soft-delete (update) their own records
- Admins full access via existing `has_role` function

---

## Step 2: Create Utility Files

### `src/utils/imageCompression.ts`
Client-side Canvas API compression with context-aware presets (logo, profile-photo, portfolio, hero, general). Recursive quality reduction until under `maxSizeKB`. Falls back to original on error.

### `src/utils/mediaPath.ts`
Deterministic path generation: `{provider-slug}/{provider-name}-{context}-{timestamp}.{ext}`. Falls back to `user-uploads/general/{uuid}-{context}.{ext}` when no provider context. Uses the existing `slugify.ts` patterns.

### `src/utils/mediaAltText.ts`
Auto-generates alt text from context + provider name (e.g., "Portfolio work by Elite Plumbing", "Elite Plumbing logo").

---

## Step 3: Create Upload Hook

### `src/hooks/useMediaUpload.ts`
Single `uploadMediaFile()` function that orchestrates the full flow:
1. Validate file size (max 5MB)
2. Compress via preset
3. Generate deterministic path
4. Upload to `media` bucket
5. Get public URL
6. Generate alt text
7. Insert into `media_files`
8. Return the full record

---

## Step 4: Create Image Component

### `src/components/ui/Image.tsx`
Drop-in replacement for `<img>` with:
- Skeleton loading state
- Error fallback UI
- `loading="lazy"` by default
- Prefers `mediaFile.alt_text` from DB over hardcoded `alt` prop

---

## Step 5: Migrate Existing Upload Code

Update these files to use the new `uploadMediaFile` hook instead of direct `supabase.storage` calls to `avatars_pro`:

| File | Change |
|---|---|
| `src/components/provider/ProviderProfileCard.tsx` | Replace `handlePhotoUpload` to use `uploadMediaFile`, store URL from `media_files.public_url` into `portfolio_photos`, add error handling with toasts |
| `src/components/provider/settings/ProviderProfileSettings.tsx` | Same refactor for both profile photo and portfolio uploads |
| `src/pages/ProviderLanding.tsx` | Replace `<img>` tags with `<Image>` component |
| `src/pages/Providers.tsx` | Replace avatar `<img>` tags with `<Image>` component |

---

## Step 6: Clean Up Stale Data

Clear broken `portfolio_photos` URLs that reference the non-existent `avatars_pro` bucket from the two existing provider records.

---

## Files Created/Modified

| File | Action |
|---|---|
| New migration SQL | Create `media` bucket + `media_files` table + RLS + trigger |
| `src/utils/imageCompression.ts` | New |
| `src/utils/mediaPath.ts` | New |
| `src/utils/mediaAltText.ts` | New |
| `src/hooks/useMediaUpload.ts` | New |
| `src/components/ui/Image.tsx` | New |
| `src/components/provider/ProviderProfileCard.tsx` | Refactor uploads |
| `src/components/provider/settings/ProviderProfileSettings.tsx` | Refactor uploads |
| `src/pages/ProviderLanding.tsx` | Use `<Image>` component |
| `src/pages/Providers.tsx` | Use `<Image>` component |

**Not included** (optional, per guide Section 8): CDN proxy and branded URL rewriting — can be added later when a custom domain is configured.

