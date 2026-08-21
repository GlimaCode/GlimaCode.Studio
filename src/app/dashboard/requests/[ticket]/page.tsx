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
      <div className="dash-top">
        <div className="dash-top-inner">
          <span className="dash-title">
            &lt;<b>GlimaCode</b>/&gt; — request
          </span>
          <div className="tabs">
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

      <div className="dash-body">
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
                  <a href={`mailto:${request.email}`}>{request.email}</a>
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

            <a
              className="btn btn-primary btn-sm"
              href={`mailto:${request.email}?subject=${encodeURIComponent(`Re: ${request.ticketId}`)}`}
            >
              Reply by email
            </a>
          </aside>
        </div>
      </div>
    </>
  );
}
