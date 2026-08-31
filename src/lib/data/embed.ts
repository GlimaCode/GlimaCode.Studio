/**
 * Can this URL be shown inside the showcase laptop?
 *
 * The showcase prefers the real thing: if a project is deployed and lets
 * itself be framed, the laptop opens onto the live page rather than a
 * screenshot. Otherwise it falls back to the screenshots.
 *
 * WHY THIS IS DECIDED ON THE SERVER
 *
 * A cross-origin iframe cannot tell you it failed. `X-Frame-Options: DENY`
 * and a CSP `frame-ancestors` that excludes us both produce a blank frame,
 * and the `load` event fires anyway — the browser will not let us read the
 * document to find out, and there is no error to catch. A client-side
 * "did it work?" check is therefore a guess with a timeout, and the failure
 * it guesses wrong about is an empty laptop in front of a prospect.
 *
 * The headers say the answer plainly, so we ask for them before rendering.
 *
 * WHAT IT COSTS
 *
 * One request per project, cached for an hour, with a four-second timeout.
 * A slow or unreachable site therefore delays the page by at most four
 * seconds once an hour, and falls back rather than failing. Anything that
 * throws — DNS, TLS, timeout, a refused connection — is not embeddable, which
 * is both true and the safe way to be wrong.
 */

/** Cheap enough to re-check hourly; slow enough that we never block a page. */
const REVALIDATE_SECONDS = 3600;
const TIMEOUT_MS = 4000;

/**
 * Reads a CSP header and decides whether it forbids us specifically.
 *
 * Only `frame-ancestors` matters here. Absent, the directive imposes nothing
 * and other directives are the embedded page's own business. Present, it is
 * an allow-list: `'none'` refuses everyone, and anything that does not name
 * us or `*` refuses us. We do not attempt to match host patterns beyond the
 * obvious — a wrong "yes" is a blank screen, so an unrecognised value is
 * treated as a refusal.
 */
function cspForbidsFraming(csp: string | null, origin: string): boolean {
  if (!csp) return false;
  const directive = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("frame-ancestors"));
  if (!directive) return false;

  const values = directive.split(/\s+/).slice(1).map((v) => v.toLowerCase());
  if (!values.length) return true;
  if (values.includes("'none'")) return true;
  if (values.includes("*")) return false;
  return !values.some((value) => value.includes(origin.replace(/^https?:\/\//, "")));
}

export type EmbedCheck = {
  embeddable: boolean;
  /** Why not, for the dashboard and for anyone debugging a blank frame. */
  reason: string | null;
};

export async function checkEmbeddable(
  url: string,
  origin: string,
): Promise<EmbedCheck> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { embeddable: false, reason: "not a valid URL" };
  }
  // A page served over http cannot be framed by an https page at all: the
  // browser blocks it as mixed content, silently, before any header matters.
  if (parsed.protocol !== "https:") {
    return { embeddable: false, reason: "not served over https" };
  }

  try {
    const response = await fetch(parsed.toString(), {
      // GET, not HEAD: plenty of hosts answer HEAD with 405 or omit the very
      // security headers this exists to read.
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (!response.ok) {
      return { embeddable: false, reason: `responded ${response.status}` };
    }

    const xfo = response.headers.get("x-frame-options")?.toLowerCase() ?? "";
    if (xfo.includes("deny")) {
      return { embeddable: false, reason: "X-Frame-Options: DENY" };
    }
    if (xfo.includes("sameorigin")) {
      return { embeddable: false, reason: "X-Frame-Options: SAMEORIGIN" };
    }
    if (cspForbidsFraming(response.headers.get("content-security-policy"), origin)) {
      return { embeddable: false, reason: "CSP frame-ancestors excludes us" };
    }
    return { embeddable: true, reason: null };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return {
      embeddable: false,
      reason: message.includes("timeout") || message.includes("abort")
        ? `did not answer within ${TIMEOUT_MS}ms`
        : `unreachable: ${message.slice(0, 60)}`,
    };
  }
}
