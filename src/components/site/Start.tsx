import type { Dictionary, Locale } from "@/i18n";
import type { RequestSource } from "./OrderForm";
import { OrderForm } from "./OrderForm";

export function Start({
  t,
  locale,
  source,
}: {
  t: Dictionary;
  locale: Locale;
  source?: RequestSource | null;
}) {
  return (
    <section id="start">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="sec-coord" dir="ltr">
            SEC 05 / GRID 48
          </span>
          <p className="sec-label">{t.start.label}</p>
          <h2>{t.start.heading}</h2>
          <p className="sec-desc">{t.start.desc}</p>
        </div>
        <OrderForm t={t} locale={locale} source={source} />
      </div>
    </section>
  );
}
