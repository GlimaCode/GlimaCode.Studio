import { Sora, IBM_Plex_Sans, IBM_Plex_Mono, Vazirmatn } from "next/font/google";

/**
 * All four faces are self-hosted: no third-party request on page load, and
 * the site keeps its typography on networks where Google Fonts is blocked.
 *
 * Two things here are deliberate and easy to undo by accident.
 *
 * `adjustFontFallback: false` on the three Latin faces. Left on, next/font
 * injects a metric-matched fallback — local Arial with size adjustments —
 * *inside* each font's CSS variable, so `--font-plex-sans` expands to
 * `"IBM Plex Sans", "IBM Plex Sans Fallback"`. That fallback face carries no
 * unicode-range limit, so in a stack ending `…, var(--font-vazirmatn)` it
 * claims the Persian glyphs before the cascade ever reaches Vazirmatn, and
 * the entire Persian site silently renders in Arial. Turning it off costs a
 * little more layout shift while fonts load and is the price of Persian
 * being set in Persian type. Vazirmatn keeps its own fallback: it sits last,
 * so nothing is behind it to intercept.
 *
 * The weights are the ones the pages actually request, measured rather than
 * assumed. Sora has no 400 anywhere in the design; Plex Sans needs 700 for
 * the emphasised names in the hero, which were rendering as synthetic bold
 * before that weight was loaded.
 */
export const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
  adjustFontFallback: false,
});

export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
  adjustFontFallback: false,
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
  adjustFontFallback: false,
});

export const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const fontVariables = [
  sora.variable,
  plexSans.variable,
  plexMono.variable,
  vazirmatn.variable,
].join(" ");
