"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ClientFormState } from "@/lib/definitions";

const input =
  "w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";
const label = "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";

type Defaults = {
  id?: string;
  name?: string;
  description?: string;
  clientId?: string;
  status?: string;
  budget?: string;
  startDate?: string;
  dueDate?: string;
};

export default function ProjectForm({
  action,
  mode,
  clients,
  defaults = {},
}: {
  action: (state: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  mode: "create" | "edit";
  clients: { id: string; companyName: string }[];
  defaults?: Defaults;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-5 max-w-2xl">
      {mode === "edit" && <input type="hidden" name="id" value={defaults.id} />}

      <div>
        <label className={label}>Project Name *</label>
        <input name="name" required defaultValue={defaults.name} placeholder="e.g. Q3 Growth Sprint" className={input} />
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea name="description" rows={3} defaultValue={defaults.description} placeholder="What's this project about?" className={input} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={label}>Client</label>
          <select name="clientId" defaultValue={defaults.clientId ?? ""} className={input}>
            <option value="">Internal (no client)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={label}>Status</label>
          <select name="status" defaultValue={defaults.status ?? "PLANNING"} className={input}>
            <option value="PLANNING">Planning</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div>
          <label className={label}>Budget</label>
          <input name="budget" type="number" step="0.01" min="0" defaultValue={defaults.budget} placeholder="0.00" className={input} />
        </div>

        <div className="hidden sm:block" />

        <div>
          <label className={label}>Start Date</label>
          <input type="date" name="startDate" defaultValue={defaults.startDate} className={input} />
        </div>

        <div>
          <label className={label}>Due Date</label>
          <input type="date" name="dueDate" defaultValue={defaults.dueDate} className={input} />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-[#c74600] bg-brand-pale/60 border border-brand/20 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-brand hover:bg-brand-hover disabled:opacity-60 text-white font-bold uppercase tracking-wide px-6 py-2.5 rounded-full transition-colors shadow-sm"
        >
          {pending ? "Saving…" : mode === "create" ? "Create Project →" : "Save Changes"}
        </button>
        <Link
          href={mode === "edit" && defaults.id ? `/projects/${defaults.id}` : "/projects"}
          className="text-sm font-semibold text-ink/50 hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
