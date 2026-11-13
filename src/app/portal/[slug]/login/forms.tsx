"use client";

import { useActionState } from "react";
import { portalSignIn, portalVerifyCode, type SignInState } from "./actions";

export function CredentialsForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(portalSignIn, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="p-label">Email</span>
        <input className="p-input" name="email" type="email" autoComplete="username" required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="p-label">Password</span>
        <input className="p-input" name="password" type="password" autoComplete="current-password" required />
      </label>
      {state?.error && <p className="p-error" role="alert">{state.error}</p>}
      <button className="p-btn p-btn-primary w-full" disabled={pending}>
        {pending ? "Checking…" : "Continue"}
      </button>
    </form>
  );
}

export function CodeForm({ label }: { label: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(portalVerifyCode, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="p-label">{label}</span>
        <input
          className="p-input text-center tracking-[0.4em] text-lg font-semibold"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          placeholder="123456"
          autoFocus
          required
        />
      </label>
      {state?.error && <p className="p-error" role="alert">{state.error}</p>}
      <button className="p-btn p-btn-primary w-full" disabled={pending}>
        {pending ? "Checking…" : "Verify and sign in"}
      </button>
    </form>
  );
}
