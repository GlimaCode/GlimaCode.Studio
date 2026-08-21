"use server";

import { revalidatePath } from "next/cache";
import { sessionClient, currentTeamMember } from "@/lib/auth/session";
import { REQUEST_STATUSES, type RequestStatus } from "@/lib/data/admin";

/**
 * Triage and portfolio actions.
 *
 * Every one re-checks team membership before touching anything. Row-level
 * security would refuse a non-member anyway — that is the real control — but
 * failing here means a stranger with a session gets a refusal instead of a
 * silent no-op they might mistake for success.
 */

async function requireTeam(): Promise<void> {
  const member = await currentTeamMember();
  if (!member) throw new Error("Not a team account.");
}

export async function setRequestStatus(
  ticketId: string,
  status: string,
): Promise<void> {
  await requireTeam();
  if (!(REQUEST_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`Unknown status: ${status}`);
  }

  const client = await sessionClient();
  const { error } = await client
    .from("requests")
    .update({ status: status as RequestStatus })
    .eq("ticket_id", ticketId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/requests/${ticketId}`);
}

export async function saveRequestNotes(
  ticketId: string,
  notes: string,
): Promise<void> {
  await requireTeam();
  const client = await sessionClient();
  const { error } = await client
    .from("requests")
    .update({ notes: notes.trim() || null })
    .eq("ticket_id", ticketId);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/requests/${ticketId}`);
}

export async function setProjectPublished(
  id: string,
  published: boolean,
): Promise<void> {
  await requireTeam();
  const client = await sessionClient();
  const { error } = await client
    .from("portfolio_projects")
    .update({ published })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/portfolio");
  // The public pages read the same rows, so they have to be refreshed too.
  revalidatePath("/en/work");
  revalidatePath("/fa/work");
}

export async function moveProject(id: string, delta: number): Promise<void> {
  await requireTeam();
  const client = await sessionClient();

  const { data: rows, error } = await client
    .from("portfolio_projects")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  if (error || !rows) throw new Error(error?.message ?? "Could not read the order.");

  const index = rows.findIndex((row) => row.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= rows.length) return;

  // Swap the two sort values rather than renumbering everything, so a
  // reorder touches two rows and cannot leave the list half-written.
  const a = rows[index];
  const b = rows[target];
  const updates = [
    client.from("portfolio_projects").update({ sort_order: b.sort_order }).eq("id", a.id),
    client.from("portfolio_projects").update({ sort_order: a.sort_order }).eq("id", b.id),
  ];
  for (const update of updates) {
    const { error: failed } = await update;
    if (failed) throw new Error(failed.message);
  }

  revalidatePath("/dashboard/portfolio");
  revalidatePath("/en/work");
  revalidatePath("/fa/work");
}
