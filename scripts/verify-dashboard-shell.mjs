// Keeps the dashboard out of the prototype's element-level styles.
//
// globals.css is one file serving two designs. Above the boundary marker it
// is the ported public design system, and that stylesheet styles a handful of
// elements *by tag name* — `nav`, `header`, `section`, `footer` — with layout
// that only makes sense on a marketing page.
//
// The dashboard loads the same file and wants none of it. Every time a
// dashboard or component file has reached for one of those tags, the ported
// rule has applied silently and broken the layout:
//
//   phase 2  a <nav> for the portfolio filter picked up `position: fixed`
//            and covered the site header.
//   phase 5  a <header> for the dashboard title strip picked up
//            `padding: 150px 0 84px`, turning a 63px sticky bar into a 297px
//            one with a backdrop blur over the top third of every page. It
//            was introduced by an accessibility fix, passed every axe check,
//            and was visible in screenshots that were looked at and read as
//            whitespace.
//
// Both were the same bug. Neither was caught by types, lint, axe or a build.
//
// Which tags are forbidden is read out of the stylesheet rather than listed
// here, so adding a bare rule to the ported region tightens this check on its
// own instead of leaving a hardcoded list to rot.
//
// Landmarks are still required — use the ARIA role on a div, which is what
// the public site already does for the portfolio filter.
//
//   node scripts/verify-dashboard-shell.mjs

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const CSS = "src/app/globals.css";
const BOUNDARY = "Additions beyond the prototype";
const ROOTS = ["src/app/dashboard", "src/components/dashboard"];

/**
 * Sectioning and landmark elements — the ones whose ported rules place a box
 * on the page rather than describe text inside one.
 *
 * The first version of this check looked for layout *properties* instead, and
 * immediately failed the build over `<h1>`: the prototype's h1 rule carries
 * `max-width: 16ch` and `line-height`, which any property list will match.
 * But a heading is content, not a container, and the dashboard needs h1 for
 * its outline — it already overrides that max-width deliberately, in
 * `.dash-h1` and `.signin-card .order-head h1`.
 *
 * So the category is what matters, not the declaration. This set is from the
 * HTML spec and does not change; which of its members are actually dangerous
 * is still read from the stylesheet, so a new bare rule tightens the check on
 * its own.
 */
const SECTIONING = new Set([
  "nav", "header", "footer", "section", "article", "aside", "main",
]);

const HTML_TAGS = new Set(
  `a abbr address article aside audio b blockquote button canvas caption cite code dd del details
   dfn dialog div dl dt em fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr
   html i iframe img input ins kbd label legend li main mark menu meter nav noscript ol option output
   p picture pre progress q s samp section select small span strong sub summary sup table tbody td
   textarea tfoot th thead time tr u ul video body`.split(/\s+/),
);

const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/**
 * Bare element selectors in the ported region, with their declarations.
 * Brace-matched rather than regex-matched so rules inside @media are seen —
 * the mobile override of `header` lives in one, and a scanner that missed it
 * would under-report exactly the rule that matters at 375px.
 */
function bareSelectors(css) {
  const found = new Map();
  let buffer = "";
  for (let i = 0; i < css.length; i += 1) {
    const char = css[i];
    if (char === "}") {
      buffer = "";
      continue;
    }
    if (char !== "{") {
      buffer += char;
      continue;
    }
    const selectors = buffer.trim();
    buffer = "";
    let depth = 1;
    let j = i + 1;
    while (j < css.length && depth) {
      if (css[j] === "{") depth += 1;
      else if (css[j] === "}") depth -= 1;
      j += 1;
    }
    const body = css.slice(i + 1, j - 1);
    if (selectors.startsWith("@")) continue; // descend into @media
    for (const selector of selectors.split(",")) {
      const tag = selector.trim();
      if (!HTML_TAGS.has(tag)) continue;
      found.set(tag, (found.get(tag) ?? "") + " " + body.replace(/\s+/g, " "));
    }
    i = j - 1;
  }
  return found;
}

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, files);
    else if (/\.tsx?$/.test(entry)) files.push(path.replace(/\\/g, "/"));
  }
  return files;
}

const css = readFileSync(CSS, "utf8");
if (!css.includes(BOUNDARY)) {
  console.error(`Could not find the "${BOUNDARY}" marker in ${CSS}.`);
  process.exit(1);
}

const ported = stripComments(css.slice(0, css.indexOf(BOUNDARY)));
const forbidden = [...bareSelectors(ported).keys()]
  .filter((tag) => SECTIONING.has(tag))
  .sort();

if (!forbidden.length) {
  // nav, header, section and footer all carry bare rules today. Finding none
  // means the stylesheet changed shape or this scanner stopped working, and
  // a check that silently passes because it found nothing to check is worse
  // than no check at all.
  console.error(
    "Found no bare sectioning-element rules in the ported region. Either the " +
      "stylesheet changed shape or this scanner is broken — both need a look.",
  );
  process.exit(1);
}

const failures = [];
const files = ROOTS.flatMap((root) => walk(root));

for (const file of files) {
  // Comments discuss these tags by name on purpose. Only real JSX counts.
  const source = stripComments(readFileSync(file, "utf8"));
  for (const tag of forbidden) {
    const used = new RegExp(`<${tag}(?=[\\s/>])`).test(source);
    if (used) {
      failures.push(
        `${file} uses <${tag}>, which the ported stylesheet styles by element. ` +
          `Use <div role="…"> instead — the landmark without the layout.`,
      );
    }
  }
}

if (failures.length) {
  console.error("\nDashboard shell check FAILED:");
  for (const failure of failures) console.error("  - " + failure);
  console.error(
    `\nBare sectioning rules in the ported region: ${forbidden.join(", ")}`,
  );
  process.exit(1);
}

console.log(
  `Dashboard shell OK: ${files.length} file(s), none using the sectioning ` +
    `elements the ported stylesheet lays out by tag (${forbidden.join(", ")}).`,
);
