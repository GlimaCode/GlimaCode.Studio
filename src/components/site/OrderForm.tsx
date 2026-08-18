"use client";

import { useEffect, useRef, useState } from "react";
import {
  generateTicketId,
  submitProjectRequest,
  type ProjectRequestInput,
} from "@/lib/data/requests";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function OrderForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const nameFieldRef = useRef<HTMLDivElement>(null);
  const emailFieldRef = useRef<HTMLDivElement>(null);
  const descFieldRef = useRef<HTMLDivElement>(null);

  /**
   * The ticket reference comes from the clock, so it cannot be generated
   * during render without the server and client disagreeing. The server
   * sends the placeholder, and after mount we write the real reference
   * straight to the node — display-only state that never needs a re-render.
   */
  const ticketIdRef = useRef<string | null>(null);
  const previewRef = useRef<HTMLSpanElement>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  useEffect(() => {
    ticketIdRef.current = generateTicketId();
    if (previewRef.current) previewRef.current.textContent = ticketIdRef.current;
  }, []);

  /**
   * "Request this" on a service card preselects the project type. The select
   * is uncontrolled, so setting value directly is safe and keeps the
   * behaviour identical to the prototype.
   */
  useEffect(() => {
    const links = Array.from(
      document.querySelectorAll<HTMLElement>("[data-service]"),
    );
    const handlers = links.map((link) => {
      const handler = () => {
        const value = link.dataset.service;
        if (value && typeRef.current) typeRef.current.value = value;
      };
      link.addEventListener("click", handler);
      return { link, handler };
    });
    return () => {
      handlers.forEach(({ link, handler }) =>
        link.removeEventListener("click", handler),
      );
    };
  }, []);

  /**
   * Toggling the class off, forcing a reflow, then back on restarts the
   * shake animation when the visitor submits an invalid form twice.
   */
  function mark(field: HTMLDivElement | null, isInvalid: boolean) {
    if (!field) return;
    field.classList.remove("invalid");
    if (isInvalid) {
      void field.offsetWidth;
      field.classList.add("invalid");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const description = String(data.get("desc") ?? "").trim();

    const nameInvalid = !name;
    const emailInvalid = !EMAIL_PATTERN.test(email);
    const descInvalid = description.length < 10;

    mark(nameFieldRef.current, nameInvalid);
    mark(emailFieldRef.current, emailInvalid);
    mark(descFieldRef.current, descInvalid);

    if (nameInvalid || emailInvalid || descInvalid) return;

    const id = ticketIdRef.current ?? generateTicketId();
    const input: ProjectRequestInput = {
      name,
      email,
      company: String(data.get("company") ?? "").trim(),
      projectType: String(data.get("ptype") ?? ""),
      budget: String(data.get("budget") ?? ""),
      timeline: String(data.get("timeline") ?? ""),
      description,
    };

    const result = await submitProjectRequest(id, input);
    setConfirmedId(result.ticketId);
  }

  function startAnother() {
    formRef.current?.reset();
    ticketIdRef.current = generateTicketId();
    if (previewRef.current) previewRef.current.textContent = ticketIdRef.current;
    setConfirmedId(null);
    document.getElementById("start")?.scrollIntoView();
  }

  return (
    <div className="order-card reveal">
      <form
        id="orderForm"
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        style={confirmedId ? { display: "none" } : undefined}
      >
        <div className="order-head">
          <h3>Project request</h3>
          <span className="req-id">
            ID:{" "}
            <span id="reqIdPreview" ref={previewRef}>
              REQ-····
            </span>
          </span>
        </div>
        <div className="form-grid">
          <div className="field" id="f-name" ref={nameFieldRef}>
            <label htmlFor="name">
              Your name <span className="req">*</span>
            </label>
            <input id="name" name="name" type="text" autoComplete="name" />
            <span className="error">Please enter your name.</span>
          </div>
          <div className="field" id="f-email" ref={emailFieldRef}>
            <label htmlFor="email">
              Email <span className="req">*</span>
            </label>
            <input id="email" name="email" type="email" autoComplete="email" />
            <span className="error">Please enter a valid email.</span>
          </div>
          <div className="field">
            <label htmlFor="company">Company / agency</label>
            <input
              id="company"
              name="company"
              type="text"
              autoComplete="organization"
            />
            <span className="hint">Optional</span>
          </div>
          <div className="field">
            <label htmlFor="ptype">
              Project type <span className="req">*</span>
            </label>
            <select id="ptype" name="ptype" ref={typeRef} defaultValue="Landing page">
              <option>Landing page</option>
              <option>Admin dashboard</option>
              <option>Full-stack MVP</option>
              <option>White-label / agency capacity</option>
              <option>Something else</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="budget">Budget range</label>
            <select id="budget" name="budget" defaultValue="$300 – $700">
              <option>Under $300</option>
              <option>$300 – $700</option>
              <option>$700 – $1,500</option>
              <option>$1,500+</option>
              <option>Not sure yet</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="timeline">Timeline</label>
            <select id="timeline" name="timeline" defaultValue="2–4 weeks">
              <option>ASAP</option>
              <option>2–4 weeks</option>
              <option>1–2 months</option>
              <option>Flexible</option>
            </select>
          </div>
          <div className="field full" id="f-desc" ref={descFieldRef}>
            <label htmlFor="desc">
              Project description <span className="req">*</span>
            </label>
            <textarea
              id="desc"
              name="desc"
              placeholder="What are you building? Who is it for? Anything already exists (designs, code, examples)?"
            ></textarea>
            <span className="error">
              A few sentences help us give you a useful reply.
            </span>
          </div>
        </div>
        <div className="order-actions">
          <button type="submit" className="btn btn-primary magnetic">
            Send request
          </button>
          <span className="order-note">
            Sends via your email app — we reply within 24 hours.
          </span>
        </div>
      </form>

      {confirmedId ? (
        <div className="order-success show" id="orderSuccess">
          <div className="check-ring" aria-hidden="true">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <p className="big">
            Ticket <span id="doneId">{confirmedId}</span> opened
          </p>
          <p>
            Your email app should have opened with the request pre-filled —
            just press send. If it didn&apos;t, email us directly and mention
            the ticket ID.
          </p>
          <div style={{ marginTop: "18px" }}>
            <button
              className="btn btn-ghost btn-sm"
              id="newRequest"
              onClick={startAnother}
            >
              Open another ticket
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
