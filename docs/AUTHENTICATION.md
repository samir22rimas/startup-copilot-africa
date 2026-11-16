# Authentication

Anza uses Supabase Auth with email and password, and Google sign-in. Sessions are stored in cookies and read on the server.

## 1. Pieces

| File | Role |
| --- | --- |
| `src/app/actions/auth.ts` | Server actions: `submitAuth` (sign-in and sign-up), `resendConfirmation`, `requestPasswordReset`, `updatePassword`, `signOut` |
| `src/components/auth/LoginForm.tsx` | The sign-in / sign-up form and the Google button |
| `src/components/auth/PasswordResetForm.tsx` | "Forgot password" and "choose a new password" forms |
| `src/components/auth/PasswordRecoveryGate.tsx` | Makes sure a recovery session exists before showing the new-password form |
| `src/app/auth/callback/route.ts` | Handles links that carry a `code` (Google, email confirmation, password reset) |
| `src/app/auth/confirm/route.ts` | Handles links that carry a `token_hash` (work on any device) |
| `src/proxy.ts` | Refreshes the session on every request and protects `/dashboard` and `/admin` |
| `src/lib/supabase/{client,server,admin}.ts` | Browser, server (cookie) and service-role clients |
| `src/lib/site-url.ts` | Works out the public origin for links in emails, without trusting an unknown `Host` header |
| `src/lib/validation.ts` | `safePostAuthPath` — the only paths a user may be sent to after signing in |

## 2. Flows

### Sign up with email

1. The form calls `submitAuth` with `mode=sign-up`.
2. Supabase creates the account and sends a confirmation email. The `handle_new_user` trigger creates the `profiles` row.
3. The user opens the link → `/auth/callback?code=…` → the session is created → redirect to the dashboard (or to the invitation they came from).
4. If email confirmation is disabled in Supabase, step 1 already returns a session and the user goes straight in.

If the email is already registered, the form shows the same "check your email" message. This is deliberate: the form must not reveal which emails have accounts.

### Sign in with email

`submitAuth` with `mode=sign-in`. Wrong credentials give one generic message. If the password is right but the email is not confirmed, the form says so and offers **Resend confirmation email** (`resendConfirmation`).

### Sign in with Google

The browser calls `signInWithOAuth` and is sent to Google, then back to `/auth/callback?code=…`, which creates the session.

### Forgotten password

1. `/forgot-password` → `requestPasswordReset` → Supabase emails a reset link. The response is the same whether or not the account exists.
2. The link opens `/auth/callback?code=…&next=/update-password`.
3. The callback creates a recovery session and **always** sends recovery links to `/update-password`, even if `next` was lost (this happens when Supabase falls back to the Site URL).
4. `/update-password` → `updatePassword` sets the new password, signs out the account's other devices, and redirects to the dashboard.

### When a link fails

| Situation | What the user sees |
| --- | --- |
| Link expired or already used | Sent to `/forgot-password` (reset links) or `/sign-in` (other links) with a clear message |
| Link opened in a different browser | Told to open it in the browser that requested it, or to request a new one |
| Supabase sent the user to the Site URL with `?code=` or `?error_code=` | `proxy.ts` forwards it to `/auth/callback`, so it is still handled |

Error messages shown from the URL are fixed text chosen by a code (`link-expired`, `other-browser`, …). Text from the URL is never rendered, so a crafted link cannot make the app display arbitrary words.

### Why "the same browser"?

Supabase's default email links use PKCE: the browser that requests the email stores a secret, and only that browser can complete the link. This protects against a stolen link but fails when the user opens the email on another device.

To make links work on any device, switch the email templates to token-hash links, which `/auth/confirm` handles. In Supabase → Authentication → Email Templates:

| Template | Link |
| --- | --- |
| Confirm signup | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` |
| Reset password | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` |

## 3. Route protection

`src/proxy.ts` runs before every page:

- No session and the path is under `/dashboard` or `/admin` → redirect to `/sign-in`, remembering where the user was going when it is a known safe path.
- A session and the path is `/sign-in`, `/sign-up` or `/forgot-password` → redirect to the dashboard.
- Otherwise the request continues with a refreshed session cookie.

The proxy is a first line of defence only. Every page and server action checks the session again, and row-level security guards the data. Do not rely on the proxy alone.

`/admin` additionally requires a platform admin: a **verified** email listed in the server-only `ADMIN_EMAILS` variable, or `app_metadata.role = "admin"`. See `src/lib/admin-guard.ts`.

## 4. Rules for code that touches auth

- Read the user with `supabase.auth.getUser()` on the server. Never trust `getSession()` or anything sent by the browser for authorisation.
- Read the plan and admin role from `app_metadata` only. `user_metadata` is editable by the user.
- Redirect after sign-in only through `safePostAuthPath`. Add a path to its allow-list when a new one is needed; never redirect to a raw `next` value.
- Keep sign-up, reset and resend responses identical whether or not the account exists.
- Build links for emails with `getSiteUrl()`, not from the request's `Host` header.

## 5. Supabase dashboard settings

| Setting | Value |
| --- | --- |
| Authentication → URL Configuration → Site URL | The production origin, for example `https://anza.example.com` |
| Redirect URLs | `https://<your-domain>/**` and `http://localhost:3000/**` |
| Email provider → Confirm email | Enabled |
| Emails → SMTP Settings | A custom SMTP provider (Resend, SendGrid, Brevo, …). The built-in service only sends a few emails per hour and is for testing |
| Email Templates | Optional: the token-hash links above |
| Google provider | Client id and secret; redirect URI `https://<project-ref>.supabase.co/auth/v1/callback` in Google Cloud |
| Rate Limits | Review "emails sent per hour" after SMTP is configured |

## 6. Password rules

At least 8 and at most 128 characters, checked in the form and again on the server. Supabase can add its own rules (leaked-password protection, required character types) under Authentication → Policies; its messages are passed through to the user because they never reveal whether an account exists.

## 7. Known limits

- No multi-factor authentication.
- No "change email" screen.
- A signed-in user can set a new password at `/update-password` without typing the old one. Supabase's "secure password change" setting can require recent sign-in.
- Auth pages are in English only.
