## Root cause

Submitting a quote inserts into `public.quotes`, which fires the trigger `trg_notify_new_quote → notify_on_new_quote() → notify_user()`. `notify_user` calls `net.http_post(...)` to invoke the `send-notification` edge function.

The `pg_net` extension is **not installed** on this database (verified — no row in `pg_extension`), so the `net` schema doesn't exist and every quote insert fails with:

```
schema "net" does not exist  (SQLSTATE 3F000)
```

`app_config.notification_function_url` is set to a real URL, so the early-return guard in `notify_user` doesn't fire.

Two reasonable fixes are needed together: turn the missing extension back on, and make sure a failed notification can never again block a core business write.

## Fix (single migration)

1. `CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;` (Supabase's standard install location — the `net` schema is created as an alias by the extension).
2. Replace `public.notify_user` so the `net.http_post` call is wrapped in a `BEGIN ... EXCEPTION WHEN OTHERS THEN RAISE NOTICE ... END;` block. Notifications are best-effort; they must never roll back the parent transaction (quote insert, job status change, payment update, etc.).

No application/client code changes. No other triggers or business logic touched.

## Verification

- Re-run the `SELECT extname FROM pg_extension WHERE extname='pg_net'` check — should return one row.
- Submit a quote from `/dashboard/jobs` in the preview — insert should succeed, toast "Quote submitted!" should appear, row visible in `quotes`.
- Edge function `send-notification` logs should show a new invocation.

## Out of scope

- The `Missing Description for DialogContent` warning is an a11y warning unrelated to this 400 — not part of this fix.
- The "message channel closed" errors are from a browser extension, not the app.
