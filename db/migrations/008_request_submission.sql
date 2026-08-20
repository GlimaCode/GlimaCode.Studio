-- 008  One validated way in, and privileges that actually restrict.
--
-- Two problems, both found by running the access probe against 006 rather
-- than by reading it.
--
-- 1. The column-level INSERT grant in 006 restricted nothing. Grants only
--    ever add, and the host's default privileges had already granted
--    table-level INSERT on every new table in public to anon. An anonymous
--    caller could file a request already marked 'Won', and could choose its
--    own reference. Both returned 201.
--
-- 2. An anonymous caller cannot read, by design — which also means it cannot
--    read back the reference the database just allocated. The visitor has to
--    be told their ticket number, so something has to return it without
--    opening the table.
--
-- Both are answered by removing direct table access from the public role and
-- routing submissions through one function. It takes exactly the fields a
-- visitor supplies, so there is no parameter for status or ticket_id to
-- travel in, and it returns the allocated reference and nothing else.

revoke all on public.requests from anon;
revoke all on public.requests from authenticated;

-- The team reads and triages through their own session. Still gated by the
-- policies in 006: the grant only decides who may ask.
grant select, update, delete on public.requests to authenticated;

-- The single entry point.
--
-- SECURITY DEFINER because the caller has no rights on the table at all now.
-- That is safe precisely because the signature is the whole interface: there
-- is no way to express "status = Won" or "ticket_id = REQ-FAKED" through it.
-- search_path is pinned so the body cannot be redirected.
--
-- The source project arrives as a slug rather than an id. A slug is public
-- and already in the page URL; an id is an internal handle, and accepting
-- one would invite callers to probe for rows by guessing.
create or replace function public.submit_request(
  p_name         text,
  p_email        text,
  p_company      text,
  p_description  text,
  p_project_type text,
  p_budget       text,
  p_timeline     text,
  p_source_slug  text default null,
  p_locale       text default 'en'
)
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_source uuid;
  v_ticket text;
begin
  -- Resolve the sample, if one was named. An unknown slug is not an error:
  -- the request still matters, it just loses its attribution.
  if p_source_slug is not null and length(btrim(p_source_slug)) > 0 then
    select id into v_source
    from public.portfolio_projects
    where slug = p_source_slug and published;
  end if;

  insert into public.requests (
    name, email, company, description,
    project_type, budget, timeline, source_project_id, locale
  ) values (
    btrim(p_name),
    lower(btrim(p_email)),
    nullif(btrim(coalesce(p_company, '')), ''),
    btrim(p_description),
    p_project_type,
    p_budget,
    p_timeline,
    v_source,
    coalesce(p_locale, 'en')
  )
  returning ticket_id into v_ticket;

  return v_ticket;
end;
$$;

comment on function public.submit_request is
  'The only way a visitor writes to requests. Returns the allocated ticket reference and nothing else.';

-- Deliberately not granted to the table, only to this function.
revoke all on function public.submit_request(
  text, text, text, text, text, text, text, text, text
) from public;

grant execute on function public.submit_request(
  text, text, text, text, text, text, text, text, text
) to anon, authenticated;

-- Kept as defence in depth for any future direct insert path: a request
-- cannot arrive already triaged. The check sees the finished row, so a
-- supplied status is caught whether or not a privilege mistake lets it
-- through.
drop policy if exists requests_insert_public on public.requests;
create policy requests_insert_public
  on public.requests
  for insert
  with check (status = 'New');
