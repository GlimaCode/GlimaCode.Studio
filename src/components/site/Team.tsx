import type { CSSProperties } from "react";

const MEMBERS = [
  {
    initial: "A",
    name: "Ali Ahmadi",
    role: "Full-stack developer · Client lead",
    body: "Developer and project coordinator with daily experience building work-management software used on real factory floors. Handles scoping, communication, and full-stack delivery.",
    chips: ["React", "Supabase", "PostgreSQL", "EN/DE/FA"],
    alt: false,
  },
  {
    initial: "M",
    name: "Mostafa Taghipour",
    role: "Full-stack developer · Delivery lead",
    body: "Developer focused on architecture, code quality, and shipping — the second pair of eyes that reviews every deliverable before it reaches you.",
    chips: ["React", "TypeScript", "Node.js", "CI/CD"],
    alt: true,
  },
];

export function Team() {
  return (
    <section id="team">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="sec-coord">SEC 04 / GRID 48</span>
          <p className="sec-label">Team</p>
          <h2>Two developers. Four eyes on everything.</h2>
        </div>
        <div className="team">
          {MEMBERS.map((member, index) => (
            <div
              className={`member${member.alt ? " alt" : ""} reveal`}
              key={member.name}
              style={index ? ({ "--i": index } as CSSProperties) : undefined}
            >
              <div className="avatar" aria-hidden="true">
                {member.initial}
              </div>
              <h3>{member.name}</h3>
              <span className="role">{member.role}</span>
              <p>{member.body}</p>
              <div className="chips">
                {member.chips.map((chip) => (
                  <span className="chip" key={chip}>
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
