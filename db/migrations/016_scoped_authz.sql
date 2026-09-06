-- 016  scoped-authz joins the board, and brings a category with it.
--
-- The sixth project, and the first that is a library rather than something you
-- can look at. It has no page to open, so it lives at tier 3 — the repository
-- card — permanently and by nature, not while waiting for a deployment.
--
-- ── THE NEW CATEGORY ──────────────────────────────────────────────────────
--
-- None of the four existing categories is true. It is not a landing page, not
-- an admin dashboard, not a web app, and calling a TypeScript authorization
-- library a "data tool" would be the kind of nearly-right that a visitor
-- notices. 003 anticipated this exact case in a comment: a category that has
-- no sample yet is left out, and adding one later is an INSERT rather than a
-- deploy.
--
-- The Persian label is «کتابخانه», the ordinary word for a software library.
-- Ali: this one is terminology rather than marketing copy, but it is still
-- customer-facing and still yours to overrule.
--
-- ── ABOUT THE REPOSITORY BEING PRIVATE ────────────────────────────────────
--
-- Running this while GlimaCode/scoped-authz is private is safe, and does not
-- put a broken card on the site. The showcase now asks GitHub whether the
-- repository can actually be opened before offering it, so a private one is
-- dropped and the project simply does not appear there yet; its case-study
-- page renders without a repository button.
--
-- No deploy is needed when the repository is flipped to public. Read the build
-- output rather than assuming: /en/showcase and /fa/showcase are `● SSG` with
-- `Revalidate 1h`, because the reachability fetches carry
-- `next: { revalidate: 3600 }` and that propagates to the page segment. So the
-- worst case is the repository check's own hour plus the page's, and the
-- project appears on its own. /work/[slug] is `ƒ Dynamic` and picks it up on
-- the first request after its cache entry expires.
--
-- That check had to be added for this project and pays for itself across all
-- six: measured on 2026-09-06, opengraph.githubassets.com answers 200 with the
-- same 506,737-byte generic placeholder for a PRIVATE repository and for one
-- that DOES NOT EXIST, so the card's onError never fires and the visitor
-- clicks through to a 404. See src/lib/data/link.ts.
--
-- Idempotent.

insert into public.portfolio_categories (slug, label_en, label_fa, sort_order)
values ('library', 'Library', 'کتابخانه', 50)
on conflict (slug) do update set
  label_en   = excluded.label_en,
  label_fa   = excluded.label_fa,
  sort_order = excluded.sort_order;
-- `do update`, not `do nothing`. The header hands the Persian term to Ali to
-- overrule, and the file's contract is that re-running it applies a wording
-- change. `do nothing` would have made both statements false the moment the
-- row existed: the edit would sit here looking applied and never reach the
-- database.

insert into public.portfolio_projects (
  slug, category_id, tech, repo_url, live_url, status, published, sort_order,
  restricted, title_en, summary_en
)
select
  'scoped-authz',
  (select id from public.portfolio_categories where slug = 'library'),
  array['TypeScript','Node.js'],
  'https://github.com/GlimaCode/scoped-authz',
  null,   -- a library has no page; tier 3 is where it belongs, not a fallback
  'shipped',
  true,
  60,
  false,
  'scoped-authz',
  'A zero-dependency TypeScript library for role-and-scope authorization — the case where some administrators govern everything and others govern a single department, region or tenant. Scope is kept in your own store rather than in the access token, so removing someone’s authority takes effect on a delay you choose instead of whenever their token happens to expire.'
where not exists (
  select 1 from public.portfolio_projects where slug = 'scoped-authz'
);

-- Re-running refreshes the copy without touching anything else, so a wording
-- change is an edit here rather than a hand-typed UPDATE nobody can review.
--
-- The `is distinct from` guard is not decoration. portfolio_projects carries
-- the portfolio_projects_touch trigger (002), so an unconditional UPDATE
-- rewrites updated_at whether or not anything changed — and sitemap.ts feeds
-- updated_at straight into <lastmod>. Re-running this file would tell every
-- crawler the case study had changed when it had not, which is the exact
-- misuse portfolio.ts warns about in its own comment.
update public.portfolio_projects set
  title_en   = 'scoped-authz',
  summary_en = 'A zero-dependency TypeScript library for role-and-scope authorization — the case where some administrators govern everything and others govern a single department, region or tenant. Scope is kept in your own store rather than in the access token, so removing someone’s authority takes effect on a delay you choose instead of whenever their token happens to expire.',
  repo_url   = 'https://github.com/GlimaCode/scoped-authz',
  restricted = false
where slug = 'scoped-authz'
  and (
       title_en   is distinct from 'scoped-authz'
    or summary_en is distinct from 'A zero-dependency TypeScript library for role-and-scope authorization — the case where some administrators govern everything and others govern a single department, region or tenant. Scope is kept in your own store rather than in the access token, so removing someone’s authority takes effect on a delay you choose instead of whenever their token happens to expire.'
    or repo_url   is distinct from 'https://github.com/GlimaCode/scoped-authz'
    or restricted is distinct from false
  );
