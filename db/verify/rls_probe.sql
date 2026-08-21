-- Row-level security probe.
--
-- Run in the SQL editor after the migrations. It demonstrates the policies
-- rather than asserting them: it creates fixtures, reads them back as each
-- caller the site really has, and reports what came back. It removes its own
-- fixtures, and if any step raises, the whole block rolls back.
--
-- Three callers:
--
--   anon                       the public site
--   authenticated, off-roster  a real signed-in account with no team_members
--                              row. Anonymous access is obviously blocked;
--                              a valid session with no membership is what a
--                              loosely written policy lets through.
--   authenticated, on-roster   the team
--
-- WHY "REFUSED" COUNTS AS A PASS
--
-- There are two ways a caller ends up with no rows, and they are not equally
-- strong. Either the role holds SELECT and row-level security filters
-- everything out, or the role holds no privilege at all and Postgres refuses
-- before any policy is consulted. The second is strictly safer.
--
-- These tables differ on purpose. Portfolio content is public, so anon holds
-- SELECT and policies decide which rows. Requests hold other people's
-- contact details, so 008 revoked the privilege outright and anon is refused
-- at the door.
--
-- An earlier version of this probe demanded "zero rows" everywhere, which
-- encoded the weaker behaviour. It then failed against the safer system, and
-- its error hint helpfully suggested granting anon SELECT on requests —
-- which would have handed every client brief to the public. A check must
-- never make the safe answer look like the broken one.

do $probe$
declare
  v_count      integer;
  v_flag       boolean;
  v_refused    boolean;
  v_category   uuid;
  v_request    uuid;
  v_stranger   constant uuid := '00000000-0000-0000-0000-0000000000ff';
  v_member     constant uuid := '00000000-0000-0000-0000-0000000000aa';
begin
  create temporary table if not exists rls_probe_results (
    seq       integer,
    caller    text,
    operation text,
    expected  text,
    observed  text,
    verdict   text
  );
  delete from rls_probe_results;

  select id into v_category
  from public.portfolio_categories
  where slug = 'data-tool';

  if v_category is null then
    raise exception 'Seed migration 003 has not been applied: no data-tool category.';
  end if;

  insert into public.portfolio_projects
    (slug, category_id, title_en, summary_en, published)
  values
    ('zz-rls-probe', v_category, 'RLS probe', 'temporary fixture', false);

  insert into public.team_members (user_id, name)
  values (v_member, 'RLS probe member');

  insert into public.requests
    (name, email, description, project_type, budget, timeline, locale)
  values
    ('RLS probe', 'zz-rls-probe@example.invalid',
     'Fixture for the access probe. Removed before this block finishes.',
     'other', 'unsure', 'flexible', 'en')
  returning id into v_request;

  insert into public.notification_attempts (request_id, delivered, provider, error)
  values (v_request, false, 'probe', 'fixture');

  ---------------------------------------------------------------- portfolio
  execute 'set local role anon';
  select count(*) into v_count
  from public.portfolio_projects where slug = 'zz-rls-probe';
  execute 'reset role';
  insert into rls_probe_results values
    (1, 'anon', 'read unpublished project', '0 rows', v_count || ' rows',
     case when v_count = 0 then 'PASS' else 'FAIL' end);

  execute 'set local role anon';
  select count(*) into v_count from public.portfolio_projects;
  execute 'reset role';
  insert into rls_probe_results values
    (2, 'anon', 'read published projects', '3 rows', v_count || ' rows',
     case when v_count = 3 then 'PASS' else 'FAIL' end);

  begin
    execute 'set local role anon';
    insert into public.portfolio_projects
      (slug, category_id, title_en, summary_en, published)
    values ('zz-rls-anon-insert', v_category, 'x', 'x', true);
    execute 'reset role';
    insert into rls_probe_results values
      (3, 'anon', 'insert a project', 'refused', 'row was inserted', 'FAIL');
  exception when others then
    execute 'reset role';
    insert into rls_probe_results values
      (3, 'anon', 'insert a project', 'refused', 'refused: ' || sqlerrm, 'PASS');
  end;

  ------------------------------------------------------------ team roster
  -- Either outcome is correct here. Today anon still holds the privilege
  -- this table was created with and row-level security does the work; if
  -- that privilege is ever revoked, the answer becomes a refusal and this
  -- check must not start failing because the system got safer.
  v_refused := false;
  begin
    execute 'set local role anon';
    select count(*) into v_count from public.team_members;
    execute 'reset role';
  exception when insufficient_privilege then
    execute 'reset role';
    v_refused := true;
  end;
  insert into rls_probe_results values
    (4, 'anon', 'read team roster', 'no rows: refused or filtered',
     case when v_refused then 'refused at the privilege layer'
          else v_count || ' rows' end,
     case when v_refused or v_count = 0 then 'PASS' else 'FAIL' end);

  ------------------------------------------- authenticated, not on the roster
  execute format(
    'set local request.jwt.claims to %L',
    json_build_object('sub', v_stranger, 'role', 'authenticated')::text
  );

  execute 'set local role authenticated';
  select app.is_team() into v_flag;
  execute 'reset role';
  insert into rls_probe_results values
    (5, 'authenticated, off-roster', 'app.is_team()', 'false', v_flag::text,
     case when v_flag is not true then 'PASS' else 'FAIL' end);

  execute 'set local role authenticated';
  select count(*) into v_count
  from public.portfolio_projects where slug = 'zz-rls-probe';
  execute 'reset role';
  insert into rls_probe_results values
    (6, 'authenticated, off-roster', 'read unpublished project', '0 rows',
     v_count || ' rows', case when v_count = 0 then 'PASS' else 'FAIL' end);

  v_refused := false;
  begin
    execute 'set local role authenticated';
    select count(*) into v_count from public.team_members;
    execute 'reset role';
  exception when insufficient_privilege then
    execute 'reset role';
    v_refused := true;
  end;
  insert into rls_probe_results values
    (7, 'authenticated, off-roster', 'read team roster',
     'no rows: refused or filtered',
     case when v_refused then 'refused at the privilege layer'
          else v_count || ' rows' end,
     case when v_refused or v_count = 0 then 'PASS' else 'FAIL' end);

  begin
    execute 'set local role authenticated';
    update public.portfolio_projects
      set title_en = 'tampered' where slug = 'zz-rls-probe';
    get diagnostics v_count = row_count;
    execute 'reset role';
    insert into rls_probe_results values
      (8, 'authenticated, off-roster', 'update a project', '0 rows affected',
       v_count || ' rows affected',
       case when v_count = 0 then 'PASS' else 'FAIL' end);
  exception when others then
    execute 'reset role';
    insert into rls_probe_results values
      (8, 'authenticated, off-roster', 'update a project', '0 rows affected',
       'refused: ' || sqlerrm, 'PASS');
  end;

  ----------------------------------------------- authenticated, on the roster
  execute format(
    'set local request.jwt.claims to %L',
    json_build_object('sub', v_member, 'role', 'authenticated')::text
  );

  execute 'set local role authenticated';
  select app.is_team() into v_flag;
  execute 'reset role';
  insert into rls_probe_results values
    (9, 'authenticated, on-roster', 'app.is_team()', 'true', v_flag::text,
     case when v_flag then 'PASS' else 'FAIL' end);

  execute 'set local role authenticated';
  select count(*) into v_count
  from public.portfolio_projects where slug = 'zz-rls-probe';
  execute 'reset role';
  insert into rls_probe_results values
    (10, 'authenticated, on-roster', 'read unpublished project', '1 row',
     v_count || ' rows', case when v_count = 1 then 'PASS' else 'FAIL' end);

  update public.portfolio_projects
    set published = true where slug = 'zz-rls-probe';

  execute 'set local role anon';
  select count(*) into v_count
  from public.portfolio_projects where slug = 'zz-rls-probe';
  execute 'reset role';
  insert into rls_probe_results values
    (11, 'anon', 'read the same row once published', '1 row',
     v_count || ' rows', case when v_count = 1 then 'PASS' else 'FAIL' end);

  ------------------------------------------------- requests and delivery
  -- Every read below can legitimately end in a refusal rather than an empty
  -- result, because 008 removed the privilege entirely for anon. Both are
  -- recorded as a pass, and which one happened is reported.
  v_refused := false;
  begin
    execute 'set local role anon';
    select count(*) into v_count from public.requests;
    execute 'reset role';
  exception when insufficient_privilege then
    execute 'reset role';
    v_refused := true;
  end;
  insert into rls_probe_results values
    (12, 'anon', 'read requests', 'no rows: refused or filtered',
     case when v_refused then 'refused at the privilege layer'
          else v_count || ' rows' end,
     case when v_refused or v_count = 0 then 'PASS' else 'FAIL' end);

  v_refused := false;
  begin
    execute 'set local role anon';
    select count(*) into v_count from public.notification_attempts;
    execute 'reset role';
  exception when insufficient_privilege then
    execute 'reset role';
    v_refused := true;
  end;
  insert into rls_probe_results values
    (13, 'anon', 'read the delivery log', 'no rows: refused or filtered',
     case when v_refused then 'refused at the privilege layer'
          else v_count || ' rows' end,
     case when v_refused or v_count = 0 then 'PASS' else 'FAIL' end);

  execute format(
    'set local request.jwt.claims to %L',
    json_build_object('sub', v_stranger, 'role', 'authenticated')::text
  );

  v_refused := false;
  begin
    execute 'set local role authenticated';
    select count(*) into v_count from public.requests;
    execute 'reset role';
  exception when insufficient_privilege then
    execute 'reset role';
    v_refused := true;
  end;
  insert into rls_probe_results values
    (14, 'authenticated, off-roster', 'read requests',
     'no rows: refused or filtered',
     case when v_refused then 'refused at the privilege layer'
          else v_count || ' rows' end,
     case when v_refused or v_count = 0 then 'PASS' else 'FAIL' end);

  v_refused := false;
  begin
    execute 'set local role authenticated';
    select count(*) into v_count from public.notification_attempts;
    execute 'reset role';
  exception when insufficient_privilege then
    execute 'reset role';
    v_refused := true;
  end;
  insert into rls_probe_results values
    (15, 'authenticated, off-roster', 'read the delivery log',
     'no rows: refused or filtered',
     case when v_refused then 'refused at the privilege layer'
          else v_count || ' rows' end,
     case when v_refused or v_count = 0 then 'PASS' else 'FAIL' end);

  begin
    execute 'set local role authenticated';
    update public.requests set status = 'Won' where id = v_request;
    get diagnostics v_count = row_count;
    execute 'reset role';
    insert into rls_probe_results values
      (16, 'authenticated, off-roster', 'triage a request', '0 rows affected',
       v_count || ' rows affected',
       case when v_count = 0 then 'PASS' else 'FAIL' end);
  exception when others then
    execute 'reset role';
    insert into rls_probe_results values
      (16, 'authenticated, off-roster', 'triage a request', '0 rows affected',
       'refused: ' || sqlerrm, 'PASS');
  end;

  -- And the team, so the policies are not simply refusing everyone.
  execute format(
    'set local request.jwt.claims to %L',
    json_build_object('sub', v_member, 'role', 'authenticated')::text
  );

  execute 'set local role authenticated';
  select count(*) into v_count from public.requests where id = v_request;
  execute 'reset role';
  insert into rls_probe_results values
    (17, 'authenticated, on-roster', 'read the request', '1 row',
     v_count || ' rows', case when v_count = 1 then 'PASS' else 'FAIL' end);

  execute 'set local role authenticated';
  select count(*) into v_count
  from public.notification_attempts where request_id = v_request;
  execute 'reset role';
  insert into rls_probe_results values
    (18, 'authenticated, on-roster', 'read the delivery log', '1 row',
     v_count || ' rows', case when v_count = 1 then 'PASS' else 'FAIL' end);

  -------------------------------------------------------------- clean up
  delete from public.notification_attempts where request_id = v_request;
  delete from public.requests where id = v_request;
  delete from public.portfolio_projects where slug like 'zz-rls-%';
  delete from public.team_members where user_id = v_member;
end
$probe$;

select seq, caller, operation, expected, observed, verdict
from rls_probe_results
order by seq;
