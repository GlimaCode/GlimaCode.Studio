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
 *
 * The tilde and the number are wrapped in a directional isolate. Built as a
 * plain string this function was already correct — and it rendered as "۵~"
 * on the Persian page, which reads as "5 tilde". A tilde is a neutral
 * character, so at the start of a run inside a right-to-left paragraph the
 * bidirectional algorithm resolves it to the paragraph direction and puts it
 * on the other side of the digits. FSI/PDI mark "~۵" as one isolated run and
 * the tilde stays where it was written. Same mechanism as `pending()`, and
 * first-strong rather than left-to-right so the digits still take the
 * numbering system Intl chose for the locale.
 */
const FSI = "⁨";
const PDI = "⁩";

export function formatApproxDays(
  days: number,
  unit: string,
  locale: Locale,
): string {
  return `${FSI}~${formatNumber(days, locale)}${PDI} ${unit}`;
}

export function formatDateTime(value: Date | string, locale: Locale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(bcp47(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
