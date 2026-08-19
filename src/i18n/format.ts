import { bcp47, type Locale } from "./config";

/**
 * Locale-aware formatting.
 *
 * Persian uses Persian-Indic digits, and Intl already knows that — the `fa`
 * locale selects the `arabext` numbering system on its own, so `5` formats
 * as `۵` with no lookup table and no dependency.
 */

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(bcp47(locale)).format(value);
}

/**
 * Renders an approximate day count: "~5 days" / "~۵ روز".
 *
 * The unit word comes from the dictionary because Persian does not
 * pluralise the counted noun the way English does.
 */
export function formatApproxDays(
  days: number,
  unit: string,
  locale: Locale,
): string {
  return `~${formatNumber(days, locale)} ${unit}`;
}

export function formatDateTime(value: Date | string, locale: Locale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(bcp47(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
