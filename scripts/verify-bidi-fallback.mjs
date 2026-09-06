// English prose falling back on a Persian page must be bidi-isolated, and the
// isolates must never reach the <head>.
//
//   node scripts/verify-bidi-fallback.mjs
//
// THE DEFECT
//
// A row keeps English and Persian side by side and falls back to English when
// the Persian is missing. An English sentence dropped into a right-to-left page
// has its trailing punctuation reordered by the bidirectional algorithm: the
// full stop leaves the words it belongs to and lands against the LEFT margin.
// Photographed on /fa/work/focusboard before the fix, the last line read
//
//     .English and Persian, light and dark
//
// and after it
//
//     English and Persian, light and dark.
//
// Not a font problem and not a CSS one — the paragraph direction is RTL, the
// run is LTR, and a neutral character at the boundary belongs to the paragraph
// rather than the run. src/i18n/pending.ts had solved this for copy that lives
// in the dictionary, and its own comment claimed it was doing what "the
// portfolio uses for missing translations". The portfolio was not doing it:
// database prose took a different path and arrived bare. The comment made the
// gap harder to see rather than easier.
//
// THREE TRIPWIRES
//
// 1. Every prose field in toProject() is assigned through pickProse. Adding a
//    fourth prose column and reaching for `pick` is the obvious next mistake,
//    and it is silent — the page renders, in the right words, with the
//    punctuation in the wrong place, on the half of the site nobody reading
//    English will ever look at.
//
// 2. No generateMetadata passes prose through without stripIsolates. The
//    isolates are invisible in a paragraph and are not invisible in a <title>,
//    a meta description or an OpenGraph image, where they travel to crawlers
//    and to satori as characters to draw.
//
// 3. Both halves are asserted to have actually looked at something. The
//    metadata half passed once having examined a three-line region, because
//    the destructured parameter list closes with a brace before the body even
//    starts. "Found no problems" and "looked" are different claims.
//
// Names are deliberately NOT covered. A title is a Latin product name with no
// trailing neutral to strand, it carries lang/dir at the point of use, and it
// flows unstripped into metadata on purpose.

import { readFileSync } from "node:fs";

const PORTFOLIO = "src/lib/data/portfolio.ts";
const METADATA_FILES = [
  "src/app/[locale]/work/[slug]/page.tsx",
  "src/app/[locale]/work/page.tsx",
  "src/app/[locale]/showcase/page.tsx",
  "src/app/[locale]/work/[slug]/opengraph-image.tsx",
];

/** Fields whose value is a sentence rather than a name. */
const PROSE_FIELDS = ["summary", "problem", "description"];

const problems = [];
const checked = [];

function withoutComments(source) {
  // verify-theme-stamp and verify-offscreen both failed on their own
  // documentation before learning this.
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// ── 1. prose is picked with the isolating picker ───────────────────────────
{
  const source = withoutComments(readFileSync(PORTFOLIO, "utf8"));
  const start = source.indexOf("function toProject");
  if (start < 0) {
    problems.push(`${PORTFOLIO}: no toProject() — this guard is looking at the wrong place.`);
  } else {
    const body = source.slice(start, source.indexOf("\n}", start));
    for (const field of PROSE_FIELDS) {
      const line = body.split("\n").find((l) => new RegExp(`^\\s*${field}:`).test(l));
      if (!line) {
        problems.push(
          `${PORTFOLIO}: toProject() no longer assigns "${field}". If the field was renamed, rename it in PROSE_FIELDS too; if it was removed, remove it here.`,
        );
        continue;
      }
      if (!/pickProse(Nullable)?\(/.test(line)) {
        problems.push(
          `${PORTFOLIO}: "${field}" is prose and is not assigned through pickProse — its English fallback will render with the punctuation adrift on /fa.\n      ${line.trim()}`,
        );
      } else {
        checked.push(`${field} uses ${/pickProseNullable/.test(line) ? "pickProseNullable" : "pickProse"}`);
      }
    }
  }
}

// ── 2. metadata strips them again ──────────────────────────────────────────
for (const file of METADATA_FILES) {
  let source;
  try {
    source = withoutComments(readFileSync(file, "utf8"));
  } catch {
    problems.push(`${file}: listed in this guard and not on disk. Update METADATA_FILES.`);
    continue;
  }
  // Only the generateMetadata body. Scoping this to "everything after the
  // word generateMetadata" was the guard's first version, and it failed the
  // repository on seven correct lines — every <p>{project.summary}</p> in the
  // component below, which is body text and must NOT be stripped. A guard that
  // is wrong about what it is looking at teaches people to ignore it.
  //
  // The OpenGraph route has no generateMetadata and renders text into a PNG,
  // so there the whole file is the region.
  const start = source.indexOf("export async function generateMetadata");
  let region;
  if (start < 0) {
    region = source;
  } else {
    // "\n}\n", not "\n}": the destructured parameter list is written
    //
    //     export async function generateMetadata({
    //       params,
    //     }: PageParams): Promise<Metadata> {
    //
    // so the first "\n}" is three lines in, and a region ending there covers
    // the signature and nothing else. It reported a confident all-clear having
    // looked at no code at all — which is why the count below is asserted.
    const end = source.indexOf("\n}\n", start);
    region = source.slice(start, end < 0 ? source.length : end);
  }
  for (const field of PROSE_FIELDS) {
    const uses = [...region.matchAll(new RegExp(`\\bproject\\.${field}\\b`, "g"))];
    for (const use of uses) {
      const before = region.slice(Math.max(0, use.index - 60), use.index);
      if (!/stripIsolates\(\s*$/.test(before)) {
        const line = region.slice(region.lastIndexOf("\n", use.index) + 1, region.indexOf("\n", use.index));
        problems.push(
          `${file}: project.${field} reaches metadata without stripIsolates — invisible in a paragraph, not invisible in a <title>.\n      ${line.trim()}`,
        );
      } else {
        checked.push(`${file.split("/").pop()}: project.${field} stripped`);
      }
    }
  }
}

// Both halves must actually have run. The metadata half silently checked
// nothing once, because its region was three lines long, and it passed. A
// count is the difference between "found no problems" and "looked".
const EXPECTED_PROSE = PROSE_FIELDS.length;
const EXPECTED_METADATA_USES = 2; // the two stripIsolates(project.summary) in work/[slug]
const proseChecked = checked.filter((c) => /^\w+ uses pickProse/.test(c)).length;
const metadataChecked = checked.length - proseChecked;

if (proseChecked !== EXPECTED_PROSE) {
  problems.push(
    `only ${proseChecked} of ${EXPECTED_PROSE} prose fields were reached — the guard is not looking where it thinks it is.`,
  );
}
if (metadataChecked < EXPECTED_METADATA_USES) {
  problems.push(
    `only ${metadataChecked} metadata use(s) of prose were reached, expected at least ${EXPECTED_METADATA_USES}. Either the region extraction broke, or generateMetadata stopped using the summary — in which case lower the number here on purpose.`,
  );
}

for (const line of checked) console.log(`  ok   ${line}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n`);
  for (const problem of problems) console.error(`  FAIL ${problem}`);
  process.exitCode = 1;
} else if (checked.length) {
  console.log(`\nBidi fallback OK: ${checked.length} assertion(s).`);
}
