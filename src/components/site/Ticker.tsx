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
 * Technology names are not translated, so the track is marked as Latin and
 * left to right even inside a right-to-left page.
 */
export function Ticker() {
  return (
    <div className="ticker" aria-hidden="true" lang="en" dir="ltr">
      <div className="ticker-track" id="tickerTrack">
        {[...STACK, ...STACK].map((item, i) => (
          <span key={`${item}-${i}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}
