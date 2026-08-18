/**
 * Board seed for the work section.
 *
 * Phase 1 only: this array is replaced by the Supabase-backed portfolio in
 * phase 2, at which point the team can add projects without a redeploy.
 * Everything here is published work at github.com/GlimaCode, so nothing on
 * the page claims something that cannot be verified.
 */

export type BoardColumn = "shipped" | "in_progress" | "up_next";

export type BoardProject = {
  /** Display ticket reference, e.g. PRJ-01. */
  ref: string;
  title: string;
  description: string;
  /** Chips rendered under the description. */
  tech: string[];
  column: BoardColumn;
  /** Drives the status dot colour: green when shipped, amber otherwise. */
  shipped: boolean;
  /** Renders the "Claim this slot" call to action on the card. */
  cta?: { label: string; href: string };
};

export const boardColumns: { key: BoardColumn; label: string }[] = [
  { key: "shipped", label: "SHIPPED" },
  { key: "in_progress", label: "IN PROGRESS" },
  { key: "up_next", label: "UP NEXT" },
];

export const boardProjects: BoardProject[] = [
  {
    ref: "PRJ-01",
    title: "Listing Quality Auditor",
    description:
      "A product-data quality auditor with its rules held as data rather than code. Report-only by design, built on the principle that absence of evidence is never a pass. Zero dependencies, covered by a full test suite.",
    tech: ["Node.js", "Rules as data", "Zero deps", "Tested"],
    column: "shipped",
    shipped: true,
  },
  {
    ref: "PRJ-02",
    title: "Vehicle Catalog",
    description:
      "A standardised vehicle catalogue with explain-why search results, an alias system for messy inputs, a validation workflow, and spreadsheet export for downstream teams.",
    tech: ["Node.js", "React", "SQLite", "Search"],
    column: "shipped",
    shipped: true,
  },
  {
    ref: "PRJ-03",
    title: "Title Batch Generator",
    description:
      "A rule-based engine that generates compliant product titles for hundreds of listings at once — deterministic, traceable, and entirely client-side, so no data ever leaves the browser.",
    tech: ["React", "TypeScript", "Vite", "CSV pipeline"],
    column: "shipped",
    shipped: true,
  },
  {
    ref: "PRJ-04",
    title: "glimacode.com",
    description:
      "The site you are reading. React and Supabase, a data-driven portfolio, and a request pipeline the two of us triage — built in the open as our own reference project.",
    tech: ["Next.js", "TypeScript", "Supabase", "RLS"],
    column: "in_progress",
    shipped: false,
  },
  {
    ref: "PRJ-05",
    title: "Your project",
    description:
      "Have an internal tool, dashboard, or MVP that needs to ship? This slot is open — send us the brief below and we'll scope it together.",
    tech: ["Scoping", "MVP", "2–4 weeks"],
    column: "up_next",
    shipped: false,
    cta: { label: "Claim this slot", href: "#start" },
  },
];
