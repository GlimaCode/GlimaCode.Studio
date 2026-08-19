import { mailto, siteConfig } from "@/config/site";
import type { Dictionary } from "@/i18n";

export function Contact({ t }: { t: Dictionary }) {
  const { linkedin, github } = siteConfig;

  return (
    <section id="contact">
      <div className="wrap">
        <div className="contact-card reveal">
          <h2>{t.contact.heading}</h2>
          <p>{t.contact.body}</p>
          <div className="contact-links">
            <a className="btn btn-primary magnetic" href={mailto()}>
              {t.contact.email}
            </a>
            {/* Profile buttons render only when the URL exists in config, so
                the page never ships a button that goes nowhere. */}
            {linkedin.ali ? (
              <a
                className="btn btn-outline"
                href={linkedin.ali}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.contact.linkedinAli}
              </a>
            ) : null}
            {linkedin.mostafa ? (
              <a
                className="btn btn-outline"
                href={linkedin.mostafa}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.contact.linkedinMostafa}
              </a>
            ) : null}
            <a
              className="btn btn-outline"
              href={github}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.contact.github}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
