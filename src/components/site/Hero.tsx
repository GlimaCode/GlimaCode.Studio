import { siteConfig } from "@/config/site";
import { Keyboard, KeyboardMini } from "@/components/keyboard/Keyboard";

export function Hero() {
  return (
    <header id="top">
      <span className="crosshair" style={{ top: "18%", right: "12%" }}>
        +
      </span>
      <span
        className="crosshair"
        style={{ top: "64%", right: "26%", animationDelay: "2.2s" }}
      >
        +
      </span>
      <span
        className="crosshair"
        style={{ top: "38%", right: "6%", animationDelay: "4.1s" }}
      >
        +
      </span>
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-text">
            <p className="eyebrow">
              <span
                className="fade-up d1"
                style={{ display: "inline-flex", gap: "10px" }}
              >
                <span id="greeting">Hello</span> — we&apos;re a two-developer
                studio
              </span>
            </p>
            <h1>
              <span className="mask">
                <span>Web apps, built like</span>
              </span>
              <span className="mask">
                <span className="accent">tickets on a board.</span>
              </span>
            </h1>
            <p className="hero-sub fade-up d1">
              We&apos;re <strong>Ali</strong> and <strong>Mostafa</strong> — a
              two-person React &amp; Supabase studio. Every project gets a
              scoped plan, staged delivery, and a second developer reviewing
              every line before it ships.
            </p>
            <div className="hero-actions fade-up d2">
              <a className="btn btn-primary magnetic" href="#start">
                Start a project
              </a>
              <a className="btn btn-ghost" href="#work">
                See our work
              </a>
            </div>
            <div className="hero-meta fade-up d3">
              <span>
                <i className="dot"></i>
                {siteConfig.availability}
              </span>
              <span>{siteConfig.location}</span>
              <span className="kbd-hint">
                ⌨ press <b>W</b>·<b>S</b>·<b>P</b>·<b>T</b>·<b>↵</b>
              </span>
            </div>
            <KeyboardMini />
          </div>
          <div className="kbd-scene fade-up d2">
            <div className="kbd-float" id="kbdFloat">
              <Keyboard />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
