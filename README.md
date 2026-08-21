# GlimaCode.Studio

The GlimaCode studio site — [glimacode.com](https://glimacode.com).

React and TypeScript on Next.js, with a Postgres database behind a thin data
layer. A visitor can browse sample work, open a request against any of it,
and get a ticket reference back. The team triages those requests and manages
the portfolio from an authenticated dashboard.

Three documents, and they do different jobs. This one says what the project
is. [`docs/RUNBOOK.md`](docs/RUNBOOK.md) says what to do — deploys, DNS,
backups, key rotation. [`docs/HANDOVER.md`](docs/HANDOVER.md) says *why*: the
decisions that look like mistakes and are not, what each guard is a scar
from, and what to check first when something breaks. Read that one before
changing anything that looks obviously wrong.

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

## Deliberate divergences from the prototype

The port is checked against `studio-site-v3.html` on every phase boundary and
the English rendering is expected to match it exactly. These differences are
intentional. Do not "fix" them back.

**Fonts are self-hosted rather than fetched from Google.** Same typefaces, no
third-party request, and the site keeps its typography on networks where
fonts.googleapis.com is unreachable. This is the only edit inside the ported
stylesheet: three `font-family` declarations now read from variables.

**IBM Plex Sans 700 is loaded.** The prototype loaded 400/500/600 only, while
`<strong>` asks for 700 — so the emphasised names in the hero were rendered
as synthetic bold by the browser, in the prototype and in the port after it.
Real bold is crisper and is not what the prototype shows. The style and
geometry diff still passes, because it measures computed values and box
sizes rather than how glyphs are rasterised.

**Sora 400 is not loaded.** Nothing in the design asks for it; measured, not
assumed.

**Vazirmatn sits ahead of the metric-matched fallback in every Latin stack.**
Without that, Persian renders in system Arial. See the comment in
`globals.css` and the guard in `scripts/verify-fonts.mjs`.

**Prices are gone and the services heading changed** from "Clear price" to
"Clear timeline", so the page does not promise something it no longer shows.

**The category filter is a `div` with a navigation role, not a `nav`.** The
ported stylesheet styles `nav` by element with `position: fixed`, so a real
`nav` there leaves the flow and covers the header.

**The header carries a skip link, and every page has a `<main>`.** The
prototype had neither, so a keyboard user tabbed through the whole header on
every page and a screen reader had no landmark to jump to. The link is
off-screen until focused; nothing changes visually.

**The portfolio routes title themselves with `<h1>`, not `<h2>`.** On the home
page those really are sections under the hero's heading. On their own routes
they are the page, and the outline had no level one at all. `.sec-head h1` in
the additions block reproduces the h2's type exactly, including undoing the
two properties the hero's `h1` carries and `h2` never did.

**Keys on the shortcut board are named by their own contents.** They carried
`aria-label="Go to work"` over a visible "W work", which fails WCAG 2.5.3 —
someone driving the page by voice reads the screen, says what they see, and
nothing happens. Hiding the letter from assistive technology does not fix it;
the rule is about what is visible, not what is exposed. Dropping the label so
the name is the visible text is the only version that cannot drift.

**Three accents have deeper variants for use as text.** Red, green and amber
were chosen to be noticed, not read: as text on paper they measure 4.27, 2.82
and 1.71 against a 4.5 requirement. The originals still fill dots, borders and
backgrounds. See the contrast block at the end of `globals.css` for the
measurements and for what was deliberately left alone.

**The hero entrance is unchanged, and it costs about 800 ms of Largest
Contentful Paint on a first visit.** Chrome does not count an element at
`opacity: 0`, so the hero paragraph — the largest thing on the screen — is
recorded only when its fade finishes. Measured cold with a 4× CPU throttle:
1440 ms as designed, 835 ms with a briefer fade, 590 ms with the rise but no
fade. This is a design decision, not a defect, and it is written down here so
the next person to run Lighthouse knows it was measured rather than missed.

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
