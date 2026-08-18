import { siteConfig } from "@/config/site";
import { KEYBOARD_ROWS, MINI_KEYS, type KeyDef } from "./keys";

/**
 * Rendered as plain markup on the server. Click handling, key flashing and
 * scroll-spy lighting are attached at runtime by the motion layer, which
 * finds these nodes through their data-key attribute.
 */
function Keycap({ def }: { def: KeyDef }) {
  const className = [
    "key",
    def.width ?? "",
    def.action ? "action" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const label = <span className="cap">{def.brand ? siteConfig.brand : def.cap}</span>;
  const sub = def.sub ? <span className="sub">{def.sub}</span> : null;

  if (!def.action) {
    return (
      <div className={className} aria-hidden="true">
        {label}
        {sub}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={className}
      data-key={def.action}
      aria-label={`Go to ${def.sub || "top"}`}
    >
      {label}
      {sub}
    </button>
  );
}

export function Keyboard() {
  return (
    <div
      className="kbd-board"
      id="kbdBoard"
      role="navigation"
      aria-label="Keyboard navigation"
    >
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div className="kbd-row" key={rowIndex}>
          {row.map((def, keyIndex) => (
            <Keycap def={def} key={`${rowIndex}-${keyIndex}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function KeyboardMini() {
  return (
    <div
      className="kbd-mini fade-up d3"
      id="kbdMini"
      role="navigation"
      aria-label="Section shortcuts"
    >
      {MINI_KEYS.map((def) => (
        <Keycap def={def} key={def.action} />
      ))}
    </div>
  );
}
