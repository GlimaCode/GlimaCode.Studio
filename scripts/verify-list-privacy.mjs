// Guards what the triage list is allowed to fetch.
//
// The request list is a surface someone may leave open on a screen while
// deciding what to work on. Choosing a row needs a reference, a name, a type
// and an age — it does not need a stranger's email address, the text of
// their brief, or our private notes about them. Those live behind opening
// the record.
//
// That is a decision, not a happy accident of how the query was written, so
// it is checked rather than trusted. Widening the select is easy, obvious in
// isolation, and completely silent.
//
//   node scripts/verify-list-privacy.mjs

import { readFileSync } from "node:fs";

const FILE = "src/lib/data/admin.ts";
const FORBIDDEN = ["email", "description", "notes"];

const source = readFileSync(FILE, "utf8");

/** The body of listRequests, up to the next top-level export. */
function listRequestsBody(text) {
  const start = text.indexOf("export async function listRequests");
  if (start === -1) return null;
  const next = text.indexOf("\nexport ", start + 1);
  return text.slice(start, next === -1 ? text.length : next);
}

const body = listRequestsBody(source);
if (!body) {
  console.error(`Could not find listRequests in ${FILE}.`);
  process.exit(1);
}

// Every .select("…") inside that function.
const selects = [...body.matchAll(/\.select\(\s*(`[^`]*`|"[^"]*"|'[^']*')/g)].map(
  (match) => match[1].slice(1, -1),
);

if (!selects.length) {
  console.error("Found listRequests but no select() call inside it.");
  process.exit(1);
}

const failures = [];
for (const select of selects) {
  const columns = select.split(",").map((c) => c.trim()).filter(Boolean);
  for (const column of columns) {
    const bare = column.split(/[\s(]/)[0];
    if (FORBIDDEN.includes(bare)) {
      failures.push(`the list query selects "${bare}" — that belongs behind opening the record`);
    }
  }
}

// The rendered list must not print them either, even if they arrive some
// other way.
const page = readFileSync("src/app/dashboard/page.tsx", "utf8");
for (const field of FORBIDDEN) {
  if (new RegExp(`request\\.${field}\\b`).test(page)) {
    failures.push(`the list page renders request.${field}`);
  }
}

if (failures.length) {
  console.error("\nTriage list privacy check FAILED:");
  for (const failure of failures) console.error("  - " + failure);
  process.exit(1);
}

console.log(
  `Triage list OK: ${selects.length} select(s) in listRequests, none exposing ${FORBIDDEN.join(", ")}.`,
);
