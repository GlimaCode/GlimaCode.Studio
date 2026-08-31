"use client";

import { useEffect, useRef } from "react";

/**
 * Ones and zeroes travelling along the blueprint grid.
 *
 * The page's texture is a 48px grid painted as a body background. This draws
 * digits that ride those lines — never floating between them — so the motion
 * reads as something moving through the drawing rather than over it. The
 * pointer pushes them off the line it is near; they drift back onto it and
 * carry on.
 *
 * Choices worth knowing about:
 *
 * - **A canvas, not elements.** Sixty-odd absolutely positioned spans animated
 *   per frame is sixty style recalculations per frame. One canvas is one.
 *
 * - **z-index -1, and the canvas is a child of body.** That paints it above
 *   the body's background grid and below every piece of content, without
 *   putting anything in front of a link. `pointer-events: none` as well, so it
 *   cannot swallow a click even if a stacking context ever changes.
 *
 * - **Fixed, with the grid offset by the scroll.** The body's grid scrolls
 *   with the document. A fixed canvas does not, so the lines a particle rides
 *   are computed in document space and drawn minus `scrollY`; without that the
 *   digits slide off the grid as soon as the page moves.
 *
 * - **Nothing runs under prefers-reduced-motion.** Not slowed, not static:
 *   the canvas is never created. Ambient movement in peripheral vision is the
 *   exact thing that setting is for.
 *
 * - **Paused when the tab is hidden**, so a backgrounded tab is not burning a
 *   frame loop for something nobody is looking at.
 */

/** Matches the body grid in globals.css. If that changes, change this. */
const CELL = 48;
/** One digit per this many square pixels of viewport, capped. */
const DENSITY = 26000;
const MAX_BITS = 90;
/** How near the pointer has to be, in px, before a digit is pushed. */
const PUSH_RADIUS = 120;
const PUSH_STRENGTH = 26;

type Bit = {
  /** Which way it travels. Horizontal rides a row, vertical rides a column. */
  axis: "h" | "v";
  /** Position along its line, and which line it is on, in document space. */
  along: number;
  line: number;
  /** px per second, signed. */
  speed: number;
  glyph: "0" | "1";
  /** Displacement from the pointer, decaying back to zero. */
  ox: number;
  oy: number;
  alpha: number;
};

function makeBit(w: number, hDoc: number, top: number): Bit {
  const axis: "h" | "v" = Math.random() < 0.5 ? "h" : "v";
  const speed = (12 + Math.random() * 26) * (Math.random() < 0.5 ? -1 : 1);
  return {
    axis,
    line:
      axis === "h"
        ? Math.round((top + Math.random() * hDoc) / CELL)
        : Math.round((Math.random() * w) / CELL),
    along: axis === "h" ? Math.random() * w : top + Math.random() * hDoc,
    speed,
    glyph: Math.random() < 0.5 ? "0" : "1",
    ox: 0,
    oy: 0,
    alpha: 0.25 + Math.random() * 0.45,
  };
}

export function GridBits() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    // Mutated in place, never reassigned: resize() tops up or trims it and the
    // frame loop replaces spent entries by index, so the array identity is
    // stable and nothing can be left holding a stale one.
    const bits: Bit[] = [];
    let raf = 0;
    let last = 0;
    // Viewport coordinates, or null when the pointer is not over the page.
    let px: number | null = null;
    let py: number | null = null;
    let colour = "#2F4DFF";
    let font = '500 11px ui-monospace, monospace';

    /**
     * A canvas cannot resolve a CSS custom property, so both the colour and
     * the family have to be read off the document and baked into concrete
     * strings. `--font-plex-mono` holds the generated family name that
     * next/font emits.
     */
    function readTheme() {
      const s = getComputedStyle(document.documentElement);
      colour = s.getPropertyValue("--cobalt").trim() || "#2F4DFF";
      const family = s.getPropertyValue("--font-plex-mono").trim();
      font = `500 11px ${family ? `${family}, ` : ""}ui-monospace, monospace`;
    }

    function resize() {
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextW = window.innerWidth;
      const nextH = window.innerHeight;
      if (nextW === w && nextH === h && nextDpr === dpr) return;

      dpr = nextDpr;
      w = nextW;
      h = nextH;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Top up or trim, rather than rolling a fresh field. A phone fires
      // resize continuously while you scroll, because the URL bar collapses
      // and window.innerHeight follows it; re-seeding there teleported every
      // digit several times a second.
      //
      // A band a screen deep either side of the viewport, so a digit that
      // scrolls out of sight is still there when the page comes back.
      const want = Math.min(MAX_BITS, Math.round((w * h) / DENSITY));
      const top = window.scrollY - h;
      if (bits.length > want) bits.length = want;
      while (bits.length < want) bits.push(makeBit(w, h * 3, top));
    }

    function frame(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const scroll = window.scrollY;
      ctx!.clearRect(0, 0, w, h);
      ctx!.font = font;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";

      for (let i = 0; i < bits.length; i++) {
        const b = bits[i];
        b.along += b.speed * dt;

        // Where it is in document space, then on screen.
        const dx = b.axis === "h" ? b.along : b.line * CELL;
        const dy = b.axis === "h" ? b.line * CELL : b.along;
        let sx = dx;
        let sy = dy - scroll;

        // The pointer pushes; the push decays so the digit settles back onto
        // its line rather than being permanently displaced.
        if (px !== null && py !== null) {
          const vx = sx + b.ox - px;
          const vy = sy + b.oy - py;
          const d2 = vx * vx + vy * vy;
          if (d2 < PUSH_RADIUS * PUSH_RADIUS && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const force = (1 - d / PUSH_RADIUS) * PUSH_STRENGTH * dt * 12;
            b.ox += (vx / d) * force;
            b.oy += (vy / d) * force;
          }
        }
        b.ox *= 0.90;
        b.oy *= 0.90;

        sx += b.ox;
        sy += b.oy;

        // Recycle anything that has left the band, on either axis.
        const outX = sx < -CELL || sx > w + CELL;
        const outY = sy < -h || sy > h * 2;
        if (outX || outY) {
          bits[i] = makeBit(w, h * 3, scroll - h);
          continue;
        }

        if (sy < -20 || sy > h + 20) continue;
        ctx!.globalAlpha = b.alpha;
        ctx!.fillStyle = colour;
        ctx!.fillText(b.glyph, sx, sy);
      }
      ctx!.globalAlpha = 1;
      raf = window.requestAnimationFrame(frame);
    }

    function start() {
      if (!raf) {
        last = 0;
        raf = window.requestAnimationFrame(frame);
      }
    }
    function stop() {
      if (raf) {
        window.cancelAnimationFrame(raf);
        raf = 0;
      }
    }
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }
    function onPointer(e: PointerEvent) {
      px = e.clientX;
      py = e.clientY;
    }
    function onLeave() {
      px = null;
      py = null;
    }

    // Reduced motion is a live query, not a value read once. Everything else
    // that moves on this site is CSS and stops the moment the setting is
    // turned on; this is the only JS animation, and it has to do the same or
    // the doc comment above is a lie for anyone who turns it on mid-visit.
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    function syncMotion() {
      if (motion.matches) {
        stop();
        ctx!.clearRect(0, 0, w, h);
      } else {
        if (!w) { readTheme(); resize(); }
        start();
      }
    }
    motion.addEventListener("change", syncMotion);

    readTheme();
    if (!motion.matches) {
      resize();
      start();
    }

    // Canvas text does not wait for a webfont the way the DOM does: setting
    // ctx.font to a family that has not loaded yet silently draws in whatever
    // is available, and the first frames came out as tofu boxes. Re-read once
    // the faces are in. Caught by screenshotting during a cold load, which is
    // the only moment it is visible.
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) readTheme(); });

    // The palette changes with the theme, and the theme can change without a
    // reload — the switch stamps data-theme on <html>.
    const observer = new MutationObserver(readTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", readTheme);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    // On document, not window. `pointerleave` does not bubble and window is
    // never its target, so a listener there is never called — the field stayed
    // pushed at the last known point forever once the cursor left the window,
    // a permanent hole in the grid. It survived the first round of testing
    // because the test dispatched the event by hand, which is exactly the
    // shape of bug a hand-dispatched event cannot find.
    document.addEventListener("pointerleave", onLeave);
    // Touch never sends a leave: the finger lifts and that is that. Without
    // these a phone keeps a dead zone at the last place it was tapped.
    window.addEventListener("pointerup", onLeave);
    window.addEventListener("pointercancel", onLeave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      stop();
      motion.removeEventListener("change", syncMotion);
      observer.disconnect();
      scheme.removeEventListener("change", readTheme);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerup", onLeave);
      window.removeEventListener("pointercancel", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="grid-bits" aria-hidden="true" />;
}
