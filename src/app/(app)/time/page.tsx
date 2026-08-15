import { Trash2 } from "lucide-react";
import { verifySession } from "@/lib/dal";
import {
  getRunningEntry,
  listEntries,
  listProjectOptions,
  startOfWeek,
  fmtDuration,
} from "@/lib/time";
import Timer from "./_components/timer";
import { addManualEntry, deleteEntry } from "./actions";

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";

export default async function TimePage() {
  const session = await verifySession();
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);

  const [running, projects, entries] = await Promise.all([
    getRunningEntry(session.userId),
    listProjectOptions(),
    listEntries(session.userId, weekStart, weekEnd),
  ]);

  const totalWeek = entries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const totalToday = entries
    .filter((e) => new Date(e.startedAt) >= todayStart)
    .reduce((s, e) => s + (e.durationSeconds ?? 0), 0);

  // Per-client rollup (billable hours by client)
  const byClient = new Map<string, number>();
  for (const e of entries) {
    const key = e.project?.client?.companyName ?? "Internal";
    byClient.set(key, (byClient.get(key) ?? 0) + (e.durationSeconds ?? 0));
  }

  const running2 = running
    ? {
        startedAt: running.startedAt,
        note: running.note,
        project: running.project
          ? { name: running.project.name, client: running.project.client }
          : null,
      }
    : null;

  return (
    <div className="space-y-6">
      <Timer running={running2} projects={projects} />

      {/* Rollups */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-black/[0.07] p-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Today</span>
          <p className="mt-1 font-display text-4xl tracking-wide text-ink">{fmtDuration(totalToday)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-black/[0.07] p-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">This Week</span>
          <p className="mt-1 font-display text-4xl tracking-wide text-ink">{fmtDuration(totalWeek)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-black/[0.07] p-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">By Client (wk)</span>
          <div className="mt-2 space-y-0.5 text-sm">
            {byClient.size === 0 ? (
              <span className="text-black/30">—</span>
            ) : (
              [...byClient.entries()].map(([name, sec]) => (
                <div key={name} className="flex justify-between">
                  <span className="text-ink/70 truncate">{name}</span>
                  <span className="text-ink font-semibold">{fmtDuration(sec)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Manual entry */}
      <form
        action={addManualEntry}
        className="bg-white rounded-2xl border border-black/[0.07] p-5 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end"
      >
        <div className="col-span-2 sm:col-span-1">
          <label className={label}>Project</label>
          <select name="projectId" required defaultValue="" className={input}>
            <option value="" disabled>Select…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.client ? `${p.client.companyName} · ` : ""}{p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Date</label>
          <input type="date" name="date" className={input} />
        </div>
        <div>
          <label className={label}>Hours</label>
          <input type="number" name="hours" step="0.25" min="0" placeholder="1.5" className={input} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={label}>Note</label>
          <input name="note" placeholder="Optional" className={input} />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-ink/60">
            <input type="checkbox" name="billable" defaultChecked className="accent-brand w-4 h-4" />
            Billable
          </label>
          <button
            type="submit"
            className="bg-brand hover:bg-brand-hover text-white text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full transition-colors"
          >
            Add
          </button>
        </div>
      </form>

      {/* Entries this week */}
      <div>
        <h3 className="font-display text-2xl tracking-wide text-ink mb-3">This Week&apos;s Entries</h3>
        {entries.length === 0 ? (
          <div className="bg-white border border-dashed border-black/15 rounded-2xl p-10 text-center">
            <p className="text-black/50">No time logged this week yet. Start the timer or add an entry.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-black/[0.07] divide-y divide-black/[0.05]">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">
                    {e.project?.client?.companyName ? `${e.project.client.companyName} · ` : ""}
                    {e.project?.name ?? "—"}
                  </p>
                  <p className="text-xs text-black/40">
                    {new Date(e.startedAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    {e.note ? ` · ${e.note}` : ""}
                    {e.source === "MANUAL" ? " · manual" : ""}
                  </p>
                </div>
                {!e.billable && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-black/40 bg-black/5 px-2 py-0.5 rounded-full">
                    Non-billable
                  </span>
                )}
                <span className="text-sm font-semibold text-ink tabular-nums w-16 text-right">
                  {fmtDuration(e.durationSeconds ?? 0)}
                </span>
                <form action={deleteEntry}>
                  <input type="hidden" name="id" value={e.id} />
                  <button type="submit" className="p-1.5 rounded-lg text-ink/40 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
