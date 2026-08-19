-- 002  Portfolio: categories and projects.
--
-- Translated text is duplicated per locale on the row; everything
-- locale-neutral stays a single column. With two locales that keeps one
-- dashboard form editing both languages, avoids a join on every read, and
-- leaves no "which slug wins" question to answer.
--
-- English columns are NOT NULL, Persian columns are nullable. A missing
-- translation falls back to English on the public site, and the dashboard
-- lists the gaps so they do not sit unnoticed.

create table if not exists public.portfolio_categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  label_en   text not null,
  label_fa   text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.portfolio_categories enable row level security;

create table if not exists public.portfolio_projects (
  id          uuid primary key default gen_random_uuid(),

  -- Locale-neutral.
  slug        text not null unique,
  category_id uuid not null references public.portfolio_categories (id)
                on delete restrict,
  tech        text[] not null default '{}',
  repo_url    text,
  live_url    text,
  -- Plain URLs rather than a provider's storage handle, so the images can be
  -- rehosted anywhere with an UPDATE instead of a schema change.
  cover_url   text,
  gallery_urls text[] not null default '{}',
  status      text not null default 'shipped'
                check (status in ('shipped', 'in_progress', 'planned')),
  published   boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Translated.
  title_en       text not null,
  title_fa       text,
  summary_en     text not null,
  summary_fa     text,
  problem_en     text,
  problem_fa     text,
  description_en text,
  description_fa text
);

alter table public.portfolio_projects enable row level security;

-- Replaceable so the file stays safe to re-run, like the tables above.
create or replace trigger portfolio_projects_touch
  before update on public.portfolio_projects
  for each row execute function app.touch_updated_at();

-- The public list is always "published, in display order".
create index if not exists portfolio_projects_published_idx
  on public.portfolio_projects (published, sort_order);

create index if not exists portfolio_projects_category_idx
  on public.portfolio_projects (category_id);

-- Categories are public: the filter has to render before anything is chosen.
drop policy if exists portfolio_categories_select_public on public.portfolio_categories;
create policy portfolio_categories_select_public
  on public.portfolio_categories
  for select
  using (true);

drop policy if exists portfolio_categories_write_team on public.portfolio_categories;
create policy portfolio_categories_write_team
  on public.portfolio_categories
  for all
  using (app.is_team())
  with check (app.is_team());

-- One SELECT policy rather than two. Multiple permissive policies are OR'd,
-- so splitting them would say the same thing less clearly: anonymous
-- visitors see published rows, the team sees everything including drafts.
drop policy if exists portfolio_projects_select on public.portfolio_projects;
create policy portfolio_projects_select
  on public.portfolio_projects
  for select
  using (published or app.is_team());

drop policy if exists portfolio_projects_write_team on public.portfolio_projects;
create policy portfolio_projects_write_team
  on public.portfolio_projects
  for all
  using (app.is_team())
  with check (app.is_team());
