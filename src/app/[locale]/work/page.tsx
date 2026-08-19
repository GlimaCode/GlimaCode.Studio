import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale, type Locale } from "@/i18n";
import { stripIsolates } from "@/i18n/pending";
import { siteConfig } from "@/config/site";
import {
  categoriesFrom,
  listPublishedProjects,
  type PortfolioProject,
} from "@/lib/data/portfolio";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { SiteMotion } from "@/components/site/SiteMotion";

type PageParams = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: stripIsolates(t.portfolio.heading),
    description: stripIsolates(t.portfolio.desc),
    alternates: { canonical: `/${locale}/work` },
  };
}

function ProjectCard({
  project,
  locale,
}: {
  project: PortfolioProject;
  locale: Locale;
}) {
  return (
    <Link className="pf-card" href={`/${locale}/work/${project.slug}`}>
      <span className="pf-card-category">{project.categoryLabel}</span>
      <h3>{project.title}</h3>
      <p>{project.summary}</p>
      <div className="chips" lang="en" dir="ltr">
        {project.tech.slice(0, 4).map((tech) => (
          <span className="chip" key={tech}>
            {tech}
          </span>
        ))}
      </div>
    </Link>
  );
}

export default async function WorkIndexPage({
  params,
  searchParams,
}: PageParams) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  // The whole section is hidden until the portfolio tables exist and are
  // seeded, so the route cannot render an empty grid at a real visitor.
  if (!siteConfig.features.portfolio) notFound();

  const { category } = await searchParams;
  const t = getDictionary(locale);

  const projects = await listPublishedProjects(locale);
  const categories = categoriesFrom(projects);

  // Filtering happens through the URL rather than client state: the result is
  // shareable, survives a reload, and works with scripting unavailable.
  const active =
    category && categories.some((c) => c.slug === category) ? category : null;
  const visible = active
    ? projects.filter((p) => p.categorySlug === active)
    : projects;

  return (
    <>
      <div id="progress" aria-hidden="true"></div>
      <Nav t={t} locale={locale} />

      <section id="work" style={{ paddingTop: "140px" }}>
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="sec-coord" dir="ltr">
              SEC 01 / GRID 48
            </span>
            <p className="sec-label">{t.portfolio.label}</p>
            <h2>{t.portfolio.heading}</h2>
            <p className="sec-desc">{t.portfolio.desc}</p>
          </div>

          {categories.length > 1 ? (
            /* A div, not a <nav>: the ported stylesheet styles `nav` by
               element with position:fixed, so a nav here would leave the
               flow and sit on top of the real header. role keeps the
               landmark semantics without inheriting those styles. */
            <div
              className="pf-filter reveal"
              role="navigation"
              aria-label={t.portfolio.label}
            >
              <Link
                className={`pf-chip${active ? "" : " active"}`}
                href={`/${locale}/work`}
                aria-current={active ? undefined : "page"}
              >
                {t.portfolio.all}
                <span className="pf-chip-count">{projects.length}</span>
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  className={`pf-chip${active === c.slug ? " active" : ""}`}
                  href={`/${locale}/work?category=${c.slug}`}
                  aria-current={active === c.slug ? "page" : undefined}
                >
                  {c.label}
                  <span className="pf-chip-count">{c.count}</span>
                </Link>
              ))}
            </div>
          ) : null}

          {visible.length ? (
            <div className="pf-grid">
              {visible.map((project) => (
                <ProjectCard
                  key={project.slug}
                  project={project}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <div className="empty">{t.portfolio.empty}</div>
          )}
        </div>
      </section>

      <Footer t={t} />
      <SiteMotion locale={locale} />
    </>
  );
}
