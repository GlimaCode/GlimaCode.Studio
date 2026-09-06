/**
 * Can a visitor actually open this link?
 *
 * Used for every outbound URL the public site offers — repository buttons and
 * live-site buttons alike. The evidence below is about GitHub because that is
 * where the defect was found, and the rule it produced is not GitHub-specific:
 * offering a link that answers 404 is worse than offering none.
 *
 * WHY THIS EXISTS
 *
 * Tier 3 of the showcase is a GitHub card that links to the repository, and
 * the client-side `onError` on that image is not the guard it looks like.
 * Measured, on 2026-09-06:
 *
 *   opengraph.githubassets.com/1/<org>/<private repo>   200, 506,737 bytes
 *   opengraph.githubassets.com/1/<org>/<missing repo>   200, 506,737 bytes
 *   opengraph.githubassets.com/1/<org>/<public repo>    200,  42,219 bytes
 *
 * A private repository and a repository that does not exist both return the
 * same generic placeholder, with 200. `onError` never fires, so the laptop
 * shows a GitHub logo and the visitor who clicks it gets a 404. That is the
 * exact outcome the tier-3 comment in Showcase.tsx calls a worse advertisement
 * than an honest sentence, arriving through the one path the fallback cannot
 * see.
 *
 * So the repository page itself is asked, on the server, before it is offered.
 *
 * WHAT COUNTS AS A NO
 *
 * A 404, and nothing else. Measured against github.com on 2026-09-06:
 *
 *   private repository            404
 *   repository does not exist     404
 *   organisation does not exist   404
 *   public repository             200
 *   renamed repository            301 -> 200 at the new name
 *
 * GitHub answers 404 for a private repository and for one that never existed,
 * deliberately and identically — it will not confirm that a private repository
 * is there. So 404 is the only status that is a statement about the
 * REPOSITORY. A 403 would be a statement about US — an abuse block on a cloud
 * egress IP, say — and treating it as "the repository is gone" would delete
 * every repository-only project from the portfolio at once, from a fact about
 * the requester.
 *
 * Everything else keeps the project: a timeout, a DNS failure, a 500, a 429.
 * That is ignorance about the repository, and ignorance must not remove work
 * from the site — a tier-3 project has nothing to fall back to, so a wrong
 * "no" removes it entirely.
 *
 * This is the opposite asymmetry to embed.ts, deliberately. There, anything
 * that throws is not embeddable, because a wrong "yes" is a blank laptop in
 * front of a prospect and the fallback below it is perfectly good. Here the
 * fallback is nothing at all, so the failure modes point the other way.
 *
 * Redirects are followed, which is what makes a renamed repository keep
 * working instead of vanishing the day somebody renames it.
 *
 * A KEPT ANSWER SAYS WHY IT WAS KEPT
 *
 * `openable: true` is returned for "GitHub said 200" and for "GitHub rate
 * limited us and we are giving it the benefit of the doubt", and those are not
 * the same state. github.com rate-limits anonymous HTML — measured, 429 with
 * `retry-after: 120` after about 110 requests from one address in half a
 * minute — and a build egressing from a shared cloud address can hit it. If
 * both cases returned the same empty reason, a build where every check was
 * refused would be indistinguishable from a healthy one, and the fallback
 * would be silently load-bearing. So `reason` is null only for a real 200.
 */

/** Same envelope as embed.ts: cheap to re-check hourly, never blocking a page. */
const REVALIDATE_SECONDS = 3600;
const TIMEOUT_MS = 4000;

export type LinkCheck = {
  /** False only when the host said the page is not there. */
  openable: boolean;
  /**
   * Null only for a clean 200. Otherwise why the answer is what it is —
   * including for a kept answer, so "we were rate limited" is legible.
   */
  reason: string | null;
};

export async function checkLinkOpenable(url: string): Promise<LinkCheck> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { openable: false, reason: "not a valid URL" };
  }
  // http as well as https, and nothing else.
  //
  // Not the mixed-content rule from embed.ts — this URL becomes an href, not
  // an iframe, and a plain http link opens perfectly well. The restriction is
  // about what else can appear in an href: `javascript:` and `data:` are URLs
  // that `new URL()` parses happily and that execute when clicked. The value
  // comes from a database row, so an allow-list is the right shape even though
  // only the team can write that row today.
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { openable: false, reason: `refused scheme ${parsed.protocol}` };
  }

  try {
    const response = await fetch(parsed.toString(), {
      // HEAD, not GET.
      //
      // embed.ts must use GET because it reads security headers that hosts
      // omit from a HEAD response. This function reads one thing — the status.
      // A GET of a repository page is 267–358 KB of HTML (measured, the five
      // states above) that is then held and persisted in the Data Cache, per
      // project, per build, and it spends the four-second budget on the body
      // rather than on the answer.
      //
      // HEAD was measured against all five states and returned the identical
      // status to GET in every one, including the 301 that a renamed
      // repository redirects through. That is the only property relied on
      // here, and if it ever stops holding the failure mode is the safe one:
      // everything other than 404 keeps the project.
      method: "HEAD",
      redirect: "follow",
      // Ask for the page a visitor would get, not whatever a host decides to
      // content-negotiate for a client that states no preference.
      headers: { accept: "text/html" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (response.status === 404) {
      return { openable: false, reason: "responded 404" };
    }
    if (response.status === 200) {
      return { openable: true, reason: null };
    }
    // Kept, but say so. See A KEPT ANSWER SAYS WHY IT WAS KEPT above.
    return { openable: true, reason: `kept despite ${response.status}` };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return {
      openable: true,
      reason: `kept despite ${message.slice(0, 60)}`,
    };
  }
}
