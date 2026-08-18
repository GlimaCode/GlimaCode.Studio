import type { Metadata, Viewport } from "next";
import { Sora, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { siteConfig } from "@/config/site";
import "./globals.css";

/**
 * Self-hosted through next/font: no third-party request on page load, no
 * flash of unstyled text, and the site keeps working on networks where
 * fonts.googleapis.com is unreachable. Weights match the prototype exactly.
 */
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

/**
 * The hero starts hidden and is revealed by the `ready` class. In the
 * prototype that class was added by an inline script at the end of the
 * document, so it landed on the first frames after parse. Running it from a
 * React effect instead would delay it until hydration, leaving the hero
 * blank on a slow connection or a backgrounded tab — so it stays inline,
 * with the same two-frame wait that lets the initial styles paint first.
 */
const REVEAL_HERO = `requestAnimationFrame(function(){requestAnimationFrame(function(){document.body.classList.add("ready")})})`;

/**
 * With scripting unavailable the reveal classes never arrive, which would
 * leave the whole page blank. This puts everything in its final state so the
 * site is still readable. It costs the entrance choreography and nothing else.
 */
const NO_SCRIPT_FALLBACK = `
  .fade-up,.reveal{opacity:1;transform:none}
  .mask > span{transform:none}
  .eyebrow::before,.sec-label::after,.col-head::before{transform:scaleX(1)}
  .step:not(:last-child)::after{transform:scaleX(1)}
`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.brand} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.brand}`,
  },
  description: siteConfig.description,
};

export const viewport: Viewport = {
  themeColor: "#F7F8FA",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <head>
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: NO_SCRIPT_FALLBACK }} />
        </noscript>
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_HERO }} />
      </body>
    </html>
  );
}
