import type { Locale } from "@/i18n/config";

/**
 * Stable option keys for the request form.
 *
 * The submitted value is a key, never a translated label. A Persian visitor
 * and an English visitor choosing the same option produce the same value, so
 * the dashboard and the database never see mixed-language data — and the
 * team always reads the English label regardless of who submitted.
 */
export const PROJECT_TYPES = [
  "landing",
  "dashboard",
  "mvp",
  "whitelabel",
  "other",
] as const;

/**
 * Budget tiers.
 *
 * READ THE KEY NAMES AS TIER ORDINALS, NOT AS PRICES.
 *
 * They were named after dollar bands because English was the only locale at
 * the time. The two locales have since stopped being translations of each
 * other. English offers the bands, because dollars are the right unit for
 * agencies in Turkey, the UAE and Europe. Persian offers scope instead,
 * because a dollar figure reads as a foreign-currency quote to an Iranian
 * client and re-anchors the exact numbers the services cards deliberately
 * dropped.
 *
 * So `to700` on a Persian row does NOT mean the visitor said $300-$700. It
 * means they chose the second tier, which they saw described as "a few pages
 * or a simple tool". Nothing they saw contained a number.
 *
 * The names stay as they are: renaming them means a check-constraint change,
 * a migration, and losing the ability to compare tiers across locales. This
 * comment carries the meaning instead.
 *
 * Anything that DISPLAYS a budget must go through the locale-aware label in
 * src/lib/data/admin.ts. Reading the English dictionary directly will quote a
 * price back at someone who was never shown one.
 */
export const BUDGETS = [
  "under300",
  "to700",
  "to1500",
  "over1500",
  "unsure",
] as const;

export const TIMELINES = ["asap", "weeks", "months", "flexible"] as const;

export type ProjectTypeKey = (typeof PROJECT_TYPES)[number];
export type BudgetKey = (typeof BUDGETS)[number];
export type TimelineKey = (typeof TIMELINES)[number];

export const DEFAULT_PROJECT_TYPE: ProjectTypeKey = "landing";
export const DEFAULT_TIMELINE: TimelineKey = "weeks";

/**
 * The preselected budget, per locale.
 *
 * English keeps a mid band selected: the anchor is wanted in that market.
 * Persian defaults to "not sure", because removing the currency while leaving
 * a tier preselected still asserts one before the visitor has typed anything,
 * which was most of the reason for removing it.
 */
export const DEFAULT_BUDGET: Record<Locale, BudgetKey> = {
  en: "to700",
  fa: "unsure",
};

/**
 * English names for what a Persian visitor actually chose.
 *
 * Not site copy: nobody browsing ever reads these. They exist so the
 * dashboard and the notification email can report a Persian submission in the
 * team's language without inventing a dollar figure. They live beside the
 * keys rather than in the dictionaries, because the dictionaries are what
 * visitors read and this is what we read.
 *
 * Keep these in step with the Persian labels in the fa dictionary. They are
 * the same five options said twice, once for the visitor and once for us.
 */
export const BUDGET_SCALE_EN: Record<BudgetKey, string> = {
  under300: "One page or a small feature",
  to700: "A few pages or a simple tool",
  to1500: "A complete product",
  over1500: "A large project or an ongoing engagement",
  unsure: "Not sure yet",
};

/**
 * Closest project type for a portfolio category.
 *
 * Used when a visitor arrives from "Request something like this": the form
 * opens with a sensible type already chosen rather than making them restate
 * what they just clicked. Anything unmapped falls through to the default.
 */
export const PROJECT_TYPE_FOR_CATEGORY: Record<string, ProjectTypeKey> = {
  "landing-page": "landing",
  "admin-dashboard": "dashboard",
  "web-app": "mvp",
  "data-tool": "other",
};
