

# Refactor All Uploads to Centralized Media System

## Problem

Three upload flows still bypass the new media system, writing directly to old storage buckets (`avatars`, `request-images`) without compression, tracking, or SEO metadata:

| Location | Old Bucket | What It Uploads |
|---|---|---|
| `ClientProfileCard.tsx` (line 113) | `avatars` | Client avatar photo |
| `TedQuestionForm.tsx` (line 87) | `request-images` | Job request reference images |
| `RequestService.tsx` (line 167) | `request-images` | Job request images (post-submit) |

Meanwhile, `ProviderProfileCard.tsx` and `ProviderProfileSettings.tsx` were already migrated to use `useMediaUpload` → `media` bucket.

## Plan

### 1. Refactor `ClientProfileCard.tsx`

Replace the direct `supabase.storage.from("avatars")` upload with the `useMediaUpload` hook:
- Context: `'avatar'`
- Add `'avatar'` preset to `COMPRESSION_PRESETS` (same as `profile-photo`: 600×600, webp)
- After upload, save `result.public_url` to `profiles.avatar_url` as before
- Add proper error toasts (already has try/catch, just wire the hook)

### 2. Refactor `TedQuestionForm.tsx`

Replace the direct `supabase.storage.from("request-images")` upload with `uploadMediaFile`:
- Context: `'request-image'`
- No `providerId` — use the current user as `uploaded_by`
- Add `'request-image'` preset to `COMPRESSION_PRESETS` (1200×800, jpeg, 500KB)
- Return the `public_url` for the parent form to use

### 3. Refactor `RequestService.tsx`

Replace the post-submit image upload loop with `uploadMediaFile`:
- Context: `'request-image'`
- Store `result.public_url` into the `image_urls` array as before
- This is the secondary upload path (TedQuestionForm handles the primary)

### 4. Add missing compression preset

Add `avatar` and `request-image` entries to `COMPRESSION_PRESETS` in `imageCompression.ts`:
```
avatar: { maxWidth: 600, maxHeight: 600, quality: 0.8, format: 'webp', maxSizeKB: 200 }
'request-image': { maxWidth: 1200, maxHeight: 800, quality: 0.8, format: 'jpeg', maxSizeKB: 500 }
```

## Files Changed

| File | Change |
|---|---|
| `src/utils/imageCompression.ts` | Add `avatar` and `request-image` presets |
| `src/components/profile/ClientProfileCard.tsx` | Use `useMediaUpload` instead of direct storage call |
| `src/components/TedQuestionForm.tsx` | Use `uploadMediaFile` instead of direct storage call |
| `src/pages/RequestService.tsx` | Use `uploadMediaFile` instead of direct storage call |

No database or RLS changes needed — the `media` bucket and `media_files` table already exist with the correct policies.

