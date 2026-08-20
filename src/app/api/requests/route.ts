import { NextResponse } from "next/server";
import { publicClient } from "@/lib/db/client";
import { hasDatabaseConfig } from "@/lib/env";
import { notifyRequest } from "@/lib/mail/notifyRequest";
import { isLocale } from "@/i18n/config";
import {
  BUDGETS,
  PROJECT_TYPES,
  TIMELINES,
  type BudgetKey,
  type ProjectTypeKey,
  type TimelineKey,
} from "@/content/formOptions";

/**
 * Receives a project request.
 *
 * The order is the whole point: persist first, notify second. A lost
 * notification is recoverable — the row is in the database and shows up in
 * triage. A lost brief is gone, and the visitor believes they sent it. So a
 * failure to send mail is logged loudly and does not fail the request.
 *
 * The write goes through submit_request, a definer-rights function that is
 * the only path the public role has to that table. It takes exactly the
 * fields a visitor supplies and returns the reference the database
 * allocated, which is how the confirmation gets a ticket number without the
 * caller being able to read the table.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A form filled in faster than a person could read it is not a person. Three
 * seconds is deliberately lenient; the honeypot does the heavier lifting.
 *
 * The timestamp comes from the client and a determined bot can forge it.
 * This is a cost filter, not a security control — it removes the traffic
 * that never looks, and nothing here depends on it being unforgeable.
 */
const MIN_FILL_MS = 3000;

type Payload = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const text = asString(value);
  return (allowed as readonly string[]).includes(text) ? (text as T) : null;
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Honeypot: a field no visitor can see and no visitor can fill. Answered
  // with the same shape as success, so a bot learns nothing from the reply.
  if (asString(payload.website).length > 0) {
    console.warn("[requests] honeypot triggered; discarding submission");
    return NextResponse.json({ ticketId: null, discarded: true }, { status: 202 });
  }

  const elapsed = Number(payload.elapsedMs);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_FILL_MS) {
    console.warn(`[requests] submitted in ${elapsed}ms; discarding submission`);
    return NextResponse.json({ ticketId: null, discarded: true }, { status: 202 });
  }

  const name = asString(payload.name);
  const email = asString(payload.email).toLowerCase();
  const description = asString(payload.description);
  const projectType = oneOf<ProjectTypeKey>(payload.projectType, PROJECT_TYPES);
  const budget = oneOf<BudgetKey>(payload.budget, BUDGETS);
  const timeline = oneOf<TimelineKey>(payload.timeline, TIMELINES);
  const localeValue = asString(payload.locale) || "en";
  const locale = isLocale(localeValue) ? localeValue : "en";

  // Mirrors the constraints in the schema, so a bad request is a 400 here
  // rather than a database error surfacing as a 500.
  const invalid: string[] = [];
  if (!name || name.length > 120) invalid.push("name");
  if (!EMAIL_PATTERN.test(email)) invalid.push("email");
  if (description.length < 10 || description.length > 5000) invalid.push("description");
  if (!projectType) invalid.push("projectType");
  if (!budget) invalid.push("budget");
  if (!timeline) invalid.push("timeline");
  // The three enum checks are repeated in the condition so the compiler can
  // narrow them away, rather than trusting that a non-empty list implies it.
  if (invalid.length || !projectType || !budget || !timeline) {
    return NextResponse.json({ error: "invalid_fields", fields: invalid }, { status: 400 });
  }

  if (!hasDatabaseConfig()) {
    console.error("[requests] database is not configured; cannot accept the request");
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  // ---- persist -----------------------------------------------------------
  const { data, error } = await publicClient().rpc("submit_request", {
    p_name: name,
    p_email: email,
    p_company: asString(payload.company) || null,
    p_description: description,
    p_project_type: projectType,
    p_budget: budget,
    p_timeline: timeline,
    p_source_slug: asString(payload.sourceProjectSlug) || null,
    p_locale: locale,
  });

  if (error) {
    // 53400 is raised by the per-address throttle in 006.
    if (error.code === "53400") {
      console.warn(`[requests] throttled: ${email}`);
      return NextResponse.json({ error: "too_many" }, { status: 429 });
    }
    console.error("[requests] could not save the request:", error.message);
    return NextResponse.json({ error: "not_saved" }, { status: 500 });
  }

  const ticketId = typeof data === "string" ? data : null;
  if (!ticketId) {
    console.error("[requests] saved but no ticket reference came back");
    return NextResponse.json({ error: "not_saved" }, { status: 500 });
  }

  // ---- notify ------------------------------------------------------------
  // Past this point the brief is safe. Nothing below may fail the response.
  try {
    const result = await notifyRequest({
      ticketId,
      name,
      email,
      company: asString(payload.company) || null,
      description,
      projectType,
      budget,
      timeline,
      locale,
      sourceProjectSlug: asString(payload.sourceProjectSlug) || null,
    });
    if (!result.delivered) {
      console.error(
        `[requests] ${ticketId} SAVED but NOT NOTIFIED via ${result.provider}: ${result.error ?? "no provider configured"}`,
      );
    }
  } catch (cause) {
    console.error(
      `[requests] ${ticketId} SAVED but the notification threw:`,
      cause instanceof Error ? cause.message : cause,
    );
  }

  return NextResponse.json({ ticketId }, { status: 201 });
}
