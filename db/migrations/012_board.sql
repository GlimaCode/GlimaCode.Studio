-- 012  The team board.
--
-- A kanban for the two of us. Not a client-facing feature and not a
-- half-public one: unlike requests, which anonymous visitors may insert into,
-- nothing outside the roster may touch these tables in any way. There is no
-- "insert for anon" policy here to get wrong later, and no grant to `anon`
-- at all — the strictest table pair in the schema, deliberately, because it
-- will hold notes we write to each other rather than anything drafted for
-- an audience.
--
-- Two tables. Columns are data rather than an enum so the board can be
-- reshaped without a migration; cards carry the work.
--
-- Idempotent throughout, like every migration here: safe to re-run.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

create table if not exists public.board_columns (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (length(btrim(title)) between 1 and 40),

  -- Where it sits, left to right. Fractional on purpose: inserting between
  -- two neighbours is the midpoint of their positions, which is one write and
  -- touches no other row. Integers would mean renumbering everything to the
  -- right of an insertion, and two people doing that at once is exactly the
  -- race a shared board invites.
  position   double precision not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.board_columns enable row level security;

create or replace trigger board_columns_touch
  before update on public.board_columns
  for each row execute function app.touch_updated_at();

create index if not exists board_columns_position_idx
  on public.board_columns (position);

-- ---------------------------------------------------------------------------
-- Cards
-- ---------------------------------------------------------------------------

create table if not exists public.board_cards (
  id          uuid primary key default gen_random_uuid(),

  -- Deleting a column takes its cards with it. The alternative — orphaned
  -- cards with a null column — is a card that exists and cannot be seen,
  -- which is worse than losing it visibly. The interface refuses to delete a
  -- column that still has cards in it, so this cascade is the backstop and
  -- not the normal path.
  column_id   uuid not null references public.board_columns (id) on delete cascade,

  title       text not null check (length(btrim(title)) between 1 and 200),
  notes       text check (length(notes) <= 5000),

  -- Who is carrying it. A roster reference rather than free text, and null
  -- for unassigned. On delete set null so removing someone from the roster
  -- never destroys the work they were holding.
  assignee_id uuid references public.team_members (user_id) on delete set null,

  -- Stable keys, never labels, for the same reason the request form uses
  -- them: the interface can be relabelled without a data migration.
  priority    text not null default 'normal'
                check (priority in ('low', 'normal', 'high')),

  due_on      date,

  -- A card can point at a request, so "reply to REQ-XXXXX" is one thing on
  -- the board rather than two places to look. Set null on delete: losing the
  -- request should not silently delete the reminder to deal with it.
  request_id  uuid references public.requests (id) on delete set null,

  position    double precision not null,

  -- Who put it there. Not an audit trail, just enough to know who to ask.
  created_by  uuid references public.team_members (user_id) on delete set null,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.board_cards enable row level security;

create or replace trigger board_cards_touch
  before update on public.board_cards
  for each row execute function app.touch_updated_at();

-- The board is read one column at a time, in order.
create index if not exists board_cards_column_idx
  on public.board_cards (column_id, position);
create index if not exists board_cards_assignee_idx
  on public.board_cards (assignee_id);
create index if not exists board_cards_request_idx
  on public.board_cards (request_id);

-- ---------------------------------------------------------------------------
-- Access
--
-- Team only, on every verb, on both tables. app.is_team() is the same
-- function every other policy in this schema uses, so a change of identity
-- provider still touches one function and nothing here.
-- ---------------------------------------------------------------------------

drop policy if exists board_columns_all_team on public.board_columns;
create policy board_columns_all_team
  on public.board_columns
  for all
  using (app.is_team())
  with check (app.is_team());

drop policy if exists board_cards_all_team on public.board_cards;
create policy board_cards_all_team
  on public.board_cards
  for all
  using (app.is_team())
  with check (app.is_team());

-- Privileges are not row filters, and both are needed. `anon` gets nothing:
-- not select, not insert, nothing. That is stricter than requests, which has
-- to accept anonymous inserts, and stricter than the portfolio, which is
-- published. Migration 010 had to take back a privilege that a table was
-- born with; these two are never granted it in the first place.
revoke all on public.board_columns from anon;
revoke all on public.board_cards   from anon;

grant select, insert, update, delete on public.board_columns to authenticated;
grant select, insert, update, delete on public.board_cards   to authenticated;

-- ---------------------------------------------------------------------------
-- Live updates
--
-- Both of us watch the same board, so a change one makes has to arrive on the
-- other's screen without a reload. Realtime replays row changes from the
-- write-ahead log to subscribed clients, and it applies the policies above to
-- each subscriber — the subscription is made with the visitor's own session,
-- so a client that could not read the row cannot receive it either.
--
-- The publication is created by the platform. Adding a table twice raises,
-- so this checks first rather than relying on `if not exists`, which the
-- statement does not support.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'board_columns'
    ) then
      alter publication supabase_realtime add table public.board_columns;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'board_cards'
    ) then
      alter publication supabase_realtime add table public.board_cards;
    end if;
  end if;
end
$$;

-- A deletion arrives at the other screen carrying only the primary key unless
-- the table replicates more. The board needs to know which column a deleted
-- card was in to remove it from the right list, so replicate the whole old
-- row. These tables hold no third-party personal data, so there is nothing
-- here that widening replication exposes.
alter table public.board_columns replica identity full;
alter table public.board_cards   replica identity full;

-- ---------------------------------------------------------------------------
-- The starting shape
--
-- Seeded once. The guard is on the table being empty rather than on the
-- titles, so renaming a column and re-running this migration does not
-- resurrect the original four.
-- ---------------------------------------------------------------------------

insert into public.board_columns (title, position)
select * from (values
  ('Backlog',     1000.0),
  ('In progress', 2000.0),
  ('Review',      3000.0),
  ('Done',        4000.0)
) as seed(title, position)
where not exists (select 1 from public.board_columns);

comment on table public.board_columns is
  'Board columns, left to right by position. Team-only on every verb.';
comment on table public.board_cards is
  'Board cards. Team-only on every verb; anon has no privilege at all.';
