"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Building2, ListChecks, CalendarClock } from "lucide-react";
import { fmtDate } from "./task-badges";
import ClientClock from "../../crm/_components/client-clock";
import type { ClientProjectSummary } from "@/lib/projects";

export default function ClientDirectory({ clients }: { clients: ClientProjectSummary[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.companyName.toLowerCase().includes(q));
  }, [clients, query]);

  return (
    <div className="space-y-4">
      {clients.length > 6 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            className="w-full bg-white border border-black/10 rounded-full pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-black/35 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-black/40 py-6">No clients match &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <Link
              key={c.id ?? "__internal__"}
              href={`/projects/client/${c.id ?? "internal"}`}
              className={`bg-white rounded-2xl border p-5 transition group ${
                c.id
                  ? "border-black/[0.07] hover:border-brand/40 hover:shadow-sm"
                  : "border-dashed border-black/15 hover:border-black/25"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {c.id ? (
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: c.colorHex ?? "#cbd5e1" }}
                    />
                  ) : (
                    <Building2 className="w-4 h-4 shrink-0 text-black/35" />
                  )}
                  <h3
                    className={`text-[17px] font-bold leading-tight truncate transition-colors ${
                      c.id ? "text-ink group-hover:text-brand" : "text-black/50"
                    }`}
                  >
                    {c.companyName}
                  </h3>
                </div>
                {c.timezone && <ClientClock timezone={c.timezone} className="shrink-0" />}
              </div>

              <div className="mt-4 flex items-center gap-4 text-xs text-black/45">
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="w-3.5 h-3.5" />
                  {c.projectCount} project{c.projectCount === 1 ? "" : "s"}
                </span>
                {c.activeCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    {c.activeCount} active
                  </span>
                )}
                {c.nearestDueDate && (
                  <span className="ml-auto inline-flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5" />
                    {fmtDate(c.nearestDueDate)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
