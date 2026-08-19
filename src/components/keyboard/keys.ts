/**
 * Key definitions for the hero keyboard — the studio's signature element.
 *
 * Action keys navigate to sections; the same map powers the physical
 * keyboard shortcuts and the scroll-spy that keeps the current section's
 * key lit. Everything else on the board is decorative and gets flashed at
 * random while the visitor scrolls.
 */

export type KeyAction = "w" | "s" | "p" | "t" | "enter" | "escape";

export const KEY_MAP: Record<KeyAction, string> = {
  w: "#work",
  s: "#services",
  p: "#process",
  t: "#team",
  enter: "#start",
  escape: "#top",
};

/**
 * Physical key positions for the same actions.
 *
 * `event.key` reports the character produced, not the key pressed. With a
 * Persian input method the physical W key emits "ص", so matching on the
 * character alone silently breaks every shortcut for the visitors the
 * Persian site exists to serve. `event.code` reports position and is
 * independent of the active layout.
 *
 * The handler accepts either: a Dvorak user pressing the key that types "w"
 * matches on the character, and a Persian-layout user pressing the physical
 * W matches on the position.
 */
export const KEY_CODE_MAP: Record<string, KeyAction> = {
  KeyW: "w",
  KeyS: "s",
  KeyP: "p",
  KeyT: "t",
  Enter: "enter",
  NumpadEnter: "enter",
  Escape: "escape",
};

/** Sections observed by the scroll-spy, in document order. */
export const SPY_SECTIONS = ["work", "services", "process", "team", "start"];

/** Sub-label keys, resolved against the dictionary at render time. */
export type KeySubLabel = "work" | "services" | "process" | "team" | "start";

export type KeyDef = {
  /** Legend printed on the keycap. */
  cap: string;
  /** Small label under the legend, and the section name in the aria-label. */
  sub?: KeySubLabel;
  /** Present on the five navigation keys plus escape. */
  action?: KeyAction;
  /** Relative width class from the stylesheet. */
  width?: "w15" | "w2" | "w6";
  /** The spacebar prints the studio name instead of a legend. */
  brand?: boolean;
};

export const KEYBOARD_ROWS: KeyDef[][] = [
  [
    { cap: "esc", action: "escape", width: "w15" },
    { cap: "1" },
    { cap: "2" },
    { cap: "3" },
    { cap: "4" },
    { cap: "5" },
    { cap: "6" },
    { cap: "7" },
    { cap: "8" },
    { cap: "9" },
    { cap: "0" },
  ],
  [
    { cap: "tab", width: "w15" },
    { cap: "Q" },
    { cap: "W", sub: "work", action: "w" },
    { cap: "E" },
    { cap: "R" },
    { cap: "T", sub: "team", action: "t" },
    { cap: "Y" },
    { cap: "U" },
    { cap: "I" },
    { cap: "O" },
    { cap: "P", sub: "process", action: "p" },
  ],
  [
    { cap: "caps", width: "w2" },
    { cap: "A" },
    { cap: "S", sub: "services", action: "s" },
    { cap: "D" },
    { cap: "F" },
    { cap: "G" },
    { cap: "H" },
    { cap: "J" },
    { cap: "K" },
    { cap: "↵", sub: "start", action: "enter", width: "w2" },
  ],
  [
    { cap: "shift", width: "w2" },
    { cap: "Z" },
    { cap: "X" },
    { cap: "C" },
    { cap: "V" },
    { cap: "B" },
    { cap: "N" },
    { cap: "M" },
    { cap: "shift", width: "w2" },
  ],
  [
    { cap: "fn" },
    { cap: "ctrl" },
    { cap: "⌥" },
    { cap: "", action: "escape", width: "w6", brand: true },
    { cap: "⌥" },
    { cap: "ctrl" },
    { cap: "fn" },
  ],
];

/** Touch-sized bar shown instead of the full board below 960px. */
export const MINI_KEYS: KeyDef[] = [
  { cap: "W", sub: "work", action: "w" },
  { cap: "S", sub: "services", action: "s" },
  { cap: "P", sub: "process", action: "p" },
  { cap: "T", sub: "team", action: "t" },
  { cap: "↵", sub: "start", action: "enter" },
];
