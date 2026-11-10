# Yet to do

- Google sign-in (Google SSO): configure the Google OAuth provider and finish integration later.

## Fix signup database error

### Reported symptom

The signup page shows:

> Unable to complete account registration due to a server error. Please try again later.

The browser's Supabase Auth signup request returned HTTP `500`:

```json
{
  "code": "unexpected_failure",
  "message": "Database error saving new user"
}
```

### What is known

- Signup calls Supabase Auth directly from `src/components/auth/SignupForm.tsx`; there is no application signup API route.
- The error happens during Supabase user creation, before the page advances to the existing six-digit email OTP form.
- The `auth.users` trigger in `supabase/migrations/0001_profiles.sql` creates a `public.profiles` row and generates an EVOAIQU ID.
- The HTTP response does not identify which database operation failed. The exact cause is **not confirmed**; do not assume the profile trigger or change production SQL without checking logs.
- No production database migrations or Supabase Auth settings were changed during investigation.

### Investigation and remediation steps

1. In the correct Supabase project, open **Logs Explorer → Auth Logs** and find the failed signup by timestamp.
2. Open **Logs Explorer → Postgres Logs** and inspect entries from the same time. Record the SQL error, SQLSTATE if shown, and function/trigger context.
3. Check that the deployed project has the expected `public.profiles` table, `public.generate_evoora_id()` and `public.handle_new_user()` functions, and the `on_auth_user_created` trigger on `auth.users`.
4. Compare the deployed schema and function definitions with `supabase/migrations/0001_profiles.sql`. Check for missing migrations, incompatible constraints, permissions, and trigger/function errors.
5. Apply only the minimal, reviewed database fix after confirming the log cause and getting approval for any production change. Do not remove the OTP verification flow or expose database details in client-facing errors.
6. Retry in a non-production environment. Verify new-user creation, profile creation, OTP delivery and verification, invalid/expired OTP handling, resend behavior, and duplicate-email handling. Also regression-test login and logout.

### Safety and privacy

- Never place real email addresses, project URLs/refs, API keys, passwords, OTPs, or access tokens in this note.
- Do not commit credentials or paste secrets into issue trackers or chat.
- The current generic signup error is intentional to avoid exposing internal database details. Keep detailed diagnostic information in server/Supabase logs only.

### Current status

**Blocked pending the matching Supabase Auth and Postgres log entries.** The provided response confirms a database-side signup failure, but not its exact root cause. Once the logs identify the failing operation, document the confirmed cause and the approved fix here.
