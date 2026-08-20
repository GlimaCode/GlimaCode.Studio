// Guards the font stacks in the built CSS.
//
// The Persian site once rendered entirely in system Arial because a
// metric-matched fallback face sat ahead of Vazirmatn in every stack. It
// looked fine in every structural check and only showed up when someone
// asked which font was actually drawing the glyphs. This turns that class of
// regression into a build failure.
//
//   npm run build && node scripts/verify-fonts.mjs
//
// Static: it reads the emitted CSS rather than driving a browser, so it can
// run anywhere without a server.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = ".next/static";

function cssFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...cssFiles(path));
    else if (entry.endsWith(".css")) out.push(path);
  }
  return out;
}

let css = "";
try {
  css = cssFiles(ROOT).map((f) => readFileSync(f, "utf8")).join("\n");
} catch {
  console.error(`No build output under ${ROOT}. Run \`npm run build\` first.`);
  process.exit(1);
}

const failures = [];
const notes = [];

// 1. Every Latin stack must reach Vazirmatn before any fallback face.
//    Take the last definition of each variable, which is the one that wins.
for (const name of ["--font-sora", "--font-plex-sans", "--font-plex-mono"]) {
  const all = [...css.matchAll(new RegExp(`${name}:([^;}]*)`, "g"))].map((m) => m[1].trim());
  if (!all.length) {
    failures.push(`${name} is not defined in the built CSS at all.`);
    continue;
  }
  const value = all[all.length - 1];
  const vazir = value.indexOf("Vazirmatn");
  const fallback = value.search(/["']?[A-Za-z ]+Fallback/);

  if (vazir === -1) {
    failures.push(`${name} does not list Vazirmatn: ${value}`);
  } else if (fallback !== -1 && fallback < vazir) {
    failures.push(
      `${name} puts a fallback face ahead of Vazirmatn, so Persian will render in it: ${value}`,
    );
  } else if (fallback === -1) {
    notes.push(`${name}: no fallback face emitted — the Turbopack workaround in globals.css can go.`);
  }
}

// 2. The weights the design uses must have real faces, or the browser fakes
//    them. Plex Sans 700 carries the emphasised names in the hero.
const required = [
  ["IBM Plex Sans", "700"],
  ["IBM Plex Sans", "400"],
  ["Sora", "800"],
  ["Sora", "700"],
  ["Vazirmatn", "700"],
  ["Vazirmatn", "400"],
];
// Family names are emitted unquoted when they have no spaces, quoted when
// they do, so parse each block rather than string-matching a fixed shape.
const declared = new Set();
for (const [, body] of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
  const family = body.match(/font-family:\s*(?:"([^"]+)"|'([^']+)'|([^;]+))/);
  const weight = body.match(/font-weight:\s*([^;]+)/);
  if (!family) continue;
  const name = (family[1] ?? family[2] ?? family[3]).trim();
  declared.add(`${name}@${weight ? weight[1].trim() : "400"}`);
}

for (const [family, weight] of required) {
  // A variable face declares a range, e.g. "100 900", and covers the weight.
  const covered =
    declared.has(`${family}@${weight}`) ||
    [...declared].some((entry) => {
      const [name, w] = entry.split("@");
      if (name !== family || !w.includes(" ")) return false;
      const [lo, hi] = w.split(/\s+/).map(Number);
      return Number(weight) >= lo && Number(weight) <= hi;
    });
  if (!covered) {
    failures.push(`No @font-face for ${family} at weight ${weight} — it would render as synthetic bold.`);
  }
}

for (const note of notes) console.log("note: " + note);
if (failures.length) {
  console.error("\nFont stack check FAILED:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("Font stacks OK: Vazirmatn is reachable in every Latin stack, and every used weight has a real face.");
