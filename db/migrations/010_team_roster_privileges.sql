-- 010  Take anon's leftover privilege on the team roster.
--
-- Found while fixing the probe. team_members was created in 001, before any
-- revoke, so it still carries the table privileges the host grants by
-- default to every new table in public. Nothing leaks: the only policy on it
-- requires app.is_team(), so an anonymous caller reads zero rows.
--
-- But it is protected by one layer where requests is protected by two, and
-- the difference is not deliberate — it is just the order the tables were
-- created in. A policy loosened by mistake would find the privilege already
-- sitting there, which is the shape of the mistake 006 made and 008 fixed.
--
-- The roster is not public data. It maps our account identifiers to our
-- names, and nothing outside the dashboard needs to read it.
--
-- Idempotent, and safe to run before or after the probe: the probe accepts
-- either a refusal or an empty result for this table, precisely so tightening
-- it cannot turn a green check red.

revoke all on public.team_members from anon;

-- Unchanged, and restated so this file says what the end state is rather
-- than only what it removed. Still gated by the policy from 001.
grant select on public.team_members to authenticated;
