// Measures colour contrast in BOTH themes, from the stylesheet itself.
//
// The light theme shipped with four colours below 4.5:1 — the form's error
// text, the confirmation tick, the wordmark's hover accent, and the badge
// that says an entry is hidden. Each was found by hand, one at a time, after
// the fact. Adding a second theme doubles every one of those chances, and
// "the dark value looks fine" is not a measurement.
//
// So the pairs are declared once and checked against both themes. A colour
// that passes in one and fails in the other fails the build.
//
// WHY IT READS THE CSS RATHER THAN A TABLE OF ITS OWN
//
// A guard with its own copy of the palette drifts from the palette. This
// resolves the tokens the way the browser does — the base :root block for
// light, the [data-theme="dark"] remap through --dk-* for dark — so editing a
// colour is enough to re-measure it, and there is nothing to keep in step.
//
//   node scripts/verify-contrast.mjs

import { readFileSync } from "node:fs";

const CSS = "src/app/globals.css";

/* ------------------------------------------------------------------ pairs */
/* Thresholds are the ones WCAG actually asks for, per role:
     4.5  body text
     3.0  large text, and graphical objects needed to understand content
   Decorative borders are absent on purpose — see EXEMPT at the bottom. */
const PAIRS = [
  ["page text",                 "ink",           "paper",         4.5],
  ["page text on a card",       "ink",           "card",          4.5],
  ["muted text",                "slate",         "paper",         4.5],
  ["muted text on a card",      "slate",         "card",          4.5],
  ["link / accent",             "cobalt",        "paper",         4.5],
  ["link / accent on a card",   "cobalt",        "card",          4.5],
  ["accent on its own tint",    "cobalt",        "cobalt-soft",   4.5],
  ["primary button label",      "__white",       "cobalt-solid",  4.5],
  ["primary button hover",      "__white",       "cobalt-solid-hover", 4.5],
  ["primary button as an object","cobalt-solid", "paper",         3.0],
  ["header CTA label",          "__white",       "nav-cta-bg",    4.5],
  ["header CTA as an object",   "nav-cta-bg",    "paper",         3.0],
  ["header CTA hover label",    "__white",       "nav-cta-bg-hover", 4.5],

  ["emphasis panel text",       "emph-fg",       "emph-bg",       4.5],
  ["emphasis panel muted",      "emph-muted",    "emph-bg",       4.5],

  ["error text",                "red-text",      "card",          4.5],
  ["error text on paper",       "red-text",      "paper",         4.5],
  ["error text on its tint",    "red-text",      "tint-danger-bg",4.5],
  ["not-notified flag",         "red-text",      "tint-flag-bg",  4.5],
  ["success tick",              "green-text",    "cobalt-soft",   3.0],
  ["deep amber text",           "signal-deep",   "paper",         4.5],
  ["label on a bright fill",    "on-bright",     "signal",        4.5],

  ["badge: new",                "badge-new-fg",     "badge-new-bg",     4.5],
  ["badge: reviewing",          "badge-review-fg",  "badge-review-bg",  4.5],
  ["badge: replied",            "badge-replied-fg", "badge-replied-bg", 4.5],
  ["badge: won",                "badge-won-fg",     "badge-won-bg",     4.5],
  ["badge: lost / hidden",      "badge-lost-fg",    "badge-lost-bg",    4.5],

  ["keycap label",              "slate",         "key-top",       4.5],
  ["action keycap label",       "key-act-label", "key-act-top",   4.5],
  // The hover face is lighter than the resting face, so it is the harder
  // of the two, and it was missing from the first version of this list.
  ["action keycap label, hover","key-act-label", "key-act-hover-top", 4.5],
  ["lit keycap label",          "__white",       "key-lit-bottom",4.5],
];

/* Roles that are decorative in BOTH themes, recorded rather than silently
   skipped. The card border, the page grid and the keycap edge carry no
   information: the card is a card because of its fill and its shadow, the
   grid is texture, and the keycap edge is a lighting cue. The light theme
   ships them at 1.15–1.21 and the dark theme is tuned to match that
   loudness, not to beat it. Raising them would change the design in both
   themes, which is a decision and not a fix. */
const EXEMPT = [
  ["line on paper", "line", "paper"],
  ["grid line on paper", "grid-line", "paper"],
  ["keycap edge under the face", "key-edge", "key-bottom"],
  // The 10px board dots. Decided in the light-theme pass and unchanged here:
  // they carry role="img" and a translated label, so the state they encode is
  // available as text and the dot is decoration beside it. Green measures
  // 2.99 on white and amber 1.82 — darkening them enough to pass would make
  // the board read as a warning panel. Recorded so the exemption stays a
  // decision rather than an oversight; in dark they measure 8.70 and 9.99.
  ["status dot: shipped", "green", "card"],
  ["status dot: in progress", "signal", "card"],
];

/* ------------------------------------------------------------- resolution */
const hexOf = (v) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return "#" + h.toUpperCase();
};
const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const src = readFileSync(CSS, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Every `--name: value` in EVERY block matching `selector`, later winning.
 *
 * "Every" matters: the base palette is declared in one :root block and the
 * theme tokens in a second, appended one. A reader that stopped at the first
 * match saw thirteen tokens and reported the other seventy as missing —
 * which is what the first run of this script did.
 */
function blocks(selector) {
  const out = new Map();
  let from = 0;
  let found = false;
  for (;;) {
    const at = src.indexOf(selector, from);
    if (at === -1) break;
    found = true;
    const open = src.indexOf("{", at);
    let depth = 1, i = open + 1;
    while (i < src.length && depth) {
      if (src[i] === "{") depth += 1;
      else if (src[i] === "}") depth -= 1;
      i += 1;
    }
    for (const m of src.slice(open + 1, i - 1).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      out.set(m[1], m[2].trim());
    }
    from = i;
  }
  return found ? out : null;
}
const block = blocks;

const base = blocks(":root{") ?? blocks(":root {");
const darkRemap = block(':root[data-theme="dark"]');
if (!base || !darkRemap) {
  console.error(`Contrast check FAILED: could not read the token blocks from ${CSS}.`);
  process.exitCode = 1;
}

/** Resolves a token in one theme, following var(--dk-*) indirection. */
function resolve(name, theme) {
  const key = "--" + name;
  let value = theme === "dark" && darkRemap.has(key) ? darkRemap.get(key) : base.get(key);
  for (let hops = 0; hops < 4 && value && value.startsWith("var("); hops += 1) {
    const inner = value.slice(4, -1).trim();
    value = base.get(inner);
  }
  return value ? hexOf(value) : null;
}

/* ------------------------------------------------------------------- run */
const failures = [];
const unresolved = [];
const rows = [];

for (const theme of ["light", "dark"]) {
  for (const [what, fgName, bgName, need] of PAIRS) {
    const fg = fgName === "__white" ? "#FFFFFF" : resolve(fgName, theme);
    const bg = bgName === "__white" ? "#FFFFFF" : resolve(bgName, theme);
    if (!fg || !bg) {
      unresolved.push(`${theme}: ${what} (${fgName} on ${bgName}) — token missing or not a plain colour`);
      continue;
    }
    const r = ratio(fg, bg);
    rows.push({ theme, what, fg, bg, r, need });
    if (r < need) {
      failures.push(
        `${theme}: ${what} — ${fg} on ${bg} is ${r.toFixed(2)}:1, needs ${need}:1`,
      );
    }
  }
}

/* --------------------------------------------------- the role-flip check */
/*
 * --ink is the TEXT colour. Using it as a fill works only while exactly one
 * theme is dark: invert, and it becomes a white block with white text on it.
 *
 * That mistake was made seven times in this stylesheet — the header CTA, two
 * avatars, the contact card, the active filter chip, the assignee tag, and
 * the locale badge on a request row. Six were caught by reading; the seventh
 * was caught by looking at a screenshot of the dashboard, because a token
 * that resolves fine is invisible to a contrast check. So it is checked
 * structurally instead: --emph-bg exists for this job.
 *
 * Scanned from the DARK THEME marker down, not from the top. The rules above
 * it that still fill with --ink are the originals: the ported design system is
 * frozen, and the dark section overrides those selectors rather than editing
 * them, so flagging them would be flagging the thing that was already fixed.
 * Below the marker is new code, and new code has no excuse.
 */
const BOUNDARY = "DARK THEME";
const rawSrc = readFileSync(CSS, "utf8");
const addedFrom = rawSrc.indexOf(BOUNDARY);
if (addedFrom === -1) {
  failures.push(`could not find the "${BOUNDARY}" marker; the role-flip check did not run`);
} else {
  // rawSrc, not src: src has its comments removed, so the two strings have
  // different lengths and an index taken from one slices the other in the
  // wrong place. The first version of this did exactly that, and the check
  // silently scanned nothing — it passed its own negative test by finding
  // no code at all.
  const NEWLINE = /\r?\n/;
  const added = rawSrc.slice(addedFrom).split(NEWLINE);
  const offset = rawSrc.slice(0, addedFrom).split(NEWLINE).length;
  const INK_FILL = /background(-color)?\s*:\s*var\(--ink\)/;
  const DECLARATION = /--[a-z0-9-]+\s*:/;
  added.forEach((line, i) => {
    const trimmed = line.trim();
    // Comments are kept in this copy, so skip prose that discusses the rule.
    if (trimmed.startsWith("*") || trimmed.startsWith("/*")) return;
    if (DECLARATION.test(line)) return;
    if (!INK_FILL.test(line)) return;
    failures.push(
      `${CSS}:${offset + i}  --ink used as a background. It is the text colour: ` +
        `in dark it becomes a near-white block and any white label on it ` +
        `disappears. Use --emph-bg with --emph-fg.\n      ${line.trim().slice(0, 90)}`,
    );
  });
}

/* The two remap blocks must carry the same token set, or a theme silently
   loses a colour on whichever path the visitor arrives by. */
const mediaAt = src.indexOf("prefers-color-scheme:dark");
const mediaBlock = mediaAt === -1 ? null : block(":root:not([data-theme])");
if (mediaBlock) {
  const a = [...darkRemap.keys()].sort().join(",");
  const b = [...mediaBlock.keys()].filter((k) => k !== "color-scheme").sort().join(",");
  const aa = [...darkRemap.keys()].filter((k) => k !== "color-scheme").sort().join(",");
  if (aa !== b) {
    const inA = [...darkRemap.keys()].filter((k) => !mediaBlock.has(k));
    const inB = [...mediaBlock.keys()].filter((k) => !darkRemap.has(k));
    failures.push(
      "the stamped and no-script dark blocks cover different tokens — " +
        `stamped only: ${inA.join(" ") || "none"}; media only: ${inB.join(" ") || "none"}`,
    );
  }
  void a;
} else {
  failures.push("could not find the no-script dark block; the two paths cannot be compared");
}

if (unresolved.length) {
  console.error("\nContrast check FAILED: tokens that could not be resolved:");
  for (const u of unresolved) console.error("  - " + u);
  process.exitCode = 1;
}

if (failures.length) {
  console.error("\nContrast check FAILED:");
  for (const f of failures) console.error("  - " + f);
  process.exitCode = 1;
} else if (!unresolved.length) {
  const worst = rows.reduce((a, b) => (a.r / a.need < b.r / b.need ? a : b));
  console.log(
    `Contrast OK: ${PAIRS.length} pair(s) checked in both themes, ` +
      `${EXEMPT.length} decorative pair(s) exempt by decision.\n` +
      `  tightest: ${worst.theme} "${worst.what}" at ${worst.r.toFixed(2)}:1 against ${worst.need}:1`,
  );
}
