import Link from "next/link";
import { notFound } from "next/navigation";
import { currentTeamMember } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";
import { listAllProjects } from "@/lib/data/admin";
import { setProjectPublished, moveProject } from "../actions";

export const dynamic = "force-dynamic";

export default async function PortfolioAdminPage() {
  const member = await currentTeamMember();
  if (!member) notFound();

  const projects = await listAllProjects();

  return (
    <>
      <div className="dash-top">
        <div className="dash-top-inner">
          <span className="dash-title">
            &lt;<b>GlimaCode</b>/&gt; — portfolio
          </span>
          <div className="tabs" role="navigation" aria-label="Dashboard sections">
            <Link className="tab" href="/dashboard">
              Requests
            </Link>
            <span className="tab active" aria-current="page">
              Portfolio
            </span>
          </div>
          <form action={signOut}>
            <button className="btn btn-ghost btn-sm" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <main className="dash-body" id="main">
        <h1 className="dash-h1">Portfolio</h1>
        <div className="dash-banner">
          Content is edited in the database. This page controls what is visible
          and in what order — the two things that should not need a deploy.
        </div>

        {projects.length ? (
          <div>
            {projects.map((project, index) => (
              <div className="req-item" key={project.id}>
                <div className="req-row">
                  <span className="rid" dir="ltr">
                    {project.slug}
                  </span>
                  <span className="rname">{project.titleEn}</span>
                  <span className="rtype">{project.categorySlug}</span>
                  <span className="right">
                    {project.missingPersian ? (
                      <span
                        className="req-flag"
                        title="No Persian prose, so the Persian site falls back to English here."
                      >
                        no Persian
                      </span>
                    ) : null}
                    <span
                      className={`req-badge ${project.published ? "s-won" : "s-lost"}`}
                    >
                      {project.published ? "published" : "hidden"}
                    </span>

                    <form
                      action={async () => {
                        "use server";
                        await moveProject(project.id, -1);
                      }}
                    >
                      <button
                        className="icon-btn"
                        type="submit"
                        title="Move up"
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await moveProject(project.id, 1);
                      }}
                    >
                      <button
                        className="icon-btn"
                        type="submit"
                        title="Move down"
                        disabled={index === projects.length - 1}
                      >
                        ↓
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await setProjectPublished(project.id, !project.published);
                      }}
                    >
                      <button className="btn btn-ghost btn-sm" type="submit">
                        {project.published ? "Unpublish" : "Publish"}
                      </button>
                    </form>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No portfolio entries.</div>
        )}
      </main>
    </>
  );
}
