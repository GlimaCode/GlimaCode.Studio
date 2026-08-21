import { sessionClient } from "@/lib/auth/session";
import { en } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import type {
  BudgetKey,
  ProjectTypeKey,
  TimelineKey,
} from "@/content/formOptions";

/**
 * Team-side reads and writes.
 *
 * Separate from src/lib/data/portfolio.ts because the access path is
 * different: every call here runs on the signed-in team member's session, so
 * row-level security is what actually authorises it. Nothing in this module
 * elevates privileges, and there is no service key anywhere in the codebase.
 *
 * The list query deliberately fetches less than the detail query. The list is
 * a triage surface, and it should not put a stranger's email address and the
 * text of their brief on screen just to decide what to open.
 */

export const REQUEST_STATUSES = [
  "New",
  "Reviewing",
  "Replied",
  "Won",
  "Lost",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type RequestListItem = {
  ticketId: string;
  name: string;
  company: string | null;
  projectType: string;
  budget: string;
  locale: Locale;
  status: RequestStatus;
  createdAt: string;
  /** Null when nothing has ever been recorded for this request. */
  delivered: boolean | null;
  deliveryError: string | null;
};

export type RequestDetail = RequestListItem & {
  email: string;
  timeline: string;
  description: string;
  notes: string | null;
  sourceProjectSlug: string | null;
  sourceProjectTitle: string | null;
  attempts: {
    delivered: boolean;
    provider: string;
    error: string | null;
    createdAt: string;
  }[];
};

/**
 * Embedded relations arrive as an object for a to-one join but are typed as
 * an array. Accept either rather than casting, so neither shape breaks.
 */
function firstOf<T>(value: unknown): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

/** Enum keys are stored, not labels. Triage always reads English. */
function label(kind: "type" | "budget" | "timeline", key: string): string {
  if (kind === "type") return en.start.projectTypes[key as ProjectTypeKey] ?? key;
  if (kind === "budget") return en.start.budgets[key as BudgetKey] ?? key;
  return en.start.timelines[key as TimelineKey] ?? key;
}

export async function listRequests(): Promise<RequestListItem[]> {
  const client = await sessionClient();

  const { data, error } = await client
    .from("requests")
    // Exactly what triage needs to decide what to open, and nothing else.
    // No email address, no brief, no notes: this is a list someone may leave
    // open on a screen, and none of that is needed to choose a row.
    // scripts/verify-list-privacy.mjs fails the build if that changes.
    .select(
      "id, ticket_id, name, company, project_type, budget, locale, status, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin] listRequests failed:", error.message);
    return [];
  }

  // Delivery state comes from its own view so the list can show it without
  // pulling every attempt for every row.
  const { data: delivery } = await client
    .from("request_delivery")
    .select("request_id, delivered, error");

  const byRequest = new Map<string, { delivered: boolean; error: string | null }>();
  for (const row of delivery ?? []) {
    byRequest.set(row.request_id as string, {
      delivered: row.delivered as boolean,
      error: (row.error as string | null) ?? null,
    });
  }

  return (data ?? []).map((row) => {
    const record = byRequest.get(row.id as string);
    return {
      ticketId: row.ticket_id as string,
      name: row.name as string,
      company: (row.company as string | null) ?? null,
      projectType: label("type", row.project_type as string),
      budget: label("budget", row.budget as string),
      locale: (row.locale as Locale) ?? "en",
      status: row.status as RequestStatus,
      createdAt: row.created_at as string,
      delivered: record ? record.delivered : null,
      deliveryError: record?.error ?? null,
    };
  });
}

export async function getRequest(ticketId: string): Promise<RequestDetail | null> {
  const client = await sessionClient();

  const { data, error } = await client
    .from("requests")
    .select(
      `id, ticket_id, name, email, company, description, project_type, budget,
       timeline, locale, status, notes, created_at,
       portfolio_projects ( slug, title_en )`,
    )
    .eq("ticket_id", ticketId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[admin] getRequest failed:", error.message);
    return null;
  }

  const { data: attempts } = await client
    .from("notification_attempts")
    .select("delivered, provider, error, created_at")
    .eq("request_id", data.id as string)
    .order("created_at", { ascending: false });

  // A to-one relation, but the generated types describe it as an array.
  // Normalise rather than assert, so a shape change is survivable.
  const source = firstOf<{ slug: string; title_en: string }>(
    data.portfolio_projects,
  );

  const list = (attempts ?? []).map((row) => ({
    delivered: row.delivered as boolean,
    provider: row.provider as string,
    error: (row.error as string | null) ?? null,
    createdAt: row.created_at as string,
  }));

  return {
    ticketId: data.ticket_id as string,
    name: data.name as string,
    email: data.email as string,
    company: (data.company as string | null) ?? null,
    description: data.description as string,
    projectType: label("type", data.project_type as string),
    budget: label("budget", data.budget as string),
    timeline: label("timeline", data.timeline as string),
    locale: (data.locale as Locale) ?? "en",
    status: data.status as RequestStatus,
    notes: (data.notes as string | null) ?? null,
    createdAt: data.created_at as string,
    sourceProjectSlug: source?.slug ?? null,
    sourceProjectTitle: source?.title_en ?? null,
    delivered: list.length ? list[0].delivered : null,
    deliveryError: list.length ? list[0].error : null,
    attempts: list,
  };
}

export type AdminProject = {
  id: string;
  slug: string;
  titleEn: string;
  titleFa: string | null;
  categorySlug: string;
  published: boolean;
  sortOrder: number;
  /** True when the entry has no Persian prose, so the gap is visible. */
  missingPersian: boolean;
};

export async function listAllProjects(): Promise<AdminProject[]> {
  const client = await sessionClient();

  const { data, error } = await client
    .from("portfolio_projects")
    .select(
      `id, slug, title_en, title_fa, published, sort_order,
       summary_fa, description_fa,
       portfolio_categories ( slug )`,
    )
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[admin] listAllProjects failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    titleEn: row.title_en as string,
    titleFa: (row.title_fa as string | null) ?? null,
    categorySlug: firstOf<{ slug: string }>(row.portfolio_categories)?.slug ?? "",
    published: row.published as boolean,
    sortOrder: row.sort_order as number,
    missingPersian: !row.summary_fa || !row.description_fa,
  }));
}
