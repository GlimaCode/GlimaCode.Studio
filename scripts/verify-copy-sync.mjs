// Checks that the home board and the portfolio still say the same thing.
//
// Three cards on the home board restate a database row word for word. The
// board reads the dictionary in src/i18n; the portfolio reads the database.
// Nothing held the two together, and the dashboard says plainly that "content
// is edited in the database" — so the first edit made there would leave the
// home page quoting the old text, on the busiest page of the site, with no
// error and nothing to notice.
//
// It found real drift the first time it ran, within minutes of being written:
// an apostrophe sweep had changed the dictionary copy and not the row.
//
// WHY THIS IS NOT IN CI
//
// The guard workflow has no database credentials, and that is deliberate —
// public pages must render without them, so a deploy is possible while the
// database is down. Adding credentials to CI to satisfy this check would undo
// a decision made for a better reason than this one.
//
// So it runs here and on a developer's machine, with the same public key a
// browser already has, and it refuses to pass when it cannot reach the
// database rather than skipping quietly. A check that reports success because
// it did nothing is worse than no check.
//
//   npm run verify:copy-sync

import { readFileSync } from "node:fs";

const DICTIONARY = "src/i18n/dictionaries/en.ts";
const BOARD = "src/content/projects.ts";

const unescapeLiteral = (s) => s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");

function env() {
  let raw;
  try {
    raw = readFileSync(".env.local", "utf8");
  } catch {
    return {};
  }
  return Object.fromEntries(
    raw
      .split("\n")
      .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [
          line.slice(0, i).trim(),
          line.slice(i + 1).trim().replace(/^["']|["']$/g, ""),
        ];
      }),
  );
}

/** ref -> slug, from the board's own declaration of what it mirrors. */
function mirroredRefs() {
  const src = readFileSync(BOARD, "utf8");
  const out = new Map();
  const re = /ref:\s*"(PRJ-\d+)"\s*,\s*\r?\n\s*portfolioSlug:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) out.set(m[1], m[2]);
  return out;
}

/** ref -> { title, description }, from the English dictionary. */
function boardCopy() {
  const src = readFileSync(DICTIONARY, "utf8");
  const block = src.slice(src.indexOf("  projects: {"));
  const out = new Map();
  const re =
    /"(PRJ-\d+)":\s*\{\s*\r?\n\s*title:\s*"((?:[^"\\]|\\.)*)"\s*,\s*\r?\n\s*description:\s*\r?\n?\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(block))) {
    out.set(m[1], {
      title: unescapeLiteral(m[2]),
      description: unescapeLiteral(m[3]),
    });
  }
  return out;
}

function fail(...lines) {
  console.error("\nCopy sync check FAILED:");
  for (const line of lines) console.error("  " + line);
  process.exitCode = 1;
}

async function main() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key } = env();
  if (!url || !key) {
    return fail(
      "no database credentials in .env.local.",
      "This compares the home board against the live portfolio rows and cannot",
      "do that offline. It refuses rather than skipping, so a green run always",
      "means the two were actually compared.",
    );
  }

  const mirrored = mirroredRefs();
  if (!mirrored.size) {
    return fail(
      "no board card declares a portfolioSlug.",
      "Either the board stopped mirroring the portfolio — in which case delete",
      "this check — or the declaration was lost and nothing is being compared.",
    );
  }

  let rows;
  try {
    const response = await fetch(
      `${url}/rest/v1/portfolio_projects?select=slug,title_en,summary_en&published=eq.true`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!response.ok) {
      return fail(`the database returned ${response.status}.`);
    }
    rows = new Map((await response.json()).map((r) => [r.slug, r]));
  } catch (cause) {
    return fail(`could not reach the database: ${cause.message}`);
  }

  const copy = boardCopy();
  const problems = [];

  for (const [ref, slug] of mirrored) {
    const card = copy.get(ref);
    const row = rows.get(slug);
    if (!card) {
      problems.push(`${ref} names portfolio row "${slug}" but has no entry in ${DICTIONARY}.`);
      continue;
    }
    if (!row) {
      problems.push(
        `${ref} names portfolio row "${slug}", which is not published — the board ` +
          `would show a project the portfolio does not.`,
      );
      continue;
    }
    if (card.title !== row.title_en) {
      problems.push(
        `${ref} title differs from portfolio row "${slug}":\n` +
          `      board: ${card.title}\n` +
          `      row:   ${row.title_en}`,
      );
    }
    if (card.description !== row.summary_en) {
      const at = [...card.description].findIndex((c, i) => c !== row.summary_en[i]);
      problems.push(
        `${ref} description differs from portfolio row "${slug}", from character ${at}:\n` +
          `      board: …${card.description.slice(Math.max(0, at - 30), at + 30)}…\n` +
          `      row:   …${row.summary_en.slice(Math.max(0, at - 30), at + 30)}…`,
      );
    }
  }

  if (problems.length) {
    return fail(
      ...problems,
      "",
      "The home board and the portfolio show the same three projects. Change the",
      "database row and the dictionary entry together, or the home page keeps",
      "quoting the old text.",
    );
  }

  console.log(
    `Copy sync OK: ${mirrored.size} board card(s) match their portfolio row, ` +
      `title and summary.`,
  );
}

await main();
