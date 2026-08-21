-- 009  A record of whether the team was actually told.
--
-- The dangerous state is not "we know this was not delivered" — that is
-- manageable. It is "we believe it was delivered and it was not", because
-- nobody looks again. So delivery is recorded as evidence rather than
-- inferred, and the dashboard shows the record instead of a derived boolean.
--
-- Append-only on purpose. Nothing may update or delete a row, by anyone,
-- through the API: a log that can be edited is not evidence. Corrections are
-- new rows.

create table if not exists public.notification_attempts (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  delivered  boolean not null,
  provider   text not null,
  -- Populated when delivery was attempted and failed. Truncated on write so
  -- a provider returning a wall of HTML cannot bloat the table.
  error      text,
  created_at timestamptz not null default now()
);

alter table public.notification_attempts enable row level security;

create index if not exists notification_attempts_request_idx
  on public.notification_attempts (request_id, created_at desc);

-- Only the team reads it. Nobody writes to it directly — see the function.
drop policy if exists notification_attempts_select_team on public.notification_attempts;
create policy notification_attempts_select_team
  on public.notification_attempts
  for select
  using (app.is_team());

revoke all on public.notification_attempts from anon;
revoke all on public.notification_attempts from authenticated;
grant select on public.notification_attempts to authenticated;

-- Recording an attempt.
--
-- Keyed on the ticket reference because that is what the route holds after
-- submitting. Definer rights, since the caller has none on either table.
--
-- A caller who knows a reference could log an attempt against it. That is
-- accepted deliberately rather than overlooked: the reference is only known
-- to us and to the person who submitted, the row can only be added and never
-- altered, and the dashboard renders every attempt rather than a summary —
-- so an invented row appears alongside the real one instead of replacing it.
-- If that ever stops being acceptable, the answer is a one-time token
-- returned by submit_request, not a tighter grant.
create or replace function public.record_notification_attempt(
  p_ticket_id text,
  p_delivered boolean,
  p_provider  text,
  p_error     text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_request uuid;
begin
  select id into v_request
  from public.requests
  where ticket_id = p_ticket_id;

  -- Unknown reference: nothing to attach to, and nothing worth telling the
  -- caller either, since answering would confirm which references exist.
  if v_request is null then
    return;
  end if;

  insert into public.notification_attempts (request_id, delivered, provider, error)
  values (v_request, p_delivered, left(coalesce(p_provider, 'unknown'), 60), left(p_error, 500));
end;
$$;

comment on function public.record_notification_attempt is
  'Appends a delivery record for a request. Append-only: attempts are never updated or removed.';

revoke all on function public.record_notification_attempt(text, boolean, text, text) from public;
grant execute on function public.record_notification_attempt(text, boolean, text, text)
  to anon, authenticated;

-- Convenience for the request list: the latest attempt per request, so the
-- list can show delivery state without fetching every attempt for every row.
-- A view inherits the policies of the tables beneath it, so this adds no
-- access of its own.
create or replace view public.request_delivery as
select distinct on (request_id)
  request_id,
  delivered,
  provider,
  error,
  created_at
from public.notification_attempts
order by request_id, created_at desc;

grant select on public.request_delivery to authenticated;
