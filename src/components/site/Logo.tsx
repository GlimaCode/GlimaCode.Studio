import { siteConfig } from "@/config/site";
import type { Locale } from "@/i18n";

/**
 * Header lockup: the <G> mark beside the wordmark.
 *
 * Both halves are rendered by the page rather than loaded from the packaged
 * lockup SVG. That file sets its wordmark in an SVG <text> element, and an
 * SVG loaded as an image cannot reach the fonts the page has loaded — it
 * would quietly fall back to Arial, which the brand guide forbids. Drawing
 * the mark inline and setting the wordmark as HTML keeps it in real Sora,
 * crisp at any zoom, selectable, and recoloured by the same tokens as the
 * rest of the site.
 *
 * The wordmark stays in Latin script in both locales, and the accent split
 * is derived from the configured brand name.
 */
function splitWordmark(brand: string): [string, string] {
  const index = brand.toLowerCase().lastIndexOf("code");
  if (index <= 0) return [brand, ""];
  return [brand.slice(0, index), brand.slice(index)];
}

export function Logo({ locale }: { locale: Locale }) {
  const [lead, accent] = splitWordmark(siteConfig.brand);

  return (
    <a
      className="logo-lockup"
      href={`/${locale}#top`}
      aria-label={siteConfig.brand}
    >
      <svg className="logo-mark" viewBox="0 0 512 512" aria-hidden="true">
        <path
          className="bracket"
          d="M168 152 96 256l72 104"
          fill="none"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="bracket"
          d="M344 152l72 104-72 104"
          fill="none"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          className="glyph"
          d="M296 226c-9-15-26-24-45-24-29 0-51 21-51 51s22 51 51 51c21 0 39-11 46-30h-46v-26h73v14c0 40-30 68-73 68-44 0-77-32-77-77s33-77 77-77c30 0 55 15 68 39z"
        />
      </svg>
      <span className="logo-word" lang="en" dir="ltr">
        {lead}
        <span className="accent">{accent}</span>
      </span>
    </a>
  );
}
