// Lists every Persian string alongside its English source, from both places
// copy lives: the dictionaries in src/i18n, and the portfolio rows in the
// database. Companion to i18n-pending.mjs — that one reports what is
// missing, this one reports what is there, for review.
//
//   node scripts/i18n-inventory.mjs > inventory.md
//
// Database rows are read with the public key, so only published projects
// appear. That is the right scope: unpublished drafts are not copy anyone
// is reading yet.

import { readFileSync } from "node:fs";

/** The dictionaries are plain object literals, so evaluate them directly
 *  rather than pulling in a TypeScript loader for two files. */
function loadDictionary(path, name) {
  const source = readFileSync(path, "utf8");
  const start = source.indexOf("{", source.indexOf(`${name} `));
  let depth = 0;
  let end = start;
  let inString = null;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    const prev = source[i - 1];
    if (inString) {
      if (c === inString && prev !== "\\") inString = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inString = c; continue; }
    if (c === "/" && source[i + 1] === "/") { i = source.indexOf("\n", i); continue; }
    if (c === "/" && source[i + 1] === "*") { i = source.indexOf("*/", i) + 1; continue; }
    if (c === "{") depth++;
    if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  return eval("(" + source.slice(start, end + 1) + ")");
}

function flatten(object, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") flatten(value, path, out);
    else out[path] = value;
  }
  return out;
}

const en = flatten(loadDictionary("src/i18n/dictionaries/en.ts", "en ="));
const fa = flatten(loadDictionary("src/i18n/dictionaries/fa.ts", "fa:"));

console.log("# Persian copy inventory\n");
console.log("Every Persian string currently shipping, with its English source.");
console.log("Two sources: the dictionary, and the database rows behind the");
console.log("portfolio. Nothing here is a suggestion — it is what is live.\n");
console.log("---\n");
console.log("## Dictionary — `src/i18n/dictionaries/fa.ts`\n");
console.log(`${Object.keys(fa).length} keys. Edits here are a direct code change.\n`);

let group = "";
for (const key of Object.keys(fa)) {
  const top = key.split(".")[0];
  if (top !== group) {
    group = top;
    console.log(`\n### ${group}\n`);
  }
  console.log("**`" + key + "`**\n");
  console.log("- EN: " + (en[key] ?? "(no English counterpart)"));
  console.log("- FA: " + fa[key] + "\n");
}

// Database copy.
const env = {};
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch {
  /* fall through to process.env */
}
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("\n---\n");
console.log("## Database — `portfolio_projects`\n");
console.log("Edits here land as a new migration, not as an edit to 004.\n");

if (!url || !key) {
  console.log("_Database credentials unavailable; dictionary section only._");
} else {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const rows = await (
    await fetch(
      `${url}/rest/v1/portfolio_projects?select=slug,title_en,summary_en,summary_fa,problem_en,problem_fa,description_en,description_fa&published=eq.true&order=sort_order`,
      { headers },
    )
  ).json();

  for (const row of rows) {
    console.log(`\n### ${row.title_en} — \`${row.slug}\`\n`);
    for (const field of ["summary", "problem", "description"]) {
      const enText = row[`${field}_en`];
      const faText = row[`${field}_fa`];
      if (!enText && !faText) continue;
      console.log("**`" + field + "`**\n");
      console.log("- EN: " + (enText ?? "(null)").replace(/\n+/g, "\n  "));
      console.log("- FA: " + (faText ?? "(null)").replace(/\n+/g, "\n  ") + "\n");
    }
  }

  const cats = await (
    await fetch(`${url}/rest/v1/portfolio_categories?select=slug,label_en,label_fa&order=sort_order`, { headers })
  ).json();
  console.log("\n### Category labels\n");
  for (const c of cats) {
    console.log(`- \`${c.slug}\` — EN: ${c.label_en} · FA: ${c.label_fa ?? "(null)"}`);
  }
}
