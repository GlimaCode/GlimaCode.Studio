import Link from "next/link";
import { currentUser, currentTeamMember } from "@/lib/auth/session";
import { ThemeSwitch } from "@/components/site/ThemeSwitch";
import { signOut } from "@/lib/auth/actions";
import { SignInForm } from "@/components/dashboard/SignInForm";
import { Board } from "@/components/dashboard/Board";
import { linkableRequests, readBoard } from "@/lib/data/board";

export const dynamic = "force-dynamic";

/**
 * The team board.
 *
 * Behind the same two gates as the rest of the dashboard, in the same order:
 * a session, then a row in team_members. Neither is the real control — the
 * policies in migration 012 are, and they refuse a non-member even if this
 * page were served by mistake. What these two do is make the refusal legible
 * instead of an empty board.
 */
export default async function BoardPage() {
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
            team roster. The board is ours, not a client surface.
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

  // The tables arrive in a migration that is applied by hand, so this page can
  // exist in a deployment where they do not. Saying which file to run is more
  // use than a stack trace.
  let board = null;
  let requests: { id: string; ticketId: string; name: string }[] = [];
  let missing: string | null = null;
  try {
    [board, requests] = await Promise.all([readBoard(), linkableRequests()]);
  } catch (e) {
    missing = e instanceof Error ? e.message : String(e);
  }

  return (
    <>
      <div className="dash-top" role="banner">
        <div className="dash-top-inner">
          <span className="dash-title">
            &lt;<b>GlimaCode</b>/&gt; — team dashboard
          </span>
          <div className="tabs" role="navigation" aria-label="Dashboard sections">
            <Link className="tab" href="/dashboard">
              Requests
            </Link>
            <Link className="tab" href="/dashboard/portfolio">
              Portfolio
            </Link>
            <span className="tab active" aria-current="page">
              Board
            </span>
          </div>
          <ThemeSwitch
            labels={{
              label: "Theme",
              system: "Following your system",
              light: "Light",
              dark: "Dark",
            }}
          />
          <form action={signOut}>
            <button className="btn btn-ghost btn-sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <main className="dash-body dash-body-wide" id="main">
        <h1 className="dash-h1">Board</h1>
        {board ? (
          <Board initial={board} me={member.userId} requests={requests} />
        ) : (
          <div className="dash-banner dash-banner-warn">
            <p>
              The board tables are not in this database yet. Run{" "}
              <code>db/migrations/012_board.sql</code> in the SQL editor, then
              reload this page.
            </p>
            <p className="kb-detail">{missing}</p>
          </div>
        )}
      </main>
    </>
  );
}
