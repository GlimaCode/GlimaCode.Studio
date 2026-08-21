import { ImageResponse } from "next/og";

/**
 * The shared link-preview card.
 *
 * One renderer, two callers: the home page and each case study. Facebook,
 * LinkedIn, Slack and iMessage all read this image, and it is often the only
 * thing a person sees before deciding whether to click.
 *
 * WHY THE CARD IS IN LATIN SCRIPT ON BOTH LOCALES
 *
 * The image is drawn by satori, which needs real font bytes — it cannot use
 * the site's stylesheet, and it cannot read woff2, which is the only format
 * next/font produces. Rendering Persian would mean committing a Vazirmatn
 * TTF to the repository purely for this one surface.
 *
 * So the card carries the parts that are Latin in both languages anyway: the
 * wordmark, the project title (product names, which we deliberately keep in
 * Latin script), and the domain. The Persian text of a share still arrives —
 * og:title and og:description are text, not pixels, and those are fully
 * translated. Only the picture is language-neutral.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const PAPER = "#F7F8FA";
const INK = "#16233B";
const SLATE = "#5B6B85";
const COBALT = "#2547F4";
const LINE = "#DDE3EC";

type CardProps = {
  /** The large line. Kept short; long titles shrink rather than wrap forever. */
  title: string;
  /** Small line above the title — a category, or the studio descriptor. */
  eyebrow: string;
  /** Small line under the title. */
  footnote: string;
};

/** Long titles get a smaller face rather than a fourth line of text. */
function titleSize(title: string): number {
  if (title.length > 54) return 56;
  if (title.length > 34) return 68;
  return 82;
}

export function ogCard({ title, eyebrow, footnote }: CardProps) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: "72px 80px",
          // Satori has no default box model quirks to fight, but it also has
          // no `border` shorthand support worth relying on, so edges are
          // drawn as explicit sides.
          borderTop: `10px solid ${COBALT}`,
        }}
      >
        {/* Lockup: the same mark as the favicon, at preview scale. */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 512 512">
            <rect width="512" height="512" rx="96" fill={COBALT} />
            <path
              d="M296 226c-9-15-26-24-45-24-29 0-51 21-51 51s22 51 51 51c21 0 39-11 46-30h-46v-26h73v14c0 40-30 68-73 68-44 0-77-32-77-77s33-77 77-77c30 0 55 15 68 39z"
              transform="translate(256 256) scale(1.55) translate(-256 -256)"
              fill="#FFFFFF"
            />
          </svg>
          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: INK,
              letterSpacing: -0.5,
            }}
          >
            GlimaCode
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: COBALT,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: titleSize(title),
              fontWeight: 700,
              color: INK,
              lineHeight: 1.12,
              letterSpacing: -1.5,
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `1px solid ${LINE}`,
            paddingTop: 28,
            fontSize: 26,
            color: SLATE,
          }}
        >
          <div style={{ display: "flex" }}>{footnote}</div>
          <div style={{ display: "flex", color: INK, fontWeight: 600 }}>
            glimacode.com
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
