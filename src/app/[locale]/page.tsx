import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/i18n";
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

/**
 * Deliberately reads no search parameters.
 *
 * This is the page a cold visitor lands on and the one carrying the keyboard
 * hero, so it must stay statically prerendered and come off the CDN. Reading
 * a query string here would make it server-rendered on every request. The
 * "request something like this" flow therefore lives on the portfolio detail
 * page, which is dynamic already, rather than bouncing through here.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

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
      <Start t={t} locale={locale} />
      <Contact t={t} />
      <Footer t={t} />
      <SiteMotion locale={locale} />
    </>
  );
}
