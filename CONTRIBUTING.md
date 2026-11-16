# Contributing to Anza

Thank you for helping build Anza. This guide covers how we work: setting up, writing code, and getting a change merged.

## 1. Setup

Follow [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md). Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before your first change.

This project uses **Next.js 16**, which differs from older versions. Before using a Next.js API, check the matching guide in `node_modules/next/dist/docs/`.

## 2. Workflow

1. Create a branch from `main`:
   - `feat/<short-name>` for a feature
   - `fix/<short-name>` for a bug fix
   - `docs/<short-name>`, `chore/<short-name>`, `refactor/<short-name>`
2. Make small, focused commits.
3. Run the checks (section 5).
4. Open a pull request into `main`. CI must pass and one person must review it.
5. Merge with "Squash and merge" so `main` has one commit per change.

Never commit directly to `main`, never force-push to it, and never commit `.env.local` or any key.

## 3. Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(team): add emoji reactions to chat messages
fix(auth): send expired reset links back to the forgot-password page
docs: add deployment guide
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`. Write the subject in the imperative ("add", not "added"), under about 70 characters.

## 4. Code rules

### Where code goes

| Kind of code | Location |
| --- | --- |
| A page | `src/app/<route>/page.tsx` (server component) |
| Interactive UI for a module | `src/components/dashboard/<module>/` (client component) |
| Reading or writing data | A server action in `src/app/actions/<module>.ts` |
| Business rules, calculations, parsing | A pure function in `src/lib/`, with a unit test |
| Database changes | A new migration in `supabase/migrations/` |
| User-facing text in the 2.0 modules | `src/lib/i18n/dictionaries/en` **and** `fr` |

### Security (non-negotiable)

- Every server action checks the session and the caller's permission first (`requireWorkspace`, `getProjectAccess` or `requireAdminClient`). Server actions are public endpoints.
- Every new table has row-level security enabled and policies, in the same migration.
- Validate every input on the server (`src/lib/validation.ts`). Never trust ids, sizes or types sent by the browser.
- Use the service-role client (`getSupabaseAdmin`) only when there is no other way, and only on the server.
- Never put a secret in a `NEXT_PUBLIC_` variable.
- Wrap user-supplied or third-party text in `fence()` before sending it to an AI model.
- Error messages shown to users must not contain database, provider or stack details.

### Honesty in the product

Anza must not present guesses as facts. Do not add invented numbers, sample data that looks real, or template text that pretends to be AI output. Label estimates and assumptions. See [docs/AI.md](docs/AI.md) §5.

### Style

- TypeScript strict; avoid `any`. Prefer types inferred from zod schemas.
- Keep components small. Server components by default; add `"use client"` only where interaction needs it.
- Files that start with `"use server"` export only async functions.
- Tailwind for styling; reuse `src/components/ui`. Support dark mode and phone widths.
- Comments explain *why*, not *what*.
- Prefer controlled inputs in forms that must keep their values after a failed server action.

## 5. Before you open a pull request

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

All must pass. If you changed a migration, also run `npm run test:db` against a disposable database.

Then walk through the parts of the manual test plan in [docs/TESTING.md](docs/TESTING.md) that your change touches, including dark mode, a phone-width screen and French.

## 6. Pull request description

- **What** changed and **why**.
- **How you tested it**, including manual steps.
- **Screenshots** for UI changes (light and dark).
- **Migrations**: list them and say whether they must be applied before deploying.
- **New environment variables**: add them to `.env.example`, the README table and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- **Docs**: update the documents your change affects ([docs/API_REFERENCE.md](docs/API_REFERENCE.md) for new actions, [docs/DATABASE.md](docs/DATABASE.md) for schema changes).
- An entry under "Unreleased" in [CHANGELOG.md](CHANGELOG.md).

## 7. Reporting bugs and security issues

Open a GitHub issue for bugs with: what you did, what you expected, what happened, and the reference code from the error page if there was one.

For security issues, do **not** open a public issue. Follow [SECURITY.md](SECURITY.md).
