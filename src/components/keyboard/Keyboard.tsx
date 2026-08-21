import { siteConfig } from "@/config/site";
import type { Dictionary, Locale } from "@/i18n";
import { KEYBOARD_ROWS, MINI_KEYS, type KeyDef } from "./keys";

/**
 * Rendered as plain markup on the server. Click handling, key flashing and
 * scroll-spy lighting are attached at runtime by the motion layer, which
 * finds these nodes through their data-key attribute.
 *
 * The board itself never mirrors. A mirrored QWERTY is not a Persian
 * keyboard, it is a broken one — and the letters on the action keys are the
 * physical keys a visitor actually presses, so they stay Latin in both
 * locales. Only the sub-labels translate.
 */
function Keycap({ def, t }: { def: KeyDef; t: Dictionary }) {
  const className = ["key", def.width ?? "", def.action ? "action" : ""]
    .filter(Boolean)
    .join(" ");

  const sublabel = def.sub ? t.keyboard.subs[def.sub] : null;

  const label = (
    <span className="cap">{def.brand ? siteConfig.brand : def.cap}</span>
  );
  const sub = sublabel ? <span className="sub">{sublabel}</span> : null;

  /**
   * ACCESSIBLE NAME
   *
   * These keys used to carry aria-label="Go to work" over a visible "W work".
   * WCAG 2.5.3 (Label in Name) asks that the accessible name contain the
   * text a sighted user can see, and that pairing fails it: someone driving
   * the page by voice reads "W work" off the screen, says it, and nothing
   * happens — the name they needed was a phrase that appears nowhere.
   *
   * Hiding the letter from assistive technology does not fix it. aria-hidden
   * removes an element from the accessibility tree, not from the screen, and
   * the rule is about what is on the screen. Verified the hard way: the audit
   * still failed with the letter hidden.
   *
   * So a key with a sub-label is named by its own contents. Visible text and
   * accessible name become the same string by construction, which is the only
   * version of this that cannot drift apart later. A screen reader announces
   * "W work, button" — the letter is genuinely part of the label here, since
   * pressing W is what the key is advertising.
   *
   * A key with no sub-label — esc, and the wordmark — has the cap as its only
   * visible text, so it takes a name that begins with exactly that.
   */
  const capText = def.brand ? siteConfig.brand : def.cap;

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
      aria-label={
        sublabel ? undefined : `${capText} ${t.keyboard.goTo} ${t.keyboard.top}`
      }
    >
      {label}
      {sub}
    </button>
  );
}

export function Keyboard({ t }: { t: Dictionary; locale: Locale }) {
  return (
    <div
      className="kbd-board"
      id="kbdBoard"
      role="navigation"
      aria-label={t.keyboard.navLabel}
    >
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div className="kbd-row" key={rowIndex}>
          {row.map((def, keyIndex) => (
            <Keycap def={def} t={t} key={`${rowIndex}-${keyIndex}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The tap bar keeps board order rather than reversing under a right-to-left
 * layout: it stands in for the keyboard, so it follows the keyboard's rule.
 */
export function KeyboardMini({ t }: { t: Dictionary }) {
  return (
    <div
      className="kbd-mini fade-up d3"
      id="kbdMini"
      role="navigation"
      aria-label={t.keyboard.shortcutsLabel}
      dir="ltr"
    >
      {MINI_KEYS.map((def) => (
        <Keycap def={def} t={t} key={def.action} />
      ))}
    </div>
  );
}
