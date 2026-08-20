// Checks what an anonymous caller can actually reach, over the same HTTP API
// the public site uses. The SQL probe in db/verify proves the policies from
// inside the database; this proves the result from outside it, through
// PostgREST, with nothing but the public key a browser already has.
//
//   node scripts/verify-public-access.mjs
//
// It writes exactly one row, into `requests`, to prove that an anonymous
// caller cannot read back what it just wrote. That row is left behind
// because anonymous callers have no delete grant either — which is the
// point. It is tagged so it is unmistakable, and the command to remove it is
// printed at the end.

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

function record(group, operation, expected, observed, pass) {
  results.push({ group, operation, expected, observed, verdict: pass ? "PASS" : "FAIL" });
}

async function get(path) {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers });
  const body = await response.text();
  let parsed;
  try { parsed = JSON.parse(body); } catch { parsed = body; }
  return { status: response.status, body: parsed };
}

async function post(path, payload, prefer) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  return { status: response.status, body };
}

// ------------------------------------------------------------------ portfolio
{
  const { status, body } = await get("portfolio_projects?select=slug&published=eq.true");
  const count = Array.isArray(body) ? body.length : -1;
  record("portfolio", "read published projects", "3 rows, HTTP 200",
    `${count} rows, HTTP ${status}`, status === 200 && count === 3);
}
{
  // Asking explicitly for unpublished rows. The client is free to ask; the
  // policy is what decides.
  const { status, body } = await get("portfolio_projects?select=slug&published=eq.false");
  const count = Array.isArray(body) ? body.length : -1;
  record("portfolio", "read unpublished projects", "0 rows",
    `${count} rows, HTTP ${status}`, status === 200 && count === 0);
}
{
  const { status, body } = await get("portfolio_categories?select=slug");
  const count = Array.isArray(body) ? body.length : -1;
  record("portfolio", "read categories", "4 rows, HTTP 200",
    `${count} rows, HTTP ${status}`, status === 200 && count === 4);
}
{
  const { status } = await post("portfolio_projects",
    { slug: "zz-anon-write-probe", title_en: "probe", summary_en: "probe" });
  record("portfolio", "insert a project", "refused, HTTP 4xx",
    `HTTP ${status}`, status >= 400);
}
{
  const { status, body } = await get("team_members?select=user_id");
  const count = Array.isArray(body) ? body.length : -1;
  record("portfolio", "read team roster", "0 rows or refused",
    Array.isArray(body) ? `${count} rows, HTTP ${status}` : `HTTP ${status}`,
    count === 0 || status >= 400);
}

// ------------------------------------------------------------------- requests
const marker = `probe-${Date.now().toString(36)}`;
const brief = {
  name: "Access probe",
  email: `${marker}@example.invalid`,
  company: marker,
  description:
    "Automated access check. Safe to delete. Confirms an anonymous caller can open a ticket and cannot read one.",
  project_type: "other",
  budget: "unsure",
  timeline: "flexible",
  locale: "en",
};

{
  // The insert must ask for nothing back. PostgREST returns the new row by
  // default, which needs a SELECT right the anonymous role does not have —
  // so the correct call is the one that returns minimal.
  const { status, body } = await post("requests", brief, "return=minimal");
  record("requests", "open a ticket (return=minimal)", "accepted, HTTP 201",
    `HTTP ${status}${status >= 400 ? " " + body.slice(0, 90) : ""}`, status === 201);
}
{
  const { status } = await post("requests", { ...brief, company: marker + "-repr" }, "return=representation");
  record("requests", "insert asking for the row back", "refused, HTTP 4xx",
    `HTTP ${status}`, status >= 400);
}
{
  // The assertion that matters. Having just written a row, try to read that
  // exact row back. "I can read what I wrote" sounds reasonable and would
  // mean reading every other visitor's brief.
  const { status, body } = await get(`requests?select=id,email&company=eq.${marker}`);
  const count = Array.isArray(body) ? body.length : -1;
  record("requests", "read back the row just written", "0 rows",
    `${count} rows, HTTP ${status}`, status === 200 && count === 0);
}
{
  const { status, body } = await get("requests?select=id");
  const count = Array.isArray(body) ? body.length : -1;
  record("requests", "read any request", "0 rows",
    `${count} rows, HTTP ${status}`, status === 200 && count === 0);
}
{
  // Column grants, not just policies: the visitor must not be able to file a
  // request that is already marked Won, or choose its reference.
  const { status } = await post("requests",
    { ...brief, company: marker + "-status", status: "Won" }, "return=minimal");
  record("requests", "set status on insert", "refused, HTTP 4xx",
    `HTTP ${status}`, status >= 400);
}
{
  const { status } = await post("requests",
    { ...brief, company: marker + "-ticket", ticket_id: "REQ-FAKED" }, "return=minimal");
  record("requests", "choose own ticket id", "refused, HTTP 4xx",
    `HTTP ${status}`, status >= 400);
}

// ------------------------------------------------------------------- report
let group = "";
const width = Math.max(...results.map((r) => r.operation.length));
for (const r of results) {
  if (r.group !== group) { group = r.group; console.log(`\n[${group}]`); }
  console.log(`  ${r.verdict.padEnd(5)} ${r.operation.padEnd(width)}  expected ${r.expected}  ·  got ${r.observed}`);
}

const failed = results.filter((r) => r.verdict === "FAIL").length;
console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
console.log(`\nOne probe row was written and cannot be removed with the public key. To clear it:\n  delete from public.requests where company like 'probe-%';`);
process.exit(failed ? 1 : 0);
