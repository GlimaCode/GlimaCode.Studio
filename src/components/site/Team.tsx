import type { CSSProperties } from "react";
import type { Dictionary } from "@/i18n";

/** Names are not translated; roles and bios are. */
const MEMBERS = [
  {
    key: "ali",
    initial: "A",
    name: "Ali Ahmadi",
    alt: false,
    chips: ["React", "Supabase", "PostgreSQL", "EN/DE/FA"],
  },
  {
    key: "mostafa",
    initial: "M",
    name: "Mostafa Taghipour",
    alt: true,
    chips: ["React", "TypeScript", "Node.js", "CI/CD"],
  },
] as const;

export function Team({ t }: { t: Dictionary }) {
  return (
    <section id="team">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="sec-coord" dir="ltr">
            SEC 04 / GRID 48
          </span>
          <p className="sec-label">{t.team.label}</p>
          <h2>{t.team.heading}</h2>
        </div>
        <div className="team">
          {MEMBERS.map((member, index) => {
            const copy = t.team.members[member.key];
            return (
              <div
                className={`member${member.alt ? " alt" : ""} reveal`}
                key={member.key}
                style={index ? ({ "--i": index } as CSSProperties) : undefined}
              >
                <div className="avatar" aria-hidden="true">
                  {member.initial}
                </div>
                <h3>{member.name}</h3>
                <span className="role">{copy.role}</span>
                <p>{copy.body}</p>
                {/* Technology names are not translated. */}
                <div className="chips" lang="en" dir="ltr">
                  {member.chips.map((chip) => (
                    <span className="chip" key={chip}>
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
