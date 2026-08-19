/**
 * English dictionary — the source of truth.
 *
 * The `Dictionary` type is derived from this object, so every other locale
 * must supply every key or the build fails. Copy uses `**bold**` where the
 * rendered text needs emphasis; see `renderRich`.
 */
export const en = {
  meta: {
    tagline: "Two-developer web studio",
    description:
      "GlimaCode is a two-developer React and Supabase studio. Scoped plans, staged delivery, and a second developer reviewing every line before it ships.",
  },

  nav: {
    work: "Work",
    services: "Services",
    process: "Process",
    team: "Team",
    cta: "Start a project",
    skipToContent: "Skip to content",
  },

  localeSwitch: {
    /** Accessible label on the switcher, e.g. "Switch to فارسی". */
    switchTo: "Switch to",
  },

  hero: {
    eyebrow: "we're a two-developer studio",
    headline: "Web apps, built like",
    headlineAccent: "tickets on a board.",
    sub: "We're **Ali** and **Mostafa** — a two-person React & Supabase studio. Every project gets a scoped plan, staged delivery, and a second developer reviewing every line before it ships.",
    ctaPrimary: "Start a project",
    ctaSecondary: "See our work",
    availability: "Taking new projects",
    location: "Remote · UTC+3:30",
    /**
     * Wraps the key list: "press W·S·P·T·↵". Split in two because Persian
     * puts the verb after the object, so a single prefix cannot work.
     */
    kbdHintPrefix: "press",
    kbdHintSuffix: "",
  },

  keyboard: {
    navLabel: "Keyboard navigation",
    shortcutsLabel: "Section shortcuts",
    goTo: "Go to",
    top: "top",
    subs: {
      work: "work",
      services: "services",
      process: "process",
      team: "team",
      start: "start",
    },
  },

  work: {
    label: "Selected work",
    heading: "Projects, the way we run them: a board.",
    desc: "We build work-management software for a living — so here's our portfolio in its native format.",
    columns: {
      shipped: "SHIPPED",
      in_progress: "IN PROGRESS",
      up_next: "UP NEXT",
    },
    status: {
      shipped: "Status: shipped",
      inProgress: "Status: in progress",
      planned: "Status: planned",
    },
    claimSlot: "Claim this slot",
  },

  projects: {
    "PRJ-01": {
      title: "Listing Quality Auditor",
      description:
        "A product-data quality auditor that reports what's wrong and proves it, without touching your catalogue. Rules live as data, so changing one takes an edit rather than a release. Zero dependencies, 13 tests.",
    },
    "PRJ-02": {
      title: "Vehicle Catalog",
      description:
        "A standardised vehicle catalogue with explain-why search results, an alias system for messy inputs, a validation workflow, and spreadsheet export for downstream teams.",
    },
    "PRJ-03": {
      title: "Title Batch Generator",
      description:
        "A rule-based engine that generates compliant product titles for hundreds of listings at once — deterministic, traceable, and entirely client-side, so no data ever leaves the browser.",
    },
    "PRJ-04": {
      title: "glimacode.com",
      description:
        "The site you are reading. React and Supabase, a data-driven portfolio, and a request pipeline the two of us triage — built in the open as our own reference project.",
    },
    "PRJ-05": {
      title: "Your project",
      description:
        "Have an internal tool, dashboard, or MVP that needs to ship? This slot is open — send us the brief below and we'll scope it together.",
    },
  },

  services: {
    label: "Services",
    heading: "Fixed scope. Clear timeline. Staged delivery.",
    desc: "Three packaged services — or tell us what you need and we'll scope it as a custom ticket.",
    requestThis: "Request this",
    /** Unit word for the approximate day count on each card. */
    days: "days",
    flexible: "flexible",
    quotedPerProject: "quoted per project",
    quotedPerEngagement: "quoted per engagement",
    items: {
      landing: {
        title: "Landing page",
        body: "A fast, responsive React landing page — up to five sections, contact form, SEO basics, and deployment included. Designed to convert, built to last.",
      },
      dashboard: {
        title: "Admin dashboard",
        body: "A full admin panel on React + Supabase: authentication, CRUD, data tables, charts, and row-level security — the tool your team opens every morning.",
      },
      whitelabel: {
        title: "White-label development",
        body: "For agencies: we build under your brand — hourly or monthly capacity, direct async communication, and a second-developer review on everything we hand you.",
      },
    },
  },

  process: {
    label: "Process",
    heading: "How a project moves across our board",
    steps: {
      analyze: {
        title: "Analyze",
        body: "We review your brief against our capacity and skills — honestly. If we're not the right fit, we'll say so within 24 hours.",
      },
      kickoff: {
        title: "Kickoff",
        body: "Scope, timeline, and price get fixed in writing before any code. You'll know exactly what's included — and what isn't.",
      },
      build: {
        title: "Build in stages",
        body: "Work ships in reviewable milestones with short screen-recorded demos, so you see progress instead of waiting for a big reveal.",
      },
      handoff: {
        title: "Review & handoff",
        body: "Every deliverable is checked by the second developer before you see it. Then: clean code, docs, and deployment — yours.",
      },
    },
  },

  team: {
    label: "Team",
    heading: "Two developers. Four eyes on everything.",
    members: {
      ali: {
        role: "Full-stack developer · Client lead",
        body: "Developer and project coordinator with daily experience building work-management software used on real factory floors. Handles scoping, communication, and full-stack delivery.",
      },
      mostafa: {
        role: "Full-stack developer · Delivery lead",
        body: "Developer focused on architecture, code quality, and shipping — the second pair of eyes that reviews every deliverable before it reaches you.",
      },
    },
  },

  start: {
    label: "Start a project",
    heading: "Open a ticket",
    desc: "Tell us what you're building. We reply within 24 hours with honest thoughts on scope, timeline, and price.",
    cardTitle: "Project request",
    idPrefix: "ID:",
    fields: {
      name: "Your name",
      email: "Email",
      company: "Company / agency",
      companyHint: "Optional",
      projectType: "Project type",
      budget: "Budget range",
      timeline: "Timeline",
      description: "Project description",
      descriptionPlaceholder:
        "What are you building? Who is it for? Anything already exists (designs, code, examples)?",
    },
    errors: {
      name: "Please enter your name.",
      email: "Please enter a valid email.",
      description: "A few sentences help us give you a useful reply.",
    },
    projectTypes: {
      landing: "Landing page",
      dashboard: "Admin dashboard",
      mvp: "Full-stack MVP",
      whitelabel: "White-label / agency capacity",
      other: "Something else",
    },
    budgets: {
      under300: "Under $300",
      to700: "$300 – $700",
      to1500: "$700 – $1,500",
      over1500: "$1,500+",
      unsure: "Not sure yet",
    },
    timelines: {
      asap: "ASAP",
      weeks: "2–4 weeks",
      months: "1–2 months",
      flexible: "Flexible",
    },
    submit: "Send request",
    note: "Sends via your email app — we reply within 24 hours.",
    success: {
      openedBefore: "Ticket",
      openedAfter: "opened",
      body: "Your email app should have opened with the request pre-filled — just press send. If it didn't, email us directly and mention the ticket ID.",
      again: "Open another ticket",
    },
  },

  contact: {
    heading: "Prefer a direct line?",
    body: "Skip the form — email or message us and we'll take it from there.",
    email: "Email the studio",
    linkedinAli: "Ali on LinkedIn",
    linkedinMostafa: "Mostafa on LinkedIn",
    github: "GitHub",
  },

  portfolio: {
    label: "Selected work",
    heading: "Work we have shipped",
    desc: "Pick something close to what you need and send us the brief — the form arrives with the sample already attached.",
    all: "All",
    empty: "Nothing published here yet.",
    backToIndex: "All work",
    problemHeading: "The problem",
    approachHeading: "What we built",
    stackHeading: "Built with",
    viewRepo: "View the code",
    viewLive: "See it live",
    requestSimilar: "Request something like this",
    requestSimilarNote: "Opens the form with this project attached.",
    basedOn: "Based on",
    clearBasedOn: "Remove",
    seeAll: "See all work",
    /** Shown on a Persian page when the entry has no Persian copy yet. */
    fallbackNotice: "This project has not been translated yet, so it is shown in English.",
  },

  footer: {
    tagline: "designed & built by two developers",
    teamAccess: "Team access",
  },
} as const;

/**
 * Every locale must satisfy this shape. Derived from English so adding a key
 * here immediately makes the other dictionaries fail to compile until they
 * supply it too.
 */
export type Dictionary = {
  readonly [K in keyof typeof en]: DeepMutable<(typeof en)[K]>;
};

type DeepMutable<T> = T extends string
  ? string
  : { -readonly [K in keyof T]: DeepMutable<T[K]> };
