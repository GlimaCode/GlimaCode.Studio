"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary, Locale } from "@/i18n";
import {
  PROJECT_TYPE_FOR_CATEGORY,
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
import { submitProjectRequest } from "@/lib/data/requests";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A portfolio sample the visitor arrived from. Resolved on the server so the
 * title is real rather than taken from a query string a stranger could edit.
 */
export type RequestSource = {
  slug: string;
  title: string;
  categorySlug: string;
};

export function OrderForm({
  t,
  locale,
  source,
}: {
  t: Dictionary;
  locale: Locale;
  source?: RequestSource | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const nameFieldRef = useRef<HTMLDivElement>(null);
  const emailFieldRef = useRef<HTMLDivElement>(null);
  const descFieldRef = useRef<HTMLDivElement>(null);

  /** When the form became available, for the timing check. */
  const shownAt = useRef<number>(0);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<"throttled" | "failed" | null>(null);

  useEffect(() => {
    shownAt.current = Date.now();
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
    if (sending) return;

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

    setProblem(null);
    setSending(true);

    const result = await submitProjectRequest({
      name,
      email,
      company: String(data.get("company") ?? "").trim(),
      projectType: String(data.get("ptype") ?? "") as ProjectTypeKey,
      budget: String(data.get("budget") ?? "") as BudgetKey,
      timeline: String(data.get("timeline") ?? "") as TimelineKey,
      description,
      locale,
      sourceProjectSlug: source?.slug ?? null,
      website: String(data.get("website") ?? ""),
      elapsedMs: shownAt.current ? Date.now() - shownAt.current : undefined,
    });

    setSending(false);

    if (result.ok) {
      setConfirmedId(result.ticketId);
      return;
    }
    // "invalid" should be unreachable — the same rules ran above — so it is
    // reported as a failure rather than silently ignored.
    setProblem(result.reason === "throttled" ? "throttled" : "failed");
  }

  function startAnother() {
    formRef.current?.reset();
    shownAt.current = Date.now();
    setConfirmedId(null);
    setProblem(null);
    document.getElementById("start")?.scrollIntoView();
  }

  return (
    <div className="order-card reveal">
      <form
        id="orderForm"
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        style={confirmedId !== null ? { display: "none" } : undefined}
      >
        {source ? (
          <p className="pf-source">
            <span>
              {t.portfolio.basedOn} <b>{source.title}</b>
            </span>
            <a href={`/${locale}#start`}>{t.portfolio.clearBasedOn}</a>
          </p>
        ) : null}
        <div className="order-head">
          <h3>{t.start.cardTitle}</h3>
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
              defaultValue={
                (source && PROJECT_TYPE_FOR_CATEGORY[source.categorySlug]) ||
                DEFAULT_PROJECT_TYPE
              }
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

        {/* Honeypot. Hidden from sight and from assistive technology, and
            excluded from tab order, so no person can reach it — anything in
            it came from something filling every field it found. Positioned
            off-screen rather than display:none, which some bots skip. */}
        <div className="hp-field" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="order-actions">
          <button
            type="submit"
            className="btn btn-primary magnetic"
            disabled={sending}
          >
            {sending ? t.start.sending : t.start.submit}
          </button>
          <span className="order-note">{t.start.note}</span>
        </div>

        {problem ? (
          <p className="order-problem" role="alert">
            {problem === "throttled" ? t.start.throttled : t.start.failed}
          </p>
        ) : null}
      </form>

      {confirmedId !== null ? (
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
