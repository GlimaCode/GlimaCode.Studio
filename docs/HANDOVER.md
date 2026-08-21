# Handover

The reasoning the code cannot hold.

`README.md` says what the project is. `docs/RUNBOOK.md` says what to do. This
file says *why*, for the decisions where the obvious reading is wrong and a
reasonable person would "fix" something that is already correct.

Written at the end of the initial build, for whoever picks this up next —
possibly one of us, six months from now, having forgotten all of it.

---

## Decisions that look like mistakes and are not

### The keyboard does not mirror in Persian

`src/components/keyboard/Keyboard.tsx`. Everything else on the site flips
under RTL. The keyboard board does not, and neither does the mobile tap bar.

A mirrored QWERTY is not a Persian keyboard, it is a broken one. The letters
on the action keys are the physical keys a visitor presses, and those keys do
not move when the page direction changes. Only the sub-labels translate.

Related and also deliberate: the shortcut handler matches `event.code`, not
just `event.key`. Under a Persian input layout the physical W key emits `ص`,
so a `key`-only handler works for exactly half the audience.

### There are no client accounts, and there never should be by default

Sign-in is team-only. `team_members` gets its rows by hand in SQL. There is no
public sign-up, no password reset flow for outsiders, no client portal.

The footer's "Team access" link leads to a form that will never accept a
stranger — that is the intended end state, not an unfinished feature. Someone
will eventually read that link as an invitation to build a portal around it.
A client portal is a product decision that needs clients to design for, and
it was explicitly deferred rather than forgotten.

`app.is_team()` is `SECURITY DEFINER` because it reads the very table its own
policy protects. Removing the definer rights makes it return false for
everyone, and the dashboard goes blank for the team while looking fine.

### A failed notification is reported, never retried, and never fatal

`src/app/api/requests/route.ts`. The order is: persist, then notify. A lost
notification is recoverable, because the row is in the database and shows up
in triage. A lost brief is gone, and the visitor believes they sent it.

So nothing after the insert is allowed to fail the response. The delivery
outcome is written to an append-only log, best effort, and **the absence of a
record reads as "not delivered."** That is not a gap — a send that died before
it could log looks identical to one that never ran, and operationally both
mean nobody was told.

There is no retry queue on purpose. The dashboard surfaces the failure loudly
enough that a person replies by hand, which is what the sender actually wants.
A silent retry that eventually succeeds is worse than a visible failure: it
hides how often the pipeline is broken.

If you build retries later, keep the flag. It is the only thing standing
between a quiet outage and a client who thinks they were ignored.

### Ticket references are random, not sequential

`app.new_ticket_id()` in `db/migrations/006_requests.sql`. `REQ-` plus five
random base36 characters, retried until unique.

Sequential ids would be shorter and prettier and would tell every person who
receives one how many requests the studio has ever had, and how many arrived
between theirs and the last one. A two-person studio quoting `REQ-00007` has
said something it did not mean to say.

The function is `SECURITY DEFINER` so its uniqueness check can see rows the
anonymous caller cannot read. That is the whole reason it is definer-rights;
do not "simplify" it.

References are stored on the row, not derived, so they survive a restore. A
reference quoted in an email a year ago still finds the right record.

### The submission throttle counts email addresses, not visitors

Five per address per hour, raising SQLSTATE `53400`, mapped to HTTP 429.

A global cap would let one flood shut the form for everyone, turning the
anti-abuse measure into the abuse. Limiting by IP would be stronger, but that
means deriving and storing something from a visitor's network address, which
is not a decision to take quietly on a marketing site. It was considered and
declined.

The honeypot and the three-second fill timer are cost filters, not security.
Both are forgeable and neither is load-bearing. A tripped honeypot returns
**202 with the same shape as success**, so a bot learns nothing from the reply.

### Anonymous callers cannot read the requests table at all

`db/migrations/008_request_submission.sql` revoked every table privilege from
`anon` and routes submissions through `public.submit_request(...)`, which
returns only the allocated reference.

This exists because of the most expensive mistake in the project. Migration
006 wrote `GRANT INSERT (col, col, ...) ON requests TO anon` believing the
column list restricted what could be written. **Grants only add.** The
platform's default privileges had already granted table-level INSERT, so the
column list restricted nothing: an anonymous caller could set `status` to
`'Won'` and choose its own ticket id.

Re-reading that file would never have revealed it. Only exercising it did.

### The triage list shows less than it could

`listRequests` in `src/lib/data/admin.ts` selects nine columns and none of
them are the visitor's email, their brief, or our notes. Opening the record
loads those.

The list is a surface someone leaves open on a screen while deciding what to
work on. Choosing a row needs a reference, a name, a type and an age. It does
not need a stranger's email address visible to whoever walks past.

`npm run verify:list-privacy` fails the build if that select widens.

### `html[lang]` redefines the font variables — delete this one day

`src/app/globals.css`, near the bottom.

`next/font` injects a metric-matched fallback face *inside* the CSS variable
it generates. That face carries no `unicode-range`, so in
`var(--font-plex-sans), var(--font-vazirmatn)` it claims every Persian glyph
before the cascade reaches Vazirmatn, and the entire Persian site renders in
system Arial while every structural check passes.

`adjustFontFallback: false` is the documented fix. **Webpack honours it;
Turbopack ignores it.** The block reorders the stacks at the CSS level to work
around that, and is harmless under webpack where the fallback family does not
exist and naming it is simply skipped.

**Delete it once Turbopack honours the option.** `npm run verify:fonts` will
fail loudly if it is removed too early — that is exactly what the guard is
for. Verify by loading `/fa` and checking which font is actually drawing the
glyphs, not by reading the stylesheet.

### Small things, so nobody re-litigates them

- **The category filter is a `div` with `role="navigation"`.** The ported
  stylesheet styles `nav` by element with `position: fixed`, so a real `nav`
  there leaves the flow and covers the header.
- **Project titles have no Persian.** `title_fa` is null on purpose — they are
  product names and stay in Latin script. The "showing English" notice is
  keyed off the prose, not the title, or every fully translated entry would
  be labelled untranslated.
- **`<body suppressHydrationWarning>`.** The inline reveal script adds a class
  before React hydrates, which is the point of running it inline. Without the
  suppression, every page load logs a hydration error and a real one would be
  invisible in the noise.
- **The shortcut keys have no `aria-label`.** Their accessible name is their
  own contents, so it matches the visible text by construction. See
  *Measured* below for why the obvious fix does not work.
- **`--red-text`, `--green-text`, `--signal-deep`.** Deeper variants used only
  where the colour has to be *read*. The originals still fill dots, borders
  and backgrounds, which is what they were chosen for.

---

## The verify scripts, and the defect each one is a scar from

None of these were written speculatively. Each one exists because something
broke in a way that reading the code could not have caught.

| Command | What it protects | The defect behind it |
|---|---|---|
| `npm run verify:fonts` | Vazirmatn is reachable in every Latin stack, and every weight used has a real face | The Persian site rendered entirely in system Arial. Every structural check passed. Found only by asking the browser which font was drawing the glyphs. |
| `npm run verify:list-privacy` | The triage list query never selects email, brief or notes | Nothing yet — written the moment the guarantee was made, because widening a select is a one-word change that looks harmless in isolation. |
| `npm run verify:seo` | Every public route declares its own canonical and hreflang | Both work routes inherited the layout's canonical of `/{locale}`, which told search engines every case study was a duplicate of the home page. No error, no warning; the pages simply would never have ranked. |
| `npm run i18n:pending` | No dictionary key ships with placeholder copy | Machine-translated marketing copy is worse than none. This makes the gap a number instead of a hunt. |
| `db/verify/rls_probe.sql` | 18 checks across three caller identities | The `GRANT INSERT (columns)` that restricted nothing. |
| `scripts/verify-public-access.mjs` | The same guarantees over HTTP, through PostgREST, with only the public key | The SQL probe proves policies from inside the database. This proves the result from outside it. Not in `package.json`: it needs a live server and writes one tagged row it cannot delete — which is itself the proof. |

`npm run verify:fonts` **must run after `npm run build`**, because it reads the
emitted CSS rather than the source. That ordering is in CI and was itself a CI
failure first.

Two rules learned the hard way, both encoded in `db/verify/rls_probe.sql`:

**A guard must accept the stronger outcome.** The probe once demanded "zero
rows" everywhere, which quietly encoded the weaker of two protections. When
the system was tightened so anonymous callers were refused outright, the probe
failed — and Postgres's error hint suggested `GRANT SELECT ON public.requests
TO anon`, which would have handed every client brief to the public. A check
written against weaker behaviour does not merely fail when you improve
something; it argues for undoing the improvement.

**A guard you have never watched fail is not a guard.** Every script here was
negative-tested: the thing it protects was deliberately broken, the failure
was read, and the break was reverted.

---

## Measured, and deliberately not changed

Numbers so the next person knows these were decided, not missed.

### The hero entrance costs about 800ms of LCP

Chrome does not count an element at `opacity: 0`, so the hero paragraph — the
largest thing on the page — is recorded only when its fade finishes. Measured
cold-cache at 4× CPU throttle, local production build:

| Hero paragraph entrance | LCP |
|---|---|
| As designed — 0.30s delay, 0.70s fade | **1440 ms** |
| Briefer fade — 0.10s + 0.30s | 835 ms |
| Rise with no fade | 590 ms, equal to first paint |

All three were built and measured. **Kept as designed.** The stagger is
deliberate, and shortening only `.hero-sub` would desynchronise it from the
CTA and meta rows that follow on `d2`/`d3`.

There is a way to make the number better without making the site faster: start
at `opacity: 0.01` instead of `0`, and Chrome counts the element immediately
while the visitor still waits for the fade. **Do not do this.** It improves a
report and nothing else.

### Lighthouse, mobile, at the end of the build

Accessibility, best practices and SEO at **100** on the home pages, the work
index and a case study, in both locales. Performance **92** on the home pages,
85–94 on the work routes with meaningful run-to-run variance. Zero axe
violations on all six public pages, the sign-in screen, and all three
dashboard routes, at 1440 and 375.

### Contrast: what was fixed, and what was left

Fixed, because the colour had to be read: red 4.27 → 4.97, green 2.82 → 5.72,
amber 1.71 → 4.88, and the `hidden`/`Lost` badge 4.39 → 5.10.

**Left alone:** the 10px status dots on the work board, which are below 3:1 as
graphical objects. They now carry `role="img"` and a translated label, so the
state they encode is available as text and the dot is decoration beside it.
Darkening them would make the board read as a warning panel.

### The accessible-name fix that did not work

The shortcut keys failed WCAG 2.5.3: `aria-label="Go to work"` over a visible
"W work". The obvious fix — `aria-hidden` on the letter — was applied, and the
audit **still failed**. `aria-hidden` removes an element from the
accessibility tree, not from the screen, and the rule is about what is on the
screen. The keys are now named by their own contents, so the two strings match
by construction and cannot drift apart.

Recorded because it is a plausible-sounding fix that a future reader will
reach for again.

### Divergences from the prototype

Listed in full in `README.md` under *Deliberate divergences*. Do not "fix"
them back. The short version: fonts are self-hosted, IBM Plex Sans 700 is
loaded (the prototype rendered synthetic bold), Sora 400 is not, prices are
gone, and the accessibility work added a skip link, `<main>` landmarks and an
`<h1>` on the portfolio routes.

---

## If something breaks in production

Work down this list. It is ordered by how often each thing is actually the
cause, not by how dramatic it sounds.

**1. Is the site up at all?** Check the host's deployment log first. A failed
build leaves the previous deployment serving, so the symptom is usually
"my change did not appear", not "the site is down".

**2. Did a request get lost?** Almost certainly not. Open the dashboard: the
row is there or it never arrived. Requests persist before anything else
happens, and nothing downstream can fail the write. If the visitor saw a
ticket reference, the row exists.

**3. Is everything flagged "not notified"?** Expected while no mail provider
is configured. See *Notification failures* in the runbook. It is the true
state, not a bug.

**4. Does the dashboard sign you in and then say you are not on the team?**
The account is real and the roster row is not. Check `team_members` against
the account id in the auth dashboard. This is the normal aftermath of
restoring into a different project.

**5. Is the Persian site rendering in the wrong font?** The `html[lang]` block
in `globals.css` has been removed or a font weight was dropped. Run
`npm run build && npm run verify:fonts`.

**6. Did something change about who can read what?** Run
`db/verify/rls_probe.sql` in the SQL editor. Eighteen checks, and it cleans up
after itself. Read the *observed* column, not just the verdicts — "refused at
the privilege layer" and "0 rows" are both passes but they mean different
things, and which one you get tells you which protection is doing the work.

**7. Rolling back.** The host keeps previous deployments; promoting one is the
fastest fix. Note the exception in the runbook: if the anonymous key was just
rotated, a rollback runs against a key that no longer exists, and the fix is
forward rather than back.

**Do not** poll the live domain in a loop while debugging. Bot protection will
start returning 403 and you will spend an hour diagnosing the wrong problem.
That has already happened once here.

---

## The one habit worth inheriting

Every significant defect in this project was found by exercising the system,
never by reading it:

- The `GRANT` that restricted nothing — found by calling the API as an
  anonymous user.
- The Persian text rendering in Arial — found by asking the browser which font
  was drawing the glyphs.
- The canonical pointing every case study at the home page — found by writing
  a check that reads what each route actually declares.
- The `aria-hidden` fix that did not fix anything — found by running the audit
  again instead of assuming.
- A missing space in the dashboard banner — read past by two people who both
  supplied it mentally, and visible only in a screenshot at a width nobody
  had looked at.

There is a matching trap: a measurement can be true and useless. "No
horizontal overflow at 375px" was correct — the document was exactly 375
wide — while a button sat outside its own card, because the overflow was
inside the card rather than past the viewport. Check that what you measured is
what you meant to ask.

When you change something here, break it on purpose first and watch the guard
catch it. If nothing catches it, that is the thing to write next.
