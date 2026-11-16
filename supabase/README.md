# Database setup

This directory contains the source-controlled Supabase schema for Anza.

## Apply the schema

1. Link this repository to the intended Supabase project: `supabase link --project-ref <project-ref>`.
2. Apply migrations: `supabase db push`.
3. In Supabase Auth, configure the Site URL and redirect URLs for your local and production app.

The initial migration creates profiles from `auth.users`, startups and team memberships, projects, AI configuration, private knowledge-document storage, conversations/messages, insights, usage events, indexes, and row-level-security policies.

The `team_collaboration_and_hardening` migration adds team invitations (`startup_invitations`), real-time team chat (`team_messages`), and tightens membership rules: people can only join a startup by accepting an invitation sent to their verified email, the owner's membership and the startup's ownership are immutable through the API, and co-founder admins can only manage members and advisors. It is safe to run more than once.

In Supabase Auth keep **Confirm email** enabled — invitations and the admin allowlist both rely on verified email addresses. Add `https://<your-domain>/auth/callback**` to the allowed redirect URLs so sign-up links can return people to their invitation.

Plan tiers are stored in `auth.users.raw_app_meta_data ->> 'plan_tier'` (set from the admin portal). Tiers previously written to user metadata are ignored, because users can edit that themselves; re-assign them from `/admin/users`.

Document object paths must start with the startup UUID, for example: `<startup-id>/pitch-deck.pdf`. The storage policies use that first path segment to enforce membership.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code. It is only for trusted server-side workers that create assistant messages, process documents, or write usage events.
