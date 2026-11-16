# Anza 2.0 — Architecture and decisions

This document explains how Anza 2.0 is put together and why. It is written for
engineers joining the project. For setup, see [GETTING_STARTED.md](GETTING_STARTED.md).
Deeper detail on each layer: [DATABASE.md](DATABASE.md), [AUTHENTICATION.md](AUTHENTICATION.md),
[AI.md](AI.md) and [API_REFERENCE.md](API_REFERENCE.md).

## 1. Shape of the system

```text
Browser ── Next.js 16 (App Router, server actions, proxy.ts)
              │
              ├── src/lib/workspace      who is asking, for which business, with which role and plan
              ├── src/lib/ai             one pipeline for every AI call
              ├── src/lib/*              pure domain logic (finance, health, ideas, canvas, plan, execution)
              │
              └── Supabase: Postgres + row-level security, Auth, Storage
```

- **Pages** are server components. They load data through server actions and
  hand it to one client "workspace" component per module.
- **Server actions** (`src/app/actions/*.ts`) are the only write path. Every
  2.0 action starts with `requireWorkspace(capability)`.
- **Domain logic** that can be pure is pure and unit tested (`tests/`).

## 2. Workspaces, roles and isolation

A *business* (`startups` row) is a workspace. All workspace data carries
`startup_id`. Isolation is enforced in three places, on purpose:

1. **Row-level security** — the enforcement point. Helpers `is_startup_member`,
   `can_edit_startup`, `can_comment_startup`, `has_startup_role`.
2. **Database triggers** — rules RLS cannot express: a task cannot point at
   another workspace's project or milestone, an assignee must be on the team,
   an artifact can never change workspace, version history is append-only.
3. **Server actions** — `requireWorkspace("view" | "comment" | "edit" | "manage")`
   gives a clear error before the database refuses.

| Role (`member_role`) | Label | Can |
| --- | --- | --- |
| `owner` | Owner | everything, including ownership |
| `admin` | Administrator | settings, team (not owners or other admins), edit |
| `member` | Editor | create and edit workspace content |
| `advisor` | Advisor | read everything, comment, team chat |
| `viewer` | Viewer | read only |

`src/lib/permissions.ts` mirrors the database rules for the UI. The
executable proof is `supabase/tests/rls_isolation.sql` (33 checks).

The Idea Lab is the one personal area: `business_ideas` belongs to a user, not
a workspace, so ideas can exist before any business does.

## 3. Data model

Additive migration `20261115000100_anza_v2_platform.sql`. Nothing is dropped.

| Table | Purpose |
| --- | --- |
| `artifacts`, `artifact_versions` | Documents with a body and a history: canvases, business plan, research and analysis reports, financial model, entrepreneur profile. `module` + `kind` identify them; `content` is validated JSON. |
| `shared_links` | Read-only public link to one artifact, opened only through `get_shared_artifact(token)`. |
| `validation_assumptions`, `validation_evidence` | What must be true, and first-hand evidence for or against it. |
| `milestones`, `tasks`, `task_comments` | Execution. Legacy JSON tasks are copied in; the JSON is left untouched. |
| `business_memory` | Facts, goals, decisions and risks Copilot keeps across conversations. |
| `opportunities`, `opportunity_tracking` | Curated catalogue (admin-written, source + verification date required) and per-workspace bookmarks and application status. |
| `activity_log` | Append-only workspace feed. |
| `ai_usage`, `audit_logs` | Service-role only: token ledger and admin audit trail. |
| `subscriptions`, `feature_flags` | Billing record and global feature switches. |

**Why one `artifacts` table instead of a table per document type?** These
documents are read and written whole, need identical versioning, sharing and
permissions, and their shape evolves with the product. One table gives one
RLS policy set, one version history and one size limit. Things that are
queried row by row (tasks, evidence, opportunities) have real tables.

Until the migration is applied, 2.0 pages show a setup notice
(`isPlatformSchemaReady`) and the previous dashboard and document vault keep
working.

## 4. AI layer (`src/lib/ai`)

Every AI feature calls `runAi` or `runAiStructured` in `service.ts`:

```text
plan feature gate → burst limit + monthly allowance → provider fallback
  → (structured) JSON extraction + zod validation, one repair pass
  → token usage recorded in ai_usage
```

- `providers.ts` — model abstraction. Gemini → Groq → DeepSeek → OpenAI,
  skipping providers without a key. Gemini can use Google Search grounding
  (`webSearch: true`) and returns real sources.
- `guard.ts` — `baseSystemPrompt` puts the truthfulness and security rules in
  front of every prompt; `fence()` wraps untrusted text in data-only tags.
- `context.ts` — builds the business context for a prompt from ONE workspace,
  through the caller's own session.
- `json.ts` — tolerant JSON extraction; output is always schema-validated.

### Truthfulness

- Structured reports label every finding `verified`, `estimate` or
  `assumption` (`src/lib/reports/schema.ts`). Without retrieved web sources,
  market research cannot contain `verified` findings — enforced in code in
  `actions/reports.ts`, not left to the model.
- Country profiles (`src/lib/country-profiles.ts`) contain no fees, tax rates
  or processing times; a test fails if a percentage or duration is added.
- Opportunities are never AI-generated. Exchange rates come from a real
  service or are reported as unavailable.
- Health scores are sums of signals computed from workspace data; a dimension
  without data shows "not enough information", never a number.

### Copilot actions

Copilot cannot change data. A reply may carry *proposed* actions (task,
milestone, decision, memory). They are stored with the message; one runs only
when a person with edit rights clicks it, at which point the server re-reads
it from the stored message, checks permissions, and marks it applied.

## 5. Plans and feature gating

`src/lib/plans.ts` is the only place tiers, limits and feature sets are
defined (Free, Pro, Team). The tier is read from Supabase `app_metadata`
(service-role writable only). Inside a workspace, the **owner's** plan governs
what the whole team can use. Administrators can also switch a feature off
globally (`feature_flags`, Admin → Features & Plans).

**Platform administrators** (verified emails in `ADMIN_EMAILS`, or `app_metadata.role = "admin"`) are unlimited: every feature, no AI quota or burst limit, no limit on businesses, seats or saved ideas, and global feature switches do not apply to them (`src/lib/entitlements.ts`). Everyone else, co-founders included, keeps the limits of their own plan: each person’s AI quota and business limit come from their own plan, while the features available inside a business and its number of seats come from the owner’s plan (unlimited when the owner is a platform admin). The one remaining cap for admin-owned teams is the 50-member abuse ceiling inside `accept_startup_invitation`.

No payment provider is integrated. `subscriptions` has provider columns ready;
choosing a provider needs a decision about mobile-money coverage in the target
markets. List prices in `plans.ts` are placeholders and are labelled as such.

## 6. Internationalisation

English and French. Strings live in `src/lib/i18n/dictionaries/{en,fr}`; the
French dictionary is typed against the English one, so a missing key fails
the build, and a test checks keys and placeholders match. The locale comes
from the `anza_locale` cookie, then the browser. AI output follows the same
locale. Pages that predate 2.0 (legal, fundraising, analytics, settings,
team, guide, admin, auth) are not yet translated.

## 7. Testing

| Command | What it covers |
| --- | --- |
| `npm test` | Unit tests: finance, health, idea scoring, AI output validation, permissions, plans, catalogue, dictionaries |
| `npm run typecheck` | TypeScript |
| `npm run test:db` | RLS isolation and role tests (`DATABASE_URL` must point at a disposable database with all migrations applied) |
| `npm run build` | Production build |
