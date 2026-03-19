
Goal: ensure images reliably appear on newly created requests, and avoid confusing broken placeholders from legacy URLs.

What I found
1) Upload + save are working for new requests:
- The image upload request succeeds (storage + media_files insert).
- The new job request insert includes image_urls with the media URL.
- The latest row in the database has image_urls populated (not empty).

2) UI is still not rendering the thumbnail for the new open request:
- In the dashboard screenshot, the new “Event Planning” open request shows no thumbnail block.
- This means the card render condition is evaluating false at runtime for that row (even though data exists in backend responses).

3) Legacy requests still point to deleted bucket URLs:
- Older rows use /request-images/... URLs, which are now invalid (expected from “future uploads only” decision).
- This causes blank/error-looking thumbnail boxes and can mask whether new-image rendering is healthy.

Implementation plan
1) Normalize image_urls before rendering (Dashboard + ProviderDashboard)
- Add a small `normalizeImageUrls` helper to defensively coerce incoming values into `string[]` and filter bad entries:
  - handles null/undefined
  - handles non-array edge cases
  - trims empty strings
- Use normalized arrays for all thumbnail condition checks and maps.

2) Make thumbnail rendering status-agnostic and explicit
- Refactor request card thumbnail section into a small shared render block/component in each page so it is clearly outside status-specific branches.
- Render thumbnails for open/pending/completion_pending consistently.

3) Ignore legacy deleted-bucket URLs in UI
- Filter out legacy `/request-images/` URLs from the normalized list so broken placeholders are not shown.
- (Optional) show a tiny “photo unavailable” text only when all images are legacy/broken, otherwise show nothing.

4) Add a robust fallback source for newly uploaded images
- In RequestService, after creating the request, tag related media_files rows with `metadata.job_request_id` (using uploaded URL match) so requests can always be rehydrated from media_files if needed.
- In dashboards, if normalized `image_urls` is empty for a request, optionally fetch fallback media URLs from media_files by `metadata.job_request_id` (lightweight secondary path).

Technical details
- Frontend files to update:
  - `src/pages/Dashboard.tsx`
  - `src/pages/ProviderDashboard.tsx`
  - `src/pages/RequestService.tsx`
- No schema migration required for the core fix.
- Optional data cleanup migration (if desired): remove legacy `/request-images/` entries from `job_requests.image_urls` to clean old broken data display.

Validation checklist
1) Create a new request with 1–3 photos.
2) Confirm thumbnails appear immediately on client dashboard for open status.
3) Confirm same request shows thumbnails in provider open jobs list.
4) Confirm old legacy requests no longer show broken blank boxes.
5) Refresh hard (or sign out/in) and verify thumbnails still render (no transient state dependency).
