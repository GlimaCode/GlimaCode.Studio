# GlimaCode.Studio

The GlimaCode studio site — [glimacode.com](https://glimacode.com).

React and TypeScript on Next.js, with a Postgres database behind a thin data
layer. A visitor can browse sample work, open a request against any of it,
and get a ticket reference back. The team triages those requests and manages
the portfolio from an authenticated dashboard.

## Stack

| Piece | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) | Per-project metadata for link previews, and a server-side place to handle notifications so no mail credentials reach the browser |
| Language | TypeScript | |
| Styling | Plain CSS with custom properties | The design system is hand-written and token-driven; a utility framework would add a dependency and risk drift |
| Database | Postgres | Schema is plain SQL in `db/migrations`, rebuildable on any host |
| Hosting | Vercel | |

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in the two values
npm run dev
```

The site runs at `http://localhost:3000`. The public pages render without
database credentials; the dashboard and portfolio need them.

```bash
npm run build    # production build
npm run lint     # eslint
npx tsc --noEmit # typecheck
```

## Layout

```
db/migrations/      Plain SQL schema, applied in filename order
docs/               Runbook and operational notes
public/brand/       Logo, lockups, favicon, brand guide
src/app/            Routes and the global stylesheet
src/components/     UI, grouped by area
src/config/         Studio-wide values: brand, contact, links
src/content/        Locale-neutral content that is not yet database-backed
src/i18n/           Locale config, dictionaries, Intl formatting
src/lib/data/       Repositories — the only code that reads or writes data
src/lib/db/         Database client factory, the only import of the provider SDK
src/lib/env.ts      Every environment variable the app reads
```

## Portability

The studio may need to move host or database provider at short notice, so the
project is built to make that a day of work rather than a rewrite:

- Provider SDK imported in exactly one module (`src/lib/db/client.ts`).
- All queries behind repositories in `src/lib/data`.
- Schema and migrations committed as plain SQL, standard Postgres only.
- Nothing operationally important stored only in a provider dashboard.
- Restore, redeploy and DNS procedures written down in [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Languages

The site is English and Persian, path-prefixed as `/en` and `/fa`, both
statically generated. The bare domain redirects to whichever locale the
visitor last read, English by default; browser headers are never used to
guess, because that gets the diaspora case wrong.

There is no translation library. `src/i18n/dictionaries/en.ts` is the source
of truth and defines the type, so a key missing from another locale is a
build error rather than a runtime `undefined`. Numbers and dates run through
`Intl`, which renders Persian-Indic digits on its own.

Marketing prose that has not been written by a native speaker is wrapped in
`pending()` and falls back to English rather than shipping a translation of
the English sentence structure. To see what is still outstanding:

```bash
npm run i18n:pending
```

Persian is right to left, and the layout mirrors with it — except the hero
keyboard, which stays left to right in both locales. It represents a
physical keyboard, and a mirrored QWERTY is not a Persian keyboard; only its
position in the grid flips. Shortcuts match on physical key position as well
as character, so they keep working under a Persian input method.

Brand and technology names stay in Latin script inside Persian sentences.

## Conventions

- Prices on the site are floors, quoted as "from". Keep the copy honest.
- One place for studio-wide values: `src/config/site.ts`.
- Every table gets row-level security in the migration that creates it.
- Only `.env.example` is committed, and only with empty values.

## Team

Built and maintained by:

- [Ali Ahmadi](https://github.com/aliahmadi1382)
- [Mostafa Taghipour](https://github.com/MoStafaMTP)

---

<p align="center">
  <sub>A <a href="https://glimacode.com">GlimaCode</a> project — a two-developer web studio.</sub>
</p>

## License

Released under the [MIT License](LICENSE) — free to use, modify, and distribute,
including commercially, provided the copyright notice is retained. Provided as
is, without warranty.
