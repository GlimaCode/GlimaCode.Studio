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

export default function HomePage() {
  return (
    <>
      <div id="progress" aria-hidden="true"></div>
      <Nav />
      <Hero />
      <Ticker />
      <WorkBoard />
      <Services />
      <Process />
      <Team />
      <Start />
      <Contact />
      <Footer />
      <SiteMotion />
    </>
  );
}
