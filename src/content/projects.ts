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
};

export const boardColumns: BoardColumn[] = [
  "shipped",
  "in_progress",
  "up_next",
];

export const boardProjects: BoardProject[] = [
  {
    ref: "PRJ-01",
    tech: ["Node.js", "Rules as data", "Zero deps", "Tested"],
    column: "shipped",
    shipped: true,
  },
  {
    ref: "PRJ-02",
    tech: ["Node.js", "React", "SQLite", "Search"],
    column: "shipped",
    shipped: true,
  },
  {
    ref: "PRJ-03",
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
