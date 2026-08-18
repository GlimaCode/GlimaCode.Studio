import type { CSSProperties } from "react";

/**
 * No prices on the public site. Every project is scoped and quoted from a
 * brief, so publishing a floor would anchor the conversation before there is
 * anything to price. Timelines stay — they set expectations honestly without
 * closing the discussion — and the budget field on the order form is where
 * we learn what the visitor has in mind.
 *
 * The timeline takes the slot the price used to occupy so the card keeps its
 * visual rhythm instead of leaving a hole where a figure was.
 */
const SERVICES = [
  {
    key: "landing",
    title: "Landing page",
    body: "A fast, responsive React landing page — up to five sections, contact form, SEO basics, and deployment included. Designed to convert, built to last.",
    timeline: "~5 days",
    pricingNote: "quoted per project",
    requestValue: "Landing page",
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
    title: "Admin dashboard",
    body: "A full admin panel on React + Supabase: authentication, CRUD, data tables, charts, and row-level security — the tool your team opens every morning.",
    timeline: "~14 days",
    pricingNote: "quoted per project",
    requestValue: "Admin dashboard",
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
    title: "White-label development",
    body: "For agencies: we build under your brand — hourly or monthly capacity, direct async communication, and a second-developer review on everything we hand you.",
    timeline: "flexible",
    pricingNote: "quoted per engagement",
    requestValue: "White-label / agency capacity",
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

export function Services() {
  return (
    <section id="services">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="sec-coord">SEC 02 / GRID 48</span>
          <p className="sec-label">Services</p>
          {/* Was "Clear price" — kept the three-beat rhythm but the claim
              had to change, since the site no longer publishes figures. */}
          <h2>Fixed scope. Clear timeline. Staged delivery.</h2>
          <p className="sec-desc">
            Three packaged services — or tell us what you need and we&apos;ll
            scope it as a custom ticket.
          </p>
        </div>
        <div className="services">
          {SERVICES.map((service, index) => (
            <div
              className="service reveal"
              key={service.key}
              style={index ? ({ "--i": index } as CSSProperties) : undefined}
            >
              <div className="icon" aria-hidden="true">
                {service.icon}
              </div>
              <h3>{service.title}</h3>
              <p>{service.body}</p>
              {/* Two children, not three: the replacement text is longer
                  than the figures it replaces, and a third item collided
                  with it. The tilde makes the timeline read as a timeline
                  without needing its own label. */}
              <div className="price-row">
                <span className="price">{service.timeline}</span>
                <span className="time">{service.pricingNote}</span>
              </div>
              <a
                className="btn btn-ghost btn-sm"
                href="#start"
                data-service={service.requestValue}
              >
                Request this
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
