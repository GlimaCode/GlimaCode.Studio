"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/lib/auth/actions";

const INITIAL: SignInState = { error: null };

/**
 * There is no "create account" and no "forgot password" here on purpose.
 * Accounts are made by hand and membership is granted in SQL, so a recovery
 * flow would be a door with nothing behind it.
 */
export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, INITIAL);

  return (
    <div className="signin-wrap">
      <form className="order-card signin-card" action={action}>
        <div className="order-head">
          <h3>Team access</h3>
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            dir="ltr"
          />
        </div>
        <div className="field" style={{ marginTop: "14px" }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            dir="ltr"
          />
        </div>
        {state.error ? (
          <p className="order-problem" role="alert">
            {state.error}
          </p>
        ) : null}
        <div className="order-actions">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}
