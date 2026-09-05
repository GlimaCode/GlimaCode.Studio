-- 013  Work we can show that we cannot demonstrate.
--
-- The showcase falls back three deep: the running page, then screenshots of
-- it, then the repository as a card you can click through. Every published
-- project reached one of the three, so the chain was complete.
--
-- It is not. Some work cannot be put on a public URL at all — it holds data
-- we are not willing to expose on a demo page — and its repository is private
-- for the same reason. Under the old chain such a project either vanished
-- from /showcase entirely, or, worse, matched the third tier on a repo_url
-- nobody can open and rendered GitHub's 404 card. A broken card is a worse
-- advertisement than no card.
--
-- So: a fourth state, and the honest one. `restricted` means "this exists, we
-- built it, and you cannot look at it from here". The interface says so in a
-- sentence rather than pretending to a demo, and it never attempts the live
-- embed for such a project.
--
-- A flag rather than a per-project reason. The reason is the same one every
-- time and belongs in the dictionary with the rest of the copy, where it can
-- be changed in both languages at once without a migration. If a project ever
-- needs its own wording — a client's name in an NDA, say — that is a later
-- migration and this flag is still what turns the tier on.
--
-- Note what this does NOT change: repo_url. A restricted project may still
-- have a public repository, and if it does the card is worth showing beside
-- the sentence. The rule is only that no live page is attempted. Leave
-- repo_url null when the repository is private, or the card 404s — that is a
-- data decision, not something the interface can guess.
--
-- Idempotent, and safe to re-run.

alter table public.portfolio_projects
  add column if not exists restricted boolean not null default false;

comment on column public.portfolio_projects.restricted is
  'True when the project cannot be shown live or in screenshots. The showcase says so plainly instead of attempting an embed. repo_url is still honoured when the repository is public.';

-- Nothing to grant: the column rides on the existing table privileges, and
-- the policies from 002 already decide who sees the row at all.
