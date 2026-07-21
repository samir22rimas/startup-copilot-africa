-- Startup Copilot Africa: initial production schema
-- Apply with: supabase db push (or paste into the Supabase SQL Editor once).

create extension if not exists "pgcrypto";

create type public.member_role as enum ('owner', 'admin', 'member', 'advisor');
create type public.startup_stage as enum ('idea', 'validation', 'mvp', 'early_revenue', 'growth', 'scale');
create type public.onboarding_status as enum ('not_started', 'in_progress', 'completed');
create type public.project_status as enum ('draft', 'active', 'paused', 'archived');
create type public.message_role as enum ('user', 'assistant', 'system');
create type public.document_status as enum ('pending', 'processing', 'ready', 'failed');
create type public.insight_status as enum ('queued', 'processing', 'completed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  city text,
  timezone text not null default 'Africa/Casablanca',
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.startups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  city text,
  industry text,
  stage public.startup_stage not null default 'idea',
  estimated_budget_cents bigint check (estimated_budget_cents is null or estimated_budget_cents >= 0),
  budget_currency char(3) not null default 'USD' check (budget_currency ~ '^[A-Z]{3}$'),
  website_url text,
  description text,
  onboarding_status public.onboarding_status not null default 'not_started',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint startups_onboarding_completed_check check (
    (onboarding_status = 'completed' and onboarding_completed_at is not null)
    or onboarding_status <> 'completed'
  )
);

create table public.startup_members (
  startup_id uuid not null references public.startups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  invited_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (startup_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text,
  target_audience text,
  status public.project_status not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_configurations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  primary_use_case text not null,
  tone_of_voice text not null,
  model text,
  system_instructions text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  status public.document_status not null default 'pending',
  extracted_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  role public.message_role not null,
  content text not null,
  model text,
  token_count integer check (token_count is null or token_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint messages_author_matches_role check (
    (role = 'assistant' and author_id is null) or (role <> 'assistant')
  )
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  kind text not null,
  title text not null,
  status public.insight_status not null default 'queued',
  input jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint insights_completion_check check (
    (status = 'completed' and result is not null and completed_at is not null)
    or status <> 'completed'
  )
);

create table public.usage_events (
  id bigint generated always as identity primary key,
  startup_id uuid references public.startups(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  quantity integer not null default 1 check (quantity >= 0),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index startups_owner_id_idx on public.startups(owner_id);
create index startup_members_user_id_idx on public.startup_members(user_id);
create index projects_startup_id_idx on public.projects(startup_id);
create index knowledge_documents_startup_id_idx on public.knowledge_documents(startup_id);
create index conversations_startup_id_updated_at_idx on public.conversations(startup_id, updated_at desc);
create index messages_conversation_id_created_at_idx on public.messages(conversation_id, created_at);
create index insights_startup_id_created_at_idx on public.insights(startup_id, created_at desc);
create index usage_events_startup_id_occurred_at_idx on public.usage_events(startup_id, occurred_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create or replace function public.add_startup_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.startup_members (startup_id, user_id, role, invited_by)
  values (new.id, new.owner_id, 'owner', new.owner_id);
  return new;
end;
$$;

create or replace function public.is_startup_member(target_startup_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.startup_members
    where startup_id = target_startup_id and user_id = auth.uid()
  );
$$;

create or replace function public.has_startup_role(target_startup_id uuid, allowed_roles public.member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.startup_members
    where startup_id = target_startup_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger startups_updated_at before update on public.startups for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger ai_configurations_updated_at before update on public.ai_configurations for each row execute function public.set_updated_at();
create trigger knowledge_documents_updated_at before update on public.knowledge_documents for each row execute function public.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger on_startup_created after insert on public.startups for each row execute function public.add_startup_owner();

alter table public.profiles enable row level security;
alter table public.startups enable row level security;
alter table public.startup_members enable row level security;
alter table public.projects enable row level security;
alter table public.ai_configurations enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.insights enable row level security;
alter table public.usage_events enable row level security;

create policy "Users can view their profile" on public.profiles for select using (id = auth.uid());
create policy "Users can update their profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "Members can view startups" on public.startups for select using (public.is_startup_member(id));
create policy "Users can create their startups" on public.startups for insert with check (owner_id = auth.uid());
create policy "Admins can update startups" on public.startups for update using (public.has_startup_role(id, array['owner', 'admin']::public.member_role[])) with check (public.has_startup_role(id, array['owner', 'admin']::public.member_role[]));
create policy "Owners can delete startups" on public.startups for delete using (public.has_startup_role(id, array['owner']::public.member_role[]));

create policy "Members can view startup members" on public.startup_members for select using (public.is_startup_member(startup_id));
create policy "Admins can invite startup members" on public.startup_members for insert with check (public.has_startup_role(startup_id, array['owner', 'admin']::public.member_role[]));
create policy "Admins can change startup members" on public.startup_members for update using (public.has_startup_role(startup_id, array['owner', 'admin']::public.member_role[]));
create policy "Admins can remove startup members" on public.startup_members for delete using (public.has_startup_role(startup_id, array['owner', 'admin']::public.member_role[]));

create policy "Members can view projects" on public.projects for select using (public.is_startup_member(startup_id));
create policy "Members can create projects" on public.projects for insert with check (created_by = auth.uid() and public.is_startup_member(startup_id));
create policy "Members can update projects" on public.projects for update using (public.is_startup_member(startup_id)) with check (public.is_startup_member(startup_id));
create policy "Admins can delete projects" on public.projects for delete using (public.has_startup_role(startup_id, array['owner', 'admin']::public.member_role[]));

create policy "Members can view AI configurations" on public.ai_configurations for select using (exists (select 1 from public.projects p where p.id = project_id and public.is_startup_member(p.startup_id)));
create policy "Members can create AI configurations" on public.ai_configurations for insert with check (created_by = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and public.is_startup_member(p.startup_id)));
create policy "Members can update AI configurations" on public.ai_configurations for update using (exists (select 1 from public.projects p where p.id = project_id and public.is_startup_member(p.startup_id))) with check (exists (select 1 from public.projects p where p.id = project_id and public.is_startup_member(p.startup_id)));
create policy "Admins can delete AI configurations" on public.ai_configurations for delete using (exists (select 1 from public.projects p where p.id = project_id and public.has_startup_role(p.startup_id, array['owner', 'admin']::public.member_role[])));

create policy "Members can view documents" on public.knowledge_documents for select using (public.is_startup_member(startup_id));
create policy "Members can add documents" on public.knowledge_documents for insert with check (uploaded_by = auth.uid() and public.is_startup_member(startup_id));
create policy "Uploaders and admins can update documents" on public.knowledge_documents for update using (uploaded_by = auth.uid() or public.has_startup_role(startup_id, array['owner', 'admin']::public.member_role[])) with check (public.is_startup_member(startup_id));
create policy "Uploaders and admins can delete documents" on public.knowledge_documents for delete using (uploaded_by = auth.uid() or public.has_startup_role(startup_id, array['owner', 'admin']::public.member_role[]));

create policy "Members can view conversations" on public.conversations for select using (public.is_startup_member(startup_id));
create policy "Members can create conversations" on public.conversations for insert with check (created_by = auth.uid() and public.is_startup_member(startup_id));
create policy "Conversation creators can update conversations" on public.conversations for update using (created_by = auth.uid()) with check (public.is_startup_member(startup_id));
create policy "Conversation creators and admins can delete conversations" on public.conversations for delete using (created_by = auth.uid() or public.has_startup_role(startup_id, array['owner', 'admin']::public.member_role[]));

create policy "Members can view messages" on public.messages for select using (exists (select 1 from public.conversations c where c.id = conversation_id and public.is_startup_member(c.startup_id)));
create policy "Members can create their messages" on public.messages for insert with check (role = 'user' and author_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and public.is_startup_member(c.startup_id)));

create policy "Members can view insights" on public.insights for select using (public.is_startup_member(startup_id));
create policy "Members can request insights" on public.insights for insert with check (requested_by = auth.uid() and public.is_startup_member(startup_id));
create policy "Members can update insights" on public.insights for update using (public.is_startup_member(startup_id)) with check (public.is_startup_member(startup_id));

create policy "Members can view their startup usage" on public.usage_events for select using (startup_id is not null and public.is_startup_member(startup_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('startup-documents', 'startup-documents', false, 26214400, array['application/pdf', 'text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy "Members can read startup documents" on storage.objects for select using (
  bucket_id = 'startup-documents' and public.is_startup_member((storage.foldername(name))[1]::uuid)
);
create policy "Members can upload startup documents" on storage.objects for insert with check (
  bucket_id = 'startup-documents' and public.is_startup_member((storage.foldername(name))[1]::uuid)
);
create policy "Members can delete startup documents" on storage.objects for delete using (
  bucket_id = 'startup-documents' and public.is_startup_member((storage.foldername(name))[1]::uuid)
);
