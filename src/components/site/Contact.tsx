import { mailto, siteConfig } from "@/config/site";

export function Contact() {
  const { linkedin, github } = siteConfig;

  return (
    <section id="contact">
      <div className="wrap">
        <div className="contact-card reveal">
          <h2>Prefer a direct line?</h2>
          <p>
            Skip the form — email or message us and we&apos;ll take it from
            there.
          </p>
          <div className="contact-links">
            <a className="btn btn-primary magnetic" href={mailto()}>
              Email the studio
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
                Ali on LinkedIn
              </a>
            ) : null}
            {linkedin.mostafa ? (
              <a
                className="btn btn-outline"
                href={linkedin.mostafa}
                target="_blank"
                rel="noopener noreferrer"
              >
                Mostafa on LinkedIn
              </a>
            ) : null}
            <a
              className="btn btn-outline"
              href={github}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
