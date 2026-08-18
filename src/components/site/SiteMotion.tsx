"use client";

import { useEffect } from "react";
import {
  KEY_CODE_MAP,
  KEY_MAP,
  SPY_SECTIONS,
  type KeyAction,
} from "@/components/keyboard/keys";

const GREETINGS = ["Hello", "Hallo", "سلام"];

function isKeyAction(value: string): value is KeyAction {
  return Object.prototype.hasOwnProperty.call(KEY_MAP, value);
}

/**
 * The motion layer.
 *
 * Renders nothing. On mount it wires up every behaviour the prototype's
 * script owned — hero load sequence, cycling greeting, scroll reveals with
 * count-up, nav choreography, scroll progress, magnetic buttons, and the
 * keyboard (click navigation, physical shortcuts, scroll-spy lighting,
 * scroll-driven typing and parallax).
 *
 * Keeping this imperative and DOM-driven, rather than lifting it into React
 * state, is deliberate: the stylesheet is built around classes like
 * `.reveal.in` and `.key.lit`, and toggling them directly is both faithful
 * to the original and avoids re-rendering forty keycaps on every scroll
 * frame. Every listener and observer is torn down on unmount.
 */
export function SiteMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanups: Array<() => void> = [];
    let disposed = false;

    // 1) The hero load sequence is triggered by an inline script in the
    //    document rather than from here, so it does not wait on hydration.
    //    See REVEAL_HERO in src/app/layout.tsx.

    // 2) Cycling multilingual greeting
    const greetingEl = document.getElementById("greeting");
    if (!reduced && greetingEl) {
      let index = 0;
      const pending = new Set<number>();
      greetingEl.style.transition = "opacity .22s ease";
      const interval = window.setInterval(() => {
        index = (index + 1) % GREETINGS.length;
        greetingEl.style.opacity = "0";
        const timer = window.setTimeout(() => {
          greetingEl.textContent = GREETINGS[index];
          greetingEl.style.opacity = "1";
          pending.delete(timer);
        }, 220);
        pending.add(timer);
      }, 2600);
      cleanups.push(() => {
        window.clearInterval(interval);
        pending.forEach((timer) => window.clearTimeout(timer));
      });
    }

    // 3) Scroll reveal, plus count-up when a board column enters view
    function countUp(el: Element) {
      const target = Number((el as HTMLElement).dataset.count);
      if (reduced || !target) {
        el.textContent = String(target || 0);
        return;
      }
      const start = performance.now();
      const duration = 700;
      const tick = (now: number) => {
        if (disposed) return;
        const progress = Math.min(1, (now - start) / duration);
        el.textContent = String(
          Math.round(target * (1 - Math.pow(1 - progress, 3))),
        );
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          entry.target
            .querySelectorAll(".count[data-count]")
            .forEach(countUp);
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );
    document
      .querySelectorAll(".reveal, .sec-head, .step")
      .forEach((el) => revealObserver.observe(el));
    cleanups.push(() => revealObserver.disconnect());

    // 4) Sticky nav: shadow once scrolled, hide going down, return going up.
    //    Shares one scroll listener with the progress hairline.
    const nav = document.getElementById("nav");
    const progressBar = document.getElementById("progress");
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      nav?.classList.toggle("scrolled", y > 8);
      if (!reduced) nav?.classList.toggle("hidden", y > 220 && y > lastY);
      lastY = y;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (progressBar) {
        progressBar.style.transform = `scaleX(${scrollable ? y / scrollable : 0})`;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    cleanups.push(() => window.removeEventListener("scroll", onScroll));

    // 5) Magnetic primary buttons, fine pointers only, capped and springy
    if (
      !reduced &&
      window.matchMedia("(hover:hover) and (pointer:fine)").matches
    ) {
      document.querySelectorAll<HTMLElement>(".magnetic").forEach((btn) => {
        const onMove = (event: MouseEvent) => {
          const rect = btn.getBoundingClientRect();
          const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
          const y = (event.clientY - rect.top - rect.height / 2) / rect.height;
          btn.style.transform = `translate(${x * 6}px, ${y * 5}px)`;
        };
        const onLeave = () => {
          btn.style.transform = "";
        };
        btn.addEventListener("mousemove", onMove);
        btn.addEventListener("mouseleave", onLeave);
        cleanups.push(() => {
          btn.removeEventListener("mousemove", onMove);
          btn.removeEventListener("mouseleave", onLeave);
          btn.style.transform = "";
        });
      });
    }

    // 6) The keyboard
    const board = document.getElementById("kbdBoard");
    if (board) {
      const flashTimers = new Set<number>();

      const flashKey = (el: Element | undefined, ms = 130) => {
        if (!el) return;
        el.classList.add("pressed");
        const timer = window.setTimeout(() => {
          el.classList.remove("pressed");
          flashTimers.delete(timer);
        }, ms);
        flashTimers.add(timer);
      };

      const pressAndGo = (action: KeyAction) => {
        document
          .querySelectorAll(`[data-key="${action}"]`)
          .forEach((el) => flashKey(el, 170));
        const target = document.querySelector(KEY_MAP[action]);
        if (!target) return;
        const timer = window.setTimeout(() => {
          target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
          flashTimers.delete(timer);
        }, 90);
        flashTimers.add(timer);
      };

      cleanups.push(() =>
        flashTimers.forEach((timer) => window.clearTimeout(timer)),
      );

      // Click navigation on both the full board and the mobile bar
      document
        .querySelectorAll<HTMLElement>("[data-key]")
        .forEach((el) => {
          const action = el.dataset.key;
          if (!action || !isKeyAction(action)) return;
          const onClick = () => pressAndGo(action);
          el.addEventListener("click", onClick);
          cleanups.push(() => el.removeEventListener("click", onClick));
        });

      // Physical shortcuts, ignored while the visitor is typing in a field
      const onKeyDown = (event: KeyboardEvent) => {
        // Guard with an instanceof check: a real keydown always targets an
        // element, but a synthetic event can target window, which has no
        // matches() and would throw here.
        const target = event.target;
        if (
          target instanceof Element &&
          target.matches("input, textarea, select")
        ) {
          return;
        }
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        // Match the character produced or the physical key position, so the
        // shortcuts survive a non-Latin input method. See KEY_CODE_MAP.
        const typed = event.key.toLowerCase();
        const action = isKeyAction(typed) ? typed : KEY_CODE_MAP[event.code];
        if (!action) return;
        event.preventDefault();
        pressAndGo(action);
      };
      window.addEventListener("keydown", onKeyDown);
      cleanups.push(() => window.removeEventListener("keydown", onKeyDown));

      // Scroll-spy: the key for the section in view stays lit
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const id = `#${entry.target.id}`;
            document.querySelectorAll<HTMLElement>(".key.action").forEach((key) => {
              const action = key.dataset.key;
              const isMatch =
                !!action && isKeyAction(action) && KEY_MAP[action] === id;
              if (isMatch && !key.classList.contains("lit")) flashKey(key);
              key.classList.toggle("lit", isMatch);
            });
          });
        },
        { rootMargin: "-42% 0px -52% 0px" },
      );
      SPY_SECTIONS.forEach((id) => {
        const section = document.getElementById(id);
        if (section) spy.observe(section);
      });
      cleanups.push(() => spy.disconnect());

      // Parallax drift and decorative "typing" while the hero is on screen
      if (!reduced) {
        const floatEl = document.getElementById("kbdFloat");
        const deco = Array.from(board.querySelectorAll(".key:not(.action)"));
        let lastType = 0;
        let lastScrollY = window.scrollY;
        const onScrollType = () => {
          const y = window.scrollY;
          if (floatEl && y < window.innerHeight * 1.2) {
            floatEl.style.transform = `translateY(${y * 0.09}px) rotate(${Math.min(
              y * 0.004,
              2,
            )}deg)`;
          }
          const now = performance.now();
          if (
            deco.length &&
            Math.abs(y - lastScrollY) > 26 &&
            now - lastType > 95 &&
            y < window.innerHeight * 1.4
          ) {
            lastType = now;
            flashKey(deco[Math.floor(Math.random() * deco.length)], 110);
          }
          lastScrollY = y;
        };
        window.addEventListener("scroll", onScrollType, { passive: true });
        cleanups.push(() =>
          window.removeEventListener("scroll", onScrollType),
        );
      }
    }

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
