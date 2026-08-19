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
    description: "استودیوی توسعه‌ی وب GlimaCode — ساخت وب‌اپلیکیشن، داشبورد و لندینگ‌پیج با React و Supabase. اسکوپ مشخص، تحویل مرحله‌ای، بازبینی دونفره.",
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
    eyebrow: "ما یک استودیوی دونفره‌ایم",
    headline: "وب‌اپلیکیشن می‌سازیم،",
    headlineAccent: "مثل تسک‌های روی برد.",
    sub: "ما **علی** و **مصطفی** هستیم — یک استودیوی دونفره‌ی React و Supabase. هر پروژه با یک نقشه‌ی مشخص شروع می‌شود، مرحله‌مرحله تحویل داده می‌شود، و پیش از اینکه به دست شما برسد، نفر دوم کدش را بازبینی می‌کند.",
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
    heading: "پروژه‌ها را همان‌طور نشان می‌دهیم که اجرا می‌کنیم: روی یک برد.",
    desc: "کارمان ساختن نرم‌افزار مدیریت کار است — پس نمونه‌کارهایمان را هم در قالب طبیعی خودشان می‌بینید.",
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
    claimSlot: "این جای خالی را بگیرید",
  },

  projects: {
    // Product names stay in Latin script.
    "PRJ-01": {
      title: "Listing Quality Auditor",
      description: "یک ممیز کیفیت داده‌ی محصول که مشکل را پیدا می‌کند و مدرکش را نشان می‌دهد، بدون اینکه به کاتالوگ شما دست بزند. قوانین به‌صورت داده ذخیره می‌شوند، پس تغییر یک قانون یک ویرایش است نه یک نسخه‌ی جدید. صفر وابستگی، ۱۳ تست.",
    },
    "PRJ-02": {
      title: "Vehicle Catalog",
      description: "کاتالوگ استاندارد داده‌ی خودرو با جستجویی که می‌گوید چرا هر نتیجه را برگردانده، سیستم نام‌های جایگزین برای ورودی‌های نامرتب، ورک‌فلوی بازبینی، و خروجی اکسل برای تیم‌های بعدی.",
    },
    "PRJ-03": {
      title: "Title Batch Generator",
      description: "موتور قانون‌محوری که برای صدها محصول همزمان عنوان استاندارد می‌سازد — قطعی، قابل ردیابی، و کاملاً داخل مرورگر، طوری که هیچ داده‌ای از سیستم شما بیرون نمی‌رود.",
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
    heading: "اسکوپ مشخص. زمان‌بندی روشن. تحویل مرحله‌ای.",
    desc: "سه سرویس آماده — یا اگر چیز دیگری لازم دارید، بگویید تا با هم تعریفش کنیم.",
    requestThis: "همین را می‌خواهم",
    days: "روز",
    flexible: "منعطف",
    quotedPerProject: "قیمت‌گذاری بر اساس پروژه",
    quotedPerEngagement: "قیمت‌گذاری بر اساس همکاری",
    items: {
      landing: {
        title: "لندینگ‌پیج",
        body: "یک لندینگ‌پیج React سریع و ریسپانسیو — تا پنج بخش، فرم تماس، سئوی پایه و انتشار روی سرور. ساخته‌شده برای اینکه بازدیدکننده را به مشتری تبدیل کند.",
      },
      dashboard: {
        title: "داشبورد ادمین",
        body: "یک پنل مدیریت کامل روی React و Supabase: ورود امن، مدیریت داده، جدول و نمودار، و کنترل دسترسی در سطح ردیف — همان ابزاری که تیم شما هر روز صبح بازش می‌کند.",
      },
      whitelabel: {
        title: "توسعه‌ی White-label",
        body: "برای آژانس‌ها: زیر برند شما می‌سازیم. ظرفیت ساعتی یا ماهانه، ارتباط مستقیم و بدون واسطه، و بازبینی نفر دوم روی هر چیزی که تحویلتان می‌دهیم.",
      },
    },
  },

  process: {
    label: "فرآیند",
    heading: "یک پروژه چطور روی برد ما جلو می‌رود",
    steps: {
      analyze: {
        title: "تحلیل",
        body: "بریف شما را با ظرفیت و توانمان می‌سنجیم — صادقانه. اگر گزینه‌ی درستی برایتان نباشیم، ظرف ۲۴ ساعت همین را می‌گوییم.",
      },
      kickoff: {
        title: "جلسه‌ی شروع",
        body: "پیش از نوشتن اولین خط کد، اسکوپ و زمان و قیمت مکتوب می‌شود. دقیقاً می‌دانید چه چیزی هست — و چه چیزی نیست.",
      },
      build: {
        title: "ساخت مرحله‌به‌مرحله",
        body: "کار در مراحل قابل بررسی تحویل داده می‌شود، همراه با ویدیوی کوتاه از هر مرحله. پیشرفت را می‌بینید، نه اینکه منتظر یک رونمایی بزرگ بمانید.",
      },
      handoff: {
        title: "بازبینی و تحویل",
        body: "هر تحویلی را نفر دوم بازبینی می‌کند، بعد به دست شما می‌رسد: کد تمیز، مستندات، و انتشار روی سرور — همه مال شما.",
      },
    },
  },

  team: {
    label: "تیم",
    heading: "دو برنامه‌نویس. چهار چشم روی هر خط کد.",
    members: {
      ali: {
        role: "توسعه‌دهنده‌ی فول‌استک · مسئول ارتباط با کلاینت",
        body: "برنامه‌نویس و هماهنگ‌کننده‌ی پروژه، با تجربه‌ی روزمره‌ی ساخت نرم‌افزارهایی که واقعاً در محیط کار استفاده می‌شوند. تعریف اسکوپ، ارتباط با کارفرما و توسعه‌ی فول‌استک با اوست.",
      },
      mostafa: {
        role: "توسعه‌دهنده‌ی فول‌استک · مسئول تحویل",
        body: "برنامه‌نویس با تمرکز روی معماری، کیفیت کد و تحویل — همان جفت‌چشم دومی که پیش از رسیدن هر خروجی به دست شما، بازبینی‌اش می‌کند.",
      },
    },
  },

  start: {
    label: "شروع پروژه",
    heading: "ثبت تیکت",
    desc: "بگویید چه می‌سازید. ظرف ۲۴ ساعت با نظر صادقانه‌مان درباره‌ی اسکوپ، زمان و قیمت جواب می‌دهیم.",
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
    heading: "راه مستقیم‌تری می‌خواهید؟",
    body: "فرم را رها کنید — ایمیل بزنید یا پیام بدهید، ادامه‌اش با ما.",
    email: "ایمیل به استودیو",
    linkedinAli: "علی در لینکدین",
    linkedinMostafa: "مصطفی در لینکدین",
    github: "گیت‌هاب",
  },

  portfolio: {
    label: "نمونه‌کارهای منتخب",
    heading: "نمونه‌کارها",
    desc: "چیزی که ساخته‌ایم و چرا این‌طور ساخته‌ایم. اگر نمونه‌ای به کار شما می‌آید، از همان‌جا می‌توانید درخواست بدهید.",
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
    tagline: "طراحی و ساخته‌شده توسط دو برنامه‌نویس",
    teamAccess: "دسترسی تیم",
  },
};
