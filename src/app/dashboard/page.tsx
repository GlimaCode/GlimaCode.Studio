import Link from "next/link";
import { currentUser, currentTeamMember } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import { listRequests, type RequestListItem } from "@/lib/data/admin";
import { SignInForm } from "@/components/dashboard/SignInForm";

export const dynamic = "force-dynamic";

function when(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/**
 * Delivery state, shown on the list rather than hidden in the record.
 *
 * "No record" and "failed" are rendered the same way on purpose. A route
 * that died before it could log anything looks identical to one that never
 * ran, and both mean the same thing operationally: nobody was told.
 */
function Delivery({ request }: { request: RequestListItem }) {
  if (request.delivered) return null;
  return (
    <span
      className="req-flag"
      title={request.deliveryError ?? "No delivery was ever recorded."}
    >
      not notified
    </span>
  );
}

function RequestRow({ request }: { request: RequestListItem }) {
  return (
    <Link className="req-item req-link" href={`/dashboard/requests/${request.ticketId}`}>
      <div className="req-row">
        <span className="rid" dir="ltr">
          {request.ticketId}
        </span>
        {/* A visitor's own words. Direction is decided per value, not by the
            surrounding English interface. */}
        <span className="rname" dir="auto">
          {request.name}
          {request.company ? ` · ${request.company}` : ""}
        </span>
        <span className="rtype">
          {request.projectType} · {request.budget}
        </span>
        <span className="right">
          {request.locale === "fa" ? (
            <span className="req-locale" title="Written in Persian">
              FA
            </span>
          ) : null}
          <Delivery request={request} />
          <span className={`req-badge s-${request.status.toLowerCase()}`}>
            {request.status}
          </span>
          <span className="req-when">{when(request.createdAt)}</span>
        </span>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) return <SignInForm />;

  const member = await currentTeamMember();
  if (!member) {
    return (
      <main className="signin-wrap" id="main">
        <div className="order-card signin-card">
          <div className="order-head">
            <h1>Not a team account</h1>
          </div>
          <p className="sec-desc" style={{ marginBottom: "18px" }}>
            You are signed in as {user.email}, but that account is not on the
            team roster, so there is nothing here for it. Membership is granted
            in SQL, not through this page.
          </p>
          <form action={signOut}>
            <button className="btn btn-ghost btn-sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </main>
    );
  }

  const requests = await listRequests();
  const undelivered = requests.filter((r) => !r.delivered).length;

  return (
    <>
      <div className="dash-top">
        <div className="dash-top-inner">
          <span className="dash-title">
            &lt;<b>GlimaCode</b>/&gt; — team dashboard
          </span>
          <div className="tabs" role="navigation" aria-label="Dashboard sections">
            <span className="tab active" aria-current="page">
              Requests
            </span>
            <Link className="tab" href="/dashboard/portfolio">
              Portfolio
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
        <h1 className="dash-h1">Requests</h1>
        {undelivered ? (
          <div className="dash-banner dash-banner-warn">
            {undelivered} request{undelivered === 1 ? "" : "s"} with no recorded
            delivery. Nobody was emailed about {undelivered === 1 ? "it" : "them"}
            — they are only here.
          </div>
        ) : null}

        {requests.length ? (
          <div>
            {requests.map((request) => (
              <RequestRow request={request} key={request.ticketId} />
            ))}
          </div>
        ) : (
          <div className="empty">No requests yet.</div>
        )}
      </main>
    </>
  );
}
