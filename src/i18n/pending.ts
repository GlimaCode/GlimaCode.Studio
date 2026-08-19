/**
 * Marks a string that still needs native copy.
 *
 * Marketing prose is not machine-translated in this project: a Persian
 * sentence built from English structure reads translated to exactly the
 * people it is aimed at. So the structure ships, and prose the team has not
 * written yet falls back to English — the same graceful fallback the
 * portfolio uses for missing translations, rather than a visible TODO.
 *
 * The fallback is wrapped in Unicode directional isolates. An English
 * sentence sitting inside a right-to-left page otherwise has its trailing
 * punctuation reordered by the bidirectional algorithm, so "board." renders
 * as ".board". LRI/PDI mark the run as an isolated left-to-right island and
 * the punctuation stays put. The characters are invisible, need no markup at
 * the call site, and disappear on their own once real Persian copy replaces
 * the fallback.
 *
 * Grep for `pending(` to find everything still waiting.
 */
const LRI = "⁦";
const PDI = "⁩";

export function pending(englishSource: string): string {
  return `${LRI}${englishSource}${PDI}`;
}

/**
 * Removes the isolates for contexts that are plain text rather than rendered
 * markup — page titles, meta descriptions, link previews. There is no
 * bidirectional layout to protect there, so the characters would only travel
 * to crawlers and social cards as invisible noise.
 */
export function stripIsolates(text: string): string {
  return text.replace(/[⁦⁩]/g, "");
}
