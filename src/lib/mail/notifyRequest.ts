import { en } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/config";
import type {
  BudgetKey,
  ProjectTypeKey,
  TimelineKey,
} from "@/content/formOptions";
import { sendMail, type MailResult } from "./index";

/**
 * The notification the team receives when a request arrives.
 *
 * Always in English, whichever language the visitor used, so triage is never
 * a mix of scripts — with the visitor's own language stated plainly and
 * marked in the subject, so it is clear which language to reply in before
 * anything is opened.
 */
export type RequestNotification = {
  ticketId: string;
  name: string;
  email: string;
  company: string | null;
  description: string;
  projectType: ProjectTypeKey;
  budget: BudgetKey;
  timeline: TimelineKey;
  locale: Locale;
  sourceProjectSlug?: string | null;
};

export async function notifyRequest(
  request: RequestNotification,
): Promise<MailResult> {
  const type = en.start.projectTypes[request.projectType];
  const budget = en.start.budgets[request.budget];
  const timeline = en.start.timelines[request.timeline];
  const language = request.locale === "fa" ? "Persian" : "English";

  const subject =
    request.locale === "fa"
      ? `[${request.ticketId}] [FA] ${type} — ${request.name}`
      : `[${request.ticketId}] ${type} — ${request.name}`;

  const text = [
    `Ticket:    ${request.ticketId}`,
    `Name:      ${request.name}`,
    `Email:     ${request.email}`,
    `Company:   ${request.company || "—"}`,
    `Type:      ${type}`,
    `Budget:    ${budget}`,
    `Timeline:  ${timeline}`,
    `Reply in:  ${language}`,
    request.sourceProjectSlug
      ? `Came from: ${request.sourceProjectSlug}`
      : `Came from: the form directly`,
    "",
    "Description:",
    request.description,
  ].join("\n");

  // Replying to the notification reaches the visitor rather than us.
  return sendMail({ subject, text, replyTo: request.email });
}
