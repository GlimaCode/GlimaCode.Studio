-- 014  Two more projects on the board.
--
-- CorpOS fills the admin-dashboard gap the pre-outreach audit called the most
-- commercially expensive finding: the services list offered admin dashboards
-- with nothing behind them. It is also the first project on this site that
-- cannot be demonstrated, which is what 013 exists for.
--
-- FocusBoard is the opposite case and is here as a correction: it was going to
-- be marked restricted too, and it should not be. It is one standalone HTML
-- file, it keeps everything in the browser's own storage, it is already
-- published, and it answers HTTP 200 with no X-Frame-Options and no
-- frame-ancestors — so the showcase can open the running thing rather than a
-- sentence about it. Claiming a constraint it does not have would be a worse
-- kind of untruth than saying nothing.
--
-- Copy is English only. Persian is left null on purpose: the reader falls back
-- to English, which is a decision recorded here rather than an oversight for
-- someone to "fix" later by machine-translating it.
--
-- Idempotent: re-running updates the rows rather than duplicating them.

insert into public.portfolio_projects (
  slug, category_id, tech, repo_url, live_url, status, published, sort_order,
  restricted, title_en, summary_en
)
select
  'corpos-internal-platform',
  (select id from public.portfolio_categories where slug = 'admin-dashboard'),
  array['React','TypeScript','Express','Prisma','PostgreSQL','Redis','Socket.io','Docker'],
  null,   -- the repository is private; a card pointing at it would 404
  null,   -- and there is no public deployment, which is the whole point
  'shipped',
  true,
  40,
  true,
  'CorpOS Internal Platform',
  'An internal platform for staff and administrators — role-based access, task routing, attachments and live updates — built on React, Express and Prisma over Postgres and Redis.'
where not exists (
  select 1 from public.portfolio_projects where slug = 'corpos-internal-platform'
);

insert into public.portfolio_projects (
  slug, category_id, tech, repo_url, live_url, status, published, sort_order,
  restricted, title_en, summary_en
)
select
  'focusboard',
  (select id from public.portfolio_categories where slug = 'web-app'),
  array['HTML','CSS','JavaScript'],
  'https://github.com/GlimaCode/focusboard',
  null,   -- set once Pages is enabled on the organisation's copy; see below
  'shipped',
  true,
  50,
  false,
  'FocusBoard',
  'A bilingual, mobile-first kanban board that is a single standalone HTML file — no build, no server, no account, and nothing leaves the browser. Works offline, in English and Persian, light and dark.'
where not exists (
  select 1 from public.portfolio_projects where slug = 'focusboard'
);

-- Re-running this file refreshes the copy without touching anything else, so
-- a wording change is an edit here rather than a hand-typed UPDATE in a
-- dashboard that nobody can review.
update public.portfolio_projects set
  title_en   = 'CorpOS Internal Platform',
  summary_en = 'An internal platform for staff and administrators — role-based access, task routing, attachments and live updates — built on React, Express and Prisma over Postgres and Redis.',
  restricted = true
where slug = 'corpos-internal-platform';

update public.portfolio_projects set
  title_en   = 'FocusBoard',
  summary_en = 'A bilingual, mobile-first kanban board that is a single standalone HTML file — no build, no server, no account, and nothing leaves the browser. Works offline, in English and Persian, light and dark.',
  repo_url   = 'https://github.com/GlimaCode/focusboard',
  restricted = false
where slug = 'focusboard';

-- When GitHub Pages is switched on for GlimaCode/focusboard, run this one line
-- and the laptop opens the running board instead of the repository card. The
-- page was checked and permits framing, so tier 1 will actually engage.
--
--   update public.portfolio_projects
--      set live_url = 'https://glimacode.github.io/focusboard/'
--    where slug = 'focusboard';
