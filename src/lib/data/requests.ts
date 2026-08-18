import { mailto } from "@/config/site";

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
  projectType: string;
  budget: string;
  timeline: string;
  description: string;
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

function composeEmail(ticketId: string, input: ProjectRequestInput): string {
  const body = [
    `Project request ${ticketId}`,
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Company: ${input.company || "—"}`,
    `Type: ${input.projectType}`,
    `Budget: ${input.budget}`,
    `Timeline: ${input.timeline}`,
    "",
    "Description:",
    input.description,
  ].join("\n");

  return mailto(
    `[${ticketId}] ${input.projectType} — ${input.name}`,
    body,
  );
}

export async function submitProjectRequest(
  ticketId: string,
  input: ProjectRequestInput,
): Promise<ProjectRequestResult> {
  window.location.href = composeEmail(ticketId, input);
  return { ticketId };
}
