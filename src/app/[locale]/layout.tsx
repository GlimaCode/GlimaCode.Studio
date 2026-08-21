import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import {
  LOCALES,
  bcp47,
  directionOf,
  getDictionary,
  isLocale,
  type Locale,
} from "@/i18n";
import { siteConfig } from "@/config/site";
import { stripIsolates } from "@/i18n/pending";
import { localeAlternates } from "@/lib/seo/alternates";
import { fontVariables } from "../fonts";
import "../globals.css";

/** Both locales are known at build time, so both are statically generated. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * The hero starts hidden and is revealed by the `ready` class. In the
 * prototype that class was added by an inline script at the end of the
 * document, so it landed on the first frames after parse. Running it from a
 * React effect instead would delay it until hydration, leaving the hero
 * blank on a slow connection or a backgrounded tab — so it stays inline,
 * with the same two-frame wait that lets the initial styles paint first.
 */
const REVEAL_HERO = `requestAnimationFrame(function(){requestAnimationFrame(function(){document.body.classList.add("ready")})})`;

/**
 * With scripting unavailable the reveal classes never arrive, which would
 * leave the whole page blank. This puts everything in its final state so the
 * site is still readable. It costs the entrance choreography and nothing else.
 */
const NO_SCRIPT_FALLBACK = `
  .fade-up,.reveal{opacity:1;transform:none}
  .mask > span{transform:none}
  .eyebrow::before,.sec-label::after,.col-head::before{transform:scaleX(1)}
  .step:not(:last-child)::after{transform:scaleX(1)}
`;

type LayoutParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = getDictionary(locale);
  // Metadata is plain text: strip the directional isolates that only matter
  // when a fallback string is laid out inside a right-to-left page.
  const title = `${siteConfig.brand} — ${stripIsolates(dictionary.meta.tagline)}`;
  const description = stripIsolates(dictionary.meta.description);

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: title,
      template: `%s — ${siteConfig.brand}`,
    },
    description,
    alternates: localeAlternates(locale),
    openGraph: {
      type: "website",
      locale: bcp47(locale),
      // The other locale, so a crawler that only reads Open Graph still
      // learns this page has a second rendering.
      alternateLocale: LOCALES.filter((code) => code !== locale).map(bcp47),
      url: `${siteConfig.url}/${locale}`,
      siteName: siteConfig.brand,
      title,
      description,
    },
    /**
     * No twitter:image is set anywhere. Declaring the card type is enough —
     * Twitter and every other reader that follows its conventions fall back
     * to og:image, which the opengraph-image route supplies. Duplicating the
     * image into a second tag would mean a second place to forget.
     */
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        // Defaults cap the text snippet and forbid large image previews on
        // some surfaces. For a studio that is found by name and judged on a
        // link preview, both caps work against us.
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#F7F8FA",
};

export default async function LocaleLayout({
  children,
  params,
}: LayoutParams & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale: Locale = locale;

  return (
    <html
      lang={bcp47(typedLocale)}
      dir={directionOf(typedLocale)}
      className={fontVariables}
    >
      <head>
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: NO_SCRIPT_FALLBACK }} />
        </noscript>
      </head>
      {/* The reveal script below adds `ready` to this element before React
          hydrates — that is the whole point of running it inline rather than
          from an effect. React therefore finds a className the server never
          sent and logs a hydration mismatch on every page load. The mismatch
          is intended and the class is not patched away, so the warning is
          noise; suppressing it here keeps a real one visible when it appears.
          Only this element's own attributes are exempted, not its children. */}
      <body suppressHydrationWarning>
        {children}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_HERO }} />
      </body>
    </html>
  );
}
