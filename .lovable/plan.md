

# Fix Media Path Generation for All Upload Contexts

## Problem

The `generateMediaPath` function only produces deterministic paths when `providerSlug` AND `providerName` are both provided. For all other uploads (client avatars, request images), it falls back to `user-uploads/general/{uuid}-{context}.{ext}` — random UUIDs, not the deterministic convention.

From the network logs, request images are landing at paths like:
```
user-uploads/general/3888187a-c125-40d9-8a3b-b5c6bf83231f-request-image.jpg
```

## Desired Convention

All paths should be deterministic and human-readable:

| Context | Path Pattern |
|---|---|
| Provider media | `{provider-slug}/{provider-name}-{context}-{timestamp}.{ext}` |
| Client avatar | `clients/{user-full-name}-avatar-{timestamp}.{ext}` |
| Request image | `requests/{service-name}-{context}-{timestamp}.{ext}` |
| Unknown user | `user-uploads/{user-id}/{context}-{timestamp}.{ext}` |

## Changes

### 1. Expand `UploadOptions` in `useMediaUpload.ts`

Add optional `userName` and `serviceName` fields so callers can pass client/service context for deterministic naming.

### 2. Rewrite `generateMediaPath` in `mediaPath.ts`

Add branches for non-provider uploads:
- If `userName` is provided (client uploads): `clients/{clean-name}-{context}-{ts}.{ext}`
- If `serviceName` is provided (request images): `requests/{clean-service}-{context}-{ts}.{ext}`
- Final fallback uses `uploaded_by` user ID instead of random UUID: `user-uploads/{userId}/{context}-{ts}.{ext}`

### 3. Update callers to pass context

| File | Change |
|---|---|
| `ClientProfileCard.tsx` | Pass `userName: profile.full_name` to `uploadMediaFile` |
| `TedQuestionForm.tsx` | Accept and pass `serviceName` prop to `uploadMediaFile` |
| `RequestService.tsx` | Pass `serviceName` from the selected service to `uploadMediaFile` |

### 4. Update `generateAltText` calls

Pass `userName` or `serviceName` through so alt text is also descriptive (e.g., "Eric Kibisu avatar" instead of "316008 10150355108602594 680024 n").

## Files Changed

| File | Change |
|---|---|
| `src/utils/mediaPath.ts` | Add `userName`, `serviceName`, `userId` params; new path branches |
| `src/hooks/useMediaUpload.ts` | Add `userName`, `serviceName` to `UploadOptions`; pass to `generateMediaPath` |
| `src/components/profile/ClientProfileCard.tsx` | Pass `userName` to upload call |
| `src/components/TedQuestionForm.tsx` | Accept `serviceName` prop, pass to `uploadMediaFile` |
| `src/pages/RequestService.tsx` | Pass `serviceName` to upload calls |

No database or migration changes needed.

