/**
 * Environment access.
 *
 * Every environment variable the app reads is named here once, so a move to
 * another host means editing this file and the deployment settings, nothing
 * else. Values are read lazily: a missing variable should fail where it is
 * used, with a message that says what to set, rather than crashing the whole
 * app at import time.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in, or add it in the hosting dashboard.`,
    );
  }
  return value;
}

/** Public database URL. Safe to expose — the browser needs it. */
export function databaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

/**
 * Public anonymous key. Safe to expose by design: it carries no privileges
 * of its own, and row-level security decides what it can actually read.
 */
export function databaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** True when both public database variables are present. */
export function hasDatabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
