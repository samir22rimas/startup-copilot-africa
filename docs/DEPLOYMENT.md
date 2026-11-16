# Deployment

Anza runs on **Vercel** (the Next.js app) and **Supabase** (database, auth, storage, realtime). This document covers the first production setup and every release after it.

## 1. Environments

| Environment | App | Database | Purpose |
| --- | --- | --- | --- |
| Local | `npm run dev` | Development Supabase project | Day-to-day work |
| Preview | Vercel preview deployment (every pull request) | Development Supabase project | Review before merging |
| Production | Vercel production (the `main` branch) | **Separate** production Supabase project | Real users |

Never point local or preview at the production database. A bug or a test run there affects real users' data.

## 2. First production setup

### Supabase

1. Create a new Supabase project for production. Choose the region closest to your users (for Africa, usually `eu-west` or `af-south` if offered on your plan).
2. Apply the schema:
   ```bash
   npx supabase link --project-ref <production-ref>
   npx supabase db push
   ```
3. Authentication → URL Configuration: Site URL `https://<your-domain>`; Redirect URLs `https://<your-domain>/**`.
4. Authentication → Email: keep **Confirm email** on.
5. Authentication → Emails → SMTP: configure a real email provider. The built-in sender is limited to a few emails per hour.
6. Optional: switch the "Confirm signup" and "Reset password" templates to token-hash links ([AUTHENTICATION.md](AUTHENTICATION.md)).
7. Google sign-in: enable the provider with a production OAuth client.
8. Database → Replication: check `team_messages` and `team_message_reactions` are in `supabase_realtime`.
9. Database → Backups: confirm daily backups are on; consider point-in-time recovery once there are paying users ([OPERATIONS.md](OPERATIONS.md)).

### Vercel

1. Import the GitHub repository.
2. Framework preset: Next.js. The build command comes from `package.json` (`next build --webpack`).
3. Node.js version: 22.
4. Environment variables (Production), all from `.env.example`:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | From the **production** Supabase project |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>`, no trailing slash |
   | `ADMIN_EMAILS` | The admins' emails |
   | `GEMINI_API_KEY` and any fallback keys | Production keys with spending limits |

   Set the Preview environment to the development Supabase project.
5. Add your domain under Settings → Domains.
6. Deploy.

### AI providers

Set a monthly spending limit in each provider's dashboard. Anza's quotas count calls, not money.

## 3. After the first deploy

- [ ] `https://<your-domain>/api/health` returns `{"status":"ok"}`
- [ ] Sign up with a real email; the confirmation email arrives within a minute
- [ ] Create a business, generate something with AI
- [ ] Invite a second account and exchange a team chat message
- [ ] `/admin` opens for an admin email
- [ ] `https://<your-domain>/robots.txt` and `/sitemap.xml` show your domain
- [ ] Response headers include `Content-Security-Policy` and `Strict-Transport-Security`

## 4. Releasing a change

1. Merge the pull request to `main` after CI passes and the preview has been checked ([TESTING.md](TESTING.md), manual test plan).
2. **If the release includes a migration, apply it to production before the code that needs it goes live:**
   ```bash
   npx supabase link --project-ref <production-ref>
   npx supabase db push
   ```
   Migrations are additive, so the old code keeps working with the new schema.
3. Vercel deploys `main` automatically.
4. Repeat the checks in section 3 for the areas that changed.
5. Add an entry to [CHANGELOG.md](../CHANGELOG.md) and tag the release: `git tag v0.2.0 && git push --tags`.

## 5. Rolling back

| Problem | Action |
| --- | --- |
| The new code is broken | Vercel → Deployments → the previous deployment → **Promote to Production**. Takes seconds |
| A migration is broken | Write a new migration that fixes it. Do not edit or delete an applied migration |
| Data was damaged | Restore from a backup ([OPERATIONS.md](OPERATIONS.md)) |

Because migrations are additive, rolling the code back does not require rolling the database back.

## 6. Secrets

- Secrets live only in Vercel's environment settings and in each developer's `.env.local`. They are never committed.
- Rotate a key immediately if it is exposed (pasted in chat, committed, logged): create a new one in the provider's dashboard, update Vercel, redeploy, then revoke the old one.
- The Supabase service-role key gives full database access. Treat it like a root password.
