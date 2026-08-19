-- 003  Seed: the four categories and the three published projects.
--
-- Idempotent, so re-running against an existing database is safe.
--
-- Persian labels and every case-study field are deliberately absent. The
-- summaries below are the copy already live on the site; the longer
-- problem/description text is written and approved separately and lands in
-- its own migration, because migrations are append-only and copy review
-- should not hold up the schema.
--
-- E-commerce is not seeded. There is no sample of it yet, and adding the
-- category later is one INSERT rather than a deploy.

insert into public.portfolio_categories (slug, label_en, label_fa, sort_order)
values
  ('landing-page',    'Landing Page',    'لندینگ‌پیج',    10),
  ('admin-dashboard', 'Admin Dashboard', 'داشبورد ادمین', 20),
  ('web-app',         'Web App',         'وب‌اپلیکیشن',   30),
  ('data-tool',       'Data Tool',       'ابزار داده',    40)
on conflict (slug) do nothing;

insert into public.portfolio_projects (
  slug, category_id, tech, repo_url, status, published, sort_order,
  title_en, summary_en
)
select
  v.slug,
  c.id,
  v.tech,
  v.repo_url,
  v.status,
  v.published,
  v.sort_order,
  v.title_en,
  v.summary_en
from (
  values
    (
      'listing-quality-auditor',
      'data-tool',
      array['Node.js', 'Rules as data', 'Zero deps', 'Tested'],
      'https://github.com/GlimaCode/listing-quality-auditor',
      'shipped', true, 10,
      'Listing Quality Auditor',
      'A product-data quality auditor with its rules held as data rather than code. Report-only by design, built on the principle that absence of evidence is never a pass. Zero dependencies, covered by a full test suite.'
    ),
    (
      'vehicle-catalog',
      'web-app',
      array['Node.js', 'React', 'SQLite', 'Search'],
      'https://github.com/GlimaCode/vehicle-catalog',
      'shipped', true, 20,
      'Vehicle Catalog',
      'A standardised vehicle catalogue with explain-why search results, an alias system for messy inputs, a validation workflow, and spreadsheet export for downstream teams.'
    ),
    (
      'title-batch-generator',
      'data-tool',
      array['React', 'TypeScript', 'Vite', 'CSV pipeline'],
      'https://github.com/GlimaCode/title-generator',
      'shipped', true, 30,
      'Title Batch Generator',
      'A rule-based engine that generates compliant product titles for hundreds of listings at once — deterministic, traceable, and entirely client-side, so no data ever leaves the browser.'
    )
) as v (
  slug, category_slug, tech, repo_url, status, published, sort_order,
  title_en, summary_en
)
join public.portfolio_categories c on c.slug = v.category_slug
on conflict (slug) do nothing;
