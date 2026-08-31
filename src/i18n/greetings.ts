/**
 * The rotating hero line.
 *
 * The eyebrow cycles the whole sentence, not just the greeting word, because
 * one word in another language reads as a flourish and a whole sentence reads
 * as a studio that works in more than one.
 *
 * WHY THESE TEN AND NOT THE OBVIOUS TEN
 *
 * Chinese, Japanese and Hindi are missing on purpose. The site loads IBM Plex
 * Mono and Vazirmatn; between them they cover Latin, Cyrillic and Arabic
 * script, and nothing else — not Greek either, which is easy to assume
 * because IBM Plex *Sans* has a Greek face and Plex *Mono* does not. Asked which face actually drew each candidate,
 * Chrome answered NSimSun, MS Gothic and Nirmala UI for those three — system
 * fonts, different on every platform, and absent entirely on a machine with no
 * CJK or Devanagari installed, where they render as empty boxes. A line whose
 * whole job is to look deliberate cannot be drawn by whatever the visitor
 * happens to have.
 *
 * Adding them properly means shipping a CJK webfont, and CJK webfonts are
 * megabytes. The hero is the LCP element and stays as designed.
 *
 * So the set is the widely-spoken languages this site can actually draw:
 * English, Spanish, French, Arabic, Russian, Portuguese, German, Italian,
 * Turkish and Indonesian, plus Persian. Every one of them renders in the
 * site's own type on every platform.
 *
 * If a language is ever added here, run scripts/verify-greeting-fonts.mjs —
 * it fails the build when an entry needs a face the site does not load.
 */

export type Greeting = {
  /** BCP 47 tag, set on the element so screen readers switch voice. */
  lang: string;
  /** Writing direction. Only the Arabic-script entries are rtl. */
  dir: "ltr" | "rtl";
  /** The greeting word. */
  hello: string;
  /** The rest of the line. */
  phrase: string;
};

export const GREETINGS: readonly Greeting[] = [
  { lang: "en", dir: "ltr", hello: "Hello", phrase: "we’re a two-developer studio" },
  { lang: "es", dir: "ltr", hello: "Hola", phrase: "somos un estudio de dos desarrolladores" },
  { lang: "fr", dir: "ltr", hello: "Bonjour", phrase: "nous sommes un studio de deux développeurs" },
  { lang: "ar", dir: "rtl", hello: "مرحبًا", phrase: "نحن استوديو من مطوّرَين" },
  { lang: "ru", dir: "ltr", hello: "Привет", phrase: "мы студия из двух разработчиков" },
  { lang: "pt", dir: "ltr", hello: "Olá", phrase: "somos um estúdio de dois desenvolvedores" },
  { lang: "de", dir: "ltr", hello: "Hallo", phrase: "wir sind ein Studio aus zwei Entwicklern" },
  { lang: "it", dir: "ltr", hello: "Ciao", phrase: "siamo uno studio di due sviluppatori" },
  { lang: "tr", dir: "ltr", hello: "Merhaba", phrase: "iki geliştiriciden oluşan bir stüdyoyuz" },
  { lang: "id", dir: "ltr", hello: "Halo", phrase: "kami studio dengan dua pengembang" },
  { lang: "fa", dir: "rtl", hello: "سلام", phrase: "ما یک استودیوی دونفره‌ایم" },
] as const;

/** The em dash between the two halves, with the spaces it needs. */
export const GREETING_SEPARATOR = " — ";

export function greetingLine(g: Greeting): string {
  return `${g.hello}${GREETING_SEPARATOR}${g.phrase}`;
}

/**
 * Where the cycle starts: the visitor's own language, so the first thing they
 * read is the one they came for. Everything after it is the flourish.
 */
export function startIndex(locale: string): number {
  const i = GREETINGS.findIndex((g) => g.lang === locale);
  return i === -1 ? 0 : i;
}
