import { mailto } from "@/config/site";
import { en } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import type {
  BudgetKey,
  ProjectTypeKey,
  TimelineKey,
} from "@/content/formOptions";

/**
 * Project requests.
 *
 * This module is the only place that knows how a request leaves the browser.
 * Phase 1 hands the request to the visitor's mail client, exactly as the
 * prototype did. Phase 3 replaces the body of `submitProjectRequest` with a
 * call to our own API route, which persists to Postgres and notifies the
 * team — no component above this layer changes.
 */

export type ProjectRequestInput = {
  name: string;
  email: string;
  company: string;
  /** Stable keys, never translated labels. */
  projectType: ProjectTypeKey;
  budget: BudgetKey;
  timeline: TimelineKey;
  description: string;
  /**
   * The language the visitor was reading. Stored with the request so we know
   * which language to reply in, and surfaced in the notification subject so
   * that is clear before anyone opens the dashboard.
   */
  locale: Locale;
  /**
   * Slug of the portfolio sample the visitor came from, when the request
   * started at a "Request something like this" button. Wired up in phase 2.
   */
  sourceProjectSlug?: string | null;
};

export type ProjectRequestResult = {
  ticketId: string;
};

/**
 * Reference shown to the visitor and used as the subject line prefix.
 *
 * Generated in the browser for now. Phase 3 moves this to a database default
 * so two visitors submitting in the same millisecond cannot collide — the
 * current scheme takes the low 5 characters of a base-36 timestamp, which is
 * unique enough to display but not unique enough to be a primary key.
 */
export function generateTicketId(): string {
  return "REQ-" + Date.now().toString(36).toUpperCase().slice(-5);
}

/**
 * Notifications always read in English, whichever language the visitor used,
 * so the two of us are never triaging a mix of scripts. The visitor's own
 * language is stated explicitly instead.
 */
function englishLabels(input: ProjectRequestInput) {
  return {
    type: en.start.projectTypes[input.projectType],
    budget: en.start.budgets[input.budget],
    timeline: en.start.timelines[input.timeline],
    language: input.locale === "fa" ? "Persian" : "English",
  };
}

function composeEmail(ticketId: string, input: ProjectRequestInput): string {
  const label = englishLabels(input);

  const body = [
    `Project request ${ticketId}`,
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Company: ${input.company || "—"}`,
    `Type: ${label.type}`,
    `Budget: ${label.budget}`,
    `Timeline: ${label.timeline}`,
    `Reply in: ${label.language}`,
    "",
    "Description:",
    input.description,
  ].join("\n");

  const subject =
    input.locale === "fa"
      ? `[${ticketId}] [FA] ${label.type} — ${input.name}`
      : `[${ticketId}] ${label.type} — ${input.name}`;

  return mailto(subject, body);
}

export async function submitProjectRequest(
  ticketId: string,
  input: ProjectRequestInput,
): Promise<ProjectRequestResult> {
  window.location.href = composeEmail(ticketId, input);
  return { ticketId };
}
