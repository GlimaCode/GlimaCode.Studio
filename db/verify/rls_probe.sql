-- Row-level security probe.
--
-- Run this in the SQL editor AFTER 001, 002 and 003 have been applied. It
-- demonstrates the policies rather than asserting them: it creates a
-- temporary unpublished row, reads it back as each caller the site will
-- actually have, and reports what came back.
--
-- It cleans up after itself. The fixture row is deleted at the end, and if
-- any step raises, the whole DO block rolls back — so a failed run leaves
-- nothing behind either.
--
-- Three callers are exercised:
--
--   anon                  the public site
--   authenticated, off-roster  a real logged-in account with no team_members
--                              row. This is the case a loosely written policy
--                              lets through, and the one worth ruling out
--                              before phase 4 creates real accounts.
--   authenticated, on-roster   the team
--
-- Both the portfolio (public marketing copy) and requests (other people's
-- contact details and briefs) are covered, because they have different rules
-- and only one of them is meant to be readable at all.
--
-- Expected: only the last one sees an unpublished row, and nobody but the
-- team can write anything.

do $probe$
declare
  v_count      integer;
  v_flag       boolean;
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

  -- Fixture: one unpublished project, and one roster entry to test against.
  insert into public.portfolio_projects
    (slug, category_id, title_en, summary_en, published)
  values
    ('zz-rls-probe', v_category, 'RLS probe', 'temporary fixture', false);

  insert into public.team_members (user_id, name)
  values (v_member, 'RLS probe member');

  ---------------------------------------------------------------- anonymous
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

  execute 'set local role anon';
  select count(*) into v_count from public.team_members;
  execute 'reset role';
  insert into rls_probe_results values
    (3, 'anon', 'read team roster', '0 rows', v_count || ' rows',
     case when v_count = 0 then 'PASS' else 'FAIL' end);

  begin
    execute 'set local role anon';
    insert into public.portfolio_projects
      (slug, category_id, title_en, summary_en, published)
    values ('zz-rls-anon-insert', v_category, 'x', 'x', true);
    execute 'reset role';
    insert into rls_probe_results values
      (4, 'anon', 'insert a project', 'refused', 'row was inserted', 'FAIL');
  exception when others then
    execute 'reset role';
    insert into rls_probe_results values
      (4, 'anon', 'insert a project', 'refused', 'refused: ' || sqlerrm, 'PASS');
  end;

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
    (6, 'authenticated, off-roster', 'read unpublished project',
     '0 rows', v_count || ' rows',
     case when v_count = 0 then 'PASS' else 'FAIL' end);

  execute 'set local role authenticated';
  select count(*) into v_count from public.team_members;
  execute 'reset role';
  insert into rls_probe_results values
    (7, 'authenticated, off-roster', 'read team roster', '0 rows',
     v_count || ' rows',
     case when v_count = 0 then 'PASS' else 'FAIL' end);

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
     v_count || ' rows',
     case when v_count = 1 then 'PASS' else 'FAIL' end);

  ------------------------------- publishing makes it visible to the public
  update public.portfolio_projects
    set published = true where slug = 'zz-rls-probe';

  execute 'set local role anon';
  select count(*) into v_count
  from public.portfolio_projects where slug = 'zz-rls-probe';
  execute 'reset role';
  insert into rls_probe_results values
    (11, 'anon', 'read the same row once published', '1 row',
     v_count || ' rows',
     case when v_count = 1 then 'PASS' else 'FAIL' end);

  ------------------------------------------------- requests and delivery
  -- The table holding strangers' contact details. An authenticated account
  -- that is not on the roster is the case worth proving: anonymous access is
  -- obviously blocked, while a valid session with no membership row is what
  -- a loosely written policy lets through.
  insert into public.requests
    (name, email, description, project_type, budget, timeline, locale)
  values
    ('RLS probe', 'zz-rls-probe@example.invalid',
     'Fixture for the access probe. Removed before this block finishes.',
     'other', 'unsure', 'flexible', 'en')
  returning id into v_request;

  insert into public.notification_attempts (request_id, delivered, provider, error)
  values (v_request, false, 'probe', 'fixture');

  execute format(
    'set local request.jwt.claims to %L',
    json_build_object('sub', v_stranger, 'role', 'authenticated')::text
  );
  execute 'set local role authenticated';
  select count(*) into v_count from public.requests;
  execute 'reset role';
  insert into rls_probe_results values
    (12, 'authenticated, off-roster', 'read requests', '0 rows',
     v_count || ' rows', case when v_count = 0 then 'PASS' else 'FAIL' end);

  execute 'set local role authenticated';
  select count(*) into v_count from public.notification_attempts;
  execute 'reset role';
  insert into rls_probe_results values
    (13, 'authenticated, off-roster', 'read delivery log', '0 rows',
     v_count || ' rows', case when v_count = 0 then 'PASS' else 'FAIL' end);

  begin
    execute 'set local role authenticated';
    update public.requests set status = 'Won' where id = v_request;
    get diagnostics v_count = row_count;
    execute 'reset role';
    insert into rls_probe_results values
      (14, 'authenticated, off-roster', 'triage a request', '0 rows affected',
       v_count || ' rows affected',
       case when v_count = 0 then 'PASS' else 'FAIL' end);
  exception when others then
    execute 'reset role';
    insert into rls_probe_results values
      (14, 'authenticated, off-roster', 'triage a request', '0 rows affected',
       'refused: ' || sqlerrm, 'PASS');
  end;

  execute 'set local role anon';
  select count(*) into v_count from public.requests;
  execute 'reset role';
  insert into rls_probe_results values
    (15, 'anon', 'read requests', '0 rows', v_count || ' rows',
     case when v_count = 0 then 'PASS' else 'FAIL' end);

  -- And the team, so the policies are not simply refusing everyone.
  execute format(
    'set local request.jwt.claims to %L',
    json_build_object('sub', v_member, 'role', 'authenticated')::text
  );
  execute 'set local role authenticated';
  select count(*) into v_count from public.requests where id = v_request;
  execute 'reset role';
  insert into rls_probe_results values
    (16, 'authenticated, on-roster', 'read the request', '1 row',
     v_count || ' rows', case when v_count = 1 then 'PASS' else 'FAIL' end);

  execute 'set local role authenticated';
  select count(*) into v_count from public.notification_attempts
   where request_id = v_request;
  execute 'reset role';
  insert into rls_probe_results values
    (17, 'authenticated, on-roster', 'read delivery log', '1 row',
     v_count || ' rows', case when v_count = 1 then 'PASS' else 'FAIL' end);

  -------------------------------------------------------------- clean up
  delete from public.requests where id = v_request;
  delete from public.portfolio_projects where slug like 'zz-rls-%';
  delete from public.team_members where user_id = v_member;
end
$probe$;

select seq, caller, operation, expected, observed, verdict
from rls_probe_results
order by seq;
