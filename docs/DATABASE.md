# Database

Anza stores everything in one Supabase PostgreSQL database. This document describes the tables, how access is controlled, and how to change the schema safely.

The design reasoning (why one `artifacts` table, why three layers of isolation) is in [ARCHITECTURE.md](ARCHITECTURE.md). The TypeScript types for every table are in `src/lib/database.types.ts` and `src/lib/database.v2.types.ts`.

## 1. Core idea: the business is the workspace

A row in `startups` is a business. Almost every other row carries a `startup_id`, and a person can read or change it only if they are a member of that business (`startup_members`). This rule is enforced by PostgreSQL row-level security (RLS), not only by application code.

```text
auth.users ──1:1── profiles
     │
     └── startup_members ──► startups ──► projects ──► conversations ──► messages
            (role)              │
                                ├── artifacts ──► artifact_versions, shared_links
                                ├── milestones, tasks ──► task_comments
                                ├── validation_assumptions ──► validation_evidence
                                ├── knowledge_documents (+ files in Storage)
                                ├── team_messages ──► team_message_reactions
                                ├── business_memory, activity_log, insights
                                └── startup_invitations, opportunity_tracking
```

The one personal area is the Idea Lab: `business_ideas` belongs to a user, not to a business, so ideas can exist before any business does.

## 2. Tables

### Accounts and workspaces

| Table | Purpose |
| --- | --- |
| `profiles` | One row per account, created automatically by the `handle_new_user` trigger when someone signs up. Name, avatar, language, experience |
| `startups` | A business: name, country, industry, stage, budget, brand colour, owner |
| `startup_members` | Who belongs to which business, and with which role. The owner's row is created by the `add_startup_owner` trigger |
| `startup_invitations` | Pending, accepted or declined invitations, tied to an email address |
| `projects` | Projects inside a business. `metadata` (JSON) holds older module data such as tracked metrics and analytics projections |

### Content

| Table | Purpose |
| --- | --- |
| `artifacts` | Whole documents: canvases, business plan, research and analysis reports, financial model, entrepreneur profile. `module` and `kind` identify them; `content` is validated JSON |
| `artifact_versions` | Append-only version history of an artifact |
| `shared_links` | Read-only public link to one artifact, opened only through `get_shared_artifact(token)` |
| `business_ideas` | Idea Lab entries with their scores. Personal to a user |
| `validation_assumptions`, `validation_evidence` | What must be true for the business to work, and first-hand evidence for or against it |
| `milestones`, `tasks`, `task_comments` | Project execution |
| `knowledge_documents` | Metadata and extracted text of uploaded files. The files are in the `startup-documents` storage bucket |
| `insights` | Generated insights for a business |

### Conversations

| Table | Purpose |
| --- | --- |
| `conversations`, `messages` | AI interview and Copilot conversations |
| `business_memory` | Facts, goals, decisions and risks the Copilot keeps across conversations |
| `team_messages` | Team chat, per channel, with replies (`reply_to_id`) |
| `team_message_reactions` | Emoji reactions |
| `team_channel_reads` | When each person last read each channel, for unread badges |

### Catalogue and feedback

| Table | Purpose |
| --- | --- |
| `opportunities` | Curated catalogue of grants, programmes and competitions. Written only by admins; a source and a verification date are required |
| `opportunity_tracking` | Per-business bookmarks and application status |
| `user_feedback` | Feedback sent from inside the app |

### System tables (service role only)

| Table | Purpose |
| --- | --- |
| `usage_events` | One row per AI generation. Drives the burst limit and the monthly quota. Users cannot insert or delete rows |
| `ai_usage` | Token ledger per AI call: feature, model, provider, tokens, duration, outcome |
| `audit_logs` | Append-only trail of what platform admins changed |
| `activity_log` | Append-only feed of what happened in a workspace |
| `subscriptions` | Billing record. Provider columns exist; no provider is connected |
| `feature_flags` | Global feature switches, set from Admin → Features & Plans |

`ai_configurations` (per-project AI settings from the first version) is a normal member-readable table, not a system table.

## 3. Types

| Enum | Values |
| --- | --- |
| `member_role` | `owner`, `admin`, `member`, `advisor`, `viewer` |
| `startup_stage` | `idea`, `validation`, `mvp`, `early_revenue`, `growth`, `scale` |
| `project_status` | `draft`, `active`, `paused`, `archived` |
| `onboarding_status` | `not_started`, `in_progress`, `completed` |
| `invitation_status` | `pending`, `accepted`, `declined` |
| `message_role` | `user`, `assistant`, `system` |
| `document_status` | `pending`, `processing`, `ready`, `failed` |
| `insight_status` | `queued`, `processing`, `completed`, `failed` |

## 4. Access control

### Roles

| Role | Label in the app | Can |
| --- | --- | --- |
| `owner` | Owner | Everything, including deleting the business |
| `admin` | Administrator | Settings and team (not owners or other admins), plus editing |
| `member` | Editor | Create and edit workspace content |
| `advisor` | Advisor | Read everything, comment, team chat |
| `viewer` | Viewer | Read only |

### Helper functions used by the policies

| Function | Answers |
| --- | --- |
| `is_startup_member(startup_id)` | Is the caller on this team? |
| `can_edit_startup(startup_id)` | Is the caller an owner, administrator or editor? |
| `can_comment_startup(startup_id)` | Can the caller comment (everyone except viewers)? |
| `has_startup_role(startup_id, roles)` | Does the caller hold one of these roles? |
| `current_verified_email()` | The caller's email, only if it is confirmed |
| `project_belongs_to_startup(project_id, startup_id)` | Guards cross-workspace references |

### Functions the app calls directly (RPC)

| Function | Purpose |
| --- | --- |
| `accept_startup_invitation`, `decline_startup_invitation` | The only way to join a team. Checks the caller's verified email matches the invitation, and the seat limit |
| `get_invitation_preview`, `get_my_pending_invitations` | Show an invitation before the person is a member |
| `get_startup_team` | Team list with profile details |
| `get_shared_artifact(token)` | Read a shared business plan without signing in |
| `get_team_unread_counts` | Unread badges for team chat |

### Triggers that protect invariants

RLS decides *who* may write a row; these triggers enforce rules about *what* may be written.

| Trigger function | Rule |
| --- | --- |
| `protect_startup_identity` | A business's owner cannot be changed through the API |
| `protect_membership_identity` | A membership cannot be moved to another user or business; the owner's row cannot be demoted or removed |
| `protect_artifact_identity` | An artifact can never change workspace |
| `guard_task`, `guard_milestone` | A task cannot point at another workspace's project or milestone; an assignee must be on the team |
| `guard_team_message_reply` | A reply must point at a message in the same channel |
| `protect_team_message` | A message's business, project, author and creation time can never change; editing the text stamps `edited_at` |
| `set_updated_at` | Keeps `updated_at` current |

### Storage

Uploaded documents go to the private bucket `startup-documents` (25 MB limit per file). The object path must start with the business id, for example `<startup-id>/pitch-deck.pdf`; the storage policies use that first segment to check membership.

### Realtime

`team_messages` and `team_message_reactions` are added to the `supabase_realtime` publication by the migrations, so team chat updates live. Realtime respects the same RLS policies.

### The service role

`SUPABASE_SERVICE_ROLE_KEY` bypasses all of the above. It is used only in server code, through `getSupabaseAdmin()` in `src/lib/supabase/admin.ts`, for: quota bookkeeping (`usage_events`, `ai_usage`), the admin portal (after `requireAdminClient()`), the audit trail, and reading another account's plan. Never import that file from a client component.

## 5. Migrations

| File | Adds |
| --- | --- |
| `20260720120000_initial_schema.sql` | Profiles, startups, memberships, projects, AI configuration, documents and storage, conversations, insights, usage events, RLS |
| `20260907000000_user_feedback.sql` | `user_feedback` |
| `20261114000000_team_collaboration_and_hardening.sql` | Invitations, team chat, stricter membership rules |
| `20261115000000_viewer_role.sql` | The `viewer` role. Separate because a new enum value cannot be used in the transaction that adds it |
| `20261115000100_anza_v2_platform.sql` | The Anza 2.0 tables: ideas, artifacts, validation, tasks, memory, opportunities, activity, AI usage, subscriptions, feature flags, audit |
| `20261116000000_startup_brand_color.sql` | `startups.primary_color` |
| `20261117000000_team_chat_upgrade.sql` | Replies, reactions, unread tracking, read-only chat for viewers |

### Applying migrations

```bash
npx supabase link --project-ref <project-ref>
npx supabase db push
```

### Changing the schema

1. Create a new file in `supabase/migrations/` named `YYYYMMDDHHMMSS_short_description.sql`. Never edit a migration that has already been applied anywhere.
2. Write it so it can run twice without failing: `create table if not exists`, `add column if not exists`, `create or replace function`, `drop policy if exists` before `create policy`.
3. Enable RLS on every new table and write its policies in the same migration. A table without RLS is readable by anyone with the public key.
4. Update the TypeScript types in `src/lib/database.types.ts` or `database.v2.types.ts`.
5. Add checks for the new table to `supabase/tests/rls_isolation.sql`.
6. Apply it to a disposable database and run `npm run test:db`.
7. Apply to the development project, then to production as part of the release ([DEPLOYMENT.md](DEPLOYMENT.md)).

Prefer additive changes (new tables, new nullable columns). To remove or rename a column, do it in two releases: first stop using it in code, then drop it.

## 6. Testing the security rules

`supabase/tests/rls_isolation.sql` creates two businesses and users in every role, then checks what each one can and cannot read or write, including an outsider and an anonymous visitor. It rolls back everything it creates.

```bash
DATABASE_URL=postgres://... npm run test:db
```

Run it only against a **disposable** database with all migrations applied. Never point it at production.

## 7. Backups and recovery

Backups are a Supabase project setting, not something in this repository. See [OPERATIONS.md](OPERATIONS.md).
