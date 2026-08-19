import type { CSSProperties } from "react";
import type { Dictionary, Locale } from "@/i18n";
import { formatNumber } from "@/i18n";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import {
  boardColumns,
  boardProjects,
  type BoardProject,
} from "@/content/projects";

function statusLabel(project: BoardProject, t: Dictionary): string {
  if (project.shipped) return t.work.status.shipped;
  return project.column === "in_progress"
    ? t.work.status.inProgress
    : t.work.status.planned;
}

function Ticket({ project, t }: { project: BoardProject; t: Dictionary }) {
  const copy = t.projects[project.ref];

  return (
    <article className="ticket">
      <span
        className={`status ${project.shipped ? "done" : "wip"}`}
        aria-label={statusLabel(project, t)}
      ></span>
      {/* Reference codes are identifiers, not prose. */}
      <span className="ticket-id" dir="ltr">
        {project.ref}
      </span>
      <h3>{copy.title}</h3>
      <p>{copy.description}</p>
      <div className="chips" lang="en" dir="ltr">
        {project.tech.map((tech) => (
          <span className="chip" key={tech}>
            {tech}
          </span>
        ))}
      </div>
      {project.ctaHref ? (
        <div style={{ marginTop: "16px" }}>
          <a className="btn btn-primary btn-sm" href={project.ctaHref}>
            {t.work.claimSlot}
          </a>
        </div>
      ) : null}
    </article>
  );
}

export function WorkBoard({ t, locale }: { t: Dictionary; locale: Locale }) {
  return (
    <section id="work">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="sec-coord" dir="ltr">
            SEC 01 / GRID 48
          </span>
          <p className="sec-label">{t.work.label}</p>
          <h2>{t.work.heading}</h2>
          <p className="sec-desc">{t.work.desc}</p>
          {/* Appears with the portfolio routes, not before. */}
          {siteConfig.features.portfolio ? (
            <p style={{ marginTop: "14px" }}>
              <Link className="btn btn-ghost btn-sm" href={`/${locale}/work`}>
                {t.portfolio.seeAll}
              </Link>
            </p>
          ) : null}
        </div>
        <div className="board">
          {boardColumns.map((column, index) => {
            const items = boardProjects.filter((p) => p.column === column);
            return (
              <div
                className="column reveal stagger"
                key={column}
                style={index ? ({ "--i": index } as CSSProperties) : undefined}
              >
                <div className="col-head">
                  {t.work.columns[column]}{" "}
                  {/* The real figure is rendered here so it survives with
                      scripting unavailable, and formatted for the locale so
                      it does not switch from Latin to Persian digits when
                      the count-up runs. */}
                  <span className="count" data-count={items.length}>
                    {formatNumber(items.length, locale)}
                  </span>
                </div>
                {items.map((project) => (
                  <Ticket project={project} t={t} key={project.ref} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
