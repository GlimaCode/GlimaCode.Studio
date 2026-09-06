// Every repository the public site offers, opened as a stranger would open it.
//
//   node scripts/verify-repo-links.mjs
//
// WHY THIS GUARD EXISTS
//
// Tier 3 of the showcase is a GitHub card that links to the repository, and
// the <img onError> fallback in Showcase.tsx cannot see the failure that
// matters. Measured on 2026-09-06:
//
//   opengraph.githubassets.com/1/<org>/<private>   200, 506,737 bytes
//   opengraph.githubassets.com/1/<org>/<missing>   200, 506,737 bytes
//   opengraph.githubassets.com/1/<org>/<public>    200,  42,219 bytes
//
// A private repository and one that never existed return the same generic
// placeholder, with 200. So the image loads, onError never fires, the laptop
// shows a GitHub logo, and the visitor who clicks it gets a 404.
//
// src/lib/data/link.ts stops that reaching the page at build time. This script
// is the other half: it says so out loud, before a build silently drops a
// project nobody notices is missing. Making a repository private is a one-click
// action taken for good reasons on a different day, and nothing on GitHub warns
// you that a portfolio depends on it.
//
// WHAT COUNTS AS A FAILURE
//
// Only a 404 — the same rule as repo.ts, for the same reason. A timeout or a
// 5xx is ignorance about the repository and is reported as UNKNOWN, which does
// not fail the run. A guard that goes red because GitHub was briefly slow is a
// guard people learn to ignore.

import { readFileSync } from "node:fs";

const TIMEOUT_MS = 8000;

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

const response = await fetch(
  `${url}/rest/v1/portfolio_projects?published=eq.true&repo_url=not.is.null&select=slug,repo_url&order=sort_order`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } },
);
if (!response.ok) {
  console.error(`Could not list projects: ${response.status} ${await response.text()}`);
  process.exit(1);
}
const projects = await response.json();

if (!Array.isArray(projects)) {
  console.error("Unexpected response shape from PostgREST.");
  process.exit(1);
}

// Not an assertion about the count — publishing a sixth project must not turn
// this red for a reason that has nothing to do with links. But zero rows means
// the query is wrong or the key lost its grant, and reporting "all clear" for
// an empty list is how a guard passes without checking anything.
if (projects.length === 0) {
  console.error("No published project has a repo_url. Nothing was checked — that is a failure, not a pass.");
  // exitCode rather than exit(): calling process.exit() while the fetch above
  // still holds a socket makes libuv assert on Windows, and an assertion dump
  // printed on top of the real message turns a clear failure into an unclear
  // one. Setting the code and stopping here lets the runtime close cleanly.
  process.exitCode = 1;
}

const rows = [];
for (const project of projects) {
  let status = null;
  let note = "";
  try {
    const page = await fetch(project.repo_url, {
      method: "GET",
      redirect: "follow",
      headers: { accept: "text/html" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    status = page.status;
    // A rename answers 301 and lands somewhere else. The link still works, and
    // saying where it landed is more useful than saying it was fine.
    if (page.url !== project.repo_url) note = `-> ${page.url}`;
  } catch (cause) {
    note = cause instanceof Error ? cause.message.slice(0, 40) : String(cause);
  }

  const verdict = status === 404 ? "FAIL" : status === null ? "UNKNOWN" : "PASS";
  rows.push({ slug: project.slug, url: project.repo_url, status: status ?? "—", note, verdict });
}

const width = Math.max(0, ...rows.map((r) => r.slug.length));
for (const row of rows) {
  const mark = row.verdict === "PASS" ? "ok  " : row.verdict === "FAIL" ? "FAIL" : "?   ";
  console.log(`  ${mark} ${row.slug.padEnd(width)}  ${String(row.status).padEnd(4)} ${row.url} ${row.note}`);
}

const failed = rows.filter((r) => r.verdict === "FAIL");
const unknown = rows.filter((r) => r.verdict === "UNKNOWN");

console.log(
  `\n${rows.length} published repository link(s): ${rows.length - failed.length - unknown.length} reachable` +
    (unknown.length ? `, ${unknown.length} unknown` : "") +
    (failed.length ? `, ${failed.length} BROKEN` : ""),
);

if (failed.length) {
  console.error(
    "\nA 404 here is a repository that is private, renamed away or deleted.\n" +
      "The site drops it at build time rather than showing a card that 404s, so\n" +
      "the visible symptom is a project quietly missing from /showcase.",
  );
  process.exitCode = 1;
}
