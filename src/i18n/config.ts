/**
 * Locale configuration.
 *
 * Two locales, path-prefixed and both statically generated. There is no
 * translation library: a typed dictionary plus Intl covers everything this
 * site needs, and a missing key becomes a build error rather than a runtime
 * `undefined`.
 */

export const LOCALES = ["en", "fa"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie remembering an explicit choice. Never set from Accept-Language. */
export const LOCALE_COOKIE = "glimacode_locale";

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function directionOf(locale: Locale): "ltr" | "rtl" {
  return locale === "fa" ? "rtl" : "ltr";
}

/** BCP 47 tag, used for `lang` and for every Intl formatter. */
export function bcp47(locale: Locale): string {
  return locale === "fa" ? "fa-IR" : "en";
}

/** Native name of each locale, for the switcher. */
export const LOCALE_LABEL: Record<Locale, string> = {
  en: "EN",
  fa: "فا",
};

/** Full native name, used for the switcher's accessible label. */
export const LOCALE_NAME: Record<Locale, string> = {
  en: "English",
  fa: "فارسی",
};
