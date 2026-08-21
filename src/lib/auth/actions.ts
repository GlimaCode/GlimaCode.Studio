"use server";

import { redirect } from "next/navigation";
import { sessionClient } from "./session";

/**
 * Sign-in and sign-out.
 *
 * Server actions rather than a route handler, so the password is never in a
 * URL and the session cookie is written on the server. There is deliberately
 * no sign-up action anywhere in the codebase: accounts are created by hand,
 * and membership is granted by inserting a row in SQL.
 */

export type SignInState = { error: string | null };

export async function signIn(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter an email address and password." };
  }

  const client = await sessionClient();
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately not distinguishing "no such account" from "wrong
    // password": the difference tells an attacker which addresses exist.
    console.warn(`[auth] failed sign-in for ${email}: ${error.message}`);
    return { error: "That email and password did not match." };
  }

  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const client = await sessionClient();
  await client.auth.signOut();
  redirect("/dashboard");
}
