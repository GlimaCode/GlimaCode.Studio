import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/i18n";
import { siteConfig } from "@/config/site";
import { getPublishedProject } from "@/lib/data/portfolio";
import type { RequestSource } from "@/components/site/OrderForm";
import { Contact } from "@/components/site/Contact";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/site/Hero";
import { Nav } from "@/components/site/Nav";
import { Process } from "@/components/site/Process";
import { Services } from "@/components/site/Services";
import { SiteMotion } from "@/components/site/SiteMotion";
import { Start } from "@/components/site/Start";
import { Team } from "@/components/site/Team";
import { Ticker } from "@/components/site/Ticker";
import { WorkBoard } from "@/components/site/WorkBoard";

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  /**
   * "Request something like this" arrives as ?from=<slug>. The project is
   * looked up here rather than trusting a title passed in the URL, so the
   * form can only ever attribute itself to a real published sample.
   */
  const { from } = await searchParams;
  let source: RequestSource | null = null;
  if (siteConfig.features.portfolio && from) {
    const project = await getPublishedProject(from, locale);
    if (project) {
      source = {
        slug: project.slug,
        title: project.title,
        categorySlug: project.categorySlug,
      };
    }
  }

  return (
    <>
      <div id="progress" aria-hidden="true"></div>
      <Nav t={t} locale={locale} />
      <Hero t={t} locale={locale} />
      <Ticker />
      <WorkBoard t={t} locale={locale} />
      <Services t={t} locale={locale} />
      <Process t={t} />
      <Team t={t} />
      <Start t={t} locale={locale} source={source} />
      <Contact t={t} />
      <Footer t={t} />
      <SiteMotion locale={locale} />
    </>
  );
}
