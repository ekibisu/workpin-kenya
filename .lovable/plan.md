## Status

✅ **Database wiped already.** All transactional tables truncated and every `auth.users` row deleted. Reference data (services, countries, regions, subscription_plans, app_config) preserved.

⏳ **Storage not yet emptied.** 22 files remain in the `media` bucket (0 in `dispute-evidence`). Direct SQL `DELETE` on `storage.objects` is blocked by a Supabase protection trigger, so files must be removed via the Storage API.

## Remaining step — needs build mode

Switch to **build mode** and I will:

1. Create a one-shot edge function `supabase/functions/wipe-storage/index.ts` that uses the service-role client to list and `.remove()` every object in `media` and `dispute-evidence` (chunked, recursive through subfolders).
2. Register it in `supabase/config.toml` with `verify_jwt = false`.
3. Invoke it once and report how many files were deleted per bucket.
4. Delete the edge function afterwards so it isn't left exposed.

Reply with build mode enabled (toggle at top of chat) and I'll run those steps.