// Guards the crawl surface.
//
// Everything checked here is invisible when it breaks. A page with no
// hreflang still renders; a sitemap that lost a route still validates; a
// dashboard that became indexable looks exactly like one that did not. The
// first sign is a month of the wrong page ranking, or a client's brief
// showing up in a search result.
//
// So these are checked at build time rather than trusted:
//
//   1. Every public route declares canonical + hreflang.
//   2. robots.txt and the sitemap are generated, not hand-written files
//      that will fall out of date.
//   3. The dashboard is noindex.
//   4. Every locale has an Open Graph image route above it.
//
//   node scripts/verify-seo.mjs

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const failures = [];
const notes = [];

function read(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

/** Every page.tsx under src/app/[locale]. */
function localePages(dir = "src/app/[locale]", found = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) localePages(path, found);
    else if (entry === "page.tsx") found.push(path.replace(/\\/g, "/"));
  }
  return found;
}

// ---- 1. hreflang on every public route ------------------------------------
// The helper is the only sanctioned way to declare these, because it pairs
// canonical, both languages and x-default from one path. A route that builds
// them by hand is a route that will pair itself with the wrong page.
const pages = localePages();
if (!pages.length) failures.push("found no pages under src/app/[locale]");

// The locale root is the exception, and only the root: the layout's canonical
// is `/{locale}`, which is exactly right for the home page and exactly wrong
// for everything below it. A nested route that forgets to declare its own
// therefore does not fall back to nothing — it inherits a canonical pointing
// at the home page, which tells search engines the route is a duplicate and
// quietly keeps it out of the index. That is the failure this check exists
// for, so it is the deeper routes that are held to it.
const LAYOUT_COVERS = "src/app/[locale]/page.tsx";

for (const page of pages) {
  if (page === LAYOUT_COVERS) continue;
  const source = read(page) ?? "";
  if (!source.includes("generateMetadata")) {
    failures.push(
      `${page} exports no generateMetadata, so it inherits the layout's canonical of "/{locale}" and reads as a duplicate of the home page`,
    );
    continue;
  }
  if (!source.includes("localeAlternates")) {
    failures.push(
      `${page} does not use localeAlternates — canonical and hreflang are per route, they are not inherited`,
    );
  }
}
notes.push(
  `${pages.length} public route(s): the locale root from its layout, ${pages.length - 1} declaring their own`,
);

// The layout supplies the shared tags the pages do not repeat.
const layout = read("src/app/[locale]/layout.tsx") ?? "";
for (const [needle, why] of [
  ["metadataBase", "metadataBase — without it every relative URL resolves against the deploy preview"],
  ["localeAlternates", "canonical + hreflang on the home page"],
  ["openGraph", "Open Graph tags"],
  ["twitter", "the twitter:card type, without which og:image is not used as a preview"],
]) {
  if (!layout.includes(needle)) failures.push(`the locale layout is missing ${why}`);
}

// ---- 2. robots and sitemap are generated ----------------------------------
for (const [path, what] of [
  ["src/app/robots.ts", "robots.txt"],
  ["src/app/sitemap.ts", "the sitemap"],
]) {
  if (!existsSync(path)) failures.push(`${what} is not generated — ${path} is missing`);
}
for (const stale of ["public/robots.txt", "public/sitemap.xml"]) {
  if (existsSync(stale)) {
    failures.push(
      `${stale} exists and would be served instead of the generated one, frozen at whatever it said the day it was written`,
    );
  }
}

const robots = read("src/app/robots.ts") ?? "";
if (!robots.includes("/dashboard")) failures.push("robots.txt does not disallow /dashboard");
if (!robots.includes("sitemap")) failures.push("robots.txt does not point at the sitemap");

// ---- 3. the dashboard stays out of the index ------------------------------
const dashLayout = read("src/app/dashboard/layout.tsx") ?? "";
const noindex = /robots:\s*{[^}]*index:\s*false/s.test(dashLayout);
if (!noindex) {
  failures.push(
    "the dashboard layout does not set robots index:false — a disallow in robots.txt is a request, a noindex is an instruction",
  );
}

// ---- 4. link previews ------------------------------------------------------
if (!existsSync("src/app/[locale]/opengraph-image.tsx")) {
  failures.push("no opengraph-image route under [locale]: shared links would preview as bare text");
}

// ---- report ---------------------------------------------------------------
if (failures.length) {
  console.error("\nSEO surface check FAILED:");
  for (const failure of failures) console.error("  - " + failure);
  process.exit(1);
}

console.log("SEO surface OK:");
for (const note of notes) console.log("  - " + note);
console.log("  - robots.txt and the sitemap are generated, and no static file shadows them");
console.log("  - the dashboard is noindex");
console.log("  - link previews have an image route");
