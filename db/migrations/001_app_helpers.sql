-- 001  Identity helpers and the team roster.
--
-- Everything provider-specific about "who is asking" is confined to
-- app.current_user_id(). Every row-level security policy in later migrations
-- goes through app.is_team() and never calls the provider's own function
-- directly, so moving to another Postgres host means rewriting one function
-- rather than every policy.

create schema if not exists app;

-- The only line in the schema that knows which provider we are on.
-- On a different host, replace the body: a session setting, a JWT claim
-- read another way, or current_user — nothing else changes.
create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

comment on function app.current_user_id() is
  'Current authenticated user. The single provider-specific point in the schema.';

-- The two of us. Rows are inserted by hand in phase 4, after the accounts
-- exist; there is deliberately no self-service path into this table.
create table if not exists public.team_members (
  user_id    uuid primary key,
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

-- Membership decides every write policy in the schema.
--
-- SECURITY DEFINER is required, not decorative: the function reads
-- team_members, which is itself protected by row-level security, and a
-- policy that had to read the table to decide whether you may read the
-- table would recurse. Running as the owner sidesteps that. search_path is
-- pinned so the body cannot be redirected by a caller's own path.
create or replace function app.is_team()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.team_members
    where user_id = app.current_user_id()
  );
$$;

comment on function app.is_team() is
  'True when the caller is a studio team member. Used by every write policy.';

grant execute on function app.current_user_id() to anon, authenticated;
grant execute on function app.is_team() to anon, authenticated;

-- Team members can see the roster. Nobody else can, and nobody can change it
-- through the API at all — membership is granted in SQL, on purpose.
drop policy if exists team_members_select_team on public.team_members;
create policy team_members_select_team
  on public.team_members
  for select
  using (app.is_team());

-- Keeps updated_at honest without the application having to remember.
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
