import { mailto, siteConfig } from "@/config/site";
import type { Dictionary } from "@/i18n";

/**
 * The direct-contact card.
 *
 * WHY THE ADDRESS IS PRINTED AS WELL AS LINKED
 *
 * A mailto: link only does something if the browser has a registered mail
 * handler. On a phone it always does. On a desktop it frequently does not,
 * and the failure is silent: the click is consumed — sometimes after an
 * account chooser appears and is answered — and then nothing happens at all.
 * No error, no new window, no clue.
 *
 * A visitor who meets that concludes the site is broken and leaves, and we
 * never learn it happened. So the button keeps the one-click path for
 * everyone whose machine is set up for it, and the address underneath is
 * there for everyone else. Plain selectable text: not an image, not
 * scrambled by script, nothing that a person or their password manager has
 * to decode.
 */
export function Contact({ t }: { t: Dictionary }) {
  const { linkedin, github, email } = siteConfig;

  return (
    <section id="contact">
      <div className="wrap">
        <div className="contact-card reveal">
          <h2>{t.contact.heading}</h2>
          <p>{t.contact.body}</p>
          <div className="contact-links">
            {/* The subject is the same phrase the form's card is titled with,
                so a message that arrives this way is filed like one that
                arrives through the form. */}
            <a
              className="btn btn-primary magnetic"
              href={mailto(t.start.cardTitle)}
            >
              {t.contact.email}
            </a>
            {/* Renders only when the URL exists in config, so the page never
                ships a button that goes nowhere. */}
            {linkedin ? (
              <a
                className="btn btn-outline"
                href={linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.contact.linkedin}
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
          {/* Not a link. Its whole job is to be readable and copyable when
              the link above does nothing. */}
          <p className="contact-address" dir="ltr" lang="en">
            {email}
          </p>
        </div>
      </div>
    </section>
  );
}
