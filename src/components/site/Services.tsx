import type { CSSProperties, ReactNode } from "react";
import type { Dictionary, Locale } from "@/i18n";
import { formatApproxDays } from "@/i18n";

/**
 * No prices on the public site. Every project is scoped and quoted from a
 * brief, so publishing a floor would anchor the conversation before there is
 * anything to price. Timelines stay — they set expectations honestly without
 * closing the discussion — and the budget field on the order form is where
 * we learn what the visitor has in mind.
 *
 * The timeline takes the slot the price used to occupy so the card keeps its
 * visual rhythm instead of leaving a hole where a figure was. Day counts run
 * through Intl, so Persian renders them as ~۵ روز rather than ~5 روز.
 */
type ServiceKey = "landing" | "dashboard" | "whitelabel";

const SERVICES: {
  key: ServiceKey;
  /** Null means the engagement has no fixed length. */
  days: number | null;
  perEngagement?: boolean;
  icon: ReactNode;
}[] = [
  {
    key: "landing",
    days: 5,
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M3 9h18" />
      </svg>
    ),
  },
  {
    key: "dashboard",
    days: 14,
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <rect x="3" y="3" width="7" height="18" rx="1.5" />
        <rect x="14" y="3" width="7" height="10" rx="1.5" />
      </svg>
    ),
  },
  {
    key: "whitelabel",
    days: null,
    perEngagement: true,
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 7h-9M14 17H5" />
        <circle cx="17" cy="17" r="3" />
        <circle cx="7" cy="7" r="3" />
      </svg>
    ),
  },
];

export function Services({ t, locale }: { t: Dictionary; locale: Locale }) {
  return (
    <section id="services">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="sec-coord" dir="ltr">
            SEC 02 / GRID 48
          </span>
          <p className="sec-label">{t.services.label}</p>
          <h2>{t.services.heading}</h2>
          <p className="sec-desc">{t.services.desc}</p>
        </div>
        <div className="services">
          {SERVICES.map((service, index) => {
            const copy = t.services.items[service.key];
            const timeline =
              service.days === null
                ? t.services.flexible
                : formatApproxDays(service.days, t.services.days, locale);
            const note = service.perEngagement
              ? t.services.quotedPerEngagement
              : t.services.quotedPerProject;

            return (
              <div
                className="service reveal"
                key={service.key}
                style={index ? ({ "--i": index } as CSSProperties) : undefined}
              >
                <div className="icon" aria-hidden="true">
                  {service.icon}
                </div>
                <h3>{copy.title}</h3>
                <p>{copy.body}</p>
                {/* Two children, not three: the replacement text is longer
                    than the figures it replaces, and with three the row
                    collided. */}
                <div className="price-row">
                  <span className="price">{timeline}</span>
                  <span className="time">{note}</span>
                </div>
                <a
                  className="btn btn-ghost btn-sm"
                  href="#start"
                  data-service={service.key}
                >
                  {t.services.requestThis}
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
