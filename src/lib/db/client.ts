import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { databaseAnonKey, databaseUrl } from "@/lib/env";

/**
 * Database clients.
 *
 * This is the only module in the app that imports the provider SDK. Every
 * query goes through a repository in `src/lib/data`, and those repositories
 * get their client from here. Moving to a different Postgres host means
 * rewriting this file and the repositories, and nothing above them.
 *
 * The schema itself is plain SQL in `db/migrations`, so the database can be
 * recreated anywhere from source.
 */

export type Database = SupabaseClient;

/** Client for use in browser components. */
export function browserClient(): Database {
  return createBrowserClient(databaseUrl(), databaseAnonKey());
}

type CookieStore = {
  getAll: () => { name: string; value: string }[];
  set: (name: string, value: string, options?: Record<string, unknown>) => void;
};

/**
 * Client for use in server components, route handlers and server actions.
 *
 * The caller passes its own cookie store because the way a framework exposes
 * cookies is framework-specific — keeping that detail out of this module is
 * what lets the rest of the data layer stay portable.
 */
export function serverClient(cookies: CookieStore): Database {
  return createServerClient(databaseUrl(), databaseAnonKey(), {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) =>
            cookies.set(name, value, options),
          );
        } catch {
          // Server components cannot set cookies. Session refresh is handled
          // by middleware, so ignoring this here is safe.
        }
      },
    },
  });
}
