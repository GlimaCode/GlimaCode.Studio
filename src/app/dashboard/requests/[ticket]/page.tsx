import Link from "next/link";
import { notFound } from "next/navigation";
import { currentTeamMember } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import { getRequest, REQUEST_STATUSES } from "@/lib/data/admin";
import { setRequestStatus, saveRequestNotes } from "../../actions";

export const dynamic = "force-dynamic";

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ ticket: string }>;
}) {
  const member = await currentTeamMember();
  if (!member) notFound();

  const { ticket } = await params;
  const request = await getRequest(ticket);
  if (!request) notFound();

  // Percent-encoded, not URLSearchParams: "+" is not a space in a mailto
  // query, so a form encoder puts a literal plus in the subject line.
  const replyHref = `mailto:${request.email}?subject=${encodeURIComponent(
    `Re: ${request.ticketId}`,
  )}`;

  async function updateStatus(formData: FormData) {
    "use server";
    await setRequestStatus(ticket, String(formData.get("status") ?? ""));
  }

  async function updateNotes(formData: FormData) {
    "use server";
    await saveRequestNotes(ticket, String(formData.get("notes") ?? ""));
  }

  return (
    <>
      {/* A banner landmark, but a div carrying the role rather than a real
          header element — the same reason the portfolio filter is a div
          with a navigation role. The ported stylesheet styles `header` by
          element with `padding:150px 0 84px`, and .dash-top sets no padding
          of its own, so the real element here became a 297px sticky bar with
          a backdrop blur, washing out the top third of every dashboard page.
          role="banner" gives the landmark with none of the layout.
          scripts/verify-dashboard-shell.mjs fails the build if this comes
          back as an element. */}
      <div className="dash-top" role="banner">
        <div className="dash-top-inner">
          <span className="dash-title">
            &lt;<b>GlimaCode</b>/&gt; — request
          </span>
          <div className="tabs" role="navigation" aria-label="Back to the request list">
            <Link className="tab" href="/dashboard">
              ← All requests
            </Link>
          </div>
          <form action={signOut}>
            <button className="btn btn-ghost btn-sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <main className="dash-body" id="main">
        {/* The reference is the page's identity, so it is the heading. */}
        <h1 className="dash-h1" dir="ltr">
          {request.ticketId}
        </h1>
        {!request.delivered ? (
          <div className="dash-banner dash-banner-warn">
            No successful delivery is recorded for this request.{" "}
            {request.deliveryError
              ? `Last error: ${request.deliveryError}`
              : "Nothing was ever logged, so assume nobody was emailed."}
          </div>
        ) : null}

        <div className="req-detail-grid">
          <div>
            <h2 className="req-detail-name" dir="auto">
              {request.name}
            </h2>
            <p className="req-detail-meta">
              <span dir="ltr">{request.ticketId}</span> · {when(request.createdAt)}
              {request.company ? (
                <>
                  {" · "}
                  <span dir="auto">{request.company}</span>
                </>
              ) : null}
            </p>

            <dl className="req-facts">
              <div>
                <dt>Email</dt>
                <dd dir="ltr">
                  {/* Same subject as the Reply button below, so a reply is
                      filed identically whichever path was taken. The address
                      is also the fallback when mailto: does nothing, which on
                      a desktop with no mail handler is often — so it is shown
                      in full rather than behind a "Reply" label. */}
                  <a href={replyHref}>{request.email}</a>
                </dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{request.projectType}</dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>{request.budget}</dd>
              </div>
              <div>
                <dt>Timeline</dt>
                <dd>{request.timeline}</dd>
              </div>
              <div>
                <dt>Reply in</dt>
                <dd>{request.locale === "fa" ? "Persian" : "English"}</dd>
              </div>
              <div>
                <dt>Came from</dt>
                <dd>
                  {request.sourceProjectSlug ? (
                    <Link href={`/en/work/${request.sourceProjectSlug}`}>
                      {request.sourceProjectTitle ?? request.sourceProjectSlug}
                    </Link>
                  ) : (
                    "the form directly"
                  )}
                </dd>
              </div>
            </dl>

            <h3 className="req-section">Brief</h3>
            {/* The visitor's own words, in their own direction and script. */}
            <p
              className="req-brief"
              dir="auto"
              lang={request.locale === "fa" ? "fa" : "en"}
            >
              {request.description}
            </p>

            <h3 className="req-section">Notes</h3>
            <form action={updateNotes} className="req-notes">
              <textarea
                name="notes"
                defaultValue={request.notes ?? ""}
                placeholder="Anything worth remembering before replying."
              />
              <button className="btn btn-ghost btn-sm" type="submit">
                Save notes
              </button>
            </form>
          </div>

          <aside className="req-side">
            <form action={updateStatus} className="req-status-form">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={request.status}>
                {REQUEST_STATUSES.map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary btn-sm" type="submit">
                Update
              </button>
            </form>

            <div className="req-attempts">
              <span className="pf-meta-label">Notification log</span>
              {request.attempts.length ? (
                <ul>
                  {request.attempts.map((attempt, index) => (
                    <li key={index} className={attempt.delivered ? "ok" : "bad"}>
                      <b>{attempt.delivered ? "delivered" : "failed"}</b> via{" "}
                      {attempt.provider}
                      <br />
                      <span className="req-when">{when(attempt.createdAt)}</span>
                      {attempt.error ? (
                        <>
                          <br />
                          <span className="req-attempt-error">{attempt.error}</span>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="req-when">
                  Nothing recorded. Treat as not delivered.
                </p>
              )}
            </div>

            <a className="btn btn-primary btn-sm" href={replyHref}>
              Reply by email
            </a>
          </aside>
        </div>
      </main>
    </>
  );
}
