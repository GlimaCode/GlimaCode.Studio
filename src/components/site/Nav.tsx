import type { Dictionary, Locale } from "@/i18n";
import { Logo } from "./Logo";
import { LocaleSwitch } from "./LocaleSwitch";

export function Nav({ t, locale }: { t: Dictionary; locale: Locale }) {
  return (
    <nav id="nav">
      <div className="nav-inner">
        <Logo locale={locale} />
        <div className="nav-links">
          <a href="#work">{t.nav.work}</a>
          <a href="#services">{t.nav.services}</a>
          <a href="#process">{t.nav.process}</a>
          <a href="#team">{t.nav.team}</a>
          <LocaleSwitch locale={locale} t={t} />
          <a className="nav-cta" href="#start">
            {t.nav.cta}
          </a>
        </div>
      </div>
    </nav>
  );
}
