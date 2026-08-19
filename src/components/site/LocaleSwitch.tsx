import { LOCALES, LOCALE_LABEL, LOCALE_NAME, type Locale } from "@/i18n";
import type { Dictionary } from "@/i18n";

/**
 * Language switcher.
 *
 * A plain link, so it works with scripting unavailable and can be opened in
 * a new tab. The visited locale is remembered by the motion layer, which
 * writes the cookie the middleware reads when someone returns to the bare
 * domain.
 */
export function LocaleSwitch({
  locale,
  t,
}: {
  locale: Locale;
  t: Dictionary;
}) {
  const other = LOCALES.find((code) => code !== locale) ?? locale;

  return (
    <a
      className="locale-switch"
      href={`/${other}`}
      lang={other === "fa" ? "fa" : "en"}
      hrefLang={other}
      aria-label={`${t.localeSwitch.switchTo} ${LOCALE_NAME[other]}`}
    >
      {LOCALE_LABEL[other]}
    </a>
  );
}
