"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { setBillingRate } from "../actions";

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";
const smallBtn =
  "bg-brand hover:bg-brand-hover text-white text-xs font-bold uppercase tracking-wide px-3.5 py-2 rounded-full transition-colors";

// Quick "set a new dated billing arrangement" — Hourly rate or Fixed hours/week.
export default function BillingRateForm({ clientId }: { clientId: string }) {
  const [type, setType] = useState<"HOURLY" | "FIXED">("HOURLY");

  return (
    <details className="group mt-4">
      <summary className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand cursor-pointer list-none">
        <Plus className="w-3.5 h-3.5" /> Set new rate
      </summary>
      <form action={setBillingRate} className="mt-3 space-y-2">
        <input type="hidden" name="clientId" value={clientId} />

        <div className="inline-flex rounded-full bg-cream border border-black/10 p-1">
          {(["HOURLY", "FIXED"] as const).map((t) => (
            <label key={t} className="cursor-pointer">
              <input
                type="radio"
                name="billingTypeChoice"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="sr-only"
              />
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold transition ${
                  type === t ? "bg-brand text-white" : "text-ink/60"
                }`}
              >
                {t === "HOURLY" ? "Hourly" : "Fixed"}
              </span>
            </label>
          ))}
        </div>
        <input type="hidden" name="billingType" value={type} />

        {type === "HOURLY" ? (
          <>
            <input
              name="billingRate"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="Hourly rate"
              className={input}
            />
            <input
              name="hoursPerWeek"
              type="number"
              step="0.5"
              min="0"
              placeholder="Agreed hours / week (optional)"
              className={input}
            />
          </>
        ) : (
          <>
            <input
              name="billingRate"
              type="number"
              step="0.01"
              min="0"
              placeholder="Retainer rate"
              className={input}
            />
            <input
              name="hoursPerWeek"
              type="number"
              step="0.5"
              min="0"
              placeholder="Required hours / week"
              className={input}
            />
          </>
        )}
        <input name="note" placeholder="Note (optional)" className={input} />
        <button type="submit" className={smallBtn}>
          Save Rate
        </button>
      </form>
    </details>
  );
}
