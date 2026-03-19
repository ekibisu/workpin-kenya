

# Fix Request Image Upload Flow + Delete Old Buckets

## Root Cause

The upload flow is broken because images are uploaded **twice**:

1. `TedQuestionForm.ImageUploadField` uploads each image immediately via `uploadMediaFile` (step 2 of the wizard) — this succeeds and creates `media_files` records, but no `job_request_id` is available yet.
2. `RequestService.handleSubmit` tries to re-upload the same `File` objects — but the job request hasn't been created until step 4. The `image_urls` array ends up empty because the second upload is redundant and the URLs never get written back.

The fix: `TedQuestionForm` should return the **`public_url` values** from the first upload, not the raw `File` objects. `RequestService` should skip re-uploading and just write those URLs into `job_requests.image_urls`.

## Changes

### 1. Fix `TedQuestionForm.tsx` — return URLs instead of Files

- Change `onImagesChange` callback signature from `(files: File[]) => void` to `(urls: string[]) => void`
- In `ImageUploadField`, track uploaded `public_url` values alongside previews
- After each successful `uploadMediaFile` call, store the returned `public_url`
- Call `onImagesChange` with the accumulated URL strings
- Also store `media_files.id` values so we can link them to the job request later

### 2. Fix `RequestService.tsx` — stop double-uploading

- Change `uploadedImages` state from `File[]` to `string[]` (URLs)
- In `handleSubmit`, skip the upload loop entirely — just write the already-uploaded URLs into `job_requests.image_urls`
- After inserting the job request, update the corresponding `media_files` records' metadata with the `job_request_id`

### 3. Fix `TedQuestionFormProps` interface

- Update `onImagesChange: (urls: string[]) => void` to match the new contract

### 4. Delete old storage buckets (migration)

- Delete all objects from `avatars` and `request-images` buckets
- Drop the buckets themselves
- Drop any associated storage RLS policies for those buckets

### 5. Use `<Image>` component in Dashboard and ProviderDashboard

Replace raw `<img>` tags rendering `image_urls` with the `<Image>` component for consistent loading/error states:
- `Dashboard.tsx` lines 491-494
- `ProviderDashboard.tsx` lines 273-278, 297-299

## Files Changed

| File | Change |
|---|---|
| `src/components/TedQuestionForm.tsx` | Return URLs from uploads, not File objects |
| `src/pages/RequestService.tsx` | Use pre-uploaded URLs, stop double-uploading |
| `src/pages/Dashboard.tsx` | Replace `<img>` with `<Image>` for request thumbnails |
| `src/pages/ProviderDashboard.tsx` | Replace `<img>` with `<Image>` for request thumbnails |
| New migration SQL | Delete `avatars` and `request-images` buckets and their objects |

