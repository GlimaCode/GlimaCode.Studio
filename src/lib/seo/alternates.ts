import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALES, bcp47, type Locale } from "@/i18n";

/**
 * Canonical plus hreflang for one page, in one call.
 *
 * Next does not inherit `alternates` from a parent layout the way it inherits
 * a title template, so every route that wants hreflang has to state it. Doing
 * that by hand three times is three chances to pair a page with the wrong
 * path, and a wrong hreflang is worse than none: it tells a crawler two
 * different pages are translations of each other.
 *
 * `path` is everything after the locale segment, with a leading slash or
 * empty for the home page.
 */
export function localeAlternates(
  locale: Locale,
  path: string = "",
): Metadata["alternates"] {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(
        LOCALES.map((code) => [bcp47(code), `/${code}${path}`]),
      ),
      // Whoever matches neither language gets the default rather than
      // whichever page the crawler happened to reach first.
      "x-default": `/${DEFAULT_LOCALE}${path}`,
    },
  };
}
