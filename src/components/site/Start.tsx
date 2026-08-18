import { OrderForm } from "./OrderForm";

export function Start() {
  return (
    <section id="start">
      <div className="wrap">
        <div className="sec-head reveal">
          <span className="sec-coord">SEC 05 / GRID 48</span>
          <p className="sec-label">Start a project</p>
          <h2>Open a ticket</h2>
          <p className="sec-desc">
            Tell us what you&apos;re building. We reply within 24 hours with
            honest thoughts on scope, timeline, and price.
          </p>
        </div>
        <OrderForm />
      </div>
    </section>
  );
}
