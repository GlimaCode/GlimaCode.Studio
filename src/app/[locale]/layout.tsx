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

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${siteConfig.brand} — ${dictionary.meta.tagline}`,
      template: `%s — ${siteConfig.brand}`,
    },
    description: dictionary.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        LOCALES.map((code) => [bcp47(code), `/${code}`]),
      ),
    },
    openGraph: {
      type: "website",
      locale: bcp47(locale),
      url: `${siteConfig.url}/${locale}`,
      siteName: siteConfig.brand,
      title: `${siteConfig.brand} — ${dictionary.meta.tagline}`,
      description: dictionary.meta.description,
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
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_HERO }} />
      </body>
    </html>
  );
}
