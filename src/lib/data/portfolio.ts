import { publicClient } from "@/lib/db/client";
import { hasDatabaseConfig } from "@/lib/env";
import type { Locale } from "@/i18n/config";
import { pending } from "@/i18n/pending";

/**
 * Portfolio reads.
 *
 * One of two modules that touch the database; components never import a
 * client. Locale resolution happens here rather than in the UI: a row keeps
 * English and Persian columns side by side, and a missing translation falls
 * back to English so the work is still shown rather than hidden.
 *
 * Every function degrades to empty rather than throwing. This is a marketing
 * site — if the database is unreachable, the rest of the page must still
 * render. Failures are logged server-side so they are visible in the host's
 * logs instead of silently swallowed.
 */

export type PortfolioStatus = "shipped" | "in_progress" | "planned";

export type PortfolioCategory = {
  slug: string;
  label: string;
  sortOrder: number;
  /** Published projects in this category. Drives whether the chip appears. */
  count: number;
};

export type PortfolioProject = {
  slug: string;
  categorySlug: string;
  categoryLabel: string;
  categorySortOrder: number;
  title: string;
  summary: string;
  problem: string | null;
  description: string | null;
  tech: string[];
  repoUrl: string | null;
  liveUrl: string | null;
  coverUrl: string | null;
  gallery: string[];
  status: PortfolioStatus;
  sortOrder: number;
  /**
   * True when the work cannot be shown live or in screenshots — it holds data
   * we will not put on a demo page. The showcase says so in a sentence rather
   * than attempting an embed. A public repository is still shown if there is
   * one; see migration 013.
   */
  restricted: boolean;
  /** True when the visitor is reading English because Persian is missing. */
  usesFallbackCopy: boolean;
};

/** Shape returned by the select below, before locale resolution. */
type ProjectRow = {
  slug: string;
  tech: string[] | null;
  repo_url: string | null;
  live_url: string | null;
  cover_url: string | null;
  gallery_urls: string[] | null;
  status: PortfolioStatus;
  sort_order: number;
  restricted: boolean | null;
  title_en: string;
  title_fa: string | null;
  summary_en: string;
  summary_fa: string | null;
  problem_en: string | null;
  problem_fa: string | null;
  description_en: string | null;
  description_fa: string | null;
  portfolio_categories: {
    slug: string;
    label_en: string;
    label_fa: string | null;
    sort_order: number;
  } | null;
};

const PROJECT_COLUMNS = `
  slug, tech, repo_url, live_url, cover_url, gallery_urls, status, sort_order,
  restricted,
  title_en, title_fa, summary_en, summary_fa,
  problem_en, problem_fa, description_en, description_fa,
  portfolio_categories ( slug, label_en, label_fa, sort_order )
`;

/**
 * English is the source of truth; Persian overrides it when present.
 *
 * For NAMES — a product title, a category label. Not for sentences: see
 * pickProse below for why those need one more thing.
 */
function pick(en: string, fa: string | null, locale: Locale): string {
  return locale === "fa" && fa ? fa : en;
}

/**
 * The same choice, for PROSE, with the English fallback bidi-isolated.
 *
 * An English sentence dropped into a right-to-left page has its trailing
 * punctuation reordered by the bidirectional algorithm: the sentence renders
 * with its full stop against the LEFT margin, detached from the words it
 * belongs to. Not a font problem and not a CSS one — the paragraph direction
 * is RTL, the run is LTR, and a neutral character at the boundary belongs to
 * the paragraph rather than the run.
 *
 * i18n/pending.ts already solved this for copy that lives in the dictionary,
 * and its own comment says it is doing what "the portfolio uses for missing
 * translations" — which the portfolio was not in fact doing. Database prose
 * took a different path here and arrived bare. Same fix, same helper, so
 * there is one definition of the isolate characters and stripIsolates keeps
 * knowing about all of them.
 *
 * Only on the fallback. Real Persian prose is RTL inside an RTL page and
 * needs nothing, and wrapping it would put invisible characters into copy for
 * no reason.
 *
 * NAMES ARE DELIBERATELY EXCLUDED. A title is a Latin product name with no
 * trailing neutral to strand, it is already marked `lang="en" dir="ltr"`
 * where it is rendered, and it flows unstripped into <title>, meta
 * descriptions and the OpenGraph image — where an isolate is not invisible,
 * it is a character satori has to draw.
 */
function pickProse(en: string, fa: string | null, locale: Locale): string {
  if (locale === "fa" && fa) return fa;
  return locale === "fa" ? pending(en) : en;
}

function pickProseNullable(
  en: string | null,
  fa: string | null,
  locale: Locale,
): string | null {
  if (locale === "fa" && fa) return fa;
  if (en === null) return null;
  return locale === "fa" ? pending(en) : en;
}

function toProject(row: ProjectRow, locale: Locale): PortfolioProject {
  const category = row.portfolio_categories;

  /**
   * Whether the reader is being shown English because Persian is missing.
   *
   * Judged on the prose only. Titles are product names and stay in Latin
   * script on purpose, so a null title_fa is the intended state rather than
   * a gap — keying the notice off it would label fully translated entries as
   * untranslated.
   */
  const missingPersian =
    locale === "fa" &&
    (!row.summary_fa ||
      (!!row.problem_en && !row.problem_fa) ||
      (!!row.description_en && !row.description_fa));

  return {
    slug: row.slug,
    categorySlug: category?.slug ?? "",
    categoryLabel: category
      ? pick(category.label_en, category.label_fa, locale)
      : "",
    categorySortOrder: category?.sort_order ?? 0,
    title: pick(row.title_en, row.title_fa, locale),
    summary: pickProse(row.summary_en, row.summary_fa, locale),
    problem: pickProseNullable(row.problem_en, row.problem_fa, locale),
    description: pickProseNullable(row.description_en, row.description_fa, locale),
    tech: row.tech ?? [],
    repoUrl: row.repo_url,
    liveUrl: row.live_url,
    coverUrl: row.cover_url,
    gallery: row.gallery_urls ?? [],
    status: row.status,
    sortOrder: row.sort_order,
    // Null only on a database that has not had 013 applied, where nothing is
    // restricted yet and false is the truthful answer.
    restricted: row.restricted ?? false,
    usesFallbackCopy: missingPersian,
  };
}

/**
 * Published projects, in display order.
 *
 * Row-level security already restricts anonymous reads to published rows;
 * the explicit filter is here so the intent is readable at the call site and
 * survives a move to a database where the policy is written differently.
 */
export async function listPublishedProjects(
  locale: Locale,
): Promise<PortfolioProject[]> {
  if (!hasDatabaseConfig()) return [];

  const { data, error } = await publicClient()
    .from("portfolio_projects")
    .select(PROJECT_COLUMNS)
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[portfolio] listPublishedProjects failed:", error.message);
    return [];
  }

  return (data as unknown as ProjectRow[]).map((row) => toProject(row, locale));
}

export async function getPublishedProject(
  slug: string,
  locale: Locale,
): Promise<PortfolioProject | null> {
  if (!hasDatabaseConfig()) return null;

  const { data, error } = await publicClient()
    .from("portfolio_projects")
    .select(PROJECT_COLUMNS)
    .eq("published", true)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[portfolio] getPublishedProject failed:", error.message);
    return null;
  }
  if (!data) return null;

  return toProject(data as unknown as ProjectRow, locale);
}

/**
 * Categories that actually have published work, with their counts.
 *
 * Empty categories are dropped rather than rendered as disabled chips: a
 * filter that leads to an empty grid is a dead end, and a zero beside
 * "Admin Dashboard" advertises the gap on the page meant to demonstrate the
 * opposite. A category reappears on its own the moment something is
 * published into it, with no code change.
 */
export function categoriesFrom(
  projects: PortfolioProject[],
): PortfolioCategory[] {
  const counts = new Map<string, PortfolioCategory>();

  for (const project of projects) {
    if (!project.categorySlug) continue;
    const existing = counts.get(project.categorySlug);
    if (existing) {
      existing.count += 1;
      continue;
    }
    counts.set(project.categorySlug, {
      slug: project.categorySlug,
      label: project.categoryLabel,
      sortOrder: project.categorySortOrder,
      count: 1,
    });
  }

  return [...counts.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
  );
}

/** Slugs of every published project, for static generation. */
export async function listPublishedSlugs(): Promise<string[]> {
  if (!hasDatabaseConfig()) return [];

  const { data, error } = await publicClient()
    .from("portfolio_projects")
    .select("slug")
    .eq("published", true);

  if (error) {
    console.error("[portfolio] listPublishedSlugs failed:", error.message);
    return [];
  }

  return (data as { slug: string }[]).map((row) => row.slug);
}

/**
 * Published projects with their last edit, for the sitemap.
 *
 * Separate from listPublishedSlugs because a sitemap wants a date and static
 * generation does not, and widening the other function would mean every
 * caller carrying a field only one of them reads.
 */
export async function listSitemapProjects(): Promise<
  { slug: string; updatedAt: Date | null }[]
> {
  if (!hasDatabaseConfig()) return [];

  const { data, error } = await publicClient()
    .from("portfolio_projects")
    .select("slug, updated_at")
    .eq("published", true);

  if (error) {
    console.error("[portfolio] listSitemapProjects failed:", error.message);
    return [];
  }

  return (data as { slug: string; updated_at: string | null }[]).map((row) => {
    const parsed = row.updated_at ? new Date(row.updated_at) : null;
    return {
      slug: row.slug,
      // An unparseable timestamp becomes no timestamp. A sitemap entry with a
      // wrong lastmod is worse than one without: crawlers use it to decide
      // whether to bother re-reading the page.
      updatedAt: parsed && !Number.isNaN(parsed.valueOf()) ? parsed : null,
    };
  });
}
