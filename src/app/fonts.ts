import { Sora, IBM_Plex_Sans, IBM_Plex_Mono, Vazirmatn } from "next/font/google";

/**
 * All four faces are self-hosted: no third-party request on page load, and
 * the site keeps its typography on networks where Google Fonts is blocked.
 *
 * Vazirmatn is listed last in every stack in the stylesheet. Font fallback
 * is per-glyph, so a Latin run inside a Persian sentence — GlimaCode, React,
 * Supabase — still renders in the Latin face, and only the Persian glyphs,
 * which the Latin faces do not contain, fall through to Vazirmatn. That is
 * exactly the mix the brand calls for, with no markup around it.
 */
export const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
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
