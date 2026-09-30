"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus } from "lucide-react";
import { createUser } from "../team-actions";

const input =
  "w-full bg-white border border-black/10 rounded-[12px] px-3.5 py-2.5 text-sm text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";
const label = "block text-xs font-semibold text-[#6B645D] mb-1.5";

export default function AddMemberForm() {
  const [state, action, pending] = useActionState(createUser, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form after a successful add.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={label}>Name</label>
        <input name="name" required placeholder="Jane Doe" className={input} />
      </div>
      <div>
        <label className={label}>Email</label>
        <input name="email" type="email" required placeholder="jane@getshtdonehq.com" className={input} />
      </div>
      <div>
        <label className={label}>Role</label>
        <select name="role" defaultValue="OWNER" className={input}>
          <option value="OWNER">Admin (Owner)</option>
          <option value="MANAGER">Manager</option>
          <option value="STAFF">Staff</option>
        </select>
      </div>
      <div>
        <label className={label}>Temporary password</label>
        <input
          name="password"
          type="text"
          required
          minLength={8}
          placeholder="min. 8 characters"
          className={input}
        />
      </div>

      {state?.error && (
        <p className="sm:col-span-2 text-sm text-[#c74600] bg-brand-pale/60 border border-brand/20 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="sm:col-span-2 text-sm text-[#0e7a52] bg-[#e7f8f1] border border-success/30 rounded-lg px-3 py-2">
          Member added. Share their email + temporary password so they can sign in and change it.
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 inline-flex items-center gap-2 bg-brand hover:bg-brand-hover disabled:opacity-60 text-ink text-sm font-bold px-4 py-2.5 rounded-[14px] transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {pending ? "Adding…" : "Add member"}
        </button>
      </div>
    </form>
  );
}
