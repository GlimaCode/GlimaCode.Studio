import type { Metadata } from "next";
import { fontVariables } from "../fonts";
import "../globals.css";

/**
 * The dashboard is its own root: it sits outside the locale segment because
 * its interface is English only, by decision. Visitor-written text inside it
 * is a different matter and is marked up for its own direction where it is
 * rendered.
 */
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
      <body className="dash-mode">{children}</body>
    </html>
  );
}
