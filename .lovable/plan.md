

# Phase E: Cleanup — Dead Code and Database Entities

## Dead Frontend Files

These files are no longer imported or routed to anywhere in the app:

| File | Reason to delete |
|------|-----------------|
| `src/pages/ProviderDashboard.tsx` | Not routed in `App.tsx`. All logic migrated to `BusinessesPanel.tsx` inside unified dashboard. |
| `src/pages/ClientProfile.tsx` | Not routed in `App.tsx`. Profile is now unified at `/profile` via `Profile.tsx`. |
| `src/pages/ClientAccountSettings.tsx` | Not imported by any active code. `UnifiedSettings.tsx` replaced it. |
| `src/pages/ProviderAccountSettings.tsx` | Only imported by `SettingsRedirect.tsx` (itself dead). Replaced by `UnifiedSettings.tsx`. |
| `src/components/dashboard/SettingsRedirect.tsx` | Not imported anywhere. Role-based fork is gone. |
| `src/components/provider/settings/NotificationSettings.tsx` | Only imported by `ProviderAccountSettings.tsx` (dead). Notification UI now lives in `UnifiedSettings.tsx`. |

## Dead Database Entities

| Entity | Type | Reason to drop |
|--------|------|---------------|
| `direct_messages` table | Table | Not queried anywhere in frontend code. Messaging uses the `messages` table (via `work_threads`). Likely a leftover from an earlier design. |
| `trg_sync_user_role` trigger | Trigger | Was removed in Phase A migration, but verify it's gone. It synced `profiles.role` to `user_roles` — no longer needed. |
| `profiles.role` column | Column | No frontend code reads it anymore. Auth, routing, navbar, and settings all stopped using it in Phases A-C. Can be dropped. |
| `app_role` enum values `customer`, `provider` | Enum values | Only `admin` is meaningful now. However, dropping enum values in Postgres requires recreating the enum — defer if risky, or clean up `user_roles` rows first. |

## Code References to Clean Up

| Location | Issue |
|----------|-------|
| `src/pages/Dashboard.tsx` lines 93, 383-386, 422-424 | Still references `provider_profiles` in the `Quote` interface and enrichment logic. Should rename to `business_ratings` or similar to avoid confusion with the dropped table name. |
| `src/components/dashboard/QuotesPanel.tsx` lines 29-31, 80-82, 167-168 | Same — references `provider_profiles` in the `Quote` type and UI rendering. Rename field. |

## Plan

### Step 1 — Delete dead files (6 files)
Delete the 6 files listed above.

### Step 2 — Rename `provider_profiles` references in Quote types
In `Dashboard.tsx` and `QuotesPanel.tsx`, rename the `provider_profiles` field in the `Quote` interface to `business_ratings` (or just `ratings`) to reflect that it's fetched from `businesses`, not a dead table.

### Step 3 — Database migration
Single migration to:
- `ALTER TABLE profiles DROP COLUMN role;`
- `DROP TABLE IF EXISTS direct_messages;`
- Verify `trg_sync_user_role` is already gone; drop if not.

### Step 4 — Defer enum cleanup
Dropping values from a Postgres enum (`customer`, `provider` from `app_role`) is complex (requires recreating the type and all dependent columns). Since only `admin` is used in code, this is cosmetic. Defer to a future pass or do it if there's no existing data using those values.

### Files changed

| Action | File |
|--------|------|
| Delete | `src/pages/ProviderDashboard.tsx` |
| Delete | `src/pages/ClientProfile.tsx` |
| Delete | `src/pages/ClientAccountSettings.tsx` |
| Delete | `src/pages/ProviderAccountSettings.tsx` |
| Delete | `src/components/dashboard/SettingsRedirect.tsx` |
| Delete | `src/components/provider/settings/NotificationSettings.tsx` |
| Edit | `src/pages/Dashboard.tsx` — rename `provider_profiles` in Quote type |
| Edit | `src/components/dashboard/QuotesPanel.tsx` — rename `provider_profiles` in Quote type |
| Migration | Drop `profiles.role` column, drop `direct_messages` table |

