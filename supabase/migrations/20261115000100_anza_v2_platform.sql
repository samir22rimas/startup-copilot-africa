-- Anza 2.0 platform schema.
--
-- Additive and safe to run more than once. Nothing is dropped; the legacy
-- JSON task list in projects.metadata is copied into public.tasks and left in
-- place.
--
-- Access model (enforced here, mirrored in src/lib/permissions.ts):
--   owner, admin  -> manage the workspace and edit everything
--   member        -> "Editor": create and edit workspace content
--   advisor       -> read everything, comment and chat
--   viewer        -> read only
--
-- Apply with: supabase db push

-- ---------------------------------------------------------------------------
-- 1. Role helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_edit_startup(target_startup_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.startup_members
    where startup_id = target_startup_id
      and user_id = auth.uid()
      and role::text in ('owner', 'admin', 'member')
  );
$$;

create or replace function public.can_comment_startup(target_startup_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.startup_members
    where startup_id = target_startup_id
      and user_id = auth.uid()
      and role::text in ('owner', 'admin', 'member', 'advisor')
  );
$$;

revoke execute on function public.can_edit_startup(uuid) from public, anon;
revoke execute on function public.can_comment_startup(uuid) from public, anon;
grant execute on function public.can_edit_startup(uuid) to authenticated, service_role;
grant execute on function public.can_comment_startup(uuid) to authenticated, service_role;

-- Administrators manage editors, advisors and viewers (never owners or other
-- administrators). Same rules as before, extended to the viewer role.
drop policy if exists "Owners and admins can change member roles" on public.startup_members;
create policy "Owners and admins can change member roles" on public.startup_members
  for update
  using (
    role <> 'owner'
    and user_id <> auth.uid()
    and (
      public.has_startup_role(startup_id, array['owner']::public.member_role[])
      or (
        public.has_startup_role(startup_id, array['admin']::public.member_role[])
        and role::text in ('member', 'advisor', 'viewer')
      )
    )
  )
  with check (
    role <> 'owner'
    and (
      public.has_startup_role(startup_id, array['owner']::public.member_role[])
      or (
        public.has_startup_role(startup_id, array['admin']::public.member_role[])
        and role::text in ('member', 'advisor', 'viewer')
      )
    )
  );

drop policy if exists "Members can leave or be removed" on public.startup_members;
create policy "Members can leave or be removed" on public.startup_members
  for delete
  using (
    role <> 'owner'
    and (
      user_id = auth.uid()
      or public.has_startup_role(startup_id, array['owner']::public.member_role[])
      or (
        public.has_startup_role(startup_id, array['admin']::public.member_role[])
        and role::text in ('member', 'advisor', 'viewer')
      )
    )
  );

drop policy if exists "Admins can create invitations" on public.startup_invitations;
create policy "Admins can create invitations" on public.startup_invitations
  for insert with check (
    invited_by = auth.uid()
    and status = 'pending'
    and accepted_by is null
    and responded_at is null
    and expires_at <= now() + interval '31 days'
    and (
      public.has_startup_role(startup_id, array['owner']::public.member_role[])
      or (
        public.has_startup_role(startup_id, array['admin']::public.member_role[])
        and role::text in ('member', 'advisor', 'viewer')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Profile and business profile
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists preferred_language text not null default 'en',
  add column if not exists experience_level text,
  add column if not exists entrepreneur_profile jsonb not null default '{}'::jsonb,
  add column if not exists onboarded_at timestamptz;

do $$ begin
  alter table public.profiles add constraint profiles_preferred_language_check
    check (preferred_language in ('en', 'fr'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles add constraint profiles_experience_level_check
    check (experience_level is null or experience_level in ('first_time', 'some_experience', 'experienced', 'serial'));
exception when duplicate_object then null; end $$;

alter table public.startups
  add column if not exists objectives jsonb not null default '[]'::jsonb,
  add column if not exists business_profile jsonb not null default '{}'::jsonb;

-- Conversations: keep the onboarding interview apart from Copilot chats, and
-- remember which specialist mode a Copilot chat uses.
alter table public.conversations
  add column if not exists kind text not null default 'copilot',
  add column if not exists mode text not null default 'advisor';

do $$ begin
  alter table public.conversations add constraint conversations_kind_check
    check (kind in ('copilot', 'interview'));
exception when duplicate_object then null; end $$;

update public.conversations
set kind = 'interview'
where kind = 'copilot' and title like 'AI Business Interview:%';

create index if not exists conversations_project_kind_idx
  on public.conversations(project_id, kind, created_at desc);

-- Documents: folders, and spreadsheet uploads.
alter table public.knowledge_documents
  add column if not exists folder text check (folder is null or char_length(folder) between 1 and 80);

create index if not exists knowledge_documents_startup_folder_idx
  on public.knowledge_documents(startup_id, folder);

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
where id = 'startup-documents';

-- ---------------------------------------------------------------------------
-- 3. Tighten legacy write policies so read-only roles really are read-only
-- ---------------------------------------------------------------------------

drop policy if exists "Members can create projects" on public.projects;
create policy "Members can create projects" on public.projects
  for insert with check (created_by = auth.uid() and public.can_edit_startup(startup_id));

drop policy if exists "Members can update projects" on public.projects;
create policy "Members can update projects" on public.projects
  for update using (public.can_edit_startup(startup_id)) with check (public.can_edit_startup(startup_id));

drop policy if exists "Members can add documents" on public.knowledge_documents;
create policy "Members can add documents" on public.knowledge_documents
  for insert with check (uploaded_by = auth.uid() and public.can_edit_startup(startup_id));

drop policy if exists "Uploaders and admins can update documents" on public.knowledge_documents;
create policy "Uploaders and admins can update documents" on public.knowledge_documents
  for update
  using (
    (uploaded_by = auth.uid() and public.can_edit_startup(startup_id))
    or public.has_startup_role(startup_id, array['owner', 'admin']::public.member_role[])
  )
  with check (public.can_edit_startup(startup_id));

drop policy if exists "Uploaders and admins can delete documents" on public.knowledge_documents;
create policy "Uploaders and admins can delete documents" on public.knowledge_documents
  for delete using (
    (uploaded_by = auth.uid() and public.can_edit_startup(startup_id))
    or public.has_startup_role(startup_id, array['owner', 'admin']::public.member_role[])
  );

drop policy if exists "Members can update insights" on public.insights;
create policy "Members can update insights" on public.insights
  for update using (public.can_edit_startup(startup_id)) with check (public.can_edit_startup(startup_id));

drop policy if exists "Members can request insights" on public.insights;
create policy "Members can request insights" on public.insights
  for insert with check (requested_by = auth.uid() and public.can_edit_startup(startup_id));

drop policy if exists "Members can upload startup documents" on storage.objects;
create policy "Members can upload startup documents" on storage.objects for insert with check (
  bucket_id = 'startup-documents' and public.can_edit_startup((storage.foldername(name))[1]::uuid)
);

drop policy if exists "Members can delete startup documents" on storage.objects;
create policy "Members can delete startup documents" on storage.objects for delete using (
  bucket_id = 'startup-documents' and public.can_edit_startup((storage.foldername(name))[1]::uuid)
);

-- ---------------------------------------------------------------------------
-- 4. Idea Lab (private to the person exploring ideas)
-- ---------------------------------------------------------------------------

create table if not exists public.business_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 160),
  summary text not null default '' check (char_length(summary) <= 2000),
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  industry text,
  -- What the founder told us (skills, interests, budget, local problem...).
  inputs jsonb not null default '{}'::jsonb,
  -- AI analysis: customer segments, risks, capital estimate, assumptions.
  analysis jsonb not null default '{}'::jsonb,
  -- Per-criterion ratings (1-5) with reasons; the total is computed in code.
  criteria jsonb not null default '{}'::jsonb,
  score numeric(5, 1) check (score is null or (score >= 0 and score <= 100)),
  status text not null default 'saved' check (status in ('saved', 'archived', 'converted')),
  startup_id uuid references public.startups(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_ideas_user_idx on public.business_ideas(user_id, created_at desc);

alter table public.business_ideas enable row level security;

drop policy if exists "Owners manage their ideas" on public.business_ideas;
create policy "Owners manage their ideas" on public.business_ideas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop trigger if exists business_ideas_updated_at on public.business_ideas;
create trigger business_ideas_updated_at before update on public.business_ideas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Workspace artifacts (canvases, plans, research, analyses, models) + history
-- ---------------------------------------------------------------------------

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  module text not null check (module in (
    'validation', 'research', 'model', 'plan', 'finance', 'marketing', 'report', 'onboarding'
  )),
  kind text not null check (char_length(kind) between 1 and 60),
  title text not null check (char_length(trim(title)) between 1 and 200),
  content jsonb not null default '{}'::jsonb,
  -- Provenance: language, model, whether web sources were retrieved, etc.
  meta jsonb not null default '{}'::jsonb,
  current_version integer not null default 1 check (current_version >= 1),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artifacts_content_size check (pg_column_size(content) <= 1048576)
);

create index if not exists artifacts_startup_module_idx
  on public.artifacts(startup_id, module, kind, updated_at desc);

create table if not exists public.artifact_versions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  startup_id uuid not null references public.startups(id) on delete cascade,
  version integer not null check (version >= 1),
  title text not null,
  content jsonb not null,
  note text check (note is null or char_length(note) <= 300),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (artifact_id, version)
);

create index if not exists artifact_versions_artifact_idx
  on public.artifact_versions(artifact_id, version desc);

alter table public.artifacts enable row level security;
alter table public.artifact_versions enable row level security;

drop policy if exists "Members can view artifacts" on public.artifacts;
create policy "Members can view artifacts" on public.artifacts
  for select using (public.is_startup_member(startup_id));

drop policy if exists "Editors can create artifacts" on public.artifacts;
create policy "Editors can create artifacts" on public.artifacts
  for insert with check (
    created_by = auth.uid()
    and public.can_edit_startup(startup_id)
    and (project_id is null or public.project_belongs_to_startup(project_id, startup_id))
  );

drop policy if exists "Editors can update artifacts" on public.artifacts;
create policy "Editors can update artifacts" on public.artifacts
  for update using (public.can_edit_startup(startup_id))
  with check (
    public.can_edit_startup(startup_id)
    and (project_id is null or public.project_belongs_to_startup(project_id, startup_id))
  );

drop policy if exists "Editors can delete artifacts" on public.artifacts;
create policy "Editors can delete artifacts" on public.artifacts
  for delete using (public.can_edit_startup(startup_id));

drop policy if exists "Members can view artifact versions" on public.artifact_versions;
create policy "Members can view artifact versions" on public.artifact_versions
  for select using (public.is_startup_member(startup_id));

-- History is append-only: no update or delete policy.
drop policy if exists "Editors can record artifact versions" on public.artifact_versions;
create policy "Editors can record artifact versions" on public.artifact_versions
  for insert with check (
    created_by = auth.uid()
    and public.can_edit_startup(startup_id)
    and exists (
      select 1 from public.artifacts a
      where a.id = artifact_id and a.startup_id = artifact_versions.startup_id
    )
  );

-- An artifact can never move to another workspace.
create or replace function public.protect_artifact_identity()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.id is distinct from old.id or new.startup_id is distinct from old.startup_id then
    raise exception 'artifact_identity_is_immutable' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists artifacts_protect on public.artifacts;
create trigger artifacts_protect before update on public.artifacts
  for each row execute function public.protect_artifact_identity();

-- Read-only public sharing of a single artifact (e.g. a business plan).
create table if not exists public.shared_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique check (char_length(token) >= 32),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  startup_id uuid not null references public.startups(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shared_links_artifact_idx on public.shared_links(artifact_id);

alter table public.shared_links enable row level security;

drop policy if exists "Members can view share links" on public.shared_links;
create policy "Members can view share links" on public.shared_links
  for select using (public.is_startup_member(startup_id));

drop policy if exists "Editors can create share links" on public.shared_links;
create policy "Editors can create share links" on public.shared_links
  for insert with check (
    created_by = auth.uid()
    and public.can_edit_startup(startup_id)
    and expires_at <= now() + interval '91 days'
    and exists (
      select 1 from public.artifacts a
      where a.id = artifact_id and a.startup_id = shared_links.startup_id
    )
  );

drop policy if exists "Editors can revoke share links" on public.shared_links;
create policy "Editors can revoke share links" on public.shared_links
  for update using (public.can_edit_startup(startup_id)) with check (public.can_edit_startup(startup_id));

drop policy if exists "Editors can delete share links" on public.shared_links;
create policy "Editors can delete share links" on public.shared_links
  for delete using (public.can_edit_startup(startup_id));

-- The only way an anonymous visitor reads shared content: by unguessable token.
create or replace function public.get_shared_artifact(share_token text)
returns table (
  title text,
  module text,
  kind text,
  content jsonb,
  startup_name text,
  updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select a.title, a.module, a.kind, a.content, s.name, a.updated_at
  from public.shared_links l
  join public.artifacts a on a.id = l.artifact_id
  join public.startups s on s.id = a.startup_id
  where l.token = share_token
    and l.revoked_at is null
    and l.expires_at > now()
    and a.archived_at is null;
$$;

grant execute on function public.get_shared_artifact(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Validation: assumptions and the evidence for or against them
-- ---------------------------------------------------------------------------

create table if not exists public.validation_assumptions (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  statement text not null check (char_length(trim(statement)) between 3 and 500),
  category text not null default 'other' check (category in (
    'problem', 'customer', 'solution', 'price', 'channel', 'market', 'other'
  )),
  status text not null default 'untested' check (status in ('untested', 'testing', 'validated', 'invalidated')),
  importance smallint not null default 2 check (importance between 1 and 3),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists validation_assumptions_startup_idx
  on public.validation_assumptions(startup_id, created_at desc);

create table if not exists public.validation_evidence (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  assumption_id uuid references public.validation_assumptions(id) on delete set null,
  kind text not null check (kind in ('interview', 'survey', 'feedback', 'competitor', 'experiment')),
  title text not null check (char_length(trim(title)) between 2 and 200),
  notes text not null default '' check (char_length(notes) <= 8000),
  -- Structured extras: respondent count, price mentioned, competitor URL...
  details jsonb not null default '{}'::jsonb,
  stance text not null default 'neutral' check (stance in ('supports', 'contradicts', 'neutral')),
  occurred_on date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists validation_evidence_startup_idx
  on public.validation_evidence(startup_id, created_at desc);
create index if not exists validation_evidence_assumption_idx
  on public.validation_evidence(assumption_id) where assumption_id is not null;

alter table public.validation_assumptions enable row level security;
alter table public.validation_evidence enable row level security;

drop policy if exists "Members can view assumptions" on public.validation_assumptions;
create policy "Members can view assumptions" on public.validation_assumptions
  for select using (public.is_startup_member(startup_id));
drop policy if exists "Editors can add assumptions" on public.validation_assumptions;
create policy "Editors can add assumptions" on public.validation_assumptions
  for insert with check (created_by = auth.uid() and public.can_edit_startup(startup_id));
drop policy if exists "Editors can update assumptions" on public.validation_assumptions;
create policy "Editors can update assumptions" on public.validation_assumptions
  for update using (public.can_edit_startup(startup_id)) with check (public.can_edit_startup(startup_id));
drop policy if exists "Editors can delete assumptions" on public.validation_assumptions;
create policy "Editors can delete assumptions" on public.validation_assumptions
  for delete using (public.can_edit_startup(startup_id));

drop policy if exists "Members can view evidence" on public.validation_evidence;
create policy "Members can view evidence" on public.validation_evidence
  for select using (public.is_startup_member(startup_id));
drop policy if exists "Editors can add evidence" on public.validation_evidence;
create policy "Editors can add evidence" on public.validation_evidence
  for insert with check (
    created_by = auth.uid()
    and public.can_edit_startup(startup_id)
    and (
      assumption_id is null
      or exists (
        select 1 from public.validation_assumptions a
        where a.id = assumption_id and a.startup_id = validation_evidence.startup_id
      )
    )
  );
drop policy if exists "Editors can update evidence" on public.validation_evidence;
create policy "Editors can update evidence" on public.validation_evidence
  for update using (public.can_edit_startup(startup_id))
  with check (
    public.can_edit_startup(startup_id)
    and (
      assumption_id is null
      or exists (
        select 1 from public.validation_assumptions a
        where a.id = assumption_id and a.startup_id = validation_evidence.startup_id
      )
    )
  );
drop policy if exists "Editors can delete evidence" on public.validation_evidence;
create policy "Editors can delete evidence" on public.validation_evidence
  for delete using (public.can_edit_startup(startup_id));

drop trigger if exists validation_assumptions_updated_at on public.validation_assumptions;
create trigger validation_assumptions_updated_at before update on public.validation_assumptions
  for each row execute function public.set_updated_at();
drop trigger if exists validation_evidence_updated_at on public.validation_evidence;
create trigger validation_evidence_updated_at before update on public.validation_evidence
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Execution: milestones, tasks, comments
-- ---------------------------------------------------------------------------

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 200),
  description text not null default '' check (char_length(description) <= 2000),
  due_date date,
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'done', 'cancelled')),
  position integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists milestones_project_idx on public.milestones(project_id, position);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text not null default '' check (char_length(description) <= 4000),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  tag text check (tag is null or char_length(tag) <= 30),
  assignee_id uuid references public.profiles(id) on delete set null,
  due_date date,
  blocked_reason text check (blocked_reason is null or char_length(blocked_reason) <= 500),
  position double precision not null default 0,
  source text not null default 'manual' check (source in ('manual', 'ai', 'copilot', 'legacy')),
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_project_status_idx on public.tasks(project_id, status, position);
create index if not exists tasks_startup_assignee_idx on public.tasks(startup_id, assignee_id) where assignee_id is not null;
create index if not exists tasks_startup_due_idx on public.tasks(startup_id, due_date) where due_date is not null;
create index if not exists tasks_milestone_idx on public.tasks(milestone_id) where milestone_id is not null;

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  startup_id uuid not null references public.startups(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_idx on public.task_comments(task_id, created_at);

alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;

-- Tasks and milestones must stay inside one workspace, assignees must be on
-- the team, and completion time follows the status.
create or replace function public.guard_task()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.projects p where p.id = new.project_id and p.startup_id = new.startup_id) then
    raise exception 'task_project_mismatch' using errcode = '42501';
  end if;
  if new.milestone_id is not null and not exists (
    select 1 from public.milestones m where m.id = new.milestone_id and m.project_id = new.project_id
  ) then
    raise exception 'task_milestone_mismatch' using errcode = '42501';
  end if;
  if new.assignee_id is not null and not exists (
    select 1 from public.startup_members sm where sm.startup_id = new.startup_id and sm.user_id = new.assignee_id
  ) then
    raise exception 'task_assignee_not_on_team' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.startup_id is distinct from old.startup_id then
    raise exception 'task_identity_is_immutable' using errcode = '42501';
  end if;

  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status is distinct from 'done' then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
  else
    new.completed_at := null;
  end if;
  if new.status <> 'blocked' then
    new.blocked_reason := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tasks_guard on public.tasks;
create trigger tasks_guard before insert or update on public.tasks
  for each row execute function public.guard_task();

create or replace function public.guard_milestone()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.projects p where p.id = new.project_id and p.startup_id = new.startup_id) then
    raise exception 'milestone_project_mismatch' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (new.startup_id is distinct from old.startup_id or new.project_id is distinct from old.project_id) then
    raise exception 'milestone_identity_is_immutable' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists milestones_guard on public.milestones;
create trigger milestones_guard before insert or update on public.milestones
  for each row execute function public.guard_milestone();

drop policy if exists "Members can view milestones" on public.milestones;
create policy "Members can view milestones" on public.milestones
  for select using (public.is_startup_member(startup_id));
drop policy if exists "Editors can add milestones" on public.milestones;
create policy "Editors can add milestones" on public.milestones
  for insert with check (created_by = auth.uid() and public.can_edit_startup(startup_id));
drop policy if exists "Editors can update milestones" on public.milestones;
create policy "Editors can update milestones" on public.milestones
  for update using (public.can_edit_startup(startup_id)) with check (public.can_edit_startup(startup_id));
drop policy if exists "Editors can delete milestones" on public.milestones;
create policy "Editors can delete milestones" on public.milestones
  for delete using (public.can_edit_startup(startup_id));

drop policy if exists "Members can view tasks" on public.tasks;
create policy "Members can view tasks" on public.tasks
  for select using (public.is_startup_member(startup_id));
drop policy if exists "Editors can add tasks" on public.tasks;
create policy "Editors can add tasks" on public.tasks
  for insert with check (created_by = auth.uid() and public.can_edit_startup(startup_id));
drop policy if exists "Editors can update tasks" on public.tasks;
create policy "Editors can update tasks" on public.tasks
  for update using (public.can_edit_startup(startup_id)) with check (public.can_edit_startup(startup_id));
drop policy if exists "Editors can delete tasks" on public.tasks;
create policy "Editors can delete tasks" on public.tasks
  for delete using (public.can_edit_startup(startup_id));

drop policy if exists "Members can view task comments" on public.task_comments;
create policy "Members can view task comments" on public.task_comments
  for select using (public.is_startup_member(startup_id));
drop policy if exists "Commenters can add task comments" on public.task_comments;
create policy "Commenters can add task comments" on public.task_comments
  for insert with check (
    author_id = auth.uid()
    and public.can_comment_startup(startup_id)
    and exists (
      select 1 from public.tasks t where t.id = task_id and t.startup_id = task_comments.startup_id
    )
  );
drop policy if exists "Authors and admins can delete task comments" on public.task_comments;
create policy "Authors and admins can delete task comments" on public.task_comments
  for delete using (
    (author_id = auth.uid() and public.is_startup_member(startup_id))
    or public.has_startup_role(startup_id, array['owner', 'admin']::public.member_role[])
  );

-- Copy the legacy JSON milestone list into real tasks, once per project.
insert into public.tasks (
  startup_id, project_id, title, tag, status, assignee_id, due_date, source, position, created_by
)
select
  p.startup_id,
  p.id,
  left(trim(item.value ->> 'title'), 200),
  nullif(left(trim(coalesce(item.value ->> 'tag', '')), 30), ''),
  case when item.value ->> 'done' = 'true' then 'done' else 'todo' end,
  (
    select sm.user_id from public.startup_members sm
    where sm.startup_id = p.startup_id and sm.user_id::text = item.value ->> 'assigneeId'
  ),
  case
    when item.value ->> 'dueDate' ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$'
      and (item.value ->> 'dueDate') not in ('', 'null')
      and (item.value ->> 'dueDate') !~ '-(02-(30|31)|(04|06|09|11)-31)$'
      and not ((item.value ->> 'dueDate') ~ '-02-29$' and (left(item.value ->> 'dueDate', 4)::int % 4) <> 0)
    then (item.value ->> 'dueDate')::date
  end,
  'legacy',
  item.ordinality,
  p.created_by
from public.projects p
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(p.metadata -> 'tasks') = 'array' then p.metadata -> 'tasks' else '[]'::jsonb end
) with ordinality as item(value, ordinality)
where jsonb_typeof(item.value) = 'object'
  and char_length(trim(coalesce(item.value ->> 'title', ''))) >= 1
  and coalesce(item.value ->> 'id', '') not in ('placeholder_1', 'rate_limited')
  and not exists (
    select 1 from public.tasks t where t.project_id = p.id and t.source = 'legacy'
  );

-- ---------------------------------------------------------------------------
-- 8. Copilot memory (per workspace)
-- ---------------------------------------------------------------------------

create table if not exists public.business_memory (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  kind text not null check (kind in ('fact', 'decision', 'goal', 'preference', 'risk')),
  content text not null check (char_length(trim(content)) between 3 and 1000),
  -- For decisions: why it was made.
  rationale text check (rationale is null or char_length(rationale) <= 1000),
  source text not null default 'user' check (source in ('user', 'copilot')),
  pinned boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_memory_startup_idx
  on public.business_memory(startup_id, created_at desc) where archived_at is null;

alter table public.business_memory enable row level security;

drop policy if exists "Members can view memory" on public.business_memory;
create policy "Members can view memory" on public.business_memory
  for select using (public.is_startup_member(startup_id));
drop policy if exists "Editors can add memory" on public.business_memory;
create policy "Editors can add memory" on public.business_memory
  for insert with check (created_by = auth.uid() and public.can_edit_startup(startup_id));
drop policy if exists "Editors can update memory" on public.business_memory;
create policy "Editors can update memory" on public.business_memory
  for update using (public.can_edit_startup(startup_id)) with check (public.can_edit_startup(startup_id));
drop policy if exists "Editors can delete memory" on public.business_memory;
create policy "Editors can delete memory" on public.business_memory
  for delete using (public.can_edit_startup(startup_id));

drop trigger if exists business_memory_updated_at on public.business_memory;
create trigger business_memory_updated_at before update on public.business_memory
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. Opportunities: a curated, verified catalogue + per-workspace tracking
-- ---------------------------------------------------------------------------

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 200),
  organization text not null check (char_length(trim(organization)) between 2 and 200),
  type text not null check (type in (
    'competition', 'incubator', 'accelerator', 'grant', 'scholarship',
    'funding_program', 'mentorship', 'event', 'challenge'
  )),
  description text not null default '' check (char_length(description) <= 4000),
  -- ISO country codes; an empty array means open across Africa.
  countries text[] not null default '{}',
  industries text[] not null default '{}',
  stages text[] not null default '{}',
  funding_type text not null default 'non_financial' check (funding_type in (
    'grant', 'equity', 'debt', 'prize', 'non_financial', 'mixed'
  )),
  amount_text text check (amount_text is null or char_length(amount_text) <= 120),
  eligibility text not null default '' check (char_length(eligibility) <= 2000),
  deadline date,
  is_rolling boolean not null default false,
  -- Every listing must point at the organiser's own page and say when it was checked.
  source_url text not null check (source_url ~ '^https://' and char_length(source_url) <= 500),
  source_name text,
  last_verified_at date not null,
  verified_by uuid references public.profiles(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opportunities_status_deadline_idx on public.opportunities(status, deadline);
create index if not exists opportunities_countries_idx on public.opportunities using gin (countries);

alter table public.opportunities enable row level security;

-- Signed-in users read published listings. Only the service role (admin
-- portal, after a server-side admin check) can write.
drop policy if exists "Signed-in users can view published opportunities" on public.opportunities;
create policy "Signed-in users can view published opportunities" on public.opportunities
  for select to authenticated using (status = 'published');

drop trigger if exists opportunities_updated_at on public.opportunities;
create trigger opportunities_updated_at before update on public.opportunities
  for each row execute function public.set_updated_at();

create table if not exists public.opportunity_tracking (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  bookmarked boolean not null default true,
  application_status text not null default 'none' check (application_status in (
    'none', 'preparing', 'submitted', 'accepted', 'rejected'
  )),
  notes text not null default '' check (char_length(notes) <= 2000),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (startup_id, opportunity_id)
);

alter table public.opportunity_tracking enable row level security;

drop policy if exists "Members can view opportunity tracking" on public.opportunity_tracking;
create policy "Members can view opportunity tracking" on public.opportunity_tracking
  for select using (public.is_startup_member(startup_id));
drop policy if exists "Editors can track opportunities" on public.opportunity_tracking;
create policy "Editors can track opportunities" on public.opportunity_tracking
  for insert with check (public.can_edit_startup(startup_id));
drop policy if exists "Editors can update opportunity tracking" on public.opportunity_tracking;
create policy "Editors can update opportunity tracking" on public.opportunity_tracking
  for update using (public.can_edit_startup(startup_id)) with check (public.can_edit_startup(startup_id));
drop policy if exists "Editors can delete opportunity tracking" on public.opportunity_tracking;
create policy "Editors can delete opportunity tracking" on public.opportunity_tracking
  for delete using (public.can_edit_startup(startup_id));

drop trigger if exists opportunity_tracking_updated_at on public.opportunity_tracking;
create trigger opportunity_tracking_updated_at before update on public.opportunity_tracking
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. Activity log (per workspace, append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  startup_id uuid not null references public.startups(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(action) between 2 and 60),
  entity_type text not null check (char_length(entity_type) between 2 and 40),
  entity_id text,
  summary text not null check (char_length(summary) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists activity_log_startup_idx on public.activity_log(startup_id, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "Members can view activity" on public.activity_log;
create policy "Members can view activity" on public.activity_log
  for select using (public.is_startup_member(startup_id));

drop policy if exists "Members can record their activity" on public.activity_log;
create policy "Members can record their activity" on public.activity_log
  for insert with check (actor_id = auth.uid() and public.is_startup_member(startup_id));

-- ---------------------------------------------------------------------------
-- 11. Platform: AI usage, subscriptions, feature flags, admin audit trail
-- ---------------------------------------------------------------------------

create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  startup_id uuid references public.startups(id) on delete set null,
  feature text not null,
  provider text not null,
  model text not null,
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  -- False when the provider did not report usage and the figures are estimates.
  tokens_reported boolean not null default true,
  success boolean not null default true,
  error text check (error is null or char_length(error) <= 500),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_created_idx on public.ai_usage(created_at desc);
create index if not exists ai_usage_user_idx on public.ai_usage(user_id, created_at desc);
create index if not exists ai_usage_startup_idx on public.ai_usage(startup_id, created_at desc);

-- Service role only: no policies.
alter table public.ai_usage enable row level security;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro', 'team')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  -- Filled in when a payment provider is connected; null means set by an admin.
  provider text,
  provider_customer_ref text,
  provider_subscription_ref text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can view their subscription" on public.subscriptions;
create policy "Users can view their subscription" on public.subscriptions
  for select using (user_id = auth.uid());

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table if not exists public.feature_flags (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,59}$'),
  description text not null default '',
  enabled boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;

drop policy if exists "Signed-in users can read feature flags" on public.feature_flags;
create policy "Signed-in users can read feature flags" on public.feature_flags
  for select to authenticated using (true);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

-- Service role only: no policies.
alter table public.audit_logs enable row level security;

-- ---------------------------------------------------------------------------
-- 12. Table privileges
-- ---------------------------------------------------------------------------
-- Row-level security decides which rows; these grants decide which tables the
-- API roles may touch at all.

grant select, insert, update, delete on
  public.business_ideas,
  public.artifacts,
  public.shared_links,
  public.validation_assumptions,
  public.validation_evidence,
  public.milestones,
  public.tasks,
  public.business_memory,
  public.opportunity_tracking
to authenticated;

grant select, insert on public.artifact_versions, public.activity_log to authenticated;
grant select, insert, delete on public.task_comments to authenticated;
grant select on public.opportunities, public.subscriptions, public.feature_flags to authenticated;

revoke all on public.ai_usage, public.audit_logs from anon, authenticated;
revoke all on
  public.business_ideas, public.artifacts, public.artifact_versions, public.shared_links,
  public.validation_assumptions, public.validation_evidence, public.milestones, public.tasks,
  public.task_comments, public.business_memory, public.opportunities, public.opportunity_tracking,
  public.activity_log, public.subscriptions, public.feature_flags
from anon;

grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant usage on sequence public.activity_log_id_seq to authenticated;
