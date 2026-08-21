import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/i18n";
import { stripIsolates } from "@/i18n/pending";
import { siteConfig } from "@/config/site";
import { localeAlternates } from "@/lib/seo/alternates";
import { getPublishedProject } from "@/lib/data/portfolio";
import { Nav } from "@/components/site/Nav";
import { Start } from "@/components/site/Start";
import { Footer } from "@/components/site/Footer";
import { SiteMotion } from "@/components/site/SiteMotion";

type PageParams = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const project = await getPublishedProject(slug, locale);
  if (!project) return {};

  return {
    title: project.title,
    description: stripIsolates(project.summary),
    alternates: localeAlternates(locale, `/work/${slug}`),
    openGraph: {
      type: "article",
      title: `${project.title} — ${siteConfig.brand}`,
      description: stripIsolates(project.summary),
      url: `${siteConfig.url}/${locale}/work/${slug}`,
      // A real cover image beats the generated card when one exists; leaving
      // this undefined lets the opengraph-image route supply the fallback.
      images: project.coverUrl ? [project.coverUrl] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: PageParams) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  if (!siteConfig.features.portfolio) notFound();

  const t = getDictionary(locale);
  const project = await getPublishedProject(slug, locale);
  if (!project) notFound();

  /**
   * The request form is rendered on this page rather than back on the home
   * page. That keeps the home page free of search parameters and therefore
   * statically prerendered, and it means the visitor never leaves the case
   * study they were just persuaded by. Phase 3 stores the link on the row.
   */
  const source = {
    slug: project.slug,
    title: project.title,
    categorySlug: project.categorySlug,
  };

  return (
    <>
      <div id="progress" aria-hidden="true"></div>
      {/* The request form lives on this page, so "start" stays local; the
          rest of the header goes home. */}
      <Nav t={t} locale={locale} localSections={["start"]} />

      <main id="main">
        <section id="work" style={{ paddingTop: "140px" }}>
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="sec-coord" dir="ltr">
                SEC 01 / GRID 48
              </span>
              <p className="sec-label">
                <Link className="pf-back" href={`/${locale}/work`}>
                  ← {t.portfolio.backToIndex}
                </Link>
              </p>
              <h1>{project.title}</h1>
              <p className="sec-desc">{project.summary}</p>
            </div>

            {project.usesFallbackCopy ? (
              <p className="pf-notice">{t.portfolio.fallbackNotice}</p>
            ) : null}

            <div className="pf-detail">
              <div className="pf-detail-main">
                {project.problem ? (
                  <>
                    <h2>{t.portfolio.problemHeading}</h2>
                    <p>{project.problem}</p>
                  </>
                ) : null}
                {project.description ? (
                  <>
                    <h2>{t.portfolio.approachHeading}</h2>
                    <p>{project.description}</p>
                  </>
                ) : null}
              </div>

              <aside className="pf-detail-side">
                <div className="pf-meta">
                  <span className="pf-meta-label">
                    {t.portfolio.stackHeading}
                  </span>
                  <div className="chips" lang="en" dir="ltr">
                    {project.tech.map((tech) => (
                      <span className="chip" key={tech}>
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                <a className="btn btn-primary pf-request" href="#start">
                  {t.portfolio.requestSimilar}
                </a>
                <p className="pf-request-note">{t.portfolio.requestSimilarNote}</p>

                {project.repoUrl ? (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={project.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.portfolio.viewRepo}
                  </a>
                ) : null}
                {project.liveUrl ? (
                  <a
                    className="btn btn-ghost btn-sm"
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.portfolio.viewLive}
                  </a>
                ) : null}
              </aside>
            </div>
          </div>
        </section>

        <Start t={t} locale={locale} source={source} />
      </main>

      <Footer t={t} />
      <SiteMotion locale={locale} />
    </>
  );
}
