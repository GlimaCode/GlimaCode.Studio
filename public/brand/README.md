# GlimaCode — Brand assets

The mark is `<G>` — angle brackets around the studio initial. Developer-native,
reads at any size, and works in one colour when it has to.

## Files

| File | Use it for |
|---|---|
| `glimacode-mark-light.svg` | **Primary.** GitHub org avatar, LinkedIn, anywhere light |
| `glimacode-mark-dark.svg` | Dark UIs, dark README banners, dark slide decks |
| `glimacode-mark-transparent.svg` | Placing on top of your own background |
| `glimacode-mark-mono.svg` | Single colour — inherits `currentColor` in HTML; print, stamps, watermarks |
|  `glimacode-lockup-light.svg` | Site header, letterhead, invoices, email signature, proposals |
| `glimacode-lockup-dark.svg` | The same, on dark |
| `favicon.svg` | Browser tab — simplified (brackets dropped, they disappear at 16px) |
| `glimacode-avatar-cobalt.svg` | **Platform avatars** (GitHub, LinkedIn) — full-bleed, no rounded plate |
| `glimacode-avatar-ink.svg` | Avatar alternative, subtler on dark themes |
| `glimacode-avatar-light.svg` | Avatar alternative, light |

### Why avatars are a separate file

GitHub, LinkedIn and most platforms crop avatars to a circle and draw their own
frame. A logo that already has its own rounded plate ends up with a visible halo
inside that frame. The `-avatar-` files are **full-bleed** — the background runs
to the edge, so the platform's crop is the only shape you see.

PNG copies of each are included for places that don't accept SVG.

## Palette

| Token | Hex | Use |
|---|---|---|
| Ink | `#16233B` | Text, dark plates |
| Cobalt | `#2547F4` | Brackets, accents, primary buttons |
| Cobalt light | `#3D5BFF` | Brackets on dark backgrounds |
| Paper | `#F7F8FA` | Light plate, page background |
| Line | `#DDE3EC` | Grid, borders |
| Slate | `#5B6B85` | Secondary text |

Identical to the tokens used on glimacode.com — the site, the logo, and the
decks all pull from one palette on purpose.

## Type

- **Sora** (800) — wordmark and headings
- **IBM Plex Mono** — the tagline, labels, code
- **IBM Plex Sans** — body text

All three are free on Google Fonts.

## Rules

- **Clear space:** keep at least the height of the `G` free on every side.
- **Minimum size:** 24px for the mark; below that use `favicon.svg`.
- **Don't** recolour the brackets, stretch the mark, add effects, or rebuild the
  wordmark in another typeface.
- **Do** pick one variant per surface and stay with it. Consistency is the
  whole point of having a mark.

## Where to apply it

- GitHub organization avatar → `glimacode-mark-light.svg`
- Site favicon → `favicon.svg`
- Site header → `glimacode-lockup-light.svg`
- LinkedIn company page → `glimacode-mark-light.svg`
- Proposals and invoices → `glimacode-lockup-light.svg`
- Email signature → `glimacode-lockup-light.png` at ~200px wide
