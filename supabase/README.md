# Database setup

This directory contains the source-controlled Supabase schema for Startup Copilot Africa.

## Apply the schema

1. Link this repository to the intended Supabase project: `supabase link --project-ref <project-ref>`.
2. Apply migrations: `supabase db push`.
3. In Supabase Auth, configure the Site URL and redirect URLs for your local and production app.

The initial migration creates profiles from `auth.users`, startups and team memberships, projects, AI configuration, private knowledge-document storage, conversations/messages, insights, usage events, indexes, and row-level-security policies.

Document object paths must start with the startup UUID, for example: `<startup-id>/pitch-deck.pdf`. The storage policies use that first path segment to enforce membership.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code. It is only for trusted server-side workers that create assistant messages, process documents, or write usage events.
