

# Fix "Auth session missing" on Password Reset

## Root Cause

When a user clicks the password reset link from their email, Supabase redirects to `/reset-password#access_token=...&type=recovery`. Two things go wrong:

1. **Race condition**: The `AuthContext` has its own `onAuthStateChange` listener that processes the recovery session. The `ResetPassword` component registers a *second* listener, but by the time it mounts, the `PASSWORD_RECOVERY` event may have already fired and been consumed.

2. **Session not restored before submit**: The user can submit the form before the recovery session is fully established. `supabase.auth.updateUser()` requires an active session — without one, it returns "Auth session missing."

The auth logs confirm this: the `/verify` endpoint returns 303 (session created), but then immediately a "Refresh Token Not Found" error appears, meaning the session was lost or not properly picked up.

## Fix

### 1. Update `ResetPassword.tsx`

- **Wait for session**: On mount, call `supabase.auth.getSession()` first to restore any existing session from the URL hash tokens, then set up `onAuthStateChange` to catch the `PASSWORD_RECOVERY` event.
- **Track session readiness**: Add an `isReady` state that gates the form. Show a loading state until the session is confirmed.
- **Verify session before submit**: Before calling `updateUser`, check that a session exists. If not, show a clear error message asking the user to request a new reset link.
- **Handle edge case**: If no recovery session is detected after a timeout (e.g. 5 seconds), show a message with a link back to the login page to request a new reset email.

```text
Mount flow:
1. getSession() → restore tokens from URL hash
2. onAuthStateChange → listen for PASSWORD_RECOVERY event
3. If session exists → set isReady=true, show form
4. If no session after timeout → show "link expired" message
```

### 2. Prevent AuthContext from interfering

The `AuthContext` currently doesn't redirect on its own (it just stores session state), so no changes needed there. The `ResetPassword` route is public (not behind `ProtectedRoute`), which is correct.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/ResetPassword.tsx` | Add session-aware gating with `getSession()` + timeout fallback |

No database or migration changes needed.

