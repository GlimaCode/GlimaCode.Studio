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
      <body>{children}</body>
    </html>
  );
}
