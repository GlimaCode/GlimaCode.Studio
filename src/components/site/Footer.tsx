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
        {/* The dashboard route does not exist yet, and the site is live, so
            the link stays hidden rather than sending anyone to a 404. */}
        {siteConfig.features.dashboard ? (
          <Link href="/dashboard">{t.footer.teamAccess}</Link>
        ) : null}
      </div>
    </footer>
  );
}
