import Link from "next/link";
import { siteConfig } from "@/config/site";
import type { Dictionary } from "@/i18n";

export function Footer({ t }: { t: Dictionary }) {
  return (
    <footer>
      <div className="wrap">
        <span>
          <span lang="en" dir="ltr">
            {siteConfig.brand}
          </span>{" "}
          — {t.footer.tagline}
        </span>
        {/* The only way in, and deliberately quiet. It leads to a sign-in
            form, not a door: there is no public sign-up behind it and no
            client accounts — membership is granted by hand in SQL. Anyone
            who follows it without an account gets a form that will never
            accept them, which is the intended outcome, not a gap. */}
        {siteConfig.features.dashboard ? (
          <Link href="/dashboard">{t.footer.teamAccess}</Link>
        ) : null}
      </div>
    </footer>
  );
}
