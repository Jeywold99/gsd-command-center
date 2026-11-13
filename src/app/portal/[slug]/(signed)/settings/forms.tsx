"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, confirmTwoStep, turnOffTwoStep, type SettingsState } from "./actions";

function Message({ state }: { state: SettingsState }) {
  if (state?.error) return <p className="p-error" role="alert">{state.error}</p>;
  if (state?.ok) return <p className="text-[13px] font-semibold text-[#065F46]">{state.ok}</p>;
  return null;
}

export function ChangePasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(changePassword, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-3 max-w-sm">
      {/* Lets password managers save the new password against the right account. */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <label className="flex flex-col gap-1.5">
        <span className="p-label">Current password</span>
        <input type="password" name="current" className="p-input" autoComplete="current-password" required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="p-label">New password (at least 12 characters)</span>
        <input type="password" name="next" className="p-input" autoComplete="new-password" minLength={12} required />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="p-label">New password again</span>
        <input type="password" name="confirm" className="p-input" autoComplete="new-password" minLength={12} required />
      </label>
      <Message state={state} />
      <div>
        <button className="p-btn p-btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </button>
      </div>
    </form>
  );
}

export function ConfirmTwoStepForm() {
  const [state, action, pending] = useActionState<SettingsState, FormData>(confirmTwoStep, undefined);
  return (
    <form action={action} className="flex flex-col gap-3 max-w-xs">
      <label className="flex flex-col gap-1.5">
        <span className="p-label">Code from the app</span>
        <input
          name="code"
          className="p-input text-center tracking-[0.4em] text-lg font-semibold"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          placeholder="123456"
          required
        />
      </label>
      <Message state={state} />
      <div>
        <button className="p-btn p-btn-primary" disabled={pending}>
          {pending ? "Checking…" : "Turn on"}
        </button>
      </div>
    </form>
  );
}

export function TurnOffTwoStepForm() {
  const [state, action, pending] = useActionState<SettingsState, FormData>(turnOffTwoStep, undefined);
  return (
    <form action={action} className="flex flex-col gap-3 max-w-sm">
      <label className="flex flex-col gap-1.5">
        <span className="p-label">Enter your password to turn it off</span>
        <input type="password" name="current" className="p-input" autoComplete="current-password" required />
      </label>
      <Message state={state} />
      <div>
        <button className="p-btn p-btn-danger" disabled={pending}>
          {pending ? "Checking…" : "Turn off two-step verification"}
        </button>
      </div>
    </form>
  );
}
