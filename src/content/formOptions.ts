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
export const DEFAULT_BUDGET: BudgetKey = "to700";
export const DEFAULT_TIMELINE: TimelineKey = "weeks";
