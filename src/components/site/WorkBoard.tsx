import type { CSSProperties } from "react";
import { boardColumns, boardProjects, type BoardProject } from "@/content/projects";

function statusLabel(project: BoardProject): string {
  if (project.shipped) return "Status: shipped";
  return project.column === "in_progress" ? "Status: in progress" : "Status: planned";
}

function Ticket({ project }: { project: BoardProject }) {
  return (
    <article className="ticket">
      <span
        className={`status ${project.shipped ? "done" : "wip"}`}
        aria-label={statusLabel(project)}
      ></span>
      <span className="ticket-id">{project.ref}</span>
      <h3>{project.title}</h3>
      <p>{project.description}</p>
      <div className="chips">
        {project.tech.map((tech) => (
          <span className="chip" key={tech}>
            {tech}
          </span>
        ))}
      </div>
      {project.cta ? (
        <div style={{ marginTop: "16px" }}>
          <a className="btn btn-primary btn-sm" href={project.cta.href}>
            {project.cta.label}
          </a>
        </div>
      ) : null}
    </article>
  );
}

export function WorkBoard() {
  return (
    <section id="work">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="sec-coord">SEC 01 / GRID 48</span>
          <p className="sec-label">Selected work</p>
          <h2>Projects, the way we run them: a board.</h2>
          <p className="sec-desc">
            We build work-management software for a living — so here&apos;s our
            portfolio in its native format.
          </p>
        </div>
        <div className="board">
          {boardColumns.map((column, index) => {
            const items = boardProjects.filter((p) => p.column === column.key);
            return (
              <div
                className="column reveal stagger"
                key={column.key}
                style={index ? ({ "--i": index } as CSSProperties) : undefined}
              >
                <div className="col-head">
                  {column.label}{" "}
                  <span className="count" data-count={items.length}>
                    0
                  </span>
                </div>
                {items.map((project) => (
                  <Ticket project={project} key={project.ref} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
