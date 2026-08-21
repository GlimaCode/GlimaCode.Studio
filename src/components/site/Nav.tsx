import type { Dictionary, Locale } from "@/i18n";
import { Logo } from "./Logo";
import { LocaleSwitch } from "./LocaleSwitch";

/**
 * The site header.
 *
 * Its links are section anchors, which only work on a page that has those
 * sections. On the home page all five do; on a case study only the request
 * form does, and the rest were silently dead — a link that scrolls nowhere,
 * with no error and no clue why.
 *
 * So each page declares which sections it actually contains, and anything
 * else becomes a link back to the home page at that anchor. The default is
 * the home page's set, because that is the page the header was written for.
 *
 * The distinction matters most for `start`. A case study renders its own
 * request form on purpose — the visitor asks for something like this without
 * leaving the thing that convinced them — so on that page `#start` has to
 * stay local rather than bouncing them back to the home page.
 */

const HOME_SECTIONS = ["work", "services", "process", "team", "start"] as const;

export function Nav({
  t,
  locale,
  localSections = HOME_SECTIONS,
}: {
  t: Dictionary;
  locale: Locale;
  localSections?: readonly string[];
}) {
  const href = (section: string) =>
    localSections.includes(section) ? `#${section}` : `/${locale}#${section}`;

  return (
    <nav id="nav">
      <div className="nav-inner">
        <a className="skip-link" href="#main">
          {t.nav.skipToContent}
        </a>
        <Logo locale={locale} />
        <div className="nav-links">
          <a href={href("work")}>{t.nav.work}</a>
          <a href={href("services")}>{t.nav.services}</a>
          <a href={href("process")}>{t.nav.process}</a>
          <a href={href("team")}>{t.nav.team}</a>
          <LocaleSwitch locale={locale} t={t} />
          <a className="nav-cta" href={href("start")}>
            {t.nav.cta}
          </a>
        </div>
      </div>
    </nav>
  );
}
