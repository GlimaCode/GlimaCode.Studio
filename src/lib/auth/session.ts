import { cookies } from "next/headers";
import { serverClient, type Database } from "@/lib/db/client";

/**
 * Team sessions.
 *
 * Everything the app knows about "who is signed in" comes through here, so a
 * change of identity provider touches this module and the client factory and
 * nothing else. Components never call the auth SDK.
 *
 * Being signed in is not the same as being on the team. Any account the
 * provider recognises has a session; only an account with a row in
 * team_members may see anything. That distinction is enforced in the
 * database by row-level security, and repeated here so the UI does not
 * render a shell around data it will never receive.
 */

export type TeamSession = {
  userId: string;
  email: string | null;
};

/** A client bound to the current request's cookies. */
export async function sessionClient(): Promise<Database> {
  const store = await cookies();
  return serverClient({
    getAll: () => store.getAll().map(({ name, value }) => ({ name, value })),
    set: (name, value, options) => {
      store.set(name, value, options);
    },
  });
}

/** The signed-in account, or null. Says nothing about team membership. */
export async function currentUser(): Promise<TeamSession | null> {
  const client = await sessionClient();
  // getUser revalidates against the provider rather than trusting the cookie,
  // which matters because the cookie is attacker-supplied data.
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { userId: data.user.id, email: data.user.email ?? null };
}

/**
 * The signed-in account, if it is on the team.
 *
 * The membership test is a database round trip rather than anything carried
 * in the token, so removing someone from the roster takes effect on their
 * next request instead of whenever their session happens to expire.
 */
export async function currentTeamMember(): Promise<TeamSession | null> {
  const user = await currentUser();
  if (!user) return null;

  const client = await sessionClient();
  const { data, error } = await client
    .from("team_members")
    .select("user_id")
    .eq("user_id", user.userId)
    .maybeSingle();

  if (error || !data) return null;
  return user;
}
