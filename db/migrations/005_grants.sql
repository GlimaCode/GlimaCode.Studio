-- 005  Privileges the schema needs to be self-sufficient.
--
-- Two separate gaps, both found by applying 001-003 to a real database.
--
-- 1. Migration 001 granted EXECUTE on app.is_team() and app.current_user_id()
--    but never granted USAGE on the schema that contains them. Those two
--    grants are not alternatives, they are both required: EXECUTE says the
--    role may call the function, USAGE says the role may reach into the
--    schema to find it. Without USAGE the call fails with "permission denied
--    for schema app" before EXECUTE is ever consulted — and because every
--    row-level security policy in 002 calls app.is_team(), that failure
--    surfaces as every policy erroring rather than as anything obviously
--    grant-shaped. This was applied by hand to unblock; it belongs here so a
--    database rebuilt from source does not hit the same wall.
--
-- 2. Nothing in 001-003 grants table privileges. On the current host they
--    are supplied by the platform's default privileges, which is why the
--    checks pass today. Those defaults are not part of this repository, so a
--    rebuild on a plain Postgres would produce tables that row-level
--    security guards correctly and that nobody can read at all. Granting
--    them explicitly makes the repository the source of truth rather than
--    the hosting account.
--
-- Privileges are not row filters. Every grant below is still subject to the
-- policies in 002: SELECT on portfolio_projects lets a caller ask, and the
-- policy decides which rows come back. The write grants to `authenticated`
-- are likewise gated by `with check (app.is_team())`, which is what the
-- off-roster probe demonstrated.
--
-- Idempotent: re-granting an existing privilege is a no-op.

grant usage on schema public to anon, authenticated;
grant usage on schema app    to anon, authenticated;

-- Reading. The filter has to render before anything is chosen, so categories
-- are readable by everyone; projects are readable by everyone and filtered
-- down to published rows by policy.
grant select on public.portfolio_categories to anon, authenticated;
grant select on public.portfolio_projects   to anon, authenticated;

-- Writing. Only signed-in callers may attempt it, and only team members
-- succeed — the policy, not the grant, is what enforces that.
grant insert, update, delete on public.portfolio_categories to authenticated;
grant insert, update, delete on public.portfolio_projects   to authenticated;

-- The roster is readable only by the team, and only through its policy.
-- No write privilege is granted to anyone: membership is changed in SQL, on
-- purpose, so there is no path to it through the API.
grant select on public.team_members to authenticated;
