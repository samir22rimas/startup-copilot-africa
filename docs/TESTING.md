# Testing

## 1. The checks

| Command | What it checks | Time |
| --- | --- | --- |
| `npm run typecheck` | TypeScript across the whole project | ~1 min |
| `npm run lint` | ESLint (Next.js and React rules) | ~1 min |
| `npm test` | Unit tests in `tests/` (Vitest) | ~10 s |
| `npm run test:db` | Row-level-security suite in `supabase/tests/` | ~5 s |
| `npm run build` | Production build | 2–10 min |

Before opening a pull request, the first three and the build must pass. Run `test:db` whenever a migration changes.

The GitHub Actions workflow in `.github/workflows/ci.yml` runs typecheck, lint, unit tests and the build on every push and pull request.

## 2. Unit tests

Tests live in `tests/*.test.ts` and run in Node (no browser). They cover the pure logic where a mistake would be costly or invisible:

| File | Covers |
| --- | --- |
| `platform.test.ts` | Permissions per role, plans and feature gates, AI output handling (JSON extraction, fencing, report validation, Copilot actions), report catalogue, canvas and plan sections, execution helpers, country profiles, navigation, English/French dictionaries, input validation, business health scoring |
| `finance.test.ts` | Financial model projections, break-even, unit economics, the seven calculators, currency helpers |
| `scoring.test.ts` | Idea Lab scoring |
| `entitlements-and-chat.test.ts` | Platform-admin entitlements, plan isolation between co-founders, team chat mentions, reactions and channel keys |
| `brand-theme.test.ts` | Brand colour validation, conversions, contrast and theme generation |

Several tests guard product promises, not just code. For example, "country profiles never ship fees, tax rates or processing times" and "health shows no score for an empty workspace". Do not weaken those tests to make a change pass. If the promise changes, change the test on purpose and say so in the pull request.

### Writing a unit test

```ts
import { describe, expect, it } from "vitest"
import { roleCan } from "@/src/lib/permissions"

describe("roles", () => {
  it("does not let a viewer edit", () => {
    expect(roleCan("viewer", "edit")).toBe(false)
  })
})
```

- Put logic you want to test in `src/lib/`, as a pure function. Server actions are hard to unit test because they need cookies and a database; keep them thin.
- Files that start with `"use server"` can only export async functions. Do not put helpers you want to test there.
- The `@/` alias resolves from the repository root, as in the app.

## 3. Database security tests

`supabase/tests/rls_isolation.sql` is the executable proof that one business cannot see another's data and that each role can do only what it should. It runs in one transaction that is rolled back; any failed expectation raises an exception.

```bash
DATABASE_URL=postgres://user:pass@host:5432/db npm run test:db
```

Use a disposable database with all migrations applied, for example a local Supabase (`npx supabase start`) or a throwaway Supabase project. **Never production.**

When you add a table, add checks for: a member can read it, an outsider cannot, a viewer cannot write, and anonymous access is denied.

## 4. Manual test plan before a release

Automated tests do not cover the browser, emails or AI providers. Before each release, walk through this on the preview deployment:

**Accounts**
- [ ] Sign up with a new email, receive the confirmation email, confirm, land in onboarding
- [ ] Sign in with a wrong password: one generic error, the email field keeps its value
- [ ] Sign in with an unconfirmed account: "confirm your email" and a working resend button
- [ ] Forgot password: email arrives, link opens "choose a new password", the new password works
- [ ] Open an old reset link: sent to "forgot password" with an "expired" message
- [ ] Sign in with Google
- [ ] Sign out; `/dashboard` then redirects to sign-in

**Workspace**
- [ ] Create a business; the overview loads
- [ ] Generate at least one thing with AI in each area you changed
- [ ] Upload a PDF and a DOCX; a renamed `.exe` is rejected
- [ ] Export the business plan to PDF and Word

**Team**
- [ ] Invite a second account, accept from that account, exchange a chat message, see it arrive live
- [ ] As a Viewer: nothing editable, chat read-only

**Admin**
- [ ] `/admin` opens for an admin and redirects anyone else
- [ ] Change a user's plan; it appears in the audit trail

**General**
- [ ] An unknown URL shows the 404 page
- [ ] Dark mode and a phone-width screen on the pages you changed
- [ ] French: switch language on the pages you changed

## 5. Not covered yet

- No browser (end-to-end) tests. Playwright is the natural next step for the sign-up, invitation and plan-export flows.
- No component tests.
- No load tests. The AI providers and the Supabase plan are the likely limits.
- No accessibility audit. Run Lighthouse or axe on the main pages before launch.
