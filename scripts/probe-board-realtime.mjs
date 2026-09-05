// Listens to the board's realtime channel as an anonymous visitor.
//
// The HTTP probe proves that an anonymous caller cannot READ the board tables.
// It cannot prove they are not being WHISPERED to. Realtime is a second door
// into the same rows: the tables are in the `supabase_realtime` publication,
// they replicate their full old row on delete, and a client that subscribes is
// asking the server to push every change as it happens. Whether row-level
// security is applied to that stream is a different mechanism from the one
// PostgREST uses, and it deserves its own evidence.
//
// This cannot run unattended, which is why it is a probe and not a guard: it
// needs somebody signed in to change something while it is listening. So does
// scripts/verify-public-access.mjs, and neither is in CI for the same reason.
//
//   node scripts/probe-board-realtime.mjs [seconds]
//
// Then, while it is listening, open /dashboard/board as a team member and move
// a card. A PASS means the anonymous listener heard nothing.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) env[match[1]] = match[2].trim();
    }
  } catch {
    // Fall through to process.env.
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

const seconds = Number(process.argv[2] ?? 45);
const heard = [];

// Deliberately the public key and nothing else: this is what any visitor to
// glimacode.com already has, because it ships in the JavaScript bundle.
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const channel = client
  .channel("anon-board-probe")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "board_cards" },
    (payload) => heard.push({ table: "board_cards", event: payload.eventType, payload }),
  )
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "board_columns" },
    (payload) => heard.push({ table: "board_columns", event: payload.eventType, payload }),
  );

// Three separate facts, because conflating the first two made an early run of
// this script report a pass for the wrong reason. `status` is whatever the
// channel last said, and the last thing it says is always CLOSED — the line
// below tears it down. Reading a refusal off that would announce "not even
// allowed to subscribe" about a client that had subscribed perfectly well.
//
// The third fact is coverage. A five-minute run printed SUBSCRIBED twice,
// which means the socket dropped and rejoined; a change made during that gap
// would have gone unheard for a reason that has nothing to do with row-level
// security. Silence is only evidence for the time actually spent listening,
// so that time is measured and reported rather than assumed to be all of it.
let status = "never reported";
let everSubscribed = false;
let subscribedSince = 0;
let listeningMs = 0;
const transitions = [];
const started = Date.now();

function closeWindow() {
  if (subscribedSince) {
    listeningMs += Date.now() - subscribedSince;
    subscribedSince = 0;
  }
}

channel.subscribe((state, error) => {
  status = error ? `${state}: ${error.message ?? error}` : state;
  transitions.push(`${((Date.now() - started) / 1000).toFixed(1)}s ${status}`);
  if (state === "SUBSCRIBED") {
    if (everSubscribed) {
      console.log("\n  (reconnected — the socket had dropped)\n");
    } else {
      console.log("\n  The anonymous listener is connected and subscribed.");
      console.log("  Now change something on the board: move a card, add one,");
      console.log("  edit one. Several changes spread out is better than one.\n");
    }
    everSubscribed = true;
    if (!subscribedSince) subscribedSince = Date.now();
  } else {
    closeWindow();
  }
});

console.log(`Listening as an anonymous client for ${seconds}s...`);
await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
closeWindow();

// Whatever the channel says after this is the teardown talking.
await client.removeChannel(channel);

const coverage = Math.round((listeningMs / (seconds * 1000)) * 100);
console.log(`\n  reached SUBSCRIBED : ${everSubscribed ? "yes" : "no"}`);
console.log(`  actually listening : ${(listeningMs / 1000).toFixed(0)}s of ${seconds}s (${coverage}%)`);
console.log(`  channel timeline   : ${transitions.join("  ->  ")}`);
console.log(`  events heard       : ${heard.length}`);

if (heard.length) {
  console.error(
    "\nFAIL — an anonymous listener received board changes.\n" +
      "Row-level security is not being applied to the realtime stream. The\n" +
      "board's contents are reaching anyone who opens the site.\n",
  );
  for (const item of heard.slice(0, 5)) {
    console.error(`  ${item.table} ${item.event}: ${JSON.stringify(item.payload.new ?? item.payload.old)}`);
  }
  process.exit(1);
}

if (!everSubscribed) {
  console.log(
    "\nPASS, by the stronger route: the anonymous client was never allowed to\n" +
      `subscribe at all (${status}). Nothing to filter, because there is no stream.\n`,
  );
} else {
  console.log(
    "\nThe anonymous client DID subscribe, and heard nothing.\n\n" +
      `It was genuinely listening for ${coverage}% of the window; anything that\n` +
      "happened in the remaining time would have been missed for a reason that\n" +
      "has nothing to do with row-level security.\n\n" +
      "And silence is only evidence if there was something to hear. If nobody\n" +
      "changed the board during the window, this run proves nothing at all.\n",
  );
}
