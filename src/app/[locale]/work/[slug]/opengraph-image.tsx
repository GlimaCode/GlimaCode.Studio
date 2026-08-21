import { getPublishedProject, listPublishedSlugs } from "@/lib/data/portfolio";
import { isLocale } from "@/i18n";
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og/card";

/**
 * Link preview for a case study.
 *
 * Always reads the English record. Project titles are product names that stay
 * in Latin script in both locales, and the category label is the one piece
 * that would differ — taking it from English keeps the card renderable with
 * the bundled font. The Persian share still reads as Persian: the title and
 * description in the page metadata are translated, and those are the lines a
 * person actually reads next to the image.
 */

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "GlimaCode case study";

export function generateStaticParams() {
  return listPublishedSlugs().then((slugs) => slugs.map((slug) => ({ slug })));
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  const project = isLocale(locale)
    ? await getPublishedProject(slug, "en")
    : null;

  // An unknown or unpublished slug still has to return an image, because the
  // route is hit by crawlers before the page 404s for them. The brand card is
  // the honest answer: it says who this is and reveals nothing about a row
  // the caller is not allowed to see.
  if (!project) {
    return ogCard({
      eyebrow: "Selected work",
      title: "GlimaCode",
      footnote: "Scoped plans · Staged delivery",
    });
  }

  return ogCard({
    eyebrow: project.categoryLabel || "Selected work",
    title: project.title,
    footnote: project.tech.slice(0, 3).join(" · ") || "Case study",
  });
}
