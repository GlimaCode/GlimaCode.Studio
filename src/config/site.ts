/**
 * Studio-wide configuration.
 *
 * One place to change brand, contact details and links — everything else in
 * the app reads from here. Replaces the CONFIG object from the prototype.
 */

export type SiteConfig = {
  /** Studio name, used in the logo, page titles and metadata. */
  brand: string;
  /** Short descriptor that follows the brand in the browser title. */
  tagline: string;
  /** Meta description for search results and link previews. */
  description: string;
  /** Canonical production origin, no trailing slash. */
  url: string;
  /**
   * Contact address. Switching to hello@glimacode.com once the domain
   * mailbox is live is a one-line change here.
   */
  email: string;
  /** GitHub organisation, not a personal profile. */
  github: string;
  /**
   * The studio's LinkedIn page. Null hides the button entirely.
   *
   * Personal profiles are deliberately not linked, even though one of them
   * exists. For a two-developer studio, linking one founder and not the
   * other reads worse than linking neither — so it is both or nothing, and
   * the thing actually worth linking is the company page. Filling this in
   * brings the button back; no markup has to be restored.
   */
  linkedin: string | null;
  /** Shown beside the pulsing availability dot in the hero. */
  availability: string;
  /** Working location and offset, shown in the hero meta row. */
  location: string;
  /**
   * Switches for routes that do not exist yet. The site is live, so a link
   * to an unbuilt page is a 404 in front of a visitor — the link appears
   * only once the route behind it does.
   */
  features: {
    /** The footer's team link. Off while the route did not exist. */
    dashboard: boolean;
    /**
     * Turn on once the portfolio migrations are applied and seeded. Until
     * then the routes and the nav link stay hidden rather than rendering an
     * empty grid against a table that does not exist yet.
     */
    portfolio: boolean;
  };
};

export const siteConfig: SiteConfig = {
  brand: "GlimaCode",
  tagline: "Two-developer web studio",
  description:
    "Glimacode is a two-developer React and Supabase studio. Scoped plans, staged delivery, and a second developer reviewing every line before it ships.",
  url: "https://glimacode.com",
  email: "glimacode.studio@gmail.com",
  github: "https://github.com/GlimaCode",
  linkedin: null,
  availability: "Taking new projects",
  location: "Remote · UTC+3:30",
  features: {
    dashboard: true,
    portfolio: true,
  },
};

/** Builds a mailto: link, optionally pre-filling subject and body. */
export function mailto(subject?: string, body?: string): string {
  // Built by hand rather than with URLSearchParams, which encodes a space as
  // "+". That is correct for a form submission and wrong here: RFC 6068 gives
  // "+" no special meaning in a mailto query, so mail clients show it
  // literally and the subject arrives as "Project+request". The helper had
  // never been called with a subject, so nothing had shipped — the bug was
  // waiting for the first caller that used one.
  const parts: string[] = [];
  if (subject) parts.push(`subject=${encodeURIComponent(subject)}`);
  if (body) parts.push(`body=${encodeURIComponent(body)}`);
  const query = parts.join("&");
  return `mailto:${siteConfig.email}${query ? `?${query}` : ""}`;
}
