"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary, Locale } from "@/i18n";
import {
  BUDGETS,
  DEFAULT_BUDGET,
  DEFAULT_PROJECT_TYPE,
  DEFAULT_TIMELINE,
  PROJECT_TYPES,
  TIMELINES,
  type BudgetKey,
  type ProjectTypeKey,
  type TimelineKey,
} from "@/content/formOptions";
import {
  generateTicketId,
  submitProjectRequest,
  type ProjectRequestInput,
} from "@/lib/data/requests";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function OrderForm({ t, locale }: { t: Dictionary; locale: Locale }) {
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
    const data = new FormData(event.currentTarget);

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
      projectType: String(data.get("ptype") ?? "") as ProjectTypeKey,
      budget: String(data.get("budget") ?? "") as BudgetKey,
      timeline: String(data.get("timeline") ?? "") as TimelineKey,
      description,
      locale,
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
          <h3>{t.start.cardTitle}</h3>
          <span className="req-id">
            {t.start.idPrefix}{" "}
            <span id="reqIdPreview" ref={previewRef} dir="ltr">
              REQ-····
            </span>
          </span>
        </div>
        <div className="form-grid">
          <div className="field" id="f-name" ref={nameFieldRef}>
            <label htmlFor="name">
              {t.start.fields.name} <span className="req">*</span>
            </label>
            <input id="name" name="name" type="text" autoComplete="name" />
            <span className="error">{t.start.errors.name}</span>
          </div>
          <div className="field" id="f-email" ref={emailFieldRef}>
            <label htmlFor="email">
              {t.start.fields.email} <span className="req">*</span>
            </label>
            {/* Email addresses are always Latin and left to right, even in
                a right-to-left form. */}
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              dir="ltr"
            />
            <span className="error">{t.start.errors.email}</span>
          </div>
          <div className="field">
            <label htmlFor="company">{t.start.fields.company}</label>
            <input
              id="company"
              name="company"
              type="text"
              autoComplete="organization"
            />
            <span className="hint">{t.start.fields.companyHint}</span>
          </div>
          <div className="field">
            <label htmlFor="ptype">
              {t.start.fields.projectType} <span className="req">*</span>
            </label>
            {/* Values are stable keys so submissions never arrive in mixed
                languages; only the labels are translated. */}
            <select
              id="ptype"
              name="ptype"
              ref={typeRef}
              defaultValue={DEFAULT_PROJECT_TYPE}
            >
              {PROJECT_TYPES.map((key) => (
                <option value={key} key={key}>
                  {t.start.projectTypes[key]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="budget">{t.start.fields.budget}</label>
            <select id="budget" name="budget" defaultValue={DEFAULT_BUDGET}>
              {BUDGETS.map((key) => (
                <option value={key} key={key}>
                  {t.start.budgets[key]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="timeline">{t.start.fields.timeline}</label>
            <select
              id="timeline"
              name="timeline"
              defaultValue={DEFAULT_TIMELINE}
            >
              {TIMELINES.map((key) => (
                <option value={key} key={key}>
                  {t.start.timelines[key]}
                </option>
              ))}
            </select>
          </div>
          <div className="field full" id="f-desc" ref={descFieldRef}>
            <label htmlFor="desc">
              {t.start.fields.description} <span className="req">*</span>
            </label>
            <textarea
              id="desc"
              name="desc"
              placeholder={t.start.fields.descriptionPlaceholder}
            ></textarea>
            <span className="error">{t.start.errors.description}</span>
          </div>
        </div>
        <div className="order-actions">
          <button type="submit" className="btn btn-primary magnetic">
            {t.start.submit}
          </button>
          <span className="order-note">{t.start.note}</span>
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
            {t.start.success.openedBefore}{" "}
            <span id="doneId" dir="ltr">
              {confirmedId}
            </span>{" "}
            {t.start.success.openedAfter}
          </p>
          <p>{t.start.success.body}</p>
          <div style={{ marginTop: "18px" }}>
            <button
              className="btn btn-ghost btn-sm"
              id="newRequest"
              onClick={startAnother}
            >
              {t.start.success.again}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
