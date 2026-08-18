const STACK = [
  "React",
  "TypeScript",
  "Supabase",
  "PostgreSQL",
  "Node.js",
  "Tailwind",
  "Prisma",
  "Socket.io",
  "Vercel",
  "Row-Level Security",
  "CI/CD",
  "REST APIs",
];

/**
 * The track is rendered twice so the CSS marquee loops seamlessly — the
 * prototype achieved this by duplicating innerHTML at runtime.
 */
export function Ticker() {
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track" id="tickerTrack">
        {[...STACK, ...STACK].map((item, i) => (
          <span key={`${item}-${i}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}
