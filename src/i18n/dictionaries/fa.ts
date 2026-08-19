import type { Dictionary } from "./en";
import { pending } from "../pending";

/**
 * Persian dictionary.
 *
 * Interface strings — labels, buttons, field names, validation messages,
 * status words — are written here and should be reviewed rather than
 * trusted. Marketing prose is wrapped in `pending()` and still renders its
 * English source: that copy needs to be written by a native speaker, not
 * translated from the English sentence structure.
 *
 * Brand and technology names stay in Latin script inside Persian sentences:
 * GlimaCode, React, Supabase, TypeScript, PostgreSQL, White-label, MVP.
 *
 * Persian strings are frequently a different length from their English
 * source. Nothing in the layout assumes otherwise.
 */
export const fa: Dictionary = {
  meta: {
    tagline: "استودیوی دونفره‌ی توسعه‌ی وب",
    description: pending(
      "GlimaCode is a two-developer React and Supabase studio. Scoped plans, staged delivery, and a second developer reviewing every line before it ships.",
    ),
  },

  nav: {
    work: "نمونه‌کارها",
    services: "خدمات",
    process: "فرآیند",
    team: "تیم",
    cta: "شروع پروژه",
    skipToContent: "رفتن به محتوا",
  },

  localeSwitch: {
    switchTo: "تغییر زبان به",
  },

  hero: {
    eyebrow: pending("we're a two-developer studio"),
    headline: pending("Web apps, built like"),
    headlineAccent: pending("tickets on a board."),
    sub: pending(
      "We're **Ali** and **Mostafa** — a two-person React & Supabase studio. Every project gets a scoped plan, staged delivery, and a second developer reviewing every line before it ships.",
    ),
    ctaPrimary: "شروع پروژه",
    ctaSecondary: "دیدن نمونه‌کارها",
    availability: "پذیرای پروژه‌ی جدید",
    location: "دورکاری · UTC+3:30",
    kbdHintPrefix: "کلیدهای",
    kbdHintSuffix: "را بزنید",
  },

  keyboard: {
    navLabel: "پیمایش با صفحه‌کلید",
    shortcutsLabel: "میان‌بر بخش‌ها",
    goTo: "رفتن به",
    top: "بالا",
    subs: {
      work: "کارها",
      services: "خدمات",
      process: "فرآیند",
      team: "تیم",
      start: "شروع",
    },
  },

  work: {
    label: "نمونه‌کارهای منتخب",
    heading: pending("Projects, the way we run them: a board."),
    desc: pending(
      "We build work-management software for a living — so here's our portfolio in its native format.",
    ),
    columns: {
      shipped: "تحویل‌شده",
      in_progress: "در حال انجام",
      up_next: "در نوبت",
    },
    status: {
      shipped: "وضعیت: تحویل‌شده",
      inProgress: "وضعیت: در حال انجام",
      planned: "وضعیت: برنامه‌ریزی‌شده",
    },
    claimSlot: pending("Claim this slot"),
  },

  projects: {
    // Product names stay in Latin script.
    "PRJ-01": {
      title: "Listing Quality Auditor",
      description: pending(
        "A product-data quality auditor with its rules held as data rather than code. Report-only by design, built on the principle that absence of evidence is never a pass. Zero dependencies, covered by a full test suite.",
      ),
    },
    "PRJ-02": {
      title: "Vehicle Catalog",
      description: pending(
        "A standardised vehicle catalogue with explain-why search results, an alias system for messy inputs, a validation workflow, and spreadsheet export for downstream teams.",
      ),
    },
    "PRJ-03": {
      title: "Title Batch Generator",
      description: pending(
        "A rule-based engine that generates compliant product titles for hundreds of listings at once — deterministic, traceable, and entirely client-side, so no data ever leaves the browser.",
      ),
    },
    "PRJ-04": {
      title: "glimacode.com",
      description: pending(
        "The site you are reading. React and Supabase, a data-driven portfolio, and a request pipeline the two of us triage — built in the open as our own reference project.",
      ),
    },
    "PRJ-05": {
      title: "پروژه‌ی شما",
      description: pending(
        "Have an internal tool, dashboard, or MVP that needs to ship? This slot is open — send us the brief below and we'll scope it together.",
      ),
    },
  },

  services: {
    label: "خدمات",
    heading: pending("Fixed scope. Clear timeline. Staged delivery."),
    desc: pending(
      "Three packaged services — or tell us what you need and we'll scope it as a custom ticket.",
    ),
    requestThis: "همین را می‌خواهم",
    days: "روز",
    flexible: "منعطف",
    quotedPerProject: "قیمت‌گذاری بر اساس پروژه",
    quotedPerEngagement: "قیمت‌گذاری بر اساس همکاری",
    items: {
      landing: {
        title: "لندینگ‌پیج",
        body: pending(
          "A fast, responsive React landing page — up to five sections, contact form, SEO basics, and deployment included. Designed to convert, built to last.",
        ),
      },
      dashboard: {
        title: "داشبورد ادمین",
        body: pending(
          "A full admin panel on React + Supabase: authentication, CRUD, data tables, charts, and row-level security — the tool your team opens every morning.",
        ),
      },
      whitelabel: {
        title: "توسعه‌ی White-label",
        body: pending(
          "For agencies: we build under your brand — hourly or monthly capacity, direct async communication, and a second-developer review on everything we hand you.",
        ),
      },
    },
  },

  process: {
    label: "فرآیند",
    heading: pending("How a project moves across our board"),
    steps: {
      analyze: {
        title: "تحلیل",
        body: pending(
          "We review your brief against our capacity and skills — honestly. If we're not the right fit, we'll say so within 24 hours.",
        ),
      },
      kickoff: {
        title: "جلسه‌ی شروع",
        body: pending(
          "Scope, timeline, and price get fixed in writing before any code. You'll know exactly what's included — and what isn't.",
        ),
      },
      build: {
        title: "ساخت مرحله‌به‌مرحله",
        body: pending(
          "Work ships in reviewable milestones with short screen-recorded demos, so you see progress instead of waiting for a big reveal.",
        ),
      },
      handoff: {
        title: "بازبینی و تحویل",
        body: pending(
          "Every deliverable is checked by the second developer before you see it. Then: clean code, docs, and deployment — yours.",
        ),
      },
    },
  },

  team: {
    label: "تیم",
    heading: pending("Two developers. Four eyes on everything."),
    members: {
      ali: {
        role: "توسعه‌دهنده‌ی فول‌استک · مسئول ارتباط با کلاینت",
        body: pending(
          "Developer and project coordinator with daily experience building work-management software used on real factory floors. Handles scoping, communication, and full-stack delivery.",
        ),
      },
      mostafa: {
        role: "توسعه‌دهنده‌ی فول‌استک · مسئول تحویل",
        body: pending(
          "Developer focused on architecture, code quality, and shipping — the second pair of eyes that reviews every deliverable before it reaches you.",
        ),
      },
    },
  },

  start: {
    label: "شروع پروژه",
    heading: "ثبت تیکت",
    desc: pending(
      "Tell us what you're building. We reply within 24 hours with honest thoughts on scope, timeline, and price.",
    ),
    cardTitle: "درخواست پروژه",
    idPrefix: "شناسه:",
    fields: {
      name: "نام شما",
      email: "ایمیل",
      company: "شرکت / آژانس",
      companyHint: "اختیاری",
      projectType: "نوع پروژه",
      budget: "بازه‌ی بودجه",
      timeline: "زمان‌بندی",
      description: "توضیح پروژه",
      descriptionPlaceholder:
        "چه چیزی می‌سازید؟ برای چه کسی است؟ چیزی از قبل آماده دارید (طراحی، کد، نمونه)؟",
    },
    errors: {
      name: "لطفاً نام خود را وارد کنید.",
      email: "لطفاً یک ایمیل معتبر وارد کنید.",
      description: "چند جمله توضیح کمک می‌کند پاسخ مفیدی بدهیم.",
    },
    projectTypes: {
      landing: "لندینگ‌پیج",
      dashboard: "داشبورد ادمین",
      mvp: "MVP فول‌استک",
      whitelabel: "White-label / ظرفیت آژانسی",
      other: "چیز دیگری",
    },
    budgets: {
      under300: "زیر ۳۰۰ دلار",
      to700: "۳۰۰ تا ۷۰۰ دلار",
      to1500: "۷۰۰ تا ۱٬۵۰۰ دلار",
      over1500: "بیش از ۱٬۵۰۰ دلار",
      unsure: "هنوز مطمئن نیستم",
    },
    timelines: {
      asap: "در اسرع وقت",
      weeks: "۲ تا ۴ هفته",
      months: "۱ تا ۲ ماه",
      flexible: "منعطف",
    },
    submit: "ارسال درخواست",
    note: "از طریق برنامه‌ی ایمیل شما ارسال می‌شود — ظرف ۲۴ ساعت پاسخ می‌دهیم.",
    success: {
      openedBefore: "تیکت",
      openedAfter: "ثبت شد",
      body: "برنامه‌ی ایمیل شما باید با متن آماده باز شده باشد — کافی است ارسال کنید. اگر باز نشد، مستقیم به ما ایمیل بزنید و شناسه‌ی تیکت را بنویسید.",
      again: "ثبت تیکت دیگر",
    },
  },

  contact: {
    heading: pending("Prefer a direct line?"),
    body: pending(
      "Skip the form — email or message us and we'll take it from there.",
    ),
    email: "ایمیل به استودیو",
    linkedinAli: "علی در لینکدین",
    linkedinMostafa: "مصطفی در لینکدین",
    github: "گیت‌هاب",
  },

  portfolio: {
    label: "نمونه‌کارهای منتخب",
    heading: pending("Work we have shipped"),
    desc: pending(
      "Pick something close to what you need and send us the brief — the form arrives with the sample already attached.",
    ),
    all: "همه",
    empty: "هنوز چیزی منتشر نشده است.",
    backToIndex: "همه‌ی نمونه‌کارها",
    problemHeading: "مسئله",
    approachHeading: "چه ساختیم",
    stackHeading: "ساخته‌شده با",
    viewRepo: "دیدن کد",
    viewLive: "مشاهده‌ی زنده",
    requestSimilar: "همین را می‌خواهم",
    requestSimilarNote: "فرم با همین پروژه‌ی پیوست‌شده باز می‌شود.",
    basedOn: "بر پایه‌ی",
    clearBasedOn: "حذف",
    seeAll: "دیدن همه‌ی نمونه‌کارها",
    fallbackNotice:
      "این پروژه هنوز ترجمه نشده و به انگلیسی نمایش داده می‌شود.",
  },

  footer: {
    tagline: pending("designed & built by two developers"),
    teamAccess: "دسترسی تیم",
  },
};
