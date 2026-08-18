import type { CSSProperties } from "react";

const STEPS = [
  {
    title: "Analyze",
    body: "We review your brief against our capacity and skills — honestly. If we're not the right fit, we'll say so within 24 hours.",
  },
  {
    title: "Kickoff",
    body: "Scope, timeline, and price get fixed in writing before any code. You'll know exactly what's included — and what isn't.",
  },
  {
    title: "Build in stages",
    body: "Work ships in reviewable milestones with short screen-recorded demos, so you see progress instead of waiting for a big reveal.",
  },
  {
    title: "Review & handoff",
    body: "Every deliverable is checked by the second developer before you see it. Then: clean code, docs, and deployment — yours.",
  },
];

export function Process() {
  return (
    <section id="process">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="sec-coord">SEC 03 / GRID 48</span>
          <p className="sec-label">Process</p>
          <h2>How a project moves across our board</h2>
        </div>
        <div className="process">
          {STEPS.map((step, index) => (
            <div
              className="step reveal"
              key={step.title}
              style={index ? ({ "--i": index } as CSSProperties) : undefined}
            >
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
