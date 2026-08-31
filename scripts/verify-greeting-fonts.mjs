// Guards the rotating hero line against a script the site cannot draw.
//
// The eyebrow cycles a sentence through eleven languages. The site loads IBM
// Plex Mono and Vazirmatn and nothing else; between them they cover Latin,
// Cyrillic and Arabic script. Asked which face drew each candidate,
// Chrome answered NSimSun for Chinese, MS Gothic for Japanese and Nirmala UI
// for Hindi — system fonts, different on every machine, and absent entirely on
// one with no CJK or Devanagari installed, where the line becomes empty boxes.
//
// Adding a language is one line in src/i18n/greetings.ts, which is exactly the
// kind of change that gets made without thinking about type. This turns it
// into a build failure instead of something a visitor on another platform
// discovers.
//
//   node scripts/verify-greeting-fonts.mjs
//
// Static: it reads the source, not a browser, so it runs anywhere. It checks
// Unicode ranges rather than the font binaries, which is an approximation in
// one direction only — a range the fonts cover cannot be flagged, and every
// range they do not cover is.

import { readFileSync } from "node:fs";

const SOURCE = "src/i18n/greetings.ts";

/**
 * What the two loaded families can draw, as ranges rather than block names so
 * the check is exact about its own limits.
 */
const COVERED = [
  [0x0020, 0x007e, "Basic Latin"],
  [0x00a0, 0x00ff, "Latin-1 Supplement"],
  [0x0100, 0x017f, "Latin Extended-A"],
  [0x0180, 0x024f, "Latin Extended-B"],
  // No Greek. It was listed here once, on the assumption that IBM Plex covers
  // it; the family that does is IBM Plex *Sans*, and the eyebrow's stack is
  // Plex *Mono* then Vazirmatn. Enumerated from the emitted @font-face rules,
  // Plex Mono ships latin, latin-ext, cyrillic, cyrillic-ext and vietnamese,
  // and Vazirmatn ships latin, latin-ext and arabic. A Greek entry would have
  // rendered in the platform's generic monospace and this guard would have
  // said OK — the one failure it exists to prevent.
  [0x0400, 0x04ff, "Cyrillic"],
  [0x0600, 0x06ff, "Arabic"],
  [0x0750, 0x077f, "Arabic Supplement"],
  [0x08a0, 0x08ff, "Arabic Extended-A"],
  [0xfb50, 0xfdff, "Arabic Presentation Forms-A"],
  [0xfe70, 0xfeff, "Arabic Presentation Forms-B"],
  // Typographic punctuation the copy actually uses: the em dash and the
  // curly apostrophe, plus the zero-width non-joiner Persian needs.
  [0x2000, 0x206f, "General Punctuation"],
];

function covered(cp) {
  return COVERED.some(([lo, hi]) => cp >= lo && cp <= hi);
}

let source = "";
try {
  source = readFileSync(SOURCE, "utf8");
} catch {
  console.error(`Cannot read ${SOURCE}.`);
  process.exit(1);
}

// The separator is rendered between the two halves of every line, so it is
// part of what has to be drawable. Read it from the source rather than
// repeating it here, where the two could drift apart.
const separatorMatch = source.match(/GREETING_SEPARATOR\s*=\s*"([^"]*)"/);
if (!separatorMatch) {
  console.error(
    `Could not find GREETING_SEPARATOR in ${SOURCE}. It is rendered in every line, so it has to be checked; fix this pattern rather than dropping it.`,
  );
  process.exit(1);
}
const separator = separatorMatch[1];

// Pull the hello/phrase pairs out of the table without importing TypeScript.
const entries = [
  ...source.matchAll(
    /\{\s*lang:\s*"([^"]+)"\s*,\s*dir:\s*"(ltr|rtl)"\s*,\s*hello:\s*"([^"]*)"\s*,\s*phrase:\s*"([^"]*)"\s*\}/g,
  ),
].map((m) => ({ lang: m[1], dir: m[2], text: `${m[3]}${separator}${m[4]}` }));

// The pattern above wants one exact shape: those four keys, in that order,
// double quoted, on one line. An entry written differently is not rejected by
// it — it is simply not seen. So the count has to be reconciled against the
// table independently, or the guard passes having examined less than it
// thinks. That exact failure has happened on this project before, to a
// different check, which is why this block exists.
const table = source.slice(
  source.indexOf("GREETINGS"),
  source.indexOf("] as const"),
);
const declared = [...table.matchAll(/\blang:/g)].length;

if (entries.length === 0) {
  console.error(
    `No greeting entries found in ${SOURCE}. If the shape of the table changed, this check is now blind — fix the pattern rather than deleting the check.`,
  );
  process.exit(1);
}
if (entries.length !== declared) {
  console.error(
    `Greeting fonts: the table declares ${declared} entr(ies) but this check could only\n` +
      `parse ${entries.length}. The ${declared - entries.length} it could not read were NOT checked.\n\n` +
      `Either write them in the same shape as the rest — { lang, dir, hello, phrase },\n` +
      `double quoted, on one line — or widen the pattern in this script. Do not delete\n` +
      `this reconciliation: without it the check silently examines fewer languages than\n` +
      `the site ships.`,
  );
  process.exit(1);
}

const failures = [];
for (const { lang, text } of entries) {
  const bad = new Map();
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (!covered(cp)) {
      bad.set(ch, `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`);
    }
  }
  if (bad.size) {
    const shown = [...bad.entries()].map(([ch, u]) => `${ch} ${u}`).join(", ");
    failures.push(`  ${lang}: ${shown}`);
  }
}

// A check that passes because it examined nothing is worse than no check.
const rtl = entries.filter((e) => e.dir === "rtl").length;
if (rtl === 0) {
  failures.push(
    "  no right-to-left entry found — either the table lost its Arabic-script languages or the pattern above stopped matching",
  );
}

if (failures.length) {
  console.error(
    `Greeting fonts: ${failures.length} entry(s) need a face the site does not load.\n` +
      failures.join("\n") +
      `\n\nThe site loads IBM Plex Mono and Vazirmatn. Either drop the language, or\n` +
      `ship a font that covers it and widen COVERED in this script to match.`,
  );
  process.exit(1);
}

console.log(
  `Greeting fonts OK: ${entries.length} language(s) (all ${declared} declared were read), ` +
    `${rtl} right-to-left, separator ${JSON.stringify(separator)}, ` +
    `every character inside IBM Plex Mono or Vazirmatn.`,
);
