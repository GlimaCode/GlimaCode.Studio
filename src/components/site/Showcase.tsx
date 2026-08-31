"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
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
  /**
   * The deployed page, when there is one AND it permits being framed.
   * Resolved on the server — see lib/data/embed.ts for why the browser
   * cannot be asked. Null means fall back to the screenshots.
   */
  liveUrl: string | null;
  /** Last resort: the repository, shown as a card you can click through. */
  repoUrl: string | null;
};

/**
 * GitHub's own social card for a repository.
 *
 * The obvious reading of "show the GitHub page" is an iframe of it, and that
 * is impossible: github.com sends both `X-Frame-Options: deny` and
 * `frame-ancestors 'none'`. It will never render in a frame, on any site.
 *
 * This is the image GitHub generates for link previews — the repository name,
 * its description, its language and star count, drawn by GitHub. It is a plain
 * PNG, so no framing rule applies, and wrapping it in a link gets the visitor
 * where they were going.
 *
 * It can rate-limit: one of three repositories answered 429 during testing. An
 * image reports its own failure, unlike an iframe, so `onError` falls back to
 * a card of our own rather than a broken picture.
 */
function githubCardImage(repoUrl: string): string | null {
  try {
    const url = new URL(repoUrl);
    if (!url.hostname.endsWith("github.com")) return null;
    const path = url.pathname.replace(/^\/|\/$/g, "");
    if (path.split("/").length !== 2) return null;
    // The leading segment is GitHub's cache key; any value works.
    return `https://opengraph.githubassets.com/1/${path}`;
  } catch {
    return null;
  }
}

/** "GlimaCode/vehicle-catalog", for the fallback card and the link label. */
function repoLabel(repoUrl: string): string {
  try {
    return new URL(repoUrl).pathname.replace(/^\/|\/$/g, "");
  } catch {
    return repoUrl;
  }
}

/**
 * The width the live page is rendered at before being scaled into the screen.
 *
 * An iframe sized to the laptop's ~540px would make the embedded site render
 * its tablet layout, which is not the page anyone means when they say "show
 * me the site". So it is laid out at a desktop width and scaled down, the way
 * a real screen shows a real page.
 *
 * In the phone frame the opposite is true: a phone should show the mobile
 * layout, at close to life size.
 */
const DESKTOP_EMBED_WIDTH = 1280;
const PHONE_EMBED_WIDTH = 390;
/** Below this the frame is a phone, matching the CSS breakpoint. */
const PHONE_MAX = 420;

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
  // Repositories whose GitHub card would not load — rate limited, renamed,
  // made private. Tracked per slug so one failure does not hide the others.
  const [cardFailed, setCardFailed] = useState<string[]>([]);
  const screenId = useId();

  /**
   * The live page is laid out at a fixed width and scaled to fit, so the
   * scale has to follow the screen's real size. A ResizeObserver rather than
   * a breakpoint: the laptop is fluid between its minimum and its max-width,
   * and a scale that is right only at two widths is wrong at every other one.
   */
  const screenRef = useRef<HTMLDivElement | null>(null);
  const [screen, setScreen] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setScreen({
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const embedWidth =
    screen.w > 0 && screen.w < PHONE_MAX ? PHONE_EMBED_WIDTH : DESKTOP_EMBED_WIDTH;
  const embedScale = screen.w > 0 ? screen.w / embedWidth : 0;
  /**
   * Height follows the screen, not a fixed ratio. The laptop is 16:10 and the
   * phone is nearly 9:19, so a single aspect left the phone's frame two thirds
   * empty below the fold of the embedded page.
   */
  const embedHeight = embedScale > 0 ? screen.h / embedScale : 0;

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
              <div
                className="sc-screen"
                id={screenId}
                aria-live="polite"
                ref={screenRef}
              >
                {active?.liveUrl ? (
                  /* The real page. sandbox without allow-top-navigation, so an
                     embedded site cannot move the window it is sitting in;
                     no-referrer so we do not announce every visitor to it. */
                  <iframe
                    key={active.slug}
                    src={active.liveUrl}
                    title={`${t.showcase.liveOf} ${active.title}`}
                    className="sc-live"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    style={{
                      width: embedWidth,
                      height: embedHeight,
                      transform: `scale(${embedScale})`,
                      // Hidden until measured, so it never flashes at full
                      // size before the scale lands.
                      opacity: embedScale ? 1 : 0,
                    }}
                  />
                ) : shot ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={shot}
                    alt={`${t.showcase.shotOf} ${active?.title}`}
                    className="sc-shot"
                    loading="lazy"
                    decoding="async"
                  />
                ) : active?.repoUrl ? (
                  /* Neither deployed nor photographed: the repository, as a
                     card that goes there when clicked. */
                  <a
                    className="sc-repo"
                    href={active.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {githubCardImage(active.repoUrl) &&
                    !cardFailed.includes(active.slug) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={githubCardImage(active.repoUrl) as string}
                        alt={`${t.showcase.repoOf} ${active.title}`}
                        className="sc-repo-card"
                        loading="lazy"
                        decoding="async"
                        onError={() =>
                          setCardFailed((failed) =>
                            failed.includes(active.slug)
                              ? failed
                              : [...failed, active.slug],
                          )
                        }
                      />
                    ) : (
                      <span className="sc-repo-plain">
                        <span className="sc-repo-mark" aria-hidden="true">
                          {"</>"}
                        </span>
                        <span className="sc-repo-path" lang="en" dir="ltr">
                          {repoLabel(active.repoUrl)}
                        </span>
                        <span className="sc-repo-cta">{t.showcase.openRepo}</span>
                      </span>
                    )}
                  </a>
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

        {active?.liveUrl || (!shots.length && active?.repoUrl)
          ? null
          : shots.length > 1 ? (
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
              <span className="sc-meta-eyebrow">
                {t.showcase.nowShowing}
                {active.liveUrl ? (
                  <span className="sc-live-badge">{t.showcase.liveBadge}</span>
                ) : !shots.length && active.repoUrl ? (
                  <span className="sc-repo-badge">{t.showcase.repoBadge}</span>
                ) : null}
              </span>
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
