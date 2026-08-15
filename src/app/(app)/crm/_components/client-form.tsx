"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ClientFormState } from "@/lib/definitions";

const input =
  "w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";
const label =
  "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";

type Defaults = {
  id?: string;
  companyName?: string;
  serviceType?: string;
  website?: string;
  health?: string;
  colorHex?: string;
  startDate?: string;
  renewalDate?: string;
};

export default function ClientForm({
  action,
  mode,
  defaults = {},
}: {
  action: (
    state: ClientFormState,
    formData: FormData,
  ) => Promise<ClientFormState>;
  mode: "create" | "edit";
  defaults?: Defaults;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [kind, setKind] = useState<"CLIENT" | "LEAD">("CLIENT");

  return (
    <form action={formAction} className="space-y-5 max-w-2xl">
      {mode === "edit" && <input type="hidden" name="id" value={defaults.id} />}

      {mode === "create" && (
        <div>
          <span className={label}>Type</span>
          <div className="inline-flex rounded-full bg-cream border border-black/10 p-1">
            {(["CLIENT", "LEAD"] as const).map((k) => (
              <label key={k} className="cursor-pointer">
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => setKind(k)}
                  className="sr-only"
                />
                <span
                  className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold transition ${
                    kind === k ? "bg-brand text-white" : "text-ink/60"
                  }`}
                >
                  {k === "CLIENT" ? "Client" : "Lead"}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={label}>Company Name *</label>
          <input
            name="companyName"
            required
            defaultValue={defaults.companyName}
            placeholder="e.g. Acme Co."
            className={input}
          />
        </div>

        <div>
          <label className={label}>Service Type</label>
          <input
            name="serviceType"
            defaultValue={defaults.serviceType}
            placeholder="Fractional COO, Marketing…"
            className={input}
          />
        </div>

        <div>
          <label className={label}>Website</label>
          <input
            name="website"
            defaultValue={defaults.website}
            placeholder="https://…"
            className={input}
          />
        </div>

        {mode === "create" && kind === "CLIENT" && (
          <div>
            <label className={label}>Status</label>
            <select name="status" className={input} defaultValue="ACTIVE">
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
            </select>
          </div>
        )}

        {mode === "create" && kind === "LEAD" && (
          <div>
            <label className={label}>Pipeline Stage</label>
            <select name="pipelineStage" className={input} defaultValue="NEW">
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="PROPOSAL">Proposal</option>
              <option value="NEGOTIATION">Negotiation</option>
            </select>
          </div>
        )}

        <div>
          <label className={label}>Health</label>
          <select name="health" className={input} defaultValue={defaults.health ?? ""}>
            <option value="">—</option>
            <option value="GREEN">Green</option>
            <option value="YELLOW">Yellow</option>
            <option value="RED">Red</option>
          </select>
        </div>

        <div>
          <label className={label}>Calendar Color</label>
          <input
            type="color"
            name="colorHex"
            defaultValue={defaults.colorHex ?? "#FF5C00"}
            className="h-11 w-full bg-white border border-black/10 rounded-xl px-1.5 cursor-pointer"
          />
        </div>

        <div>
          <label className={label}>Start Date</label>
          <input type="date" name="startDate" defaultValue={defaults.startDate} className={input} />
        </div>

        <div>
          <label className={label}>Renewal Date</label>
          <input type="date" name="renewalDate" defaultValue={defaults.renewalDate} className={input} />
        </div>

        {mode === "create" && (
          <div>
            <label className={label}>Billing Rate (per hour)</label>
            <input
              name="billingRate"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className={input}
            />
          </div>
        )}
      </div>

      {mode === "create" && (
        <div className="border-t border-black/[0.07] pt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand mb-3">
            Primary Contact (optional)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={label}>Name</label>
              <input name="contactName" placeholder="Jane Doe" className={input} />
            </div>
            <div>
              <label className={label}>Email</label>
              <input name="contactEmail" type="email" placeholder="jane@acme.co" className={input} />
            </div>
            <div>
              <label className={label}>Phone</label>
              <input name="contactPhone" placeholder="+1…" className={input} />
            </div>
          </div>
        </div>
      )}

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
          {pending ? "Saving…" : mode === "create" ? "Create →" : "Save Changes"}
        </button>
        <Link
          href={mode === "edit" && defaults.id ? `/crm/${defaults.id}` : "/crm"}
          className="text-sm font-semibold text-ink/50 hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
