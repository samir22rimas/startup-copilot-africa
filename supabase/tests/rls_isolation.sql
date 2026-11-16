-- Workspace isolation and role tests for the Anza schema.
--
-- Run against a database that has every migration applied (never production):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_isolation.sql
--
-- Everything happens inside one transaction that is rolled back at the end.
-- Any failed expectation raises an exception and stops the run.

begin;

-- Fixtures -----------------------------------------------------------------

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'owner-a@test.local', now()),
  ('00000000-0000-0000-0000-00000000000b', 'editor-b@test.local', now()),
  ('00000000-0000-0000-0000-00000000000c', 'advisor-c@test.local', now()),
  ('00000000-0000-0000-0000-00000000000d', 'viewer-d@test.local', now()),
  ('00000000-0000-0000-0000-00000000000e', 'outsider-e@test.local', now());

insert into public.startups (id, owner_id, name, slug, country_code) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Alpha Foods', 'alpha-foods', 'CM'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000e', 'Echo Logistics', 'echo-logistics', 'KE');

insert into public.startup_members (startup_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'member'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'advisor'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 'viewer');

insert into public.projects (id, startup_id, created_by, title, metadata) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Alpha launch', '{}'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000e', 'Echo launch', '{}');

insert into public.artifacts (id, startup_id, module, kind, title, content, created_by) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'plan', 'business_plan', 'Alpha plan', '{"secret":"alpha"}', '00000000-0000-0000-0000-00000000000a'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'plan', 'business_plan', 'Echo plan', '{"secret":"echo"}', '00000000-0000-0000-0000-00000000000e');

insert into public.tasks (id, startup_id, project_id, title, created_by) values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Alpha task', '00000000-0000-0000-0000-00000000000a'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Echo task', '00000000-0000-0000-0000-00000000000e');

insert into public.business_memory (startup_id, kind, content, created_by) values
  ('10000000-0000-0000-0000-000000000002', 'decision', 'Echo will price at 5000 KES', '00000000-0000-0000-0000-00000000000e');

insert into public.business_ideas (user_id, title) values
  ('00000000-0000-0000-0000-00000000000e', 'Echo private idea');

insert into public.opportunities (title, organization, type, source_url, last_verified_at, status) values
  ('Published programme', 'Test Org', 'grant', 'https://example.org/a', current_date, 'published'),
  ('Draft programme', 'Test Org', 'grant', 'https://example.org/b', current_date, 'draft');

-- Helpers --------------------------------------------------------------------

create or replace function pg_temp.act_as(user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  execute 'set local role authenticated';
end;
$$;

create or replace function pg_temp.expect(condition boolean, label text) returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'FAILED: %', label;
  end if;
  raise notice 'ok - %', label;
end;
$$;

-- Runs a statement that must be refused (by a policy, a trigger or a grant).
create or replace function pg_temp.expect_denied(statement text, label text) returns void language plpgsql as $$
declare
  affected integer;
begin
  begin
    execute statement;
    get diagnostics affected = row_count;
  exception when others then
    raise notice 'ok - % (refused: %)', label, sqlerrm;
    return;
  end;
  if affected > 0 then
    raise exception 'FAILED: % (statement affected % row(s))', label, affected;
  end if;
  raise notice 'ok - % (no rows affected)', label;
end;
$$;

-- 1. An outsider sees nothing from another workspace ---------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000e');
select pg_temp.expect((select count(*) from public.startups) = 1, 'outsider sees only their own startup');
select pg_temp.expect((select count(*) from public.artifacts where startup_id = '10000000-0000-0000-0000-000000000001') = 0, 'outsider cannot read Alpha artifacts');
select pg_temp.expect((select count(*) from public.tasks where startup_id = '10000000-0000-0000-0000-000000000001') = 0, 'outsider cannot read Alpha tasks');
select pg_temp.expect_denied(
  $$insert into public.tasks (startup_id, project_id, title, created_by) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Injected', '00000000-0000-0000-0000-00000000000e')$$,
  'outsider cannot add a task to Alpha');
select pg_temp.expect_denied(
  $$update public.artifacts set title = 'Hacked' where id = '30000000-0000-0000-0000-000000000001'$$,
  'outsider cannot edit an Alpha artifact');
select pg_temp.expect_denied(
  $$insert into public.tasks (startup_id, project_id, title, created_by) values ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Cross', '00000000-0000-0000-0000-00000000000e')$$,
  'a task cannot point at a project from another workspace');
select pg_temp.expect_denied(
  $$update public.artifacts set startup_id = '10000000-0000-0000-0000-000000000001' where id = '30000000-0000-0000-0000-000000000002'$$,
  'an artifact cannot be moved to another workspace');
reset role;

-- 2. Owner and editor can work in their workspace -----------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) from public.artifacts) = 1, 'editor sees only Alpha artifacts');
select pg_temp.expect((select count(*) from public.business_memory) = 0, 'editor cannot read Echo memory');
select pg_temp.expect((select count(*) from public.business_ideas) = 0, 'ideas are private to their author');
insert into public.tasks (startup_id, project_id, title, created_by, assignee_id)
  values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Editor task', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select count(*) from public.tasks) = 2, 'editor can add a task');
select pg_temp.expect_denied(
  $$insert into public.tasks (startup_id, project_id, title, created_by, assignee_id) values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Bad assignee', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000e')$$,
  'a task cannot be assigned to someone outside the team');
update public.tasks set status = 'done' where title = 'Editor task';
select pg_temp.expect((select completed_at is not null from public.tasks where title = 'Editor task'), 'completing a task stamps completed_at');
insert into public.artifact_versions (artifact_id, startup_id, version, title, content, created_by)
  values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, 'Alpha plan', '{}', '00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_denied(
  $$update public.artifact_versions set title = 'Rewritten history' where artifact_id = '30000000-0000-0000-0000-000000000001'$$,
  'version history cannot be rewritten');
select pg_temp.expect_denied(
  $$insert into public.artifact_versions (artifact_id, startup_id, version, title, content, created_by) values ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 9, 'x', '{}', '00000000-0000-0000-0000-00000000000b')$$,
  'a version cannot be attached to another workspace''s artifact');
select pg_temp.expect_denied(
  $$update public.startup_members set role = 'owner' where user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'an editor cannot promote themselves');
reset role;

-- 3. Advisor: read and comment only -------------------------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) from public.tasks) = 2, 'advisor can read tasks');
insert into public.task_comments (task_id, startup_id, author_id, body)
  values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000c', 'Looks good');
select pg_temp.expect_denied(
  $$update public.tasks set title = 'Advisor edit' where id = '40000000-0000-0000-0000-000000000001'$$,
  'advisor cannot edit tasks');
select pg_temp.expect_denied(
  $$insert into public.artifacts (startup_id, module, kind, title, created_by) values ('10000000-0000-0000-0000-000000000001', 'plan', 'business_plan', 'x', '00000000-0000-0000-0000-00000000000c')$$,
  'advisor cannot create artifacts');
reset role;

-- 4. Viewer: read only --------------------------------------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect((select count(*) from public.artifacts) = 1, 'viewer can read artifacts');
select pg_temp.expect_denied(
  $$insert into public.task_comments (task_id, startup_id, author_id, body) values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000d', 'hi')$$,
  'viewer cannot comment');
select pg_temp.expect_denied(
  $$update public.projects set title = 'Viewer edit' where id = '20000000-0000-0000-0000-000000000001'$$,
  'viewer cannot edit projects');
select pg_temp.expect_denied(
  $$insert into public.business_memory (startup_id, kind, content, created_by) values ('10000000-0000-0000-0000-000000000001', 'fact', 'viewer note', '00000000-0000-0000-0000-00000000000d')$$,
  'viewer cannot write memory');
select pg_temp.expect_denied(
  $$delete from public.tasks where id = '40000000-0000-0000-0000-000000000001'$$,
  'viewer cannot delete tasks');
reset role;

-- 5. Platform tables ----------------------------------------------------------

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect((select count(*) from public.opportunities) = 1, 'only published opportunities are visible');
select pg_temp.expect_denied(
  $$insert into public.opportunities (title, organization, type, source_url, last_verified_at, status) values ('Fake grant', 'Nobody', 'grant', 'https://example.org/x', current_date, 'published')$$,
  'users cannot publish opportunities');
select pg_temp.expect_denied($$select count(*) from public.ai_usage$$, 'users cannot read AI usage records');
select pg_temp.expect_denied($$select count(*) from public.audit_logs$$, 'users cannot read the admin audit trail');
select pg_temp.expect_denied(
  $$insert into public.subscriptions (user_id, plan) values ('00000000-0000-0000-0000-00000000000a', 'team')$$,
  'users cannot grant themselves a plan');
reset role;

-- 6. Sharing ------------------------------------------------------------------

insert into public.shared_links (token, artifact_id, startup_id, created_by)
  values (repeat('a', 40), '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a');
insert into public.shared_links (token, artifact_id, startup_id, created_by, revoked_at)
  values (repeat('b', 40), '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', now());

set local role anon;
select pg_temp.expect((select count(*) from public.get_shared_artifact(repeat('a', 40))) = 1, 'a valid share link opens the artifact');
select pg_temp.expect((select count(*) from public.get_shared_artifact(repeat('b', 40))) = 0, 'a revoked share link opens nothing');
select pg_temp.expect((select count(*) from public.get_shared_artifact(repeat('z', 40))) = 0, 'an unknown token opens nothing');
select pg_temp.expect_denied($$select count(*) from public.artifacts$$, 'anonymous visitors cannot read artifacts directly');
reset role;

rollback;
