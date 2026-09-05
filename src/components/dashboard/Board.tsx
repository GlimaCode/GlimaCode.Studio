"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { browserClient } from "@/lib/db/client";
import type { Board as BoardData, BoardCard, Priority } from "@/lib/data/board";
import {
  addCard,
  addColumn,
  deleteCard,
  deleteColumn,
  fetchBoard,
  relocateCard,
  relocateColumn,
  saveCard,
  saveColumnTitle,
} from "@/app/dashboard/board/actions";

/**
 * The team board.
 *
 * Two people, one screen each, and whatever one does has to appear on the
 * other's without a reload. That is the whole design constraint, and it
 * decides the shape: every write goes through a server action which returns
 * the board it produced, and the realtime channel is used only to learn that
 * *someone else* wrote something, at which point this asks for the board
 * again. Applying the replayed row payloads directly would be faster and is
 * not worth it — two clients merging partial rows is a class of bug that
 * takes a week to find and this saves an HTTP round trip.
 *
 * Dragging is the mouse affordance and not the only one. HTML5 drag events do
 * not fire on touch at all, and they are unreachable by keyboard, so every
 * card also carries four move buttons. They are not a fallback bolted on
 * afterwards: on a phone they are the only way, and they are what a screen
 * reader reads.
 */

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

/** Local midnight, so "today" means the reader's today and not UTC's. */
function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function dueLabel(dueOn: string): { text: string; state: "past" | "soon" | "later" } {
  const now = today();
  const days = Math.round(
    (new Date(dueOn + "T00:00:00").getTime() - new Date(now + "T00:00:00").getTime()) /
      86400000,
  );
  if (days < 0) return { text: `${-days}d overdue`, state: "past" };
  if (days === 0) return { text: "today", state: "soon" };
  if (days === 1) return { text: "tomorrow", state: "soon" };
  if (days <= 6) return { text: `in ${days}d`, state: "soon" };
  return {
    text: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
      new Date(dueOn + "T00:00:00"),
    ),
    state: "later",
  };
}

type Props = {
  initial: BoardData;
  me: string;
  requests: { id: string; ticketId: string; name: string }[];
};

export function Board({ initial, me, requests }: Props) {
  const [board, setBoard] = useState<BoardData>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const [openCard, setOpenCard] = useState<string | null>(null);
  const [composing, setComposing] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);

  const [who, setWho] = useState<string>("all");
  const [query, setQuery] = useState("");

  const [dragging, setDragging] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ columnId: string; index: number } | null>(null);

  // Set while one of our own writes is in flight, so the realtime echo of
  // that same write does not trigger a second read of a board we already have.
  const writing = useRef(false);

  const run = useCallback((work: () => Promise<BoardData>) => {
    setError(null);
    writing.current = true;
    startTransition(async () => {
      try {
        setBoard(await work());
      } catch (e) {
        setError(e instanceof Error ? e.message : "That did not work.");
        // Put the optimistic state back where the server says it is.
        try {
          setBoard(await fetchBoard());
        } catch {
          /* leave what is on screen; the error above says why */
        }
      } finally {
        writing.current = false;
      }
    });
  }, []);

  // Live updates. One channel for both tables; any change anyone makes is a
  // reason to re-read, and the debounce collapses the burst that a column
  // renumber produces into a single read.
  useEffect(() => {
    const client = browserClient();
    let timer = 0;
    let alive = true;

    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        if (!alive || writing.current) return;
        try {
          const next = await fetchBoard();
          if (!alive) return;
          setBoard(next);
          setNotice("Board updated.");
          window.setTimeout(() => setNotice(""), 1500);
        } catch {
          /* a failed background read is not worth interrupting anyone for */
        }
      }, 250);
    };

    const channel = client
      .channel("board")
      .on("postgres_changes", { event: "*", schema: "public", table: "board_cards" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "board_columns" }, refresh)
      .subscribe();

    return () => {
      alive = false;
      window.clearTimeout(timer);
      client.removeChannel(channel);
    };
  }, []);

  const memberName = useCallback(
    (id: string | null) => board.members.find((m) => m.userId === id)?.name ?? null,
    [board.members],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return board.cards.filter((card) => {
      if (who === "me" && card.assigneeId !== me) return false;
      if (who === "none" && card.assigneeId !== null) return false;
      if (who !== "all" && who !== "me" && who !== "none" && card.assigneeId !== who) {
        return false;
      }
      if (!q) return true;
      return (
        card.title.toLowerCase().includes(q) ||
        (card.notes ?? "").toLowerCase().includes(q) ||
        (card.requestTicket ?? "").toLowerCase().includes(q)
      );
    });
  }, [board.cards, who, query, me]);

  const byColumn = useCallback(
    (columnId: string) => visible.filter((c) => c.columnId === columnId),
    [visible],
  );

  /**
   * Where a card sits among the cards actually on screen.
   *
   * Moves are expressed against the filtered view because that is what the
   * person is looking at, and the server places against the same column read
   * fresh — so a card hidden by a filter keeps its place rather than being
   * silently shuffled by someone else's search box.
   */
  const indexIn = (columnId: string, cardId: string) =>
    byColumn(columnId).findIndex((c) => c.id === cardId);

  const moveTo = (card: BoardCard, columnId: string, index: number) => {
    // Optimistic: put it where it is going before the round trip, or dragging
    // feels broken on a slow connection.
    setBoard((prev) => {
      const rest = prev.cards.filter((c) => c.id !== card.id);
      const target = rest.filter((c) => c.columnId === columnId);
      const at = Math.max(0, Math.min(index, target.length));
      const before = at > 0 ? target[at - 1].position : null;
      const after = at < target.length ? target[at].position : null;
      const position =
        before === null && after === null
          ? 1000
          : before === null
            ? (after as number) - 1000
            : after === null
              ? before + 1000
              : (before + after) / 2;
      return { ...prev, cards: [...rest, { ...card, columnId, position }] };
    });
    run(() => relocateCard(card.id, columnId, index));
  };

  const columnOf = (card: BoardCard) => board.columns.findIndex((c) => c.id === card.columnId);

  const shift = (card: BoardCard, by: -1 | 1) => {
    const at = columnOf(card);
    const next = board.columns[at + by];
    if (!next) return;
    moveTo(card, next.id, byColumn(next.id).length);
  };

  const nudge = (card: BoardCard, by: -1 | 1) => {
    const at = indexIn(card.columnId, card.id);
    const to = at + by;
    if (to < 0 || to >= byColumn(card.columnId).length) return;
    moveTo(card, card.columnId, to);
  };

  const filtering = who !== "all" || query.trim() !== "";

  return (
    <div className="kb" aria-busy={pending}>
      <div className="kb-bar">
        <div className="kb-filters">
          <label className="kb-field">
            <span className="kb-label">Assignee</span>
            <select
              className="kb-select"
              value={who}
              onChange={(e) => setWho(e.target.value)}
            >
              <option value="all">Everyone</option>
              <option value="me">Mine</option>
              <option value="none">Unassigned</option>
              {board.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="kb-field kb-field-grow">
            <span className="kb-label">Search</span>
            <input
              className="kb-input"
              type="search"
              value={query}
              placeholder="Title, notes or ticket"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {filtering ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setWho("all");
                setQuery("");
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="kb-state">
          {/* Two live regions, because they say different kinds of thing: one
              is the other person arriving, the other is our own failure. */}
          <span className="kb-notice" aria-live="polite">
            {notice}
          </span>
          {pending ? <span className="kb-spinner" aria-hidden="true" /> : null}
        </div>
      </div>

      {error ? (
        <div className="dash-banner dash-banner-warn" role="alert">
          {error}
        </div>
      ) : null}

      {filtering ? (
        <p className="kb-filtering">
          Showing {visible.length} of {board.cards.length} cards. Moves still
          land where you drop them; the hidden ones keep their places.
        </p>
      ) : null}

      <div className="kb-cols">
        {board.columns.map((column, columnIndex) => {
          const cards = byColumn(column.id);
          return (
            <div
              /* A div with a role, not <section> — the ported stylesheet
                 styles sectioning elements by element name, which is how the
                 dashboard once grew a 297px blurred bar. The landmark without
                 the layout. scripts/verify-dashboard-shell.mjs fails the build
                 if this comes back as an element. */
              role="group"
              className={`kb-col${dropAt?.columnId === column.id ? " kb-col-over" : ""}`}
              key={column.id}
              aria-label={`${column.title}, ${cards.length} card${cards.length === 1 ? "" : "s"}`}
              onDragOver={(e) => {
                if (!dragging) return;
                e.preventDefault();
                if (!dropAt || dropAt.columnId !== column.id) {
                  setDropAt({ columnId: column.id, index: cards.length });
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const card = board.cards.find((c) => c.id === dragging);
                if (card && dropAt) moveTo(card, dropAt.columnId, dropAt.index);
                setDragging(null);
                setDropAt(null);
              }}
            >
              <div className="kb-col-head">
                {renaming === column.id ? (
                  <form
                    className="kb-rename"
                    action={(data) => {
                      const title = String(data.get("title") ?? "");
                      setRenaming(null);
                      if (title.trim() && title.trim() !== column.title) {
                        run(() => saveColumnTitle(column.id, title));
                      }
                    }}
                  >
                    <input
                      className="kb-input"
                      name="title"
                      defaultValue={column.title}
                      maxLength={40}
                      autoFocus
                      aria-label="Column title"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setRenaming(null);
                      }}
                    />
                    <button className="btn btn-sm" type="submit">
                      Save
                    </button>
                  </form>
                ) : (
                  <>
                    <h2 className="kb-col-title">
                      {column.title}
                      <span className="kb-count">{cards.length}</span>
                    </h2>
                    <div className="kb-col-tools">
                      <button
                        type="button"
                        className="kb-icon"
                        aria-label={`Move ${column.title} left`}
                        disabled={columnIndex === 0}
                        onClick={() => run(() => relocateColumn(column.id, columnIndex - 1))}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="kb-icon"
                        aria-label={`Move ${column.title} right`}
                        disabled={columnIndex === board.columns.length - 1}
                        onClick={() => run(() => relocateColumn(column.id, columnIndex + 1))}
                      >
                        ›
                      </button>
                      <button
                        type="button"
                        className="kb-icon"
                        aria-label={`Rename ${column.title}`}
                        onClick={() => setRenaming(column.id)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="kb-icon kb-icon-danger"
                        aria-label={`Delete ${column.title}`}
                        onClick={() => run(() => deleteColumn(column.id))}
                      >
                        ×
                      </button>
                    </div>
                  </>
                )}
              </div>

              <ul className="kb-list">
                {cards.map((card, index) => {
                  const due = card.dueOn ? dueLabel(card.dueOn) : null;
                  const assignee = memberName(card.assigneeId);
                  const open = openCard === card.id;
                  return (
                    <li key={card.id}>
                      {dropAt?.columnId === column.id && dropAt.index === index ? (
                        <div className="kb-drop" aria-hidden="true" />
                      ) : null}
                      <article
                        className={`kb-card p-${card.priority}${dragging === card.id ? " kb-card-dragging" : ""}`}
                        draggable={!open}
                        onDragStart={() => setDragging(card.id)}
                        onDragEnd={() => {
                          setDragging(null);
                          setDropAt(null);
                        }}
                        onDragOver={(e) => {
                          if (!dragging) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const box = e.currentTarget.getBoundingClientRect();
                          const after = e.clientY > box.top + box.height / 2;
                          setDropAt({ columnId: column.id, index: index + (after ? 1 : 0) });
                        }}
                      >
                        <div className="kb-card-top">
                          <button
                            type="button"
                            className="kb-card-title"
                            aria-expanded={open}
                            onClick={() => setOpenCard(open ? null : card.id)}
                          >
                            {card.title}
                          </button>
                          <span className={`kb-pri kb-pri-${card.priority}`}>
                            {PRIORITY_LABEL[card.priority]}
                          </span>
                        </div>

                        {card.notes && !open ? (
                          <p className="kb-card-notes">{card.notes}</p>
                        ) : null}

                        <div className="kb-card-meta">
                          {assignee ? (
                            <span className="kb-chip">{assignee}</span>
                          ) : (
                            <span className="kb-chip kb-chip-muted">Unassigned</span>
                          )}
                          {due ? (
                            <span className={`kb-chip kb-due-${due.state}`}>{due.text}</span>
                          ) : null}
                          {card.requestTicket ? (
                            <a
                              className="kb-chip kb-chip-link"
                              href={`/dashboard/requests/${card.requestTicket}`}
                            >
                              {card.requestTicket}
                            </a>
                          ) : null}
                        </div>

                        <div className="kb-moves">
                          <button
                            type="button"
                            className="kb-icon"
                            aria-label={`Move ${card.title} to ${board.columns[columnIndex - 1]?.title ?? "the previous column"}`}
                            disabled={columnIndex === 0}
                            onClick={() => shift(card, -1)}
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            className="kb-icon"
                            aria-label={`Move ${card.title} up`}
                            disabled={index === 0}
                            onClick={() => nudge(card, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="kb-icon"
                            aria-label={`Move ${card.title} down`}
                            disabled={index === cards.length - 1}
                            onClick={() => nudge(card, 1)}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="kb-icon"
                            aria-label={`Move ${card.title} to ${board.columns[columnIndex + 1]?.title ?? "the next column"}`}
                            disabled={columnIndex === board.columns.length - 1}
                            onClick={() => shift(card, 1)}
                          >
                            →
                          </button>
                        </div>

                        {open ? (
                          <form
                            className="kb-edit"
                            action={(data) => {
                              setOpenCard(null);
                              run(() =>
                                saveCard(card.id, {
                                  title: String(data.get("title") ?? ""),
                                  notes: String(data.get("notes") ?? ""),
                                  assigneeId: String(data.get("assignee") ?? ""),
                                  priority: String(data.get("priority") ?? "normal"),
                                  dueOn: String(data.get("due") ?? ""),
                                  requestId: String(data.get("request") ?? ""),
                                }),
                              );
                            }}
                          >
                            <label className="kb-field">
                              <span className="kb-label">Title</span>
                              <input
                                className="kb-input"
                                name="title"
                                defaultValue={card.title}
                                maxLength={200}
                                required
                              />
                            </label>
                            <label className="kb-field">
                              <span className="kb-label">Notes</span>
                              <textarea
                                className="kb-textarea"
                                name="notes"
                                rows={4}
                                maxLength={5000}
                                defaultValue={card.notes ?? ""}
                              />
                            </label>
                            <div className="kb-edit-row">
                              <label className="kb-field">
                                <span className="kb-label">Assignee</span>
                                <select
                                  className="kb-select"
                                  name="assignee"
                                  defaultValue={card.assigneeId ?? ""}
                                >
                                  <option value="">Unassigned</option>
                                  {board.members.map((m) => (
                                    <option key={m.userId} value={m.userId}>
                                      {m.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="kb-field">
                                <span className="kb-label">Priority</span>
                                <select
                                  className="kb-select"
                                  name="priority"
                                  defaultValue={card.priority}
                                >
                                  <option value="low">Low</option>
                                  <option value="normal">Normal</option>
                                  <option value="high">High</option>
                                </select>
                              </label>
                              <label className="kb-field">
                                <span className="kb-label">Due</span>
                                <input
                                  className="kb-input"
                                  type="date"
                                  name="due"
                                  defaultValue={card.dueOn ?? ""}
                                />
                              </label>
                            </div>
                            <label className="kb-field">
                              <span className="kb-label">Linked request</span>
                              <select
                                className="kb-select"
                                name="request"
                                defaultValue={card.requestId ?? ""}
                              >
                                <option value="">None</option>
                                {requests.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.ticketId} — {r.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="kb-edit-actions">
                              <button className="btn btn-sm" type="submit">
                                Save
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                type="button"
                                onClick={() => setOpenCard(null)}
                              >
                                Cancel
                              </button>
                              <button
                                className="btn btn-ghost btn-sm kb-delete"
                                type="button"
                                onClick={() => {
                                  setOpenCard(null);
                                  run(() => deleteCard(card.id));
                                }}
                              >
                                Delete card
                              </button>
                            </div>
                          </form>
                        ) : null}
                      </article>
                    </li>
                  );
                })}
                {dropAt?.columnId === column.id && dropAt.index >= cards.length ? (
                  <li>
                    <div className="kb-drop" aria-hidden="true" />
                  </li>
                ) : null}
              </ul>

              {composing === column.id ? (
                <form
                  className="kb-compose"
                  action={(data) => {
                    const title = String(data.get("title") ?? "");
                    if (title.trim()) run(() => addCard(column.id, title));
                    setComposing(null);
                  }}
                >
                  <input
                    className="kb-input"
                    name="title"
                    placeholder="What needs doing?"
                    maxLength={200}
                    autoFocus
                    required
                    aria-label={`New card in ${column.title}`}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setComposing(null);
                    }}
                  />
                  <div className="kb-edit-actions">
                    <button className="btn btn-sm" type="submit">
                      Add
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => setComposing(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="kb-add"
                  onClick={() => setComposing(column.id)}
                >
                  + Add a card
                </button>
              )}
            </div>
          );
        })}

        <div className="kb-col kb-col-new">
          {addingColumn ? (
            <form
              className="kb-compose"
              action={(data) => {
                const title = String(data.get("title") ?? "");
                if (title.trim()) run(() => addColumn(title));
                setAddingColumn(false);
              }}
            >
              <input
                className="kb-input"
                name="title"
                placeholder="Column name"
                maxLength={40}
                autoFocus
                required
                aria-label="New column name"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setAddingColumn(false);
                }}
              />
              <div className="kb-edit-actions">
                <button className="btn btn-sm" type="submit">
                  Add
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => setAddingColumn(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="kb-add" onClick={() => setAddingColumn(true)}>
              + Add a column
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
