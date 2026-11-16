# Launch checklist

Everything a production web application needs, and where Anza stands on each. Use it before a private beta, again before a public launch, and as a review list for any new app.

**Status key:** ✅ done · 🟡 partly done · ❌ not done · 👤 needs an account, a decision or dashboard access (cannot be done in code)

Last reviewed: 16 November 2026, version 0.1.0.

## Summary

| Stage | Verdict |
| --- | --- |
| **Private beta** (10–50 invited founders) | Ready once the four "Before beta" items are done |
| **Public launch** | Not yet: also needs the "Before public launch" items |

### Before beta
1. 👤 Confirm all migrations are applied to the production Supabase project ([DATABASE.md](DATABASE.md))
2. 👤 Configure custom SMTP and the auth URLs in Supabase ([AUTHENTICATION.md](AUTHENTICATION.md))
3. 👤 Turn on database backups (Supabase paid plan)
4. 👤 Set spending limits with every AI provider

### Before public launch
5. 👤 Error tracking with alerts (Sentry or similar)
6. 👤 Uptime monitor on `/api/health`
7. 👤 Have the Terms and Privacy Policy reviewed for the countries you serve
8. ❌ Browser tests for sign-up, invitation and export
9. ❌ Accessibility and performance audit (Lighthouse / axe)
10. 👤 Decide on a licence

---

## 1. Product

| Item | Status | Notes |
| --- | --- | --- |
| Clear core user journey | ✅ | Idea → research → validate → plan → run → grow |
| Onboarding for new users | ✅ | |
| Empty states that tell the user what to do | ✅ | |
| Honest AI output (no invented facts presented as real) | ✅ | See [AI.md](AI.md) §5 |
| In-app help | ✅ | `/dashboard/guide` |
| A way for users to send feedback | ✅ | Feedback form → Admin → User Feedback |
| Pricing and payments | 🟡 | Plans and limits exist; no payment provider. Plans are assigned by admins |
| Internationalisation | 🟡 | English and French; some older pages English only |

## 2. Accounts and security

| Item | Status | Notes |
| --- | --- | --- |
| Sign-up, sign-in, sign-out | ✅ | |
| Email confirmation and resend | ✅ | |
| Password reset | ✅ | |
| Social sign-in | ✅ | Google |
| No account enumeration | ✅ | Same responses whether or not an email is registered |
| Authorisation enforced on the server and in the database | ✅ | Server actions + row-level security |
| Roles and permissions | ✅ | Five roles, tested in SQL |
| Admin access restricted and audited | ✅ | `ADMIN_EMAILS`, audit trail |
| Input validation | ✅ | |
| Upload validation by file signature | ✅ | |
| Rate limiting on expensive operations | ✅ | AI burst limit and monthly quota |
| Security headers (CSP, HSTS, framing) | ✅ | `next.config.ts` |
| Secrets kept out of the repository and the browser | ✅ | `.env*` ignored; no secret has a `NEXT_PUBLIC_` prefix |
| Prompt-injection defences | ✅ | `fence()` and the system prompt rules |
| Multi-factor authentication | ❌ | Not required for beta |
| Dependency vulnerability checks | 🟡 | Run `npm audit` before each release; consider Dependabot |
| Security policy for reporters | ✅ | [SECURITY.md](../SECURITY.md) |

## 3. Data

| Item | Status | Notes |
| --- | --- | --- |
| Schema in version control | ✅ | `supabase/migrations/` |
| Repeatable, additive migrations | ✅ | |
| Migrations applied to production | 👤 | Must be confirmed |
| Separate development and production databases | 👤 | Recommended in [DEPLOYMENT.md](DEPLOYMENT.md) |
| Backups | 👤 | Supabase paid plan |
| A tested restore | ❌ | |
| Data export for users | 🟡 | Plan and documents export; no full account export |
| Account deletion | 🟡 | Done by an admin on request |

## 4. Reliability and quality

| Item | Status | Notes |
| --- | --- | --- |
| TypeScript strict mode | ✅ | |
| Lint passes with no warnings | ✅ | |
| Unit tests | ✅ | 89 tests |
| Database security tests | ✅ | `supabase/tests/rls_isolation.sql` |
| Continuous integration | ✅ | `.github/workflows/ci.yml` |
| Browser (end-to-end) tests | ❌ | |
| Error pages (500, 404) | ✅ | `error.tsx`, `global-error.tsx`, `not-found.tsx` |
| Loading states | ✅ | `loading.tsx` and skeletons |
| AI provider fallback | ✅ | Four providers |
| Health-check endpoint | ✅ | `/api/health` |

## 5. Operations

| Item | Status | Notes |
| --- | --- | --- |
| Deployment documented | ✅ | [DEPLOYMENT.md](DEPLOYMENT.md) |
| Rollback plan | ✅ | Promote the previous Vercel deployment |
| Error tracking and alerts | 👤 | Needs a Sentry (or similar) account |
| Uptime monitoring | 👤 | Endpoint ready; needs a monitor |
| Logs | ✅ | Vercel and Supabase |
| Product analytics | 🟡 | Admin overview and usage events; no funnel analytics |
| Cost controls | 🟡 | Quotas in the app; provider spending limits to set |
| Runbook for incidents | ✅ | [OPERATIONS.md](OPERATIONS.md) |

## 6. Legal and trust

| Item | Status | Notes |
| --- | --- | --- |
| Terms of Service | 🟡 | Page exists; needs legal review |
| Privacy Policy | 🟡 | Page exists; needs legal review for the data-protection laws where you operate (for example Nigeria's NDPA, Kenya's Data Protection Act, South Africa's POPIA, Cameroon's 2024 personal data law, the EU's GDPR for European users) |
| Cookie notice | 🟡 | Only essential cookies (session, language, active business). No consent banner needed for those in most jurisdictions; revisit if analytics or ads cookies are added |
| AI disclaimer | ✅ | Legal and financial content is labelled as orientation |
| Licence | 👤 | No licence file. Choose one: a proprietary notice if the code is closed, or an open-source licence (MIT, Apache-2.0) if it is not |

## 7. Discoverability

| Item | Status | Notes |
| --- | --- | --- |
| Page titles and descriptions | ✅ | |
| Open Graph and Twitter cards | 🟡 | Text set; no social image yet (`app/opengraph-image`) |
| robots.txt and sitemap.xml | ✅ | Private areas excluded |
| Favicon and app icon | ✅ | |

## 8. Documentation

| Item | Status |
| --- | --- |
| README with setup | ✅ |
| Architecture | ✅ |
| Database, auth, AI, API reference | ✅ |
| Testing, deployment, operations | ✅ |
| User guide | ✅ |
| Contributing guide and changelog | ✅ |
