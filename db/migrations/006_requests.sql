-- 006  Project requests.
--
-- The sensitive table. Portfolio rows are public marketing copy; these are
-- strangers' names, email addresses and descriptions of what they are
-- building. The access rules are correspondingly narrower: anonymous
-- callers may insert and nothing else — not even reading back the row they
-- just wrote, which would otherwise expose every other visitor's brief.

-- Reference shown to the visitor, allocated here rather than in the browser.
-- The prototype derived it from the clock, which can collide and should
-- never have become a key.
--
-- Random rather than sequential, deliberately: a sequence would publish how
-- many requests the studio has ever received, and REQ-00003 on a reply is
-- not the impression to give a prospect. Scrambling a sequence was the other
-- option and is worse — the constants would sit in a public repository, so
-- anyone could invert them.
--
-- SECURITY DEFINER is required, and is the subtle part. The uniqueness check
-- reads public.requests, which row-level security hides from the caller
-- inserting the row. Running as the caller, the check would find nothing,
-- happily return a duplicate, and fail on the unique constraint instead.
create or replace function app.new_ticket_id()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  candidate text;
  attempts  integer := 0;
begin
  loop
    select 'REQ-' || string_agg(
             substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                    (floor(random() * 36) + 1)::integer, 1), '')
      into candidate
      from generate_series(1, 5);

    exit when not exists (
      select 1 from public.requests where ticket_id = candidate
    );

    attempts := attempts + 1;
    if attempts > 25 then
      raise exception 'Could not allocate a unique ticket id after % attempts', attempts;
    end if;
  end loop;

  return candidate;
end;
$$;

comment on function app.new_ticket_id() is
  'Allocates an unused REQ-XXXXX reference. Definer rights so the uniqueness check can see rows the caller cannot.';

create table if not exists public.requests (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    text not null unique default app.new_ticket_id(),

  -- What the visitor told us.
  name         text not null check (length(btrim(name)) between 1 and 120),
  email        text not null check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  company      text check (length(company) <= 160),
  description  text not null check (length(btrim(description)) between 10 and 5000),

  -- Stable keys, never translated labels, so a Persian and an English
  -- visitor choosing the same option produce the same value.
  project_type text not null
                 check (project_type in ('landing','dashboard','mvp','whitelabel','other')),
  budget       text not null
                 check (budget in ('under300','to700','to1500','over1500','unsure')),
  timeline     text not null
                 check (timeline in ('asap','weeks','months','flexible')),

  -- Which sample they came from, if any. Kept on delete so removing a
  -- portfolio entry never destroys the request that referenced it.
  source_project_id uuid references public.portfolio_projects (id)
                      on delete set null,

  -- Which language they were reading, so we know how to reply.
  locale       text not null default 'en' check (locale in ('en','fa')),

  status       text not null default 'New'
                 check (status in ('New','Reviewing','Replied','Won','Lost')),
  -- Triage notes. Team-only, like every other read on this table.
  notes        text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.requests enable row level security;

create or replace trigger requests_touch
  before update on public.requests
  for each row execute function app.touch_updated_at();

-- The dashboard lists newest first and filters by status.
create index if not exists requests_created_idx on public.requests (created_at desc);
create index if not exists requests_status_idx  on public.requests (status, created_at desc);
create index if not exists requests_source_idx  on public.requests (source_project_id);

-- Modest per-address throttle. Deliberately scoped to the sender rather than
-- applied globally: a global cap would let one flood shut the form for
-- everyone, turning an anti-abuse measure into the abuse. Address-based
-- limiting cannot do that.
--
-- Limiting by network address would be stronger, but that means storing
-- something derived from a visitor's IP, which is not a decision to take
-- silently. Not done here.
create or replace function app.throttle_requests()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recent integer;
begin
  select count(*) into recent
  from public.requests
  where lower(email) = lower(new.email)
    and created_at > now() - interval '1 hour';

  if recent >= 5 then
    raise exception 'Too many requests from this address in the last hour.'
      using errcode = '53400';
  end if;

  return new;
end;
$$;

create or replace trigger requests_throttle
  before insert on public.requests
  for each row execute function app.throttle_requests();

-- Anyone may open a ticket.
drop policy if exists requests_insert_public on public.requests;
create policy requests_insert_public
  on public.requests
  for insert
  with check (true);

-- Nobody but the team may read one. There is deliberately no "read your own
-- row" policy: the row is not identified to its author in any way an
-- anonymous caller could prove, so such a policy would in practice mean
-- reading everyone's.
drop policy if exists requests_select_team on public.requests;
create policy requests_select_team
  on public.requests
  for select
  using (app.is_team());

drop policy if exists requests_update_team on public.requests;
create policy requests_update_team
  on public.requests
  for update
  using (app.is_team())
  with check (app.is_team());

drop policy if exists requests_delete_team on public.requests;
create policy requests_delete_team
  on public.requests
  for delete
  using (app.is_team());

-- Column-level insert privileges, so the fields a visitor must not control
-- are refused by the privilege system rather than only by convention.
-- Notably absent: ticket_id, status, notes, and both timestamps.
grant insert (
  name, email, company, description,
  project_type, budget, timeline, source_project_id, locale
) on public.requests to anon, authenticated;

grant select, update, delete on public.requests to authenticated;
