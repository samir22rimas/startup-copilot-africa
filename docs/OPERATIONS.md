# Operations

How to keep Anza running once people depend on it: monitoring, backups, the admin portal, and what to do when something breaks.

## 1. Monitoring

| What | How | Status |
| --- | --- | --- |
| Is the site up? | An uptime monitor (UptimeRobot, Better Stack, …) calling `GET /api/health` every few minutes | Endpoint ready; monitor to be set up |
| Server errors | Vercel → Logs. Error pages show a reference (`digest`) that matches the log entry | Available |
| Error tracking with alerts | Sentry or similar. The error pages already have a `console.error` hook marked for replacement in `src/components/shared/ErrorState.tsx` | **Not set up** |
| Database load and size | Supabase → Reports | Available |
| Auth problems, email delivery | Supabase → Logs → Auth; your SMTP provider's dashboard | Available |
| AI usage, failures and cost | Admin → AI Usage; each provider's billing page | Available |
| Product usage | Admin → Overview and Usage Events | Available |

Check weekly until there is alerting: Vercel error logs, Admin → AI Usage failures, Supabase database size.

## 2. Backups

The database is the only place user data lives. Uploaded files are in Supabase Storage.

- **Daily backups** are included on Supabase's paid plans; the free plan has none you can restore yourself. Move to a paid plan before real users depend on the data.
- **Point-in-time recovery** (restore to any minute) is a paid add-on. Worth it once there are paying customers.
- **Storage files are not in the database backups.** For important files, plan a periodic copy of the `startup-documents` bucket.
- **Test a restore** once, into a new project, so you know the steps before you need them.

## 3. The admin portal

Open `/admin` with an email listed in `ADMIN_EMAILS` (the email must be verified).

| Page | Use it to |
| --- | --- |
| Overview | Sign-ups, active businesses, usage at a glance |
| Users & Profiles | Find a user, change their plan |
| Subscriptions | See plan assignments |
| User Feedback | Read what users sent from the app |
| Startups | Browse businesses |
| Opportunities | Curate the grants and programmes catalogue. Every entry needs a source and a verification date |
| AI Usage | Calls, tokens, providers, failures |
| Features & Plans | Switch a feature off for everyone (for example while a provider is failing) |
| Usage Events | The AI quota ledger |
| Audit Trail | Who changed what in the admin portal |

Every change made in the portal is written to the audit trail. Platform admins have unlimited AI usage; keep the list short.

## 4. Common tasks

| Task | How |
| --- | --- |
| Give someone the Pro or Team plan | Admin → Users → change plan. Stored in `app_metadata.plan_tier` |
| Add an admin | Add their email to `ADMIN_EMAILS` in Vercel and redeploy. They must have confirmed their email |
| Remove an admin | Remove the email and redeploy |
| A user did not get an email | Supabase → Logs → Auth for the send attempt; then the SMTP provider's logs. Check spam. Check Supabase's email rate limit |
| A user is locked out | Ask them to use "Forgot password". Supabase → Authentication → Users can also send a reset or delete the account |
| Delete a user's data on request | Supabase → Authentication → Users → delete. Businesses they own must be deleted or handed over first; check the privacy policy's promises |
| Turn off a broken AI feature | Admin → Features & Plans |
| An AI provider is down | Nothing, if another provider key is set: calls fall through to the next provider. Otherwise add a fallback key in Vercel and redeploy |

## 5. When something breaks

1. **Is it everyone or one user?** Check `/api/health`, then try the failing action yourself.
2. **Find the error.** Vercel → Logs, filtered by time. If the user saw a reference code, search for it.
3. **Recent change?** If it started with a deployment, promote the previous deployment (Vercel → Deployments) first and investigate after.
4. **Database?** Supabase → Logs → Postgres. "permission denied" or `42501` usually means a missing migration or an RLS policy; "relation does not exist" means a migration was not applied.
5. **AI?** Admin → AI Usage for `unavailable` outcomes; then the provider's status page and billing limit.
6. **Email?** Supabase Auth logs, then the SMTP provider.
7. **Fix forward** with a normal pull request, and add a test that would have caught it.
8. **Tell affected users** what happened if data or access was affected.

## 6. Limits to watch

| Limit | Where | What happens |
| --- | --- | --- |
| Supabase free plan: database size, monthly active users, project pauses after inactivity | Supabase → Usage | Writes fail or the project pauses |
| Supabase built-in email: a few per hour | Supabase → Auth | Sign-up and reset emails silently stop |
| AI provider spending limit | Provider dashboard | Calls fail; the app falls back to the next provider or shows "unavailable" |
| Vercel function duration | Vercel plan | Long AI generations can time out |
| Upload size: 25 MB per file | `src/lib/document-files.ts`, storage bucket | Larger files are rejected |
