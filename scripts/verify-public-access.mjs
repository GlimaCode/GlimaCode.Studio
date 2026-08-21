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
// After 008 the public role has no rights on the table at all. The only way
// in is submit_request, whose signature is the security boundary.
const marker = `probe-${Date.now().toString(36)}`;
const brief = {
  p_name: "Access probe",
  p_email: `${marker}@example.invalid`,
  p_company: marker,
  p_description:
    "Automated access check. Safe to delete. Confirms a visitor can open a ticket and cannot read one.",
  p_project_type: "other",
  p_budget: "unsure",
  p_timeline: "flexible",
  p_source_slug: null,
  p_locale: "en",
};

async function rpc(name, args) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const body = await response.text();
  return { status: response.status, body };
}

{
  // Writing straight to the table must now be refused outright.
  const { status } = await post("requests", {
    name: "x", email: "x@example.invalid", description: "long enough to pass",
    project_type: "other", budget: "unsure", timeline: "flexible",
  }, "return=minimal");
  record("requests", "insert straight into the table", "refused, HTTP 4xx",
    `HTTP ${status}`, status >= 400);
}

let ticket = null;
{
  const { status, body } = await rpc("submit_request", brief);
  ticket = status === 200 ? body.replace(/^"|"$/g, "") : null;
  record("requests", "open a ticket via submit_request", "a reference, HTTP 200",
    `HTTP ${status}${ticket ? " " + ticket : " " + body.slice(0, 80)}`,
    status === 200 && /^REQ-[0-9A-Z]{5}$/.test(ticket ?? ""));
}
{
  // The assertion that matters, and now the sharpest version of it: the
  // caller knows its own reference and still cannot read the row.
  const query = ticket
    ? `requests?select=id,email&ticket_id=eq.${encodeURIComponent(ticket)}`
    : `requests?select=id,email&company=eq.${marker}`;
  const { status, body } = await get(query);
  const count = Array.isArray(body) ? body.length : -1;
  // Either answer is correct, and refusal is the stronger one: since 008 the
  // role has no select privilege at all, so the request is rejected before
  // row-level security is consulted. Asserting only "200 with no rows" would
  // fail against the safer outcome.
  record("requests", "read back its own ticket", "no rows, by refusal or by filter",
    Array.isArray(body) ? `${count} rows, HTTP ${status}` : `refused, HTTP ${status}`,
    status >= 400 || (status === 200 && count === 0));
}
{
  const { status, body } = await get("requests?select=id");
  const count = Array.isArray(body) ? body.length : -1;
  record("requests", "read any request", "no rows, by refusal or by filter",
    Array.isArray(body) ? `${count} rows, HTTP ${status}` : `refused, HTTP ${status}`,
    status >= 400 || (status === 200 && count === 0));
}
{
  // There is no parameter for status, so the call cannot even be formed.
  const { status } = await rpc("submit_request", { ...brief, p_status: "Won" });
  record("requests", "smuggle a status through the call", "refused, HTTP 4xx",
    `HTTP ${status}`, status >= 400);
}
{
  const response = await fetch(`${url}/rest/v1/requests?ticket_id=eq.${encodeURIComponent(ticket ?? "REQ-00000")}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ status: "Won" }),
  });
  record("requests", "change a request's status", "refused, HTTP 4xx",
    `HTTP ${response.status}`, response.status >= 400);
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
