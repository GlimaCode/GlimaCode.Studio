import type { MetadataRoute } from "next";
import { LOCALES, DEFAULT_LOCALE, bcp47 } from "@/i18n";
import { siteConfig } from "@/config/site";
import { listSitemapProjects } from "@/lib/data/portfolio";

/**
 * The sitemap.
 *
 * Every public URL appears once per locale, and each entry declares the other
 * locale as an alternate. That matters more here than on a monolingual site:
 * /en and /fa are the same page in two languages, and without the alternates
 * a crawler is entitled to read them as two thin pages competing with each
 * other. The pairing is what tells it they are one page with two renderings.
 *
 * Deliberately absent:
 *
 *   /             a redirect, not a destination
 *   /dashboard    private, and disallowed in robots.txt
 *   /api/*        not pages
 *
 * Unpublished projects never appear, because they are filtered in the query
 * and by row-level security. A sitemap is a public document, and listing a
 * URL that 404s for everyone but us would leak the fact that it exists.
 */

/** Rebuilt at most this often; project copy changes far less than that. */
export const revalidate = 3600;

function alternatesFor(path: string) {
  return {
    languages: {
      ...Object.fromEntries(
        LOCALES.map((code) => [bcp47(code), `${siteConfig.url}/${code}${path}`]),
      ),
      // Matches the x-default in the page's own <link> tags. A sitemap that
      // disagrees with the markup is worse than a sitemap that says less,
      // because a crawler has no way to know which one we meant.
      "x-default": `${siteConfig.url}/${DEFAULT_LOCALE}${path}`,
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    entries.push({
      url: `${siteConfig.url}/${locale}`,
      changeFrequency: "monthly",
      // The default locale is the one an unmatched visitor lands on, so it is
      // the better of the two to surface. Both are indexable either way.
      priority: locale === DEFAULT_LOCALE ? 1 : 0.9,
      alternates: alternatesFor(""),
    });
  }

  if (!siteConfig.features.portfolio) return entries;

  for (const locale of LOCALES) {
    entries.push({
      url: `${siteConfig.url}/${locale}/work`,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: alternatesFor("/work"),
    });
  }

  // One database read, shared by both locales: the row is the same, only the
  // language of the rendering differs.
  const projects = await listSitemapProjects();
  projects.sort((a, b) => a.slug.localeCompare(b.slug));

  for (const project of projects) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${siteConfig.url}/${locale}/work/${project.slug}`,
        lastModified: project.updatedAt ?? undefined,
        changeFrequency: "yearly",
        priority: 0.7,
        alternates: alternatesFor(`/work/${project.slug}`),
      });
    }
  }

  return entries;
}
