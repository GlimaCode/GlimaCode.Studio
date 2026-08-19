import type { CSSProperties } from "react";
import type { Dictionary } from "@/i18n";

const STEP_KEYS = ["analyze", "kickoff", "build", "handoff"] as const;

export function Process({ t }: { t: Dictionary }) {
  return (
    <section id="process">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="sec-coord" dir="ltr">
            SEC 03 / GRID 48
          </span>
          <p className="sec-label">{t.process.label}</p>
          <h2>{t.process.heading}</h2>
        </div>
        <div className="process">
          {STEP_KEYS.map((key, index) => {
            const step = t.process.steps[key];
            return (
              <div
                className="step reveal"
                key={key}
                style={index ? ({ "--i": index } as CSSProperties) : undefined}
              >
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
