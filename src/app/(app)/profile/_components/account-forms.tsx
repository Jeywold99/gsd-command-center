"use client";

import { useActionState, useState } from "react";
import { ChevronRight, Lock } from "lucide-react";
import { updateName, changePassword } from "../actions";

const field =
  "h-11 w-full rounded-[12px] border border-black/10 bg-white px-3 text-base text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

function Status({ state }: { state: { error?: string; ok?: string } | undefined }) {
  if (!state) return null;
  return (
    <p role="status" className={`text-sm font-medium ${state.error ? "text-[#B42318]" : "text-[#0B5C3D]"}`}>
      {state.error ?? state.ok}
    </p>
  );
}

export function AccountForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(updateName, undefined);
  return (
    <section aria-labelledby="acct-h" className="rounded-[22px] border border-black/[0.07] bg-white px-4 pb-4">
      <h2 id="acct-h" className="mt-3.5 mb-2 text-base font-bold">
        Account
      </h2>
      <form action={action} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="pf-name" className="text-xs font-semibold text-[#6B645D]">
            Name
          </label>
          <div className="flex gap-2">
            <input id="pf-name" name="name" defaultValue={name} required className={field} />
            <button
              type="submit"
              disabled={pending}
              className="h-11 shrink-0 rounded-[12px] bg-midnight px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[#6B645D]">Email</span>
          <span className="truncate text-[15px]">{email}</span>
        </div>
        <Status state={state} />
      </form>
    </section>
  );
}

export function PasswordForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <div className="border-b border-black/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-3.5 text-left"
      >
        <Lock className="w-5 h-5" />
        <span className="flex-1 text-[15px] font-semibold">Change password</span>
        <ChevronRight className={`w-4 h-4 text-[#6B645D] transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <form action={action} className="flex flex-col gap-2.5 pb-4">
          <label className="sr-only" htmlFor="pw-current">
            Current password
          </label>
          <input
            id="pw-current"
            name="current"
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            required
            className={field}
          />
          <label className="sr-only" htmlFor="pw-next">
            New password
          </label>
          <input
            id="pw-next"
            name="next"
            type="password"
            autoComplete="new-password"
            placeholder="New password (8+ characters)"
            minLength={8}
            required
            className={field}
          />
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-[12px] bg-midnight text-sm font-semibold text-white disabled:opacity-60"
          >
            Update password
          </button>
          <Status state={state} />
        </form>
      )}
    </div>
  );
}
