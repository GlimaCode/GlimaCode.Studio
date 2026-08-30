"use client";

import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Dictionary, Locale } from "@/i18n";

/**
 * The device showcase.
 *
 * A laptop that starts closed. Choosing a project opens the lid and the
 * screenshot is on the screen. On a phone the laptop is the wrong object —
 * a phone frame takes its place and the shot fills it edge to edge.
 *
 * WHY THE LID STARTS CLOSED
 *
 * It was asked for, and it earns the extra click: a closed laptop reads as
 * "there is something in here", and the opening is the moment the work
 * appears. The cost is real though — one more action between a visitor and
 * the thing they came to see — so the project list is never hidden behind the
 * lid, and a link that names a project arrives with it already open.
 *
 * WHY THE FRAME IS CSS AND NOT AN IMAGE
 *
 * A device mockup as a PNG is a second asset to ship in two themes and two
 * resolutions, and it cannot take the page's own colours. Built from
 * elements it costs nothing to render, follows the theme tokens, and the
 * screen is a real box that a real image sits inside.
 */

export type ShowcaseProject = {
  slug: string;
  title: string;
  summary: string;
  categoryLabel: string;
  /** Cover first, then the gallery. Empty means nothing to show. */
  shots: string[];
};

/**
 * Which project is open lives in the URL hash, not in component state.
 *
 * It makes the open lid shareable and the back button work, and it removes
 * the effect that would otherwise be needed to read the hash after mount —
 * a render-time read of `location` cannot be done on the server, and setting
 * state from an effect is the pattern useSyncExternalStore exists to replace.
 */
const hashListeners = new Set<() => void>();

function subscribeHash(onChange: () => void) {
  hashListeners.add(onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    hashListeners.delete(onChange);
    window.removeEventListener("hashchange", onChange);
  };
}

const readHash = () => window.location.hash.replace("#", "");
/** The server has no hash, so nothing is open in the first paint. */
const noHash = () => "";

function writeHash(slug: string | null) {
  const url = slug
    ? `#${slug}`
    : window.location.pathname + window.location.search;
  // replaceState rather than assigning location.hash: this should not add a
  // history entry for every project someone glances at, and it must not jump
  // the page to an element that happens to share the id.
  window.history.replaceState(null, "", url);
  hashListeners.forEach((l) => l());
}

export function Showcase({
  projects,
  locale,
  t,
}: {
  projects: ShowcaseProject[];
  locale: Locale;
  t: Dictionary;
}) {
  const hash = useSyncExternalStore(subscribeHash, readHash, noHash);
  const activeSlug = projects.some((p) => p.slug === hash) ? hash : null;
  const [shotIndex, setShotIndex] = useState(0);
  const screenId = useId();

  const active = projects.find((p) => p.slug === activeSlug) ?? null;
  const isOpen = active !== null;
  const shots = active?.shots ?? [];
  const shot = shots[Math.min(shotIndex, Math.max(shots.length - 1, 0))];

  function choose(slug: string) {
    // Clicking the open project again closes the lid, so the control is a
    // toggle rather than a one-way door.
    writeHash(slug === activeSlug ? null : slug);
    setShotIndex(0);
  }

  if (!projects.length) {
    return <div className="empty">{t.showcase.empty}</div>;
  }

  return (
    <div className="sc">
      {/* The chooser. Always visible: the lid is a reveal, not a gate. */}
      <div className="sc-picker">
        <p className="sc-picker-label" id={`${screenId}-label`}>
          {t.showcase.pick}
        </p>
        <ul className="sc-list" aria-labelledby={`${screenId}-label`}>
          {projects.map((project) => {
            const selected = project.slug === activeSlug;
            return (
              <li key={project.slug}>
                <button
                  type="button"
                  className={`sc-item${selected ? " active" : ""}`}
                  onClick={() => choose(project.slug)}
                  aria-pressed={selected}
                  aria-controls={screenId}
                >
                  <span className="sc-item-cat">{project.categoryLabel}</span>
                  {/* Product names stay in Latin script in both locales. */}
                  <span className="sc-item-title" lang="en" dir="ltr">
                    {project.title}
                  </span>
                  <span className="sc-item-hint">
                    {selected ? t.showcase.close : t.showcase.open}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* The device. aria-hidden on the shell itself: the frame is scenery,
          and everything a screen reader needs is in the chooser and in the
          live region below. */}
      <div className={`sc-stage${isOpen ? " open" : ""}`}>
        <div className="sc-laptop" data-open={isOpen}>
          <div className="sc-rig">
          <div className="sc-lid">
            <div className="sc-bezel">
              <div className="sc-screen" id={screenId} aria-live="polite">
                {shot ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={shot}
                    alt={`${t.showcase.shotOf} ${active?.title}`}
                    className="sc-shot"
                    loading="lazy"
                    decoding="async"
                  />
                ) : isOpen ? (
                  <div className="sc-screen-empty">{t.showcase.empty}</div>
                ) : null}
              </div>
              <span className="sc-camera" aria-hidden="true" />
            </div>
            {/* The back of the lid, seen while it is closed. */}
            <div className="sc-lid-back" aria-hidden="true">
              <span className="sc-mark">&lt;/&gt;</span>
            </div>
          </div>
          <div className="sc-base" aria-hidden="true">
            <span className="sc-hinge" />
            <span className="sc-notch" />
          </div>
          </div>
        </div>

        {shots.length > 1 ? (
          <div className="sc-shots">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShotIndex((i) => Math.max(0, i - 1))}
              disabled={shotIndex === 0}
            >
              {t.showcase.prev}
            </button>
            <span className="sc-shots-count" dir="ltr">
              {shotIndex + 1} / {shots.length}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() =>
                setShotIndex((i) => Math.min(shots.length - 1, i + 1))
              }
              disabled={shotIndex === shots.length - 1}
            >
              {t.showcase.next}
            </button>
          </div>
        ) : null}

        {active ? (
          <div className="sc-meta">
            <p className="sc-meta-title">
              <span className="sc-meta-eyebrow">{t.showcase.nowShowing}</span>
              <span lang="en" dir="ltr">
                {active.title}
              </span>
            </p>
            <p className="sc-meta-summary">{active.summary}</p>
            <div className="sc-meta-actions">
              <Link
                className="btn btn-ghost btn-sm"
                href={`/${locale}/work/${active.slug}`}
              >
                {t.showcase.readCase}
              </Link>
              <Link
                className="btn btn-primary btn-sm"
                href={`/${locale}/work/${active.slug}#start`}
              >
                {t.showcase.startLike}
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
