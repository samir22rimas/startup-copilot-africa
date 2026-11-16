-- Anza: team chat upgrade — replies, reactions, unread tracking, read-only viewers.
-- Additive and safe to run more than once. Apply with: supabase db push

-- ---------------------------------------------------------------------------
-- 1. Replies
-- ---------------------------------------------------------------------------

alter table public.team_messages
  add column if not exists reply_to_id uuid references public.team_messages(id) on delete set null;

create index if not exists team_messages_reply_idx
  on public.team_messages(reply_to_id) where reply_to_id is not null;

-- A reply must point at a message in the same business and the same channel.
create or replace function public.guard_team_message_reply()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.reply_to_id is not null and not exists (
    select 1 from public.team_messages m
    where m.id = new.reply_to_id
      and m.startup_id = new.startup_id
      and m.project_id is not distinct from new.project_id
  ) then
    raise exception 'reply_to_other_channel' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists team_messages_guard_reply on public.team_messages;
create trigger team_messages_guard_reply before insert on public.team_messages
  for each row execute function public.guard_team_message_reply();

-- Edits may change the text only. reply_to_id may only become null (when the
-- original message is deleted).
create or replace function public.protect_team_message()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.id is distinct from old.id
     or new.startup_id is distinct from old.startup_id
     or new.project_id is distinct from old.project_id
     or new.created_at is distinct from old.created_at
     or new.is_copilot is distinct from old.is_copilot
     or (new.author_id is distinct from old.author_id and new.author_id is not null)
     or (new.reply_to_id is distinct from old.reply_to_id and new.reply_to_id is not null) then
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

-- ---------------------------------------------------------------------------
-- 2. Viewers read the chat but do not post (same rule as everywhere else)
-- ---------------------------------------------------------------------------

drop policy if exists "Members can post team messages" on public.team_messages;
create policy "Members can post team messages" on public.team_messages
  for insert with check (
    author_id = auth.uid()
    and is_copilot = false
    and edited_at is null
    and public.can_comment_startup(startup_id)
    and (project_id is null or public.project_belongs_to_startup(project_id, startup_id))
  );

-- ---------------------------------------------------------------------------
-- 3. Reactions
-- ---------------------------------------------------------------------------

create table if not exists public.team_message_reactions (
  message_id uuid not null references public.team_messages(id) on delete cascade,
  startup_id uuid not null references public.startups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- A fixed set of keys; the app maps them to emoji.
  reaction text not null check (reaction in ('thumbs_up', 'heart', 'party', 'laugh', 'thanks', 'eyes', 'check', 'fire')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, reaction)
);

create index if not exists team_message_reactions_startup_idx on public.team_message_reactions(startup_id);

alter table public.team_message_reactions enable row level security;

drop policy if exists "Members can view reactions" on public.team_message_reactions;
create policy "Members can view reactions" on public.team_message_reactions
  for select using (public.is_startup_member(startup_id));

drop policy if exists "Commenters can react" on public.team_message_reactions;
create policy "Commenters can react" on public.team_message_reactions
  for insert with check (
    user_id = auth.uid()
    and public.can_comment_startup(startup_id)
    and exists (
      select 1 from public.team_messages m
      where m.id = message_id and m.startup_id = team_message_reactions.startup_id
    )
  );

drop policy if exists "People can remove their reactions" on public.team_message_reactions;
create policy "People can remove their reactions" on public.team_message_reactions
  for delete using (user_id = auth.uid());

grant select, insert, delete on public.team_message_reactions to authenticated;
revoke all on public.team_message_reactions from anon;

-- ---------------------------------------------------------------------------
-- 4. Unread tracking (per person, per channel)
-- ---------------------------------------------------------------------------

create table if not exists public.team_channel_reads (
  startup_id uuid not null references public.startups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- 'general' or a project id.
  channel_key text not null check (
    channel_key = 'general'
    or channel_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  last_read_at timestamptz not null default now(),
  primary key (startup_id, user_id, channel_key)
);

alter table public.team_channel_reads enable row level security;

drop policy if exists "People manage their own read markers" on public.team_channel_reads;
create policy "People manage their own read markers" on public.team_channel_reads
  for all
  using (user_id = auth.uid() and public.is_startup_member(startup_id))
  with check (user_id = auth.uid() and public.is_startup_member(startup_id));

grant select, insert, update, delete on public.team_channel_reads to authenticated;
revoke all on public.team_channel_reads from anon;

-- Messages from others since the caller last read each channel (or since they
-- joined the team, for channels they have never opened).
create or replace function public.get_team_unread_counts(target_startup_id uuid)
returns table (channel_key text, unread integer)
language sql stable security definer set search_path = public as $$
  select coalesce(m.project_id::text, 'general') as channel_key, count(*)::integer as unread
  from public.team_messages m
  join public.startup_members sm
    on sm.startup_id = m.startup_id and sm.user_id = auth.uid()
  left join public.team_channel_reads r
    on r.startup_id = m.startup_id
   and r.user_id = auth.uid()
   and r.channel_key = coalesce(m.project_id::text, 'general')
  where m.startup_id = target_startup_id
    and m.author_id is distinct from auth.uid()
    and m.created_at > coalesce(r.last_read_at, sm.joined_at)
  group by 1;
$$;

revoke execute on function public.get_team_unread_counts(uuid) from public, anon;
grant execute on function public.get_team_unread_counts(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Live updates for reactions
-- ---------------------------------------------------------------------------

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_message_reactions'
     ) then
    alter publication supabase_realtime add table public.team_message_reactions;
  end if;
end $$;
