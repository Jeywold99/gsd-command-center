"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@gsdhq.com"
          className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
        />
        {state?.errors?.email && (
          <p className="mt-1 text-xs text-[#c74600]">{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
        />
        {state?.errors?.password && (
          <p className="mt-1 text-xs text-[#c74600]">{state.errors.password[0]}</p>
        )}
      </div>

      {state?.message && (
        <p className="text-sm text-[#c74600] bg-brand-pale/60 border border-brand/20 rounded-lg px-3 py-2">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-brand hover:bg-brand-hover disabled:opacity-60 text-white font-bold uppercase tracking-wide py-3 rounded-full transition-colors shadow-sm"
      >
        {pending ? "Signing in…" : "Sign In →"}
      </button>
    </form>
  );
}
