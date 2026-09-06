import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/i18n";
import { stripIsolates } from "@/i18n/pending";
import { siteConfig } from "@/config/site";
import { localeAlternates } from "@/lib/seo/alternates";
import { listPublishedProjects } from "@/lib/data/portfolio";
import { checkEmbeddable } from "@/lib/data/embed";
import { checkLinkOpenable } from "@/lib/data/link";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { SiteMotion } from "@/components/site/SiteMotion";
import { Showcase, type ShowcaseProject } from "@/components/site/Showcase";

type PageParams = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale) || !siteConfig.features.showcase) return {};
  const t = getDictionary(locale);
  return {
    title: stripIsolates(t.showcase.heading),
    description: stripIsolates(t.showcase.desc),
    alternates: localeAlternates(locale, "/showcase"),
  };
}

export default async function ShowcasePage({ params }: PageParams) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  /**
   * Off until there is something to show.
   *
   * The showcase is a frame around screenshots, and every published project
   * currently has a null cover and an empty gallery. A device that opens onto
   * nothing is worse than no page: it tells a prospect we build things we
   * cannot show. The flag lives in config/site.ts with the reason next to it.
   */
  if (!siteConfig.features.showcase) notFound();

  const t = getDictionary(locale);
  const projects = await listPublishedProjects(locale);

  /**
   * The laptop prefers the real page. A project that is deployed and lets
   * itself be framed opens live; everything else opens onto its screenshots.
   *
   * Embeddability is resolved here rather than in the browser because a
   * cross-origin iframe cannot report its own failure — see lib/data/embed.ts.
   * The checks run in parallel and are cached for an hour, so this costs one
   * request per deployed project per hour and never blocks on a slow host for
   * more than four seconds.
   *
   * Cover first, then the gallery: the cover is the shot chosen to represent
   * the project, so it is the one the lid should open onto. A project with
   * neither a live page nor a single image is left out rather than shown as
   * an empty screen.
   */
  const resolved = await Promise.all(
    projects.map(async (project) => {
      const shots = [project.coverUrl, ...project.gallery].filter(
        (url): url is string => typeof url === "string" && url.length > 0,
      );
      // Two independent probes, together rather than in sequence: neither
      // needs the other's answer, and a project with both would otherwise wait
      // out two four-second budgets instead of one.
      const [check, repo] = await Promise.all([
        // A restricted project's live URL is never probed: there is nothing to
        // frame, and asking spends a request to learn what the flag says.
        project.liveUrl && !project.restricted
          ? checkEmbeddable(project.liveUrl, siteConfig.url)
          : null,
        // Its repository IS probed, though. If a restricted project has a
        // public repository, that is the only thing about it a visitor can
        // open, and offering one that 404s is the failure this whole check
        // exists to prevent.
        project.repoUrl ? checkLinkOpenable(project.repoUrl) : null,
      ]);
      return {
        slug: project.slug,
        title: project.title,
        summary: project.summary,
        categoryLabel: project.categoryLabel,
        shots: project.restricted ? [] : shots,
        liveUrl: check?.embeddable ? project.liveUrl : null,
        // A repository the visitor cannot open is worse than none: the GitHub
        // card renders anyway — private and missing repositories both answer
        // 200 with a generic placeholder, so the image's onError never fires —
        // and the click lands on a 404. See lib/data/link.ts.
        repoUrl: repo === null || repo.openable ? project.repoUrl : null,
        restricted: project.restricted,
        // Kept so a blank frame is diagnosable from the served HTML rather
        // than by guessing. Rendered nowhere.
        liveReason: check?.reason ?? null,
        repoReason: repo?.reason ?? null,
      };
    }),
  );

  /**
   * Three ways to show a project, in order of how much they prove: the running
   * page, then screenshots of it, then the repository. Only a project with
   * none of the three is left out — and a published project with no live URL,
   * no image and no repository has nothing to show anywhere on the site.
   *
   * Restricted projects are the exception and come first in the test. They
   * have nothing to embed by definition, and leaving them out would hide work
   * we did; what they show instead is a sentence saying why there is nothing
   * to click. See migration 013.
   */
  const showable: ShowcaseProject[] = resolved.filter(
    (project) =>
      project.restricted ||
      project.liveUrl !== null ||
      project.shots.length > 0 ||
      project.repoUrl !== null,
  );

  return (
    <>
      <div id="progress" aria-hidden="true"></div>
      {/* This page has none of the home page's sections, so every header link
          goes home. */}
      <Nav t={t} locale={locale} localSections={[]} />

      <main id="main">
        <section id="showcase" style={{ paddingTop: "140px" }}>
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="sec-coord" dir="ltr">
                SEC 01 / GRID 48
              </span>
              <p className="sec-label">{t.showcase.label}</p>
              <h1>{t.showcase.heading}</h1>
              <p className="sec-desc">{t.showcase.desc}</p>
            </div>

            <Showcase projects={showable} locale={locale} t={t} />
          </div>
        </section>
      </main>

      <Footer t={t} />
      <SiteMotion locale={locale} />
    </>
  );
}
