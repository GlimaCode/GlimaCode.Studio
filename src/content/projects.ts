/**
 * Board seed for the work section.
 *
 * Only locale-neutral fields live here. Titles and descriptions come from
 * the dictionaries, keyed by `ref` — the same split the phase 2 schema will
 * use, where translated text is duplicated per locale and everything else
 * stays a single column.
 *
 * Phase 1 seed: replaced by the database-backed portfolio in phase 2.
 */

export type BoardColumn = "shipped" | "in_progress" | "up_next";

export type ProjectRef =
  | "PRJ-01"
  | "PRJ-02"
  | "PRJ-03"
  | "PRJ-04"
  | "PRJ-05";

export type BoardProject = {
  ref: ProjectRef;
  /** Technology chips. Product and technology names are not translated. */
  tech: string[];
  column: BoardColumn;
  /** Drives the status dot colour: green when shipped, amber otherwise. */
  shipped: boolean;
  /** Renders the call to action on the card. */
  ctaHref?: string;
  /**
   * The portfolio row this card mirrors, when it mirrors one.
   *
   * The board and the portfolio are separate surfaces on purpose: the board
   * is what we are working on, the portfolio is what a client can have. But
   * three cards restate a database row word for word, from the dictionary,
   * and nothing kept the two copies together. The dashboard tells you
   * "content is edited in the database" — so the first edit made there would
   * have silently left the home page quoting the old text.
   *
   * Naming the relationship makes it checkable. npm run verify:copy-sync
   * compares them, and the portfolio list flags a row whose copy has drifted.
   *
   * Undefined means the card has no portfolio row and is not expected to:
   * PRJ-04 is this site, PRJ-05 is the open slot.
   */
  portfolioSlug?: string;
};

export const boardColumns: BoardColumn[] = [
  "shipped",
  "in_progress",
  "up_next",
];

export const boardProjects: BoardProject[] = [
  {
    ref: "PRJ-01",
    portfolioSlug: "listing-quality-auditor",
    tech: ["Node.js", "Rules as data", "Zero deps", "Tested"],
    column: "shipped",
    shipped: true,
  },
  {
    ref: "PRJ-02",
    portfolioSlug: "vehicle-catalog",
    tech: ["Node.js", "React", "SQLite", "Search"],
    column: "shipped",
    shipped: true,
  },
  {
    ref: "PRJ-03",
    portfolioSlug: "title-batch-generator",
    tech: ["React", "TypeScript", "Vite", "CSV pipeline"],
    column: "shipped",
    shipped: true,
  },
  {
    ref: "PRJ-04",
    tech: ["Next.js", "TypeScript", "Supabase", "RLS"],
    column: "in_progress",
    shipped: false,
  },
  {
    ref: "PRJ-05",
    tech: ["Scoping", "MVP", "2–4 weeks"],
    column: "up_next",
    shipped: false,
    ctaHref: "#start",
  },
];
