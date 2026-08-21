import { siteConfig } from "@/config/site";
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/card";

/**
 * Link preview for the home page, and — by inheritance — for the work index
 * and anything else under a locale that does not define its own.
 *
 * Identical for both locales. Everything on the card is Latin script by
 * necessity (see lib/og/card.tsx), so there is nothing left for the locale to
 * change; the translated text of a share travels in og:title and
 * og:description instead.
 */

export const alt = "GlimaCode — two-developer web studio";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return ogCard({
    eyebrow: siteConfig.tagline,
    title: "React and Supabase, built by two developers",
    footnote: "Scoped plans · Staged delivery",
  });
}
