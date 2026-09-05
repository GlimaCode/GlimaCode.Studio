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
 * There is no revalidatePath in this file. The board is a live surface — it
 * re-reads on its own, both after its own writes and when the other person's
 * change arrives over the realtime channel — so invalidating the route cache
 * would only make the page flash without telling anyone anything new.
 */

async function requireTeam(): Promise<string> {
  const member = await currentTeamMember();
  if (!member) throw new Error("Not a team account.");
  return member.userId;
}

/** Re-read. Called by the client after its own writes and on live changes. */
export async function fetchBoard(): Promise<Board> {
  await requireTeam();
  return readBoard();
}

function cleanTitle(raw: string, limit: number, what: string): string {
  const title = raw.trim().replace(/\s+/g, " ");
  if (!title) throw new Error(`A ${what} needs a title.`);
  if (title.length > limit) {
    throw new Error(`That ${what} title is longer than ${limit} characters.`);
  }
  return title;
}

export async function addCard(columnId: string, title: string): Promise<Board> {
  const userId = await requireTeam();
  await appendCard({
    columnId,
    title: cleanTitle(title, 200, "card"),
    createdBy: userId,
  });
  return readBoard();
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
): Promise<Board> {
  await requireTeam();

  if (patch.priority !== undefined && !(PRIORITIES as readonly string[]).includes(patch.priority)) {
    throw new Error(`Unknown priority: ${patch.priority}`);
  }
  // A date input hands back "" for cleared, which is not a date. Postgres
  // would reject it, and the message it gives back is about syntax rather
  // than about the field the person was editing.
  const dueOn = patch.dueOn === "" ? null : patch.dueOn;

  await editCard(id, {
    ...(patch.title !== undefined ? { title: cleanTitle(patch.title, 200, "card") } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes?.trim() ? patch.notes : null } : {}),
    ...(patch.assigneeId !== undefined ? { assigneeId: patch.assigneeId || null } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority as Priority } : {}),
    ...(dueOn !== undefined ? { dueOn } : {}),
    ...(patch.requestId !== undefined ? { requestId: patch.requestId || null } : {}),
  });
  return readBoard();
}

export async function deleteCard(id: string): Promise<Board> {
  await requireTeam();
  await removeCard(id);
  return readBoard();
}

export async function relocateCard(
  id: string,
  columnId: string,
  index: number,
): Promise<Board> {
  await requireTeam();
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Bad index: ${index}`);
  }
  await moveCard(id, columnId, index);
  return readBoard();
}

export async function addColumn(title: string): Promise<Board> {
  await requireTeam();
  await appendColumn(cleanTitle(title, 40, "column"));
  return readBoard();
}

export async function saveColumnTitle(id: string, title: string): Promise<Board> {
  await requireTeam();
  await renameColumn(id, cleanTitle(title, 40, "column"));
  return readBoard();
}

export async function deleteColumn(id: string): Promise<Board> {
  await requireTeam();
  await removeColumn(id);
  return readBoard();
}

export async function relocateColumn(id: string, index: number): Promise<Board> {
  await requireTeam();
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Bad index: ${index}`);
  }
  await moveColumn(id, index);
  return readBoard();
}
