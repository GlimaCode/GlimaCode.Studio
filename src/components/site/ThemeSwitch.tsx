"use client";

import { useSyncExternalStore } from "react";
import {
  THEME_STORAGE_KEY,
  isThemeChoice,
  type ThemeChoice,
} from "@/lib/theme";

/**
 * Theme control, beside the language control.
 *
 * Cycles system → light → dark → system. Three states rather than two,
 * because "follow the system" is the default and someone who tries the
 * control should be able to get back to it. A two-state switch quietly turns
 * every curious click into a permanent override.
 *
 * The stored choice is an external store — it lives in localStorage, another
 * tab can change it, and the operating system can change what "system" means
 * while the page is open. useSyncExternalStore is the shape React provides
 * for exactly that, and it also gives a defined server snapshot, so the
 * button hydrates without guessing.
 */

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // Another tab writing the key, and the system preference changing under a
  // visitor who has not overridden it. Both change what this button shows.
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", onChange);
  media.addEventListener("change", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
    media.removeEventListener("change", onChange);
  };
}

function getSnapshot(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(stored) ? stored : "system";
  } catch {
    // Storage throws in some privacy modes. Following the system is the
    // honest answer when we cannot know otherwise.
    return "system";
  }
}

/** The server cannot know the choice; "system" is the default it renders. */
const getServerSnapshot = (): ThemeChoice => "system";

const ORDER: ThemeChoice[] = ["system", "light", "dark"];

function apply(next: ThemeChoice) {
  try {
    if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // The page still changes for this visit; only persistence is lost.
  }
  const resolved =
    next === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : next;
  document.documentElement.setAttribute("data-theme", resolved);
  emit();
}

export function ThemeSwitch({
  labels,
}: {
  labels: { system: string; light: string; dark: string; label: string };
}) {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];

  return (
    <button
      type="button"
      className="theme-switch"
      onClick={() => apply(next)}
      aria-label={`${labels.label}: ${labels[choice]}`}
      title={labels[choice]}
      data-choice={choice}
    >
      {/* One glyph per state, all at the same optical weight and box, so the
          control does not resize as it cycles and nothing beside it moves. */}
      <span aria-hidden="true" className="theme-switch-icon">
        {choice === "light" ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
          </svg>
        ) : choice === "dark" ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2.8" y="4.2" width="18.4" height="12.6" rx="2" />
            <path d="M8.5 20.4h7" />
          </svg>
        )}
      </span>
    </button>
  );
}
