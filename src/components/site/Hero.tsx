import type { Dictionary, Locale } from "@/i18n";
import { renderRich } from "@/i18n/rich";
import { Keyboard, KeyboardMini } from "@/components/keyboard/Keyboard";

export function Hero({ t, locale }: { t: Dictionary; locale: Locale }) {
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
                <span id="greeting">Hello</span> — {t.hero.eyebrow}
              </span>
            </p>
            <h1>
              <span className="mask">
                <span>{t.hero.headline}</span>
              </span>
              <span className="mask">
                <span className="accent">{t.hero.headlineAccent}</span>
              </span>
            </h1>
            <p className="hero-sub fade-up d1">{renderRich(t.hero.sub)}</p>
            <div className="hero-actions fade-up d2">
              <a className="btn btn-primary magnetic" href="#start">
                {t.hero.ctaPrimary}
              </a>
              <a className="btn btn-ghost" href="#work">
                {t.hero.ctaSecondary}
              </a>
            </div>
            <div className="hero-meta fade-up d3">
              <span>
                <i className="dot"></i>
                {t.hero.availability}
              </span>
              <span>{t.hero.location}</span>
              {/* The key names stay Latin and left to right: they name the
                  physical keys the visitor presses, in both locales. */}
              <span className="kbd-hint">
                ⌨ {t.hero.kbdHintPrefix}{" "}
                <span dir="ltr">
                  <b>W</b>·<b>S</b>·<b>P</b>·<b>T</b>·<b>↵</b>
                </span>{" "}
                {t.hero.kbdHintSuffix}
              </span>
            </div>
            <KeyboardMini t={t} />
          </div>
          {/* The keyboard is a physical object and stays left to right in
              both locales; only its position in the grid flips. */}
          <div className="kbd-scene fade-up d2" dir="ltr">
            <div className="kbd-float" id="kbdFloat">
              <Keyboard t={t} locale={locale} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
