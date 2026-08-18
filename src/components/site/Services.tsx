import type { CSSProperties } from "react";

/**
 * Prices are floors, not fixed quotes — the copy says "from" throughout,
 * and the figures match the studio service catalogue exactly.
 */
const SERVICES = [
  {
    key: "landing",
    title: "Landing page",
    body: "A fast, responsive React landing page — up to five sections, contact form, SEO basics, and deployment included. Designed to convert, built to last.",
    price: "$300",
    time: "~5 days",
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
    price: "$700",
    time: "~14 days",
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
    price: "$15/h",
    time: "flexible",
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
          <h2>Fixed scope. Clear price. Staged delivery.</h2>
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
              <div className="price-row">
                <span className="from">from</span>
                <span className="price">{service.price}</span>
                <span className="time">{service.time}</span>
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
