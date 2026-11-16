-- Anza: team collaboration (invitations + team chat) and access-control hardening.
-- Apply with: supabase db push (or paste into the Supabase SQL Editor once).

-- ---------------------------------------------------------------------------
-- 1. Startups: fix INSERT ... RETURNING for owners, lock ownership transfers
-- ---------------------------------------------------------------------------

-- The owner's membership row is added by an AFTER INSERT trigger, so the old
-- member-only SELECT policy could not see a startup in the same statement that
-- created it. Letting the owner read their own row removes the need to create
-- startups with the service-role key.
drop policy if exists "Members can view startups" on public.startups;
create policy "Members can view startups" on public.startups
  for select using (owner_id = auth.uid() or public.is_startup_member(id));

-- Startup admins may edit startup details but must never be able to reassign
-- ownership (or the primary key) through a plain UPDATE.
create or replace function public.protect_startup_identity()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and (new.owner_id is distinct from old.owner_id or new.id is distinct from old.id) then
    raise exception 'startup_owner_is_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists startups_protect_identity on public.startups;
create trigger startups_protect_identity before update on public.startups
  for each row execute function public.protect_startup_identity();

-- ---------------------------------------------------------------------------
-- 2. Membership: no direct inserts, no privilege escalation
-- ---------------------------------------------------------------------------

-- Before: any startup admin could insert an arbitrary user as a member, promote
-- themselves to owner, or demote/remove the owner. Now members only join by
-- accepting an invitation (security definer function below), the owner row is
-- immutable, and admins can only manage members/advisors.
drop policy if exists "Admins can invite startup members" on public.startup_members;
drop policy if exists "Admins can change startup members" on public.startup_members;
drop policy if exists "Admins can remove startup members" on public.startup_members;

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
        and role in ('member', 'advisor')
      )
    )
  )
  with check (
    role <> 'owner'
    and (
      public.has_startup_role(startup_id, array['owner']::public.member_role[])
      or (
        public.has_startup_role(startup_id, array['admin']::public.member_role[])
        and role in ('member', 'advisor')
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
        and role in ('member', 'advisor')
      )
    )
  );

create or replace function public.protect_membership_identity()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.startup_id is distinct from old.startup_id or new.user_id is distinct from old.user_id then
    raise exception 'membership_identity_is_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists startup_members_protect_identity on public.startup_members;
create trigger startup_members_protect_identity before update on public.startup_members
  for each row execute function public.protect_membership_identity();

-- Users may create their own profile row if the signup trigger missed it.
drop policy if exists "Users can create their profile" on public.profiles;
create policy "Users can create their profile" on public.profiles
  for insert with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Invitations
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'declined');
exception when duplicate_object then null;
end $$;

create table if not exists public.startup_invitations (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  email text not null check (
    email = lower(email)
    and char_length(email) <= 254
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  role public.member_role not null default 'member' check (role <> 'owner'),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status public.invitation_status not null default 'pending',
  message text check (message is null or char_length(message) <= 500),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references public.profiles(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists startup_invitations_pending_unique
  on public.startup_invitations(startup_id, email) where status = 'pending';
create index if not exists startup_invitations_email_idx
  on public.startup_invitations(email) where status = 'pending';

alter table public.startup_invitations enable row level security;

-- Only the startup's owner/admins can see and manage invitations directly.
-- Invitees read and answer theirs through the security definer functions below.
drop policy if exists "Admins can view invitations" on public.startup_invitations;
create policy "Admins can view invitations" on public.startup_invitations
  for select using (public.has_startup_role(startup_id, array['owner', 'admin']::public.member_role[]));

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
        and role in ('member', 'advisor')
      )
    )
  );

drop policy if exists "Admins can revoke invitations" on public.startup_invitations;
create policy "Admins can revoke invitations" on public.startup_invitations
  for delete using (public.has_startup_role(startup_id, array['owner', 'admin']::public.member_role[]));

-- The verified email of the calling user, or null. Never trusts JWT claims.
create or replace function public.current_verified_email()
returns text language sql stable security definer set search_path = public as $$
  select lower(u.email)
  from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null;
$$;

-- Public preview shown on the invite landing page. The invitation id is an
-- unguessable UUID; only the startup name, inviter name, role and a masked
-- email are revealed.
create or replace function public.get_invitation_preview(target_invitation_id uuid)
returns table (
  startup_name text,
  inviter_name text,
  role public.member_role,
  email_hint text,
  status public.invitation_status,
  is_expired boolean,
  is_for_current_user boolean
)
language sql stable security definer set search_path = public as $$
  select
    s.name,
    coalesce(nullif(trim(p.full_name), ''), 'A founder'),
    i.role,
    left(i.email, 1) || '***@' || split_part(i.email, '@', 2),
    i.status,
    i.expires_at <= now(),
    coalesce(i.email = public.current_verified_email(), false)
  from public.startup_invitations i
  join public.startups s on s.id = i.startup_id
  left join public.profiles p on p.id = i.invited_by
  where i.id = target_invitation_id;
$$;

create or replace function public.get_my_pending_invitations()
returns table (
  id uuid,
  startup_id uuid,
  startup_name text,
  inviter_name text,
  role public.member_role,
  message text,
  expires_at timestamptz,
  created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    i.id,
    i.startup_id,
    s.name,
    coalesce(nullif(trim(p.full_name), ''), 'A founder'),
    i.role,
    i.message,
    i.expires_at,
    i.created_at
  from public.startup_invitations i
  join public.startups s on s.id = i.startup_id
  left join public.profiles p on p.id = i.invited_by
  where i.status = 'pending'
    and i.expires_at > now()
    and i.email = public.current_verified_email()
  order by i.created_at desc;
$$;

-- Accepting is the ONLY way to become a member of someone else's startup.
-- The caller must be signed in with a verified email equal to the invited one.
create or replace function public.accept_startup_invitation(target_invitation_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  inv public.startup_invitations%rowtype;
  caller_email text;
  member_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  caller_email := public.current_verified_email();
  if caller_email is null then
    raise exception 'email_not_verified' using errcode = '42501';
  end if;

  select * into inv from public.startup_invitations
  where id = target_invitation_id
  for update;

  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;
  if inv.email <> caller_email then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;
  if inv.status <> 'pending' then
    raise exception 'invitation_not_pending' using errcode = 'P0001';
  end if;
  if inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;

  -- Hard abuse ceiling; per-plan seat limits are enforced when inviting.
  select count(*) into member_count from public.startup_members where startup_id = inv.startup_id;
  if member_count >= 50 then
    raise exception 'team_is_full' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, full_name)
  select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
  from auth.users u where u.id = auth.uid()
  on conflict (id) do nothing;

  insert into public.startup_members (startup_id, user_id, role, invited_by)
  values (inv.startup_id, auth.uid(), inv.role, inv.invited_by)
  on conflict (startup_id, user_id) do nothing;

  update public.startup_invitations
  set status = 'accepted', accepted_by = auth.uid(), responded_at = now()
  where id = inv.id;

  return inv.startup_id;
end;
$$;

create or replace function public.decline_startup_invitation(target_invitation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  caller_email text;
begin
  caller_email := public.current_verified_email();
  if auth.uid() is null or caller_email is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update public.startup_invitations
  set status = 'declined', responded_at = now()
  where id = target_invitation_id and status = 'pending' and email = caller_email;

  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- Team roster for members of a startup. Profiles stay private (own row only);
-- this exposes just the fields teammates need, and never the phone number.
create or replace function public.get_startup_team(target_startup_id uuid)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  email text,
  role public.member_role,
  joined_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.full_name, p.avatar_url, u.email::text, m.role, m.joined_at
  from public.startup_members m
  join public.profiles p on p.id = m.user_id
  join auth.users u on u.id = m.user_id
  where m.startup_id = target_startup_id
    and public.is_startup_member(target_startup_id)
  order by
    case m.role when 'owner' then 0 when 'admin' then 1 when 'member' then 2 else 3 end,
    m.joined_at;
$$;

-- ---------------------------------------------------------------------------
-- 4. Team chat
-- ---------------------------------------------------------------------------

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  content text not null check (char_length(trim(content)) between 1 and 4000),
  -- Replies posted by the AI Copilot. Only the server (service role) can set this.
  is_copilot boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  constraint team_messages_copilot_has_no_author check (not is_copilot or author_id is null)
);

create index if not exists team_messages_startup_created_idx
  on public.team_messages(startup_id, created_at desc);
create index if not exists team_messages_project_created_idx
  on public.team_messages(project_id, created_at desc) where project_id is not null;

alter table public.team_messages enable row level security;

create or replace function public.project_belongs_to_startup(target_project_id uuid, target_startup_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects where id = target_project_id and startup_id = target_startup_id
  );
$$;

drop policy if exists "Members can read team messages" on public.team_messages;
create policy "Members can read team messages" on public.team_messages
  for select using (public.is_startup_member(startup_id));

drop policy if exists "Members can post team messages" on public.team_messages;
create policy "Members can post team messages" on public.team_messages
  for insert with check (
    author_id = auth.uid()
    and is_copilot = false
    and edited_at is null
    and public.is_startup_member(startup_id)
    and (project_id is null or public.project_belongs_to_startup(project_id, startup_id))
  );

drop policy if exists "Authors can edit their team messages" on public.team_messages;
create policy "Authors can edit their team messages" on public.team_messages
  for update
  using (author_id = auth.uid() and public.is_startup_member(startup_id))
  with check (author_id = auth.uid() and public.is_startup_member(startup_id));

drop policy if exists "Authors and admins can delete team messages" on public.team_messages;
create policy "Authors and admins can delete team messages" on public.team_messages
  for delete using (
    (author_id = auth.uid() and public.is_startup_member(startup_id))
    or public.has_startup_role(startup_id, array['owner', 'admin']::public.member_role[])
  );

-- An edit may only change the text; everything else is frozen and the edit is stamped.
create or replace function public.protect_team_message()
returns trigger language plpgsql set search_path = public as $$
begin
  -- author_id may only ever change to null (when the author's profile is deleted).
  if new.id is distinct from old.id
     or new.startup_id is distinct from old.startup_id
     or new.project_id is distinct from old.project_id
     or new.created_at is distinct from old.created_at
     or new.is_copilot is distinct from old.is_copilot
     or (new.author_id is distinct from old.author_id and new.author_id is not null) then
    raise exception 'team_message_is_immutable' using errcode = '42501';
  end if;
  if new.content is distinct from old.content then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;

drop trigger if exists team_messages_protect on public.team_messages;
create trigger team_messages_protect before update on public.team_messages
  for each row execute function public.protect_team_message();

-- Live updates for the chat (no-op when the realtime publication is absent).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_messages'
     ) then
    alter publication supabase_realtime add table public.team_messages;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Usage accounting: fast per-user rate-limit and quota lookups
-- ---------------------------------------------------------------------------

create index if not exists usage_events_user_event_occurred_idx
  on public.usage_events(user_id, event_name, occurred_at desc);

-- ---------------------------------------------------------------------------
-- 6. Function privileges: nothing here is callable by anonymous visitors
--    except the invitation preview.
-- ---------------------------------------------------------------------------

revoke execute on function public.current_verified_email() from public, anon;
revoke execute on function public.get_my_pending_invitations() from public, anon;
revoke execute on function public.accept_startup_invitation(uuid) from public, anon;
revoke execute on function public.decline_startup_invitation(uuid) from public, anon;
revoke execute on function public.get_startup_team(uuid) from public, anon;
revoke execute on function public.project_belongs_to_startup(uuid, uuid) from public, anon;

grant execute on function public.current_verified_email() to authenticated, service_role;
grant execute on function public.get_my_pending_invitations() to authenticated, service_role;
grant execute on function public.accept_startup_invitation(uuid) to authenticated, service_role;
grant execute on function public.decline_startup_invitation(uuid) to authenticated, service_role;
grant execute on function public.get_startup_team(uuid) to authenticated, service_role;
grant execute on function public.project_belongs_to_startup(uuid, uuid) to authenticated, service_role;
grant execute on function public.get_invitation_preview(uuid) to anon, authenticated, service_role;
