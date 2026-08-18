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
  /** Personal profiles. Null hides the corresponding button entirely. */
  linkedin: {
    ali: string | null;
    mostafa: string | null;
  };
  /** Shown beside the pulsing availability dot in the hero. */
  availability: string;
  /** Working location and offset, shown in the hero meta row. */
  location: string;
};

export const siteConfig: SiteConfig = {
  brand: "Glimacode",
  tagline: "Two-developer web studio",
  description:
    "Glimacode is a two-developer React and Supabase studio. Scoped plans, staged delivery, and a second developer reviewing every line before it ships.",
  url: "https://glimacode.com",
  email: "glimacode.studio@gmail.com",
  github: "https://github.com/GlimaCode",
  linkedin: {
    ali: "https://www.linkedin.com/in/ali-ahmadi-165538271",
    // Not published yet — the button stays hidden until this is filled in.
    mostafa: null,
  },
  availability: "Taking new projects",
  location: "Remote · UTC+3:30",
};

/** Builds a mailto: link, optionally pre-filling subject and body. */
export function mailto(subject?: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return `mailto:${siteConfig.email}${query ? `?${query}` : ""}`;
}
