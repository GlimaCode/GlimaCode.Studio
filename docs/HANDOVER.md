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

### The ported stylesheet styles four elements by tag

`nav`, `header`, `section` and `footer` carry bare element rules in the
ported region of `globals.css`, with layout that only makes sense on a
marketing page — `nav` is `position: fixed`, `header` is
`padding: 150px 0 84px`.

The dashboard loads the same stylesheet and wants none of it. Twice now, a
dashboard or component file has reached for one of those tags for a perfectly
good semantic reason and silently inherited the layout:

- The portfolio filter used a `nav`, took `position: fixed`, and covered the
  site header.
- The dashboard title strip used a `header`, took the 150px padding, and
  became a 297px sticky bar with a backdrop blur washing out the top third of
  every dashboard page. It was introduced *by an accessibility fix*, passed
  every axe check, survived a build, and appeared in screenshots that were
  looked at and read as generous whitespace.

Neither was caught by types, lint, axe, or a passing build. Both had the same
one-line fix: keep the ARIA role, drop the element.

`npm run verify:dashboard-shell` now fails the build on any of those tags in
a dashboard file, and reads the forbidden set out of the stylesheet so a new
bare rule tightens it automatically. Headings are exempt on purpose — the
first version of that check failed the build over `<h1>`, whose ported rule
carries a `max-width` the dashboard already overrides. A container is the
problem; a heading is not.

### Two tokens change role between the themes

`src/app/globals.css`. The dark theme is not an inversion; two tokens do a
different job in each theme and had to be split.

**`--ink` was the text colour and also the fill behind seven white labels** —
the header CTA, both avatars, the contact card, the active filter chip, the
assignee tag and the locale badge on a request row. That works only while
exactly one of the two themes is dark. Inverted, every one of them becomes a
near-white block with white text on it. `--emph-bg` / `--emph-fg` now own that
job. Six were found by reading the stylesheet; the seventh was found by
looking at a screenshot, because a token that resolves cleanly is invisible to
a contrast check.

`verify:contrast` refuses `background: var(--ink)` in any code written below
the dark-theme marker. The rules above it are the originals, which the dark
section overrides rather than edits.

**`--cobalt` is read as text and also filled behind white text.** On paper one
value serves both. Lifted to `#6E8BFF` so it can be read on a dark ground, it
measures 3.09 against white and can no longer carry a white label. Fills use
`--cobalt-solid`, tuned the other way — dark enough for white at 5.29, light
enough to read as a button against the page at 3.39. Thin rules and bars keep
the brighter value; they carry no text.

### The dark theme is stamped before paint, and the media query is the fallback

An inline script in each layout writes `data-theme` on `<html>` before the
first paint, so the common path needs one selector and there is no flash. The
`@media (prefers-color-scheme: dark)` block is scoped to
`:root:not([data-theme])` and exists only for the no-JavaScript path — it must
never compete with a stamped choice.

The control has three states, not two. "Follow the system" is the default, and
a two-state switch turns every curious click into a permanent override with no
way back.

The two dark blocks — the stamped one and the media one — must carry the same
token set. `verify:contrast` compares them, and caught them drifting when a
token reached one and not the other.

### The keyboard faces the viewer, and the depth is deliberate

The prototype had it isometric — `rotateX(45deg) rotateZ(-13deg)`, a product
shot from above and to one side. It is now front-on at 25 degrees with no
twist.

Less rotation means less depth from a transform, so the depth was rebuilt
where it can be seen: perspective tightened from 1200px to 700px, a deeper
base under the deck, taller walls under every cap, and a rim of light along
each cap's top edge. The scroll parallax no longer rotates — on a square-on
board a couple of degrees reads as a crooked keyboard rather than as movement.

Keycaps read as objects because of a relationship, not a palette: face lit
from above, the wall below it darker than the face, the deck darker again.
Inverting the values for dark would put the light where the shadow belongs.

### The hero line cycles eleven languages, and which eleven was measured

`src/i18n/greetings.ts` holds the table; `Hero.tsx` renders the visitor's own
language server-side, and `SiteMotion.tsx` takes it round, setting `lang` and
`dir` with each turn. The whole sentence changes, not just the greeting word:
one word in another language reads as a flourish, a whole sentence reads as a
studio that works in more than one.

**It is a tour, not a metronome.** Each language holds 3.2 seconds except the
visitor's own, which holds 5 — so the line goes round all eleven, comes home,
rests, and goes again. That is why the rotation is a self-scheduling
`setTimeout` rather than a `setInterval`: the delay is decided per step by
which language is on screen, and an interval cannot vary. Timed with a
MutationObserver on both locales: `en -> es -> fr -> ar -> ru -> pt -> de ->
it -> tr -> id -> fa -> en`, eleven distinct languages, others at 3.203s and
home at 5.004s.

Note what this does not do: the rotation is still perpetual, so the WCAG 2.2.2
position is unchanged from before this feature existed — there is no
pause control, and the three-word version that shipped first had none either.
Ali was shown that and chose the rest-and-repeat shape knowingly. Adding a
control later is `REST_MS`, `STEP_MS` and a button.

**Chinese, Japanese and Hindi are missing on purpose, and the reason is
measured.** The site loads IBM Plex Mono and Vazirmatn, which between them
cover Latin, Cyrillic and Arabic script — not Greek, which is worth saying
because IBM Plex *Sans* has a Greek face and Plex *Mono* does not. Asked with CDP's
`CSS.getPlatformFontsForNode` which face actually drew each candidate, Chrome
answered NSimSun for Chinese, MS Gothic for Japanese and Nirmala UI for Hindi:
system fonts, different on every platform, and absent altogether on a machine
with no CJK or Devanagari installed, where the line becomes empty boxes.
Shipping them properly means a CJK webfont, and those are megabytes against an
LCP element that is not to be touched. `verify:greeting-fonts` now fails the
build if anyone adds one without solving that.

Two smaller things that were also measured rather than assumed. The `lang` on
each turn is what stops a screen reader reading Turkish in an English voice.
The `dir` is what keeps the em dash on the correct side for the two
right-to-left entries — an em dash between neutral characters is placed by the
surrounding direction, and this stylesheet has been bitten by that three times
already.

And the eyebrow reserves room. Every one of the eleven fits on one line down to
720px, so nothing is reserved there; below it the longest wrap to two, so two
lines are held (`min-height: 54px`). Without that the headline moved 20px every
time a longer language came round — a layout shift on a timer, happening while
somebody is reading. Verified by walking all eleven strings through the element
at 1280 and 375 and checking the headline's top never changes.

### Ones and zeroes on the grid

`src/components/site/GridBits.tsx`, mounted as a child of `<body>` in the
locale layout. Digits ride the 48px grid the body paints, are pushed away by
the pointer, and settle back onto the line they were on.

- **A canvas, not elements.** Ninety absolutely positioned spans animated per
  frame is ninety style recalculations per frame; one canvas is one. Measured
  cost of the loop: 16.6ms median frame with it running, 16.5ms with the canvas
  detached — both at the vsync cap, so the difference is unmeasurable.
- **`z-index: -1` on a fixed child of body** paints it above the body's grid
  and below every piece of content, with `pointer-events: none` so it can never
  take a click.
- **Document space, drawn minus `scrollY`.** The body's grid scrolls with the
  page and a fixed canvas does not; without the offset the digits slide off the
  lines the moment the page moves.
- **The canvas is never created under `prefers-reduced-motion`.** Not slowed,
  not static. The loop also stops when the tab is hidden.
- **Canvas text does not wait for webfonts.** Setting `ctx.font` to a family
  that has not loaded yet silently draws in something else, and the first
  frames of a cold load came out as tofu boxes. It re-reads on
  `document.fonts.ready`. Found by screenshotting during a cold load, which is
  the only moment it exists.

Every claim above about position and behaviour was checked by sampling the
painted canvas: every inked pixel sits within 7px of a grid line; ink within
30px of a held pointer goes to zero while the same ink stays within 150px; and
after the pointer leaves, all of it is back on the lines and still moving.

### The blueprint grid is tuned to a loudness, not flipped

Light measures 1.21:1 against its page. The dark value was chosen at 1.23 to
match that, rather than at whatever an inversion produced — a naive flip gives
bright lines on dark, which is louder than the original ever was on light.

### /showcase falls back three deep, and that is why it is on

`siteConfig.features.showcase`. The laptop shows, in order of how much it
proves:

1. **The running page**, in an iframe, if the project is deployed and permits
   framing.
2. **Screenshots**, from `cover_url` and `gallery_urls`.
3. **The repository**, as GitHub's own social card, with the whole screen
   linking to it.

The third tier is what let the page go live. It was gated while it could only
show screenshots and there were none; a device opening onto nothing tells a
prospect we build things we cannot show. Every published project has a
`repo_url`, so the laptop now always opens onto something real.

**"Show the GitHub page" cannot mean an iframe of it.** github.com sends both
`X-Frame-Options: deny` and `frame-ancestors 'none'` — it will never render in
a frame, anywhere. What is shown instead is the PNG GitHub generates for link
previews, carrying the repository name, description, language and star count.
It rate-limits: one of three repositories answered 429 during testing, so an
`onError` falls back to a plain card of our own. An image reports its own
failure; an iframe does not, which is the whole reason tier 1 is decided on
the server.

The card is `object-fit: contain`, not `cover`. GitHub's card is 2:1 and the
screen is 16:10, and the sides that `cover` crops are where the repository
name and its description live.

### The laptop is a lid, a 22px bar and one transition curve

`.sc-lid` is `rotateX(90deg)` shut and `rotateX(-11deg)` open, inside a
`.sc-rig` tilted 16 degrees, above a `.sc-base` that is a 22px bar. There is
no keyboard, no deck, and nothing in the third dimension but the lid. It took
six passes to arrive back at almost exactly the object it started as, and the
value of writing that down is that four of those passes will look like good
ideas again.

**Ninety degrees, because the face has to change.** It shipped at 68, on the
reasoning that 90 leaves the lid 16 degrees off edge-on and it would all but
vanish. The vanishing is real — the shut lid projects 29px — and it does not
matter, because a closed laptop seen from the front is mostly its front edge.
What 68 does is stop short of the face change: under 90 the sum of lid and
rig still points the screen at the viewer, so the machine reads as folded all
the way back. Ali saw it as 270 degrees open. Raising it is the other trap:
the lid grows to 70px at 98 degrees, 112 at 106, 202 at 124, as a flared
trapezoid spreading below the machine.

**The curve was the fault, not the geometry, and it took filming to see.**
Three separate passes tried to fix the movement by adding a body for the lid
to lift off — a deck as deep as the screen, a shallow deck, an edge-on deck
drawn entirely by the perspective. Wedge, funnel, tray. A flat keyboard panel
that grew in height. Ali rejected all four on sight, and each time the real
complaint was that the lid did not appear to travel.

It did not. The site's house curve, `cubic-bezier(.22,1,.28,1)`, puts ninety
per cent of the travel in its first hundred milliseconds. Filmed at 115ms
intervals, the lid was already open in the first frame after the click. It
did not come up, it appeared — and a thing that appears has to have come from
somewhere, which is what "the screen rises from behind" was describing. The
lid now uses `.9s cubic-bezier(.45,.05,.55,.95)`: half way through the swing
at half the time. Filmed again, in both directions, it lifts off the front of
the machine and settles back onto it.

This is the only place on the site that departs from the house curve, and it
should stay departed. It is also the only change from the version before all
of this: one declaration.

**What not to try again.** A deck, in any of its forms — at
`perspective: 1500px` on a 560px object every plane that recedes flares into
a funnel, and the parts of this machine that recede have to be small enough
that the perspective never gets to show off. The 22px bar is that. A front
lip: 350px nearer the eye it is magnified 30% and reads as a second, wider
plate. Drawing a keyboard: at this scale the panel is 40px tall and any key
detail in it becomes a band.

None of the angles were worked out on paper. Each was settled by rendering
the lid at a list of them and looking, and the fault that mattered was found
only by filming the transition rather than screenshotting its two ends. Four
times the reasoning and the render disagreed, and the render was right every
time — including about which way a positive `rotateX` tips a plane, which is
the sort of thing one is sure about right up until the screenshot arrives.

The phone is 125 degrees closed, not the 92 it started at. 92 is two degrees
past edge-on and a plane two degrees from edge-on is a hairline, so on a phone
the object was invisible until it was tapped — a poor invitation to tap it.
125 leaves a back turned towards the viewer. The laptop gets away with lying
almost flat because it has a base to sit on; the phone has nothing but
itself. `rotateY` is physical, so RTL gets the mirrored sign, or the phone
swings in from the side the eye is travelling away from.

Which project is open lives in the URL hash rather than in component state, so
the open lid is shareable and the back button works.

### The board writes through the server and reads on a socket

`/dashboard/board`. Worth knowing why it is built the way it is, because the
obvious alternative looks cheaper and is not.

Every write is a server action that returns the whole board it produced. The
realtime subscription carries no data into the state at all — it is used only
to learn that *somebody else* wrote something, at which point the client asks
for the board again. Applying the replayed row payloads directly would save a
round trip and would mean two clients merging partial rows out of order,
which is a class of bug that takes a week to find and cannot be reproduced on
demand. The board is two people's task list; it is not a document editor and
does not need to behave like one.

The client suppresses the echo of its own writes with a ref, so a change made
here costs one read rather than two.

**Dragging is not the only way to move a card, and that is not politeness.**
HTML5 drag events do not fire on touch at all, so on a phone the four move
buttons on each card are the only mechanism; they are also what a keyboard
reaches and what a screen reader reads, and their labels name the card and
the destination because an arrow glyph says nothing out loud. They are 24px,
which is the WCAG 2.2 target minimum, not a pixel under.

**Every colour is a token that already existed.** The priority chips reuse
the request badges, the due dates reuse the error and muted text colours.
Nothing new was introduced, so `verify:contrast` did not need a new pair — a
new pair here would be one the guard does not know about, and the point of
that guard is that it knows about all of them.

**The dashboard shell caught me again.** The first draft of the board used
`<section>` for a column and `<header>` for its title row, and
`verify:dashboard-shell` failed the build: the ported stylesheet lays those
out by element name, which is how the dashboard once grew a 297px blurred
bar. Third time that guard has earned itself. Columns are
`<div role="group">` now.

**Moves are anchored, and the first version was not.** A move says "put this
card above that one", never "put it at slot 3". Three lists are in play — what
the browser draws, which still contains the card being dragged; what the
filter leaves visible; and what the column actually holds — and an index means
a different thing in each. Indexed, every downward drag inside a column landed
one slot below the line it had just drawn, and any drag with a search active
landed somewhere else entirely. A neighbour's identity survives all three
lists, another person's concurrent move, and the drag being in the air when
the anchor disappears (it falls back to the end).

**The optimistic move needed a sort to be visible at all.** It computed the
right new position and pushed the card onto the end of the array, and nothing
sorted by position — so the card stayed where it was for the whole round trip
and then jumped. `ordered` sorts; without it the optimism was invisible and
the code that produced it was dead.

**Server actions return a result; they do not throw at people.** Next.js
redacts errors thrown out of a server action in production, so every message
written here for someone to read — "That column still has 3 cards in it" —
reached nobody outside development. Expected failures are values now.
Unexpected ones still throw, are still redacted, and go to the log, which is
right: a database error is not something to put on a card.

**The echo window is a timestamp, not a flag.** Postgres replays our own
writes back over the same channel and the replay lands *after* the action has
resolved, so a boolean cleared in a `finally` was always already false: every
local change cost a second full read and announced "Board updated." to the
person who had just made it. A remote change that arrives inside the window is
retried, not dropped — it belongs to the other person and losing it is the
failure the window exists to avoid.

**Everything above was found by a six-lens adversarial review, not by using
the board.** Nineteen confirmed findings on a feature that had passed nine
guards, types, lint and a build. None of them were reachable by reading the
diff once; all of them were reachable by reading it adversarially with a
specific question in hand. The board still had not been used by anyone at the
point they were fixed.

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

- **The category filter is a `div` with `role="navigation"`, and the
  dashboard title strip is a `div` with `role="banner"`.** Not a style
  preference — see *The ported stylesheet styles four elements by tag* below.
  Both are landmarks; neither may be the matching element.
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
| `npm run verify:repo-links` | Every repository the public site links to actually opens for a stranger | Adding `scoped-authz` exposed it: `opengraph.githubassets.com` answers **200** with the same 506,737-byte generic placeholder for a *private* repository and for one that *does not exist*, so the card's `onError` never fires. The laptop showed a GitHub logo and the click would have landed on a 404. `src/lib/data/link.ts` now drops such a repository at build time; this says so out loud, because the visible symptom otherwise is a project quietly missing from `/showcase`. Not in CI, for the same reason as `verify:copy-sync`: the checks job holds no database credentials on purpose. |
| `npm run verify:seo` | Every public route declares its own canonical and hreflang | Both work routes inherited the layout's canonical of `/{locale}`, which told search engines every case study was a duplicate of the home page. No error, no warning; the pages simply would never have ranked. |
| `npm run verify:dashboard-shell` | No dashboard file uses an element the ported stylesheet lays out by tag | The portfolio filter as a `nav` (covered the header), then the dashboard title strip as a `header` (a 297px blurred bar over the top third of every page). Same bug twice, two phases apart. |
| `npm run verify:contrast` | 31 colour pairs meet their threshold in BOTH themes, and `--ink` is never used as a fill in new code | Adding a second theme doubles every chance of the four contrast failures the light theme shipped with. It caught the action keycap label at 4.39 in dark — measured by hand against the wrong background — and the two dark token blocks drifting apart. |
| `npm run verify:offscreen` | No large negative *logical* inset parks something off-screen | The skip link used `inset-inline-start:-9999px`, which resolves to the RIGHT in a right-to-left page: on `/fa` it sat at x=+11331. No scrollbar appeared only because its container happened to be `position: fixed`. |
| `npm run verify:copy-sync` | The three home-board cards still match the portfolio rows they mirror | The same copy lives in the dictionary and in the database with nothing holding them together, and the dashboard tells you content is edited in the database. It found real drift within minutes of being written. Not in CI: the guard workflow has no database credentials on purpose. |
| `npm run verify:greeting-fonts` | Every language in the rotating hero line uses only scripts IBM Plex Mono or Vazirmatn can draw | Adding a language is one line in a table, which is exactly the kind of change nobody thinks about type for. Chrome reported NSimSun, MS Gothic and Nirmala UI for Chinese, Japanese and Hindi — system fonts, different on every machine and missing entirely on some. |
| `npm run verify:bidi-fallback` | English prose falling back on a Persian page is bidi-isolated, and the isolates never reach the `<head>` | The portfolio's database fallback rendered bare inside an RTL page, so the bidirectional algorithm moved every sentence-final full stop to the left margin: `/fa/work/focusboard` read `.English and Persian, light and dark`. `i18n/pending.ts` had solved this for dictionary copy and its own comment claimed the portfolio did the same — the comment made the gap harder to see rather than easier. Photographed before and after. |
| `npm run verify:theme-stamp` | Only `<html>` carries `suppressHydrationWarning`, where the theme script actually writes | Suppressing it higher up would hide every genuine hydration mismatch below it. The guard first failed on its own documentation, because the comment explaining it contained a literal `<html>` — the same mistake `verify:offscreen` made once. |
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

### Dark theme: what was measured

31 pairs, both themes, re-measured on every build. The tightest is the header
CTA's hover label at 4.53:1 against a 4.5 threshold, so there is very little
room — a nudge to `--cobalt-solid-hover` will fail the build, and that is the
guard working rather than a fragility to route around.

Five pairs are exempt in writing, with the reason: the card border, the page
grid, and the keycap edge are decorative in both themes and sit at 1.15–1.23
by design, and the two 10px status dots carry `role="img"` and a translated
label so the state they encode is available as text.

Persian in dark is one weight step lighter than in light. It measured
identical — same face, same weight, same size, confirmed through
`CSS.getPlatformFontsForNode` — and read visibly heavier, because light text
on a dark field blooms. Latin is untouched.

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
- The seventh place `--ink` was used as a fill — six were found by reading the
  stylesheet, and the last one only by looking at the dashboard in dark, where
  it was a white box with white text in it.
- The laptop, six times over, every rejection from Ali and every one in a
  single glance. Stylised to 68 degrees to avoid a vanishing act that did not
  happen, and it read as folded all the way back. Rebuilt with a real deck,
  uglier than the bug. Fixed to 90 with no body, and the lid appeared rather
  than lifted. An edge-on deck: a tray. A flat keyboard panel: not what he
  asked for either. The answer was one transition curve, and the object he
  wanted was the one he already had. Four of those six passes were me adding
  geometry to fix a timing problem.
- The transition curve itself, which went unexamined through all of it because
  two screenshots of the two end states look identical whatever the easing is.
  Filming at 115ms intervals showed the lid reaching ninety per cent of its
  travel in the first frame. The whole of "it comes from behind" was "it does
  not appear to move at all". Anything that animates gets filmed now.
- **A test that passed by firing the event the browser never sends.** GridBits
  listened for `pointerleave` on `window`. That event does not bubble and
  window is never its target, so the listener was dead: once the cursor left
  the window the digits stayed pushed at the last known point forever, a
  permanent hole in the grid, and on touch a permanent dead zone at the last
  tap. The check that was supposed to catch it did
  `window.dispatchEvent(new Event("pointerleave"))` and watched everything
  settle back — proving only that the handler worked if something called it.
  A synthetic event tests the handler; only a real one tests the wiring. It
  was found by an adversarial review that moved the mouse instead, and
  measured 942 off-grid pixels still displaced afterwards.
- **A focus ring that could not be seen.** `--focus-ring` is a 14% wash,
  about 1.25:1. It existed for one purpose — a soft `box-shadow` halo behind
  another cue — and had exactly one use. The board gave it four more as
  `outline: 2px solid`, making it the entire focus indicator on every control
  a keyboard user needs, including all four move buttons. The rest of the site
  outlines in `--cobalt`. `verify:contrast` now refuses the token as an
  outline colour, so it is a rule instead of a habit.
- **A probe that could not run, and a check inside it that passed because it
  broke.** The board fixtures in `rls_probe.sql` omitted `position`, which is
  NOT NULL with no default — so the whole DO block aborted before its first
  assertion, on any database that actually has the board. Worse, the
  off-roster write check caught `when others` as well as
  `insufficient_privilege`, so the same missing column would have reported
  PASS for a policy that was never consulted. Both fixed; the handler now
  reports anything that is not a refusal as INCONCLUSIVE rather than as a
  pass.
- **A guard that claimed a script neither font has.** `verify-greeting-fonts`
  listed Greek as covered, on the assumption that IBM Plex covers it. The
  family that does is IBM Plex *Sans*; the eyebrow's stack is Plex *Mono* and
  Vazirmatn, and enumerating the emitted `@font-face` rules shows no
  U+370-3FF face in either. A Greek greeting would have rendered in the
  platform's generic monospace and the guard would have said OK — the exact
  failure it exists to prevent, written into the guard on its first day.
- The phone at 92 degrees: past edge-on, so a hairline. Nobody sees a hairline
  and thinks "I should tap that".

And one that is worth more than the rest, because the tool itself was the
thing that lied: the first version of `verify:contrast` took a string index
from the raw stylesheet and applied it to a comment-stripped copy. The slice
landed past the end, the scan read nothing, and it passed its own negative
test by finding no code at all. A guard that reports success because it did
nothing is worse than no guard. Break every check on purpose and watch it
fail before believing it.

There is a matching trap: a measurement can be true and useless. "No
horizontal overflow at 375px" was correct — the document was exactly 375
wide — while a button sat outside its own card, because the overflow was
inside the card rather than past the viewport. Check that what you measured is
what you meant to ask.

When you change something here, break it on purpose first and watch the guard
catch it. If nothing catches it, that is the thing to write next.
