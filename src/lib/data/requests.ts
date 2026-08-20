import type { Locale } from "@/i18n/config";
import type {
  BudgetKey,
  ProjectTypeKey,
  TimelineKey,
} from "@/content/formOptions";

/**
 * Project requests.
 *
 * The only place that knows how a request leaves the browser. It posts to
 * our own route, which persists the request and then notifies the team —
 * in that order, so a mail failure never costs a brief.
 *
 * The ticket reference is allocated by the database and returned here. It is
 * no longer generated in the browser: a clock-derived reference can collide,
 * and the visitor should be quoting the same string the row actually has.
 */

export type ProjectRequestInput = {
  name: string;
  email: string;
  company: string;
  projectType: ProjectTypeKey;
  budget: BudgetKey;
  timeline: TimelineKey;
  description: string;
  locale: Locale;
  /** Slug of the portfolio sample the visitor arrived from, if any. */
  sourceProjectSlug?: string | null;
  /** Honeypot. Always empty for a person; never shown. */
  website?: string;
  /** Milliseconds between the form appearing and being submitted. */
  elapsedMs?: number;
};

export type ProjectRequestResult =
  | { ok: true; ticketId: string }
  | { ok: false; reason: "throttled" | "invalid" | "failed" };

export async function submitProjectRequest(
  input: ProjectRequestInput,
): Promise<ProjectRequestResult> {
  let response: Response;
  try {
    response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, reason: "failed" };
  }

  if (response.status === 429) return { ok: false, reason: "throttled" };
  if (response.status === 400) return { ok: false, reason: "invalid" };

  let body: { ticketId?: string | null } = {};
  try {
    body = (await response.json()) as { ticketId?: string | null };
  } catch {
    return { ok: false, reason: "failed" };
  }

  // A discarded submission answers 202 with no reference. The sender is
  // shown the ordinary confirmation rather than being told it was rejected.
  if (response.status === 202) return { ok: true, ticketId: "" };

  if (!response.ok || !body.ticketId) return { ok: false, reason: "failed" };
  return { ok: true, ticketId: body.ticketId };
}
