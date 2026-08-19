// Lists dictionary keys still awaiting native copy, so the handoff is a
// checklist rather than a hunt through components.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/i18n/dictionaries";
const files = readdirSync(DIR).filter((f) => f.endsWith(".ts") && f !== "en.ts");

let total = 0;
for (const file of files) {
  const source = readFileSync(join(DIR, file), "utf8");
  const lines = source.split("\n");
  const found = [];
  const path = [];

  lines.forEach((line, index) => {
    const open = line.match(/^\s*([A-Za-z0-9_"'-]+):\s*\{\s*$/);
    if (open) path.push(open[1].replace(/["']/g, ""));
    else if (/^\s*\},?\s*$/.test(line)) path.pop();

    const key = line.match(/^\s*([A-Za-z0-9_"'-]+):\s*pending\(/);
    if (key) {
      found.push({
        key: [...path, key[1].replace(/["']/g, "")].join("."),
        line: index + 1,
      });
    }
  });

  console.log(`\n${file} — ${found.length} key(s) awaiting native copy`);
  found.forEach((entry) =>
    console.log(`  ${String(entry.line).padStart(4)}  ${entry.key}`),
  );
  total += found.length;
}

console.log(`\nTotal: ${total}`);
