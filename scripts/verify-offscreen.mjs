// Guards how things are hidden off-screen.
//
// There are two idioms for parking an element outside the viewport while
// keeping it focusable, and only one of them is safe in both directions:
//
//   left: -9999px                 physical. Always the same side. Fine.
//   inset-inline-start: -9999px   logical. Flips to the RIGHT under RTL.
//
// The second one shipped on the skip link. On the Persian page it placed the
// link at x = +11331 — ten thousand pixels past the right edge of a 1440px
// viewport. It produced no scrollbar, so nothing caught it, and the only
// reason was that its container happened to be position:fixed. Nothing
// enforced that and nothing wrote it down. Make the nav sticky one day and
// the Persian site gains a ten-thousand-pixel horizontal scroll.
//
// The rule this encodes: a large negative offset on a LOGICAL property means
// "off-screen in one language and past the far edge in the other". Park
// things in the block axis instead — above the page is above the page in both.
//
// Physical left/right are left alone deliberately. The honeypot field uses a
// physical negative offset and is correct: off-screen left in both locales,
// which is exactly what it wants.
//
//   node scripts/verify-offscreen.mjs

import { readFileSync } from "node:fs";

const CSS = "src/app/globals.css";

/** Logical properties whose sign changes meaning with the writing direction. */
const LOGICAL = [
  "inset-inline-start",
  "inset-inline-end",
  "inset-inline",
  "margin-inline-start",
  "margin-inline-end",
  "margin-inline",
  "padding-inline-start",
  "padding-inline-end",
];

/** Beyond this it is "parked off-screen" rather than a nudge. */
const OFFSCREEN_PX = 400;

/**
 * Blanks every CSS comment while preserving the line count, so a reported
 * line number is the line the declaration is really on.
 *
 * The first version of this check skipped comments by testing whether a line
 * STARTS with an asterisk, and promptly failed the build on its own
 * documentation: the comment above quotes the banned declaration, on a line
 * that begins with a backtick. A guard that cannot tell code from prose about
 * code is worse than no guard, because the noise teaches you to skip it.
 */
function stripComments(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text[i] === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      for (const ch of text.slice(i, stop)) out += ch === "\n" ? "\n" : " ";
      i = stop;
      continue;
    }
    out += text[i];
    i += 1;
  }
  return out;
}

const source = readFileSync(CSS, "utf8");
const original = source.split(/\r?\n/);
const scannable = stripComments(source).split(/\r?\n/);

const failures = [];

scannable.forEach((line, index) => {
  if (!line.trim()) return;
  for (const property of LOGICAL) {
    const re = new RegExp(`${property}\\s*:\\s*(-\\s*[\\d.]+)(px|rem|em|vw|vh)`, "g");
    let m;
    while ((m = re.exec(line))) {
      const raw = Math.abs(parseFloat(m[1].replace(/\s/g, "")));
      const unit = m[2];
      const px =
        unit === "px" ? raw : unit === "vw" || unit === "vh" ? raw * 10 : raw * 16;
      if (px >= OFFSCREEN_PX) {
        failures.push(
          `${CSS}:${index + 1}  ${property}: -${raw}${unit}\n` +
            `      A logical offset this large parks the element off-screen in one\n` +
            `      direction and past the far edge in the other. Use the block axis\n` +
            `      (top/bottom), or a physical left/right if it must be beside.\n` +
            `      ${original[index].trim().slice(0, 100)}`,
        );
      }
    }
  }
});

if (failures.length) {
  console.error("\nOff-screen positioning check FAILED:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}

console.log(
  `Off-screen positioning OK: no logical inset in ${CSS} parks anything ` +
    `${OFFSCREEN_PX}px or more in a direction-dependent way.`,
);
