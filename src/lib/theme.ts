/**
 * Theme selection.
 *
 * Three states, not two: "system" is a real choice and the default one. A
 * visitor who has never touched the control follows their operating system,
 * and keeps following it when they change it. Only an explicit choice is
 * stored, and only an explicit choice overrides.
 *
 * The stamped attribute is always concrete — "light" or "dark", never
 * "system" — because CSS cannot resolve "system" on its own. What is stored
 * and what is stamped are therefore different things, and conflating them is
 * how a theme toggle ends up unable to return to following the system.
 */

export const THEMES = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof THEMES)[number];

/** Where the choice is kept. Read by the inline script before first paint. */
export const THEME_STORAGE_KEY = "glimacode-theme";

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/**
 * Runs before the first paint, in both layouts.
 *
 * It has to be inline and synchronous. Moving it into a component would mean
 * the page paints in one theme and then swaps once React hydrates, which is
 * the flash this exists to prevent — the same reason the hero reveal is
 * inline rather than an effect.
 *
 * Deliberately silent on failure. Storage access throws in some privacy modes,
 * and the fallback is the media query in globals.css, which is already the
 * right answer for someone who has never chosen.
 *
 * Kept as a string rather than a function so it can be stringified honestly:
 * a minifier is free to rename a real function's internals, and this has to
 * keep working when it is inlined verbatim into the document head.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var m=window.matchMedia("(prefers-color-scheme: dark)");
var t=(s==="light"||s==="dark")?s:(m.matches?"dark":"light");
document.documentElement.setAttribute("data-theme",t);
if(s!=="light"&&s!=="dark"){
  var f=function(e){document.documentElement.setAttribute("data-theme",e.matches?"dark":"light")};
  m.addEventListener?m.addEventListener("change",f):m.addListener(f);
}
}catch(e){}})()`;
