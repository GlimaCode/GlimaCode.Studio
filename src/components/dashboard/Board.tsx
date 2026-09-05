"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
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
  type BoardResult,
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
 * MOVES ARE ANCHORED, NOT INDEXED. A move says "put this card above that one",
 * never "put it at slot 3". Three different lists are in play — what the
 * browser draws (which still contains the card being dragged), what the filter
 * leaves visible, and what the column actually holds — and an index means a
 * different thing in each. The first version of this used indices and dropped
 * cards one slot below the line it had just drawn, or somewhere else entirely
 * when a search was active. A neighbour's identity survives all three.
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

/**
 * Whether we are past hydration.
 *
 * useSyncExternalStore rather than a state set in an effect, which is the
 * pattern the theme switch and the showcase already use here and the one the
 * lint rule asks for: it gives React a different snapshot on the server and
 * the client, which is exactly the question being asked.
 */
const neverChanges = () => () => {};
const onClient = () => true;
const onServer = () => false;

/** Where a move puts a card: above `before`, or last when that is null. */
type Anchor = { columnId: string; before: string | null };

function sameAnchor(a: Anchor | null, b: Anchor | null): boolean {
  return !!a && !!b && a.columnId === b.columnId && a.before === b.before;
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
  const [dropAt, setDropAt] = useState<Anchor | null>(null);

  /**
   * Relative dates are computed after mount and not before.
   *
   * "Today" depends on the reader's clock, the server's is in UTC, and both
   * developers are at UTC+3:30 — so a card due today rendered as "tomorrow" in
   * the served HTML and then changed after hydration, which React reports as a
   * mismatch and a reader experiences as the date moving.
   */
  const mounted = useSyncExternalStore(neverChanges, onClient, onServer);

  /**
   * The echo window.
   *
   * Postgres replays our own writes back to us over the same channel, and the
   * replay arrives *after* the action has resolved — so a flag cleared in a
   * `finally` is already false by the time the echo lands, and every local
   * change cost a second full read and announced "Board updated." to the
   * person who had just made it. A timestamp closes the window for long enough
   * to cover the replay instead.
   */
  const quietUntil = useRef(0);

  /** Which control to put focus back on once the board has re-rendered. */
  const refocus = useRef<string | null>(null);

  const run = useCallback((work: () => Promise<BoardResult>) => {
    setError(null);
    quietUntil.current = Date.now() + 4000;
    startTransition(async () => {
      let result: BoardResult;
      try {
        result = await work();
      } catch {
        // Unexpected: the action threw rather than refusing. Its real message
        // is redacted in production and is in the server log.
        result = { ok: false, message: "Something went wrong. Nothing changed." };
      }
      if (result.ok) {
        setBoard(result.board);
      } else {
        setError(result.message);
        // Put the optimistic state back where the server says it is.
        const fresh = await fetchBoard().catch(() => null);
        if (fresh?.ok) setBoard(fresh.board);
      }
      quietUntil.current = Date.now() + 1200;
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
        if (!alive) return;
        // Our own echo. Try again after the window rather than dropping it:
        // a remote change that lands in the same window is somebody else's and
        // must not be lost.
        if (Date.now() < quietUntil.current) {
          timer = window.setTimeout(refresh, 300);
          return;
        }
        const next = await fetchBoard().catch(() => null);
        if (!alive || !next?.ok) return;
        setBoard(next.board);
        setNotice("Board updated.");
      }, 250);
    };

    const channel = client
      .channel("board")
      .on("postgres_changes", { event: "*", schema: "public", table: "board_cards" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "board_columns" }, refresh)
      .subscribe();

    // A dropped socket is silent by design, so ask for the board whenever the
    // tab comes back. Cheap, and it is the moment someone looks at a board
    // that may have been stale for an hour.
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      client.removeChannel(channel);
    };
  }, []);

  // One timer for the notice, cleared on every change, so a second update
  // cannot wipe the first one's message early or leave one behind on unmount.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /**
   * Put focus back after a move.
   *
   * A move re-parents the card into a different list, so React unmounts the
   * button that was pressed and focus falls to the body. For someone working
   * the board from the keyboard that ends the interaction on every single
   * press. Layout effect rather than effect: before paint, so the ring does
   * not visibly jump.
   */
  useLayoutEffect(() => {
    const key = refocus.current;
    if (!key) return;
    refocus.current = null;
    const target = document.querySelector<HTMLElement>(`[data-focus-key="${key}"]`);
    target?.focus();
  }, [board]);

  const memberName = useCallback(
    (id: string | null) => board.members.find((m) => m.userId === id)?.name ?? null,
    [board.members],
  );

  /**
   * Cards in draw order.
   *
   * Sorted by position rather than trusting the array. The server returns them
   * ordered, but an optimistic move rewrites one card's position without
   * moving it in the array — so without this the card sat wherever it already
   * was until the round trip finished, which for a drag to the top of a column
   * meant watching it stay at the bottom and then jump.
   */
  const ordered = useMemo(
    () => [...board.cards].sort((a, b) => a.position - b.position),
    [board.cards],
  );

  const filtering = who !== "all" || query.trim() !== "";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ordered.filter((card) => {
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
  }, [ordered, who, query, me]);

  const byColumn = useCallback(
    (columnId: string) => visible.filter((c) => c.columnId === columnId),
    [visible],
  );
  const allIn = useCallback(
    (columnId: string) => ordered.filter((c) => c.columnId === columnId),
    [ordered],
  );

  /** Move `card` so it sits immediately above `anchor.before`. */
  const moveTo = (card: BoardCard, anchor: Anchor, focusKey?: string) => {
    if (focusKey) refocus.current = focusKey;

    // Optimistic: give it the position it will get, so it is drawn where it
    // was dropped rather than after the round trip. Same arithmetic the
    // repository uses, against the same card-removed list.
    setBoard((prev) => {
      const rest = prev.cards.filter((c) => c.id !== card.id);
      const target = rest
        .filter((c) => c.columnId === anchor.columnId)
        .sort((a, b) => a.position - b.position);
      const at = anchor.before
        ? target.findIndex((c) => c.id === anchor.before)
        : -1;
      const index = at === -1 ? target.length : at;
      const before = index > 0 ? target[index - 1].position : null;
      const after = index < target.length ? target[index].position : null;
      const position =
        before === null && after === null
          ? 1000
          : before === null
            ? (after as number) - 1000
            : after === null
              ? before + 1000
              : (before + after) / 2;
      return {
        ...prev,
        cards: [...rest, { ...card, columnId: anchor.columnId, position }],
      };
    });

    run(() => relocateCard(card.id, anchor.columnId, anchor.before));
  };

  const columnOf = (card: BoardCard) =>
    board.columns.findIndex((c) => c.id === card.columnId);

  /** Sideways: to the end of the neighbouring column. */
  const shift = (card: BoardCard, by: -1 | 1) => {
    const next = board.columns[columnOf(card) + by];
    if (!next) return;
    moveTo(card, { columnId: next.id, before: null }, `${card.id}:${by < 0 ? "left" : "right"}`);
  };

  /**
   * Up or down one place among the cards actually on screen.
   *
   * Anchored to the visible neighbour, so with a filter on, "down" means below
   * the card you can see below it — which is what the person means — and the
   * hidden cards keep their own places rather than being stepped over.
   */
  const nudge = (card: BoardCard, by: -1 | 1) => {
    const shown = byColumn(card.columnId);
    const at = shown.findIndex((c) => c.id === card.id);
    if (at === -1) return;
    const key = `${card.id}:${by < 0 ? "up" : "down"}`;
    if (by < 0) {
      if (at === 0) return;
      moveTo(card, { columnId: card.columnId, before: shown[at - 1].id }, key);
    } else {
      if (at >= shown.length - 1) return;
      // Below the next one, which is above the one after that.
      moveTo(
        card,
        { columnId: card.columnId, before: shown[at + 2]?.id ?? null },
        key,
      );
    }
  };

  return (
    <div className="kb">
      <div className="kb-bar">
        <div className="kb-filters">
          <label className="kb-field">
            <span className="kb-label">Assignee</span>
            <select className="kb-select" value={who} onChange={(e) => setWho(e.target.value)}>
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
          Showing {visible.length} of {board.cards.length} cards. Moves are
          anchored to the card you can see, so the hidden ones keep their places.
        </p>
      ) : null}

      <div className="kb-cols">
        {board.columns.map((column, columnIndex) => {
          const cards = byColumn(column.id);
          const total = allIn(column.id).length;
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
              aria-label={`${column.title}, ${total} card${total === 1 ? "" : "s"}`}
              onDragOver={(e) => {
                if (!dragging) return;
                e.preventDefault();
                // Over the column but not over a card: the end of it.
                if (dropAt?.columnId !== column.id || dropAt.before !== null) {
                  setDropAt({ columnId: column.id, before: null });
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const card = board.cards.find((c) => c.id === dragging);
                if (card && dropAt) moveTo(card, dropAt);
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
                      <span className="kb-count">
                        {filtering && cards.length !== total
                          ? `${cards.length}/${total}`
                          : total}
                      </span>
                    </h2>
                    <div className="kb-col-tools">
                      <button
                        type="button"
                        className="kb-icon"
                        data-focus-key={`col:${column.id}:left`}
                        aria-label={`Move the ${column.title} column left`}
                        disabled={columnIndex === 0}
                        onClick={() => {
                          refocus.current = `col:${column.id}:left`;
                          run(() => relocateColumn(column.id, columnIndex - 1));
                        }}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="kb-icon"
                        data-focus-key={`col:${column.id}:right`}
                        aria-label={`Move the ${column.title} column right`}
                        disabled={columnIndex === board.columns.length - 1}
                        onClick={() => {
                          refocus.current = `col:${column.id}:right`;
                          run(() => relocateColumn(column.id, columnIndex + 1));
                        }}
                      >
                        ›
                      </button>
                      <button
                        type="button"
                        className="kb-icon"
                        aria-label={`Rename the ${column.title} column`}
                        onClick={() => setRenaming(column.id)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="kb-icon kb-icon-danger"
                        aria-label={`Delete the ${column.title} column`}
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
                  const assignee = memberName(card.assigneeId);
                  const open = openCard === card.id;
                  const here: Anchor = { columnId: column.id, before: card.id };
                  return (
                    <li key={card.id}>
                      {sameAnchor(dropAt, here) ? (
                        <div className="kb-drop" aria-hidden="true" />
                      ) : null}
                      <article
                        className={`kb-card p-${card.priority}${dragging === card.id ? " kb-card-dragging" : ""}`}
                        draggable={!open}
                        onDragStart={(e) => {
                          // Firefox starts no drag at all without a payload.
                          e.dataTransfer.setData("text/plain", card.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragging(card.id);
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setDropAt(null);
                        }}
                        onDragOver={(e) => {
                          if (!dragging) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const box = e.currentTarget.getBoundingClientRect();
                          const below = e.clientY > box.top + box.height / 2;
                          // Above this card, or above the next one — never an
                          // index, so the line drawn and the card's landing
                          // place are the same fact.
                          setDropAt({
                            columnId: column.id,
                            before: below ? (cards[index + 1]?.id ?? null) : card.id,
                          });
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
                          {card.dueOn ? <Due iso={card.dueOn} live={mounted} /> : null}
                          {card.requestTicket ? (
                            <a
                              className="kb-chip kb-chip-link"
                              href={`/dashboard/requests/${card.requestTicket}`}
                            >
                              {card.requestTicket}
                            </a>
                          ) : null}
                        </div>

                        {/* Hidden while the editor is open: a move re-renders
                            the card and would take everything typed with it. */}
                        {open ? null : (
                          <div className="kb-moves">
                            <button
                              type="button"
                              className="kb-icon"
                              data-focus-key={`${card.id}:left`}
                              aria-label={`Move ${card.title} to ${board.columns[columnIndex - 1]?.title ?? "the previous column"}`}
                              disabled={columnIndex === 0}
                              onClick={() => shift(card, -1)}
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              className="kb-icon"
                              data-focus-key={`${card.id}:up`}
                              aria-label={`Move ${card.title} up`}
                              disabled={index === 0}
                              onClick={() => nudge(card, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="kb-icon"
                              data-focus-key={`${card.id}:down`}
                              aria-label={`Move ${card.title} down`}
                              disabled={index === cards.length - 1}
                              onClick={() => nudge(card, 1)}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="kb-icon"
                              data-focus-key={`${card.id}:right`}
                              aria-label={`Move ${card.title} to ${board.columns[columnIndex + 1]?.title ?? "the next column"}`}
                              disabled={columnIndex === board.columns.length - 1}
                              onClick={() => shift(card, 1)}
                            >
                              →
                            </button>
                          </div>
                        )}

                        {open ? (
                          <CardEditor
                            card={card}
                            members={board.members}
                            requests={requests}
                            onCancel={() => setOpenCard(null)}
                            onSave={(patch) => {
                              setOpenCard(null);
                              run(() => saveCard(card.id, patch));
                            }}
                            onDelete={() => {
                              setOpenCard(null);
                              run(() => deleteCard(card.id));
                            }}
                          />
                        ) : null}
                      </article>
                    </li>
                  );
                })}
                {sameAnchor(dropAt, { columnId: column.id, before: null }) ? (
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

/**
 * A due date.
 *
 * Absolute until the component has mounted, relative afterwards. "Today"
 * depends on the reader's clock and the server renders in UTC; both developers
 * are at UTC+3:30, where a card due today would otherwise be served as
 * "tomorrow" and then change under them.
 */
function Due({ iso, live }: { iso: string; live: boolean }) {
  const absolute = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso + "T00:00:00"));

  if (!live) {
    return <span className="kb-chip kb-due-later">{absolute}</span>;
  }

  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(iso + "T00:00:00");
  const days = Math.round((due.getTime() - midnight.getTime()) / 86400000);

  if (days < 0) {
    return (
      <span className="kb-chip kb-due-past">
        {-days}d overdue
      </span>
    );
  }
  if (days === 0) return <span className="kb-chip kb-due-soon">today</span>;
  if (days === 1) return <span className="kb-chip kb-due-soon">tomorrow</span>;
  if (days <= 6) return <span className="kb-chip kb-due-soon">in {days}d</span>;
  return <span className="kb-chip kb-due-later">{absolute}</span>;
}

type EditorProps = {
  card: BoardCard;
  members: { userId: string; name: string }[];
  requests: { id: string; ticketId: string; name: string }[];
  onCancel: () => void;
  onSave: (patch: {
    title: string;
    notes: string;
    assigneeId: string;
    priority: string;
    dueOn: string;
    requestId: string;
  }) => void;
  onDelete: () => void;
};

function CardEditor({ card, members, requests, onCancel, onSave, onDelete }: EditorProps) {
  const first = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    first.current?.focus();
    first.current?.select();
  }, []);

  /**
   * The card's own request, even when it is older than the sixty offered.
   *
   * Without this the select has no option matching the card, submits an empty
   * value, and quietly unlinks a request the moment anyone opens and saves the
   * card for an unrelated reason.
   */
  const options = requests.some((r) => r.id === card.requestId)
    ? requests
    : card.requestId
      ? [
          {
            id: card.requestId,
            ticketId: card.requestTicket ?? "linked request",
            name: "currently linked",
          },
          ...requests,
        ]
      : requests;

  return (
    <form
      className="kb-edit"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onCancel();
        }
      }}
      action={(data) =>
        onSave({
          title: String(data.get("title") ?? ""),
          notes: String(data.get("notes") ?? ""),
          assigneeId: String(data.get("assignee") ?? ""),
          priority: String(data.get("priority") ?? "normal"),
          dueOn: String(data.get("due") ?? ""),
          requestId: String(data.get("request") ?? ""),
        })
      }
    >
      <label className="kb-field">
        <span className="kb-label">Title</span>
        <input
          ref={first}
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
          <select className="kb-select" name="assignee" defaultValue={card.assigneeId ?? ""}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="kb-field">
          <span className="kb-label">Priority</span>
          <select className="kb-select" name="priority" defaultValue={card.priority}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="kb-field">
          <span className="kb-label">Due</span>
          <input className="kb-input" type="date" name="due" defaultValue={card.dueOn ?? ""} />
        </label>
      </div>
      <label className="kb-field">
        <span className="kb-label">Linked request</span>
        <select className="kb-select" name="request" defaultValue={card.requestId ?? ""}>
          <option value="">None</option>
          {options.map((r) => (
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
        <button className="btn btn-ghost btn-sm" type="button" onClick={onCancel}>
          Cancel
        </button>
        {confirming ? (
          <>
            <span className="kb-confirm">Delete for both of us?</span>
            <button
              className="btn btn-ghost btn-sm kb-delete"
              type="button"
              onClick={onDelete}
            >
              Yes, delete
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => setConfirming(false)}
            >
              Keep
            </button>
          </>
        ) : (
          <button
            className="btn btn-ghost btn-sm kb-delete"
            type="button"
            onClick={() => setConfirming(true)}
          >
            Delete card
          </button>
        )}
      </div>
    </form>
  );
}
