// Guards the no-flash theme script against the warning it necessarily causes.
//
// THEME_INIT_SCRIPT runs inline in <head> and stamps data-theme on <html>
// before React hydrates. That is deliberate and it is the only way to avoid
// painting in one theme and swapping to the other in front of the visitor —
// from a component it would run after hydration, too late.
//
// The cost is that the server sends an <html> without the attribute and the
// client finds one with it, which React reports as a hydration mismatch on
// every page load. The remedy is suppressHydrationWarning on that element,
// and it does NOT cascade: the site carried it on <body> for months, for a
// different and also-correct reason, while the <html> mismatch it was assumed
// to cover went on being reported. A console with a permanent error in it is
// a console nobody reads, which is how a real one gets missed.
//
// So: any layout that injects the script must exempt the element the script
// writes to. Adding a third root layout is the moment this is easy to forget.
//
//   node scripts/verify-theme-stamp.mjs

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src/app";
const MARKER = "THEME_INIT_SCRIPT";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (entry.endsWith(".tsx")) out.push(path);
  }
  return out;
}

/**
 * Comments removed before anything is matched.
 *
 * The first version of this guard failed on its own documentation: the comment
 * explaining that the script stamps data-theme on <html> contains the literal
 * text "<html>", the search found that first, and the check reported a file
 * that was correct as broken. verify-offscreen made the same mistake once. A
 * guard that reads prose about the rule as a breach of it will be silenced by
 * whoever meets it next, which is worse than not having written it.
 */
function withoutComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}

const failures = [];
let checked = 0;

for (const file of walk(ROOT)) {
  const source = withoutComments(readFileSync(file, "utf8"));
  if (!source.includes(MARKER)) continue;

  // Only the file that actually injects it, not one that merely imports the
  // constant to re-export it.
  if (!/dangerouslySetInnerHTML=\{\{\s*__html:\s*THEME_INIT_SCRIPT/.test(source)) {
    continue;
  }
  checked += 1;

  // The opening <html …> tag, which may be spread over several lines.
  const open = source.match(/<html\b[^>]*>/s);
  if (!open) {
    failures.push(
      `${file}  injects ${MARKER} but has no <html> element. If the script now ` +
        `stamps something else, update this check to match rather than deleting it.`,
    );
    continue;
  }
  if (!/\bsuppressHydrationWarning\b/.test(open[0])) {
    failures.push(
      `${file}  injects ${MARKER}, which stamps data-theme on <html> before\n` +
        `      hydration, but the <html> element does not carry\n` +
        `      suppressHydrationWarning. React will report a mismatch on every\n` +
        `      page load. Putting it on <body> does not help — it does not cascade.`,
    );
  }
}

if (checked === 0) {
  console.error(
    `verify-theme-stamp found no file injecting ${MARKER} under ${ROOT}/.\n` +
      `Either the theme script moved or this check has gone blind. A guard that\n` +
      `examines nothing is worse than no guard: fix the search, do not delete it.`,
  );
  process.exit(1);
}

if (failures.length) {
  console.error("Theme stamp check FAILED:\n  - " + failures.join("\n  - "));
  process.exit(1);
}

console.log(
  `Theme stamp OK: ${checked} layout(s) inject the pre-paint theme script, and every one exempts its own <html> from hydration warnings.`,
);
