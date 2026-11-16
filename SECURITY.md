# Security policy

## Reporting a vulnerability

If you find a security problem in Anza, please tell us privately so we can fix it before it is exploited.

- Use GitHub's **private vulnerability reporting** on this repository (Security tab → "Report a vulnerability").
- Do **not** open a public issue, pull request or discussion about it.
- Include what you found, the steps to reproduce it, and what an attacker could do with it.

We will acknowledge your report within 3 working days and keep you informed until it is fixed. We will credit you in the changelog if you wish.

Please test only against your own accounts, do not access or change other people's data, and do not run denial-of-service or automated scanning against the production site.

## Supported versions

Only the current `main` branch and the production deployment receive security fixes.

## Security model

A summary for reviewers. The details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATABASE.md](docs/DATABASE.md) and [docs/AUTHENTICATION.md](docs/AUTHENTICATION.md).

| Area | Protection |
| --- | --- |
| Data isolation | Row-level security on every table; access only through team membership. Tested by `supabase/tests/rls_isolation.sql` |
| Joining a team | Only by accepting an invitation addressed to the caller's **verified** email, inside a database function that also enforces the seat limit |
| Privilege escalation | Triggers prevent changing a business's owner, moving memberships, or demoting the owner through the API |
| Server actions | Each checks the session and role before doing anything; inputs are validated on the server |
| Plans and admin rights | Read only from `app_metadata`, which users cannot edit. Admins also need a verified email on a server-only allow-list |
| Service-role key | Server only; used for quota bookkeeping, the admin portal and the audit trail |
| Authentication | Supabase Auth with PKCE; no account enumeration in sign-up, reset or resend; post-login redirects limited to an allow-list |
| Uploads | Size limit, extension allow-list and file-signature check on the server |
| AI | Untrusted text fenced as data; the Copilot cannot change data without a user's click; structured output validated |
| HTTP | Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `nosniff`, strict referrer and permissions policies |
| Abuse | Per-user AI burst limit and monthly quota |

## Known gaps

- No multi-factor authentication.
- No automated dependency scanning yet. Run `npm audit` before releases.
- The CSP allows `'unsafe-inline'` scripts, which Next.js needs without a nonce setup.
