import type { Metadata, Viewport } from "next";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { fontVariables } from "../fonts";
import "../globals.css";

/**
 * The dashboard is its own root: it sits outside the locale segment because
 * its interface is English only, by decision. Visitor-written text inside it
 * is a different matter and is marked up for its own direction where it is
 * rendered.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F8FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1728" },
  ],
};

export const metadata: Metadata = {
  title: "Dashboard — GlimaCode",
  // Never index the dashboard, and never follow out of it.
  robots: { index: false, follow: false, nocache: true },
};

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className={fontVariables}>
      <head>
        {/* The same pre-paint stamp as the public layout. The dashboard is
            its own root, so it needs its own copy — and it is the surface
            that most wants dark, being the one read at night. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="dash-mode">{children}</body>
    </html>
  );
}
