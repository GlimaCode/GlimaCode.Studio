"use server";

import { currentTeamMember } from "@/lib/auth/session";
import {
  PRIORITIES,
  appendCard,
  appendColumn,
  editCard,
  moveCard,
  moveColumn,
  readBoard,
  removeCard,
  removeColumn,
  renameColumn,
  type Board,
  type Priority,
} from "@/lib/data/board";

/**
 * Board actions.
 *
 * Every one re-checks team membership first, on the same reasoning as the
 * triage actions: row-level security is the real control and would refuse a
 * non-member anyway, but failing here turns a silent no-op into a refusal the
 * caller can see.
 *
 * WHY THESE RETURN A RESULT INSTEAD OF THROWING
 *
 * Next.js redacts errors thrown out of a server action in a production build.
 * The client receives "An error occurred in the Server Components render" and
 * a digest, and nothing else — so every message written here for a person to
 * read ("That column still has 3 cards in it. Move them first.") reached
 * nobody outside development. Expected failures are values, not exceptions,
 * and travel as values.
 *
 * Unexpected failures still throw, and are still redacted, which is right:
 * a database error message is not something to put on a screen.
 *
 * There is no revalidatePath in this file. The board is a live surface — it
 * re-reads on its own, both after its own writes and when the other person's
 * change arrives over the realtime channel — so invalidating the route cache
 * would only make the page flash without telling anyone anything new.
 */

export type BoardResult =
  | { ok: true; board: Board }
  | { ok: false; message: string };

/** Thrown for the failures a person is meant to read, and caught below. */
class Refused extends Error {}

async function requireTeam(): Promise<string> {
  const member = await currentTeamMember();
  if (!member) throw new Refused("Not a team account.");
  return member.userId;
}

/**
 * Runs the work and turns a Refused into a value.
 *
 * Anything else propagates: an unexpected error should reach the logs as an
 * error, not be flattened into a sentence on a card.
 */
async function attempt(work: () => Promise<void>): Promise<BoardResult> {
  try {
    await work();
  } catch (e) {
    if (e instanceof Refused) return { ok: false, message: e.message };
    // The repository throws plain Errors carrying the database's own message.
    // Those are for us, not for the person: say something true and generic and
    // let the real one go to the server log.
    console.error("[board]", e);
    return { ok: false, message: "The database refused that. Nothing changed." };
  }
  return { ok: true, board: await readBoard() };
}

/** Re-read. Called by the client after its own writes and on live changes. */
export async function fetchBoard(): Promise<BoardResult> {
  return attempt(async () => {
    await requireTeam();
  });
}

function cleanTitle(raw: string, limit: number, what: string): string {
  const title = raw.trim().replace(/\s+/g, " ");
  if (!title) throw new Refused(`A ${what} needs a title.`);
  if (title.length > limit) {
    throw new Refused(`That ${what} title is longer than ${limit} characters.`);
  }
  return title;
}

export async function addCard(columnId: string, title: string): Promise<BoardResult> {
  return attempt(async () => {
    const userId = await requireTeam();
    await appendCard({
      columnId,
      title: cleanTitle(title, 200, "card"),
      createdBy: userId,
    });
  });
}

export async function saveCard(
  id: string,
  patch: {
    title?: string;
    notes?: string | null;
    assigneeId?: string | null;
    priority?: string;
    dueOn?: string | null;
    requestId?: string | null;
  },
): Promise<BoardResult> {
  return attempt(async () => {
    await requireTeam();

    if (
      patch.priority !== undefined &&
      !(PRIORITIES as readonly string[]).includes(patch.priority)
    ) {
      throw new Refused(`Unknown priority: ${patch.priority}`);
    }
    // A date input hands back "" for cleared, which is not a date. Postgres
    // would reject it, and the message it gives back is about syntax rather
    // than about the field the person was editing.
    const dueOn = patch.dueOn === "" ? null : patch.dueOn;

    await editCard(id, {
      ...(patch.title !== undefined
        ? { title: cleanTitle(patch.title, 200, "card") }
        : {}),
      ...(patch.notes !== undefined
        ? { notes: patch.notes?.trim() ? patch.notes : null }
        : {}),
      ...(patch.assigneeId !== undefined
        ? { assigneeId: patch.assigneeId || null }
        : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority as Priority } : {}),
      ...(dueOn !== undefined ? { dueOn } : {}),
      ...(patch.requestId !== undefined ? { requestId: patch.requestId || null } : {}),
    });
  });
}

export async function deleteCard(id: string): Promise<BoardResult> {
  return attempt(async () => {
    await requireTeam();
    await removeCard(id);
  });
}

/**
 * Put a card immediately before `beforeCardId`, or at the end when it is null.
 *
 * An anchor rather than an index. The client renders a filtered view and knows
 * the card it wants to land above; an index would have to mean the same thing
 * in the filtered list and in the column, and it does not — which is how the
 * first version of this dropped cards a slot below the line it had drawn, and
 * dropped them somewhere else entirely when a search was active.
 */
export async function relocateCard(
  id: string,
  columnId: string,
  beforeCardId: string | null,
): Promise<BoardResult> {
  return attempt(async () => {
    await requireTeam();
    await moveCard(id, columnId, beforeCardId);
  });
}

export async function addColumn(title: string): Promise<BoardResult> {
  return attempt(async () => {
    await requireTeam();
    await appendColumn(cleanTitle(title, 40, "column"));
  });
}

export async function saveColumnTitle(
  id: string,
  title: string,
): Promise<BoardResult> {
  return attempt(async () => {
    await requireTeam();
    await renameColumn(id, cleanTitle(title, 40, "column"));
  });
}

export async function deleteColumn(id: string): Promise<BoardResult> {
  return attempt(async () => {
    await requireTeam();
    const cards = await removeColumn(id);
    if (cards !== null) {
      throw new Refused(
        `That column still has ${cards} card${cards === 1 ? "" : "s"} in it. Move them first.`,
      );
    }
  });
}

export async function relocateColumn(
  id: string,
  index: number,
): Promise<BoardResult> {
  return attempt(async () => {
    await requireTeam();
    if (!Number.isInteger(index) || index < 0) {
      throw new Refused(`Bad index: ${index}`);
    }
    await moveColumn(id, index);
  });
}
