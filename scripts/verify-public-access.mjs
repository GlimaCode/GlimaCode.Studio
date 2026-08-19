// Checks what an anonymous caller can actually reach, over the same HTTP API
// the public site uses. The SQL probe in db/verify proves the policies from
// inside the database; this proves the result from outside it, through
// PostgREST, with nothing but the public key a browser already has.
//
//   node scripts/verify-public-access.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from
// .env.local. Read-only apart from one deliberate write attempt, which is
// expected to be refused.

import { readFileSync } from "node:fs";

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) env[match[1]] = match[2].trim();
    }
  } catch {
    // Fall through to process.env so this also works in CI.
  }
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    key:
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

const { url, key } = loadEnv();
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY.");
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };
const results = [];

function record(operation, expected, observed, pass) {
  results.push({ operation, expected, observed, verdict: pass ? "PASS" : "FAIL" });
}

async function get(path) {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers });
  const body = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    parsed = body;
  }
  return { status: response.status, body: parsed };
}

// 1. Published projects are readable.
{
  const { status, body } = await get(
    "portfolio_projects?select=slug,published&published=eq.true",
  );
  const count = Array.isArray(body) ? body.length : -1;
  record(
    "read published projects",
    "3 rows, HTTP 200",
    `${count} rows, HTTP ${status}`,
    status === 200 && count === 3,
  );
}

// 2. Asking for unpublished rows explicitly must still return nothing. The
//    filter is the client lying about what it wants; the policy is what
//    decides.
{
  const { status, body } = await get(
    "portfolio_projects?select=slug&published=eq.false",
  );
  const count = Array.isArray(body) ? body.length : -1;
  record(
    "read unpublished projects",
    "0 rows",
    `${count} rows, HTTP ${status}`,
    status === 200 && count === 0,
  );
}

// 3. The roster must be unreachable.
{
  const { status, body } = await get("team_members?select=user_id");
  const count = Array.isArray(body) ? body.length : -1;
  record(
    "read team roster",
    "0 rows or refused",
    Array.isArray(body) ? `${count} rows, HTTP ${status}` : `HTTP ${status}`,
    count === 0 || status >= 400,
  );
}

// 4. Categories are public on purpose — the filter has to render.
{
  const { status, body } = await get("portfolio_categories?select=slug");
  const count = Array.isArray(body) ? body.length : -1;
  record(
    "read categories",
    "4 rows, HTTP 200",
    `${count} rows, HTTP ${status}`,
    status === 200 && count === 4,
  );
}

// 5. Writing must be refused.
{
  const response = await fetch(`${url}/rest/v1/portfolio_projects`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      slug: "zz-anon-write-probe",
      title_en: "probe",
      summary_en: "probe",
    }),
  });
  record(
    "insert a project",
    "refused, HTTP 4xx",
    `HTTP ${response.status}`,
    response.status >= 400,
  );
}

const width = Math.max(...results.map((r) => r.operation.length));
for (const r of results) {
  console.log(
    `${r.verdict.padEnd(5)} ${r.operation.padEnd(width)}  expected ${r.expected}  ·  got ${r.observed}`,
  );
}

const failed = results.filter((r) => r.verdict === "FAIL").length;
console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
