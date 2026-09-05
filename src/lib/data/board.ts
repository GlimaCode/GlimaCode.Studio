import { sessionClient } from "@/lib/auth/session";

/**
 * The team board.
 *
 * Every call here runs on the signed-in member's session, so row-level
 * security is what actually authorises it — the same arrangement as
 * src/lib/data/admin.ts, and for the same reason: there is no service key
 * anywhere in this codebase, so there is no path that can accidentally read
 * past a policy.
 *
 * Positions are fractional doubles. Moving a card is a single write of one
 * number, computed as the midpoint of its new neighbours, so two people
 * dragging different cards at the same time do not have to agree about
 * anything. See `between()` for what happens when the midpoints run out of
 * room, which they eventually do.
 */

export const PRIORITIES = ["low", "normal", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export type BoardColumn = {
  id: string;
  title: string;
  position: number;
};

export type BoardCard = {
  id: string;
  columnId: string;
  title: string;
  notes: string | null;
  assigneeId: string | null;
  priority: Priority;
  dueOn: string | null;
  requestId: string | null;
  requestTicket: string | null;
  position: number;
  createdBy: string | null;
  updatedAt: string;
};

export type BoardMember = {
  userId: string;
  name: string;
};

export type Board = {
  columns: BoardColumn[];
  cards: BoardCard[];
  members: BoardMember[];
};

/** The gap that new positions are placed at when there is no neighbour. */
const STEP = 1000;

/**
 * A position between two neighbours, either of which may be absent.
 *
 * Returns null when the two are so close that the midpoint would not be
 * representable as a distinct double — about 1e-9 apart, which takes roughly
 * fifty consecutive drops into the same gap. The caller answers that by
 * renumbering the column, which is the only operation on this board that
 * writes more than one row.
 */
function between(before: number | null, after: number | null): number | null {
  if (before === null && after === null) return STEP;
  if (before === null) return (after as number) - STEP;
  if (after === null) return before + STEP;
  const mid = (before + after) / 2;
  if (mid <= before || mid >= after) return null;
  return mid;
}

type ColumnRow = { id: string; title: string; position: number };
type CardRow = {
  id: string;
  column_id: string;
  title: string;
  notes: string | null;
  assignee_id: string | null;
  priority: Priority;
  due_on: string | null;
  request_id: string | null;
  position: number;
  created_by: string | null;
  updated_at: string;
  requests: { ticket_id: string } | { ticket_id: string }[] | null;
};

function toCard(row: CardRow): BoardCard {
  // The join comes back as an object or a one-element array depending on how
  // the relationship is inferred; normalise rather than depend on which.
  const joined = Array.isArray(row.requests) ? row.requests[0] : row.requests;
  return {
    id: row.id,
    columnId: row.column_id,
    title: row.title,
    notes: row.notes,
    assigneeId: row.assignee_id,
    priority: row.priority,
    dueOn: row.due_on,
    requestId: row.request_id,
    requestTicket: joined?.ticket_id ?? null,
    position: row.position,
    createdBy: row.created_by,
    updatedAt: row.updated_at,
  };
}

/** The whole board. It is two people's task list; it is not paginated. */
export async function readBoard(): Promise<Board> {
  const client = await sessionClient();

  const [columns, cards, members] = await Promise.all([
    client.from("board_columns").select("id, title, position").order("position"),
    client
      .from("board_cards")
      .select(
        "id, column_id, title, notes, assignee_id, priority, due_on, request_id, position, created_by, updated_at, requests ( ticket_id )",
      )
      .order("position"),
    client.from("team_members").select("user_id, name").order("name"),
  ]);

  if (columns.error) throw new Error(columns.error.message);
  if (cards.error) throw new Error(cards.error.message);
  if (members.error) throw new Error(members.error.message);

  return {
    columns: (columns.data as ColumnRow[]).map((c) => ({
      id: c.id,
      title: c.title,
      position: c.position,
    })),
    cards: (cards.data as unknown as CardRow[]).map(toCard),
    members: (members.data as { user_id: string; name: string }[]).map((m) => ({
      userId: m.user_id,
      name: m.name,
    })),
  };
}

/** Positions of one column's cards, in order, for placing a move. */
async function columnPositions(columnId: string): Promise<number[]> {
  const client = await sessionClient();
  const { data, error } = await client
    .from("board_cards")
    .select("position")
    .eq("column_id", columnId)
    .order("position");
  if (error) throw new Error(error.message);
  return (data as { position: number }[]).map((r) => r.position);
}

export async function appendCard(input: {
  columnId: string;
  title: string;
  createdBy: string;
}): Promise<void> {
  const client = await sessionClient();
  const positions = await columnPositions(input.columnId);
  const last = positions.length ? positions[positions.length - 1] : null;

  const { error } = await client.from("board_cards").insert({
    column_id: input.columnId,
    title: input.title,
    position: between(last, null),
    created_by: input.createdBy,
  });
  if (error) throw new Error(error.message);
}

export async function editCard(
  id: string,
  patch: {
    title?: string;
    notes?: string | null;
    assigneeId?: string | null;
    priority?: Priority;
    dueOn?: string | null;
    requestId?: string | null;
  },
): Promise<void> {
  const client = await sessionClient();
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.assigneeId !== undefined) row.assignee_id = patch.assigneeId;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.dueOn !== undefined) row.due_on = patch.dueOn;
  if (patch.requestId !== undefined) row.request_id = patch.requestId;
  if (Object.keys(row).length === 0) return;

  const { error } = await client.from("board_cards").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeCard(id: string): Promise<void> {
  const client = await sessionClient();
  const { error } = await client.from("board_cards").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Put a card immediately before `beforeCardId`, or at the end when it is null.
 *
 * Anchored to a neighbour rather than to an index, because an index is
 * ambiguous the moment the caller is looking at a filtered board: the client
 * knows which card it wants to land above, and that card's identity survives
 * filtering, another person's concurrent move, and the difference between the
 * list-with-the-dragged-card-still-in-it that the browser draws and the
 * list-without-it that this function places into. The first version took an
 * index and got all three of those wrong.
 *
 * An anchor that is no longer in the column — someone else moved or deleted it
 * while the drag was in the air — falls back to the end, which is where a
 * dropped card goes when its target has gone.
 *
 * When the midpoints run out, the column is renumbered on `STEP` boundaries
 * and the move is placed again. That is the only multi-row write here, and it
 * is rare: the gap halves on each drop into the same place, so it takes about
 * fifty of them.
 */
export async function moveCard(
  id: string,
  columnId: string,
  beforeCardId: string | null,
): Promise<void> {
  const client = await sessionClient();

  const { data, error } = await client
    .from("board_cards")
    .select("id, position")
    .eq("column_id", columnId)
    .order("position");
  if (error) throw new Error(error.message);

  const others = (data as { id: string; position: number }[]).filter(
    (r) => r.id !== id,
  );
  const anchor = beforeCardId
    ? others.findIndex((r) => r.id === beforeCardId)
    : -1;
  const at = anchor === -1 ? others.length : anchor;
  const before = at > 0 ? others[at - 1].position : null;
  const after = at < others.length ? others[at].position : null;

  let position = between(before, after);

  if (position === null) {
    // Renumber, then place again in the same slot. Sequential rather than
    // parallel so the writes cannot interleave into a new collision.
    for (let i = 0; i < others.length; i++) {
      const { error: spread } = await client
        .from("board_cards")
        .update({ position: (i + 1) * STEP })
        .eq("id", others[i].id);
      if (spread) throw new Error(spread.message);
    }
    const beforeNow = at > 0 ? at * STEP : null;
    const afterNow = at < others.length ? (at + 1) * STEP : null;
    position = between(beforeNow, afterNow);
  }

  const { error: moved } = await client
    .from("board_cards")
    .update({ column_id: columnId, position })
    .eq("id", id);
  if (moved) throw new Error(moved.message);
}

export async function appendColumn(title: string): Promise<void> {
  const client = await sessionClient();
  const { data, error } = await client
    .from("board_columns")
    .select("position")
    .order("position");
  if (error) throw new Error(error.message);

  const positions = (data as { position: number }[]).map((r) => r.position);
  const last = positions.length ? positions[positions.length - 1] : null;

  const { error: added } = await client
    .from("board_columns")
    .insert({ title, position: between(last, null) });
  if (added) throw new Error(added.message);
}

export async function renameColumn(id: string, title: string): Promise<void> {
  const client = await sessionClient();
  const { error } = await client
    .from("board_columns")
    .update({ title })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Deletes the column, or reports how many cards stopped it.
 *
 * Returns null on success and the blocking count otherwise, rather than
 * throwing: the count becomes a sentence for a person to read, and a thrown
 * message would be redacted before it got to them in a production build.
 *
 * The foreign key cascades, so the database would take the cards with it
 * without complaint. That is the right backstop and the wrong default: one
 * mis-click should not be able to delete a fortnight of notes, and the
 * cascade cannot ask. The count is the real one, not the filtered one — the
 * client's search box must not be able to make a column look empty.
 */
export async function removeColumn(id: string): Promise<number | null> {
  const client = await sessionClient();
  const { count, error } = await client
    .from("board_cards")
    .select("id", { count: "exact", head: true })
    .eq("column_id", id);
  if (error) throw new Error(error.message);
  if (count && count > 0) return count;

  const { error: removed } = await client
    .from("board_columns")
    .delete()
    .eq("id", id);
  if (removed) throw new Error(removed.message);
  return null;
}

/** Put a column at `index`, counting the board without it. */
export async function moveColumn(id: string, index: number): Promise<void> {
  const client = await sessionClient();
  const { data, error } = await client
    .from("board_columns")
    .select("id, position")
    .order("position");
  if (error) throw new Error(error.message);

  const others = (data as { id: string; position: number }[]).filter(
    (r) => r.id !== id,
  );
  const at = Math.max(0, Math.min(index, others.length));
  const before = at > 0 ? others[at - 1].position : null;
  const after = at < others.length ? others[at].position : null;

  let position = between(before, after);
  if (position === null) {
    for (let i = 0; i < others.length; i++) {
      const { error: spread } = await client
        .from("board_columns")
        .update({ position: (i + 1) * STEP })
        .eq("id", others[i].id);
      if (spread) throw new Error(spread.message);
    }
    const beforeNow = at > 0 ? at * STEP : null;
    const afterNow = at < others.length ? (at + 1) * STEP : null;
    position = between(beforeNow, afterNow);
  }

  const { error: moved } = await client
    .from("board_columns")
    .update({ position })
    .eq("id", id);
  if (moved) throw new Error(moved.message);
}

/**
 * Requests offered in a card's "linked request" picker.
 *
 * Capped at the sixty newest, which is a list length decision and nearly
 * became a data-loss one: the edit form submits every field every time, so a
 * card linked to the sixty-first request would find no matching option, submit
 * an empty value and quietly unlink itself the next time anyone touched it.
 * The client puts the card's own request back into the list when it is missing
 * from this one — see the picker in Board.tsx.
 *
 * Only the reference and the name, never the address or the brief. The same
 * rule the triage list follows, and for the same reason: this is a surface
 * left open on a screen.
 */
export async function linkableRequests(): Promise<
  { id: string; ticketId: string; name: string }[]
> {
  const client = await sessionClient();
  const { data, error } = await client
    .from("requests")
    .select("id, ticket_id, name")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return (data as { id: string; ticket_id: string; name: string }[]).map((r) => ({
    id: r.id,
    ticketId: r.ticket_id,
    name: r.name,
  }));
}
