import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { listEntries, startOfWeek, fmtDuration } from "@/lib/time";
import { listUsers } from "@/lib/projects";

const ymd = (d: Date) => new Date(d).toISOString().slice(0, 10);
const hours = (sec: number) => (sec / 3600).toFixed(2);

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; user?: string }>;
}) {
  const session = await verifySession();
  const me = await getCurrentUser();
  const { week, user } = await searchParams;

  const canViewOthers = me?.role === "OWNER" || me?.role === "MANAGER";
  const targetUserId = canViewOthers && user ? user : session.userId;

  const weekStart = startOfWeek(week ? new Date(week) : new Date());
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  const prevWeek = ymd(new Date(weekStart.getTime() - 7 * 86_400_000));
  const nextWeek = ymd(new Date(weekStart.getTime() + 7 * 86_400_000));

  const [entries, users] = await Promise.all([
    listEntries(targetUserId, weekStart, weekEnd),
    canViewOthers ? listUsers() : Promise.resolve([]),
  ]);

  const targetName =
    targetUserId === session.userId
      ? me?.name ?? "You"
      : users.find((u) => u.id === targetUserId)?.name ?? "User";

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * 86_400_000);
    const dayEntries = entries.filter((e) => {
      const es = new Date(e.startedAt).getTime();
      return es >= d.getTime() && es < d.getTime() + 86_400_000;
    });
    return { date: d, sec: dayEntries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0) };
  });

  const byProject = new Map<string, { name: string; client: string; sec: number; billableSec: number }>();
  for (const e of entries) {
    const key = e.project?.id ?? "none";
    const cur = byProject.get(key) ?? {
      name: e.project?.name ?? "—",
      client: e.project?.client?.companyName ?? "Internal",
      sec: 0,
      billableSec: 0,
    };
    cur.sec += e.durationSeconds ?? 0;
    if (e.billable) cur.billableSec += e.durationSeconds ?? 0;
    byProject.set(key, cur);
  }

  const totalWeek = entries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
  const totalBillable = entries.reduce((s, e) => s + (e.billable ? e.durationSeconds ?? 0 : 0), 0);
  const exportBase = `/api/timesheet/export?week=${ymd(weekStart)}&user=${targetUserId}`;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-full bg-cream border border-black/10">
            <Link href={`/timesheet?week=${prevWeek}&user=${targetUserId}`} className="p-2 text-ink/60 hover:text-ink" aria-label="Previous week">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <span className="px-3 text-sm font-semibold text-ink">
              {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} –{" "}
              {new Date(weekEnd.getTime() - 86_400_000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
            <Link href={`/timesheet?week=${nextWeek}&user=${targetUserId}`} className="p-2 text-ink/60 hover:text-ink" aria-label="Next week">
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {canViewOthers && (
            <form method="get" className="flex items-center gap-2">
              <input type="hidden" name="week" value={ymd(weekStart)} />
              <select
                name="user"
                defaultValue={targetUserId}
                className="bg-white border border-black/10 rounded-[12px] px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-brand"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <button type="submit" className="min-h-11 px-3 text-sm font-semibold text-[#B34100]">Go</button>
            </form>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a href={`${exportBase}&type=payroll`} className="inline-flex items-center gap-1.5 border border-black/10 text-ink/70 hover:bg-cream text-sm font-semibold px-3 py-2 rounded-full transition">
            <Download className="w-4 h-4" /> Payroll CSV
          </a>
          <a href={`${exportBase}&type=invoice`} className="min-h-11 inline-flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-ink text-sm font-bold px-3 py-2 rounded-[14px] transition">
            <Download className="w-4 h-4" /> Invoice CSV
          </a>
        </div>
      </div>

      <p className="text-sm text-black/50">
        Timesheet for <span className="font-semibold text-ink">{targetName}</span>
      </p>

      {/* Day grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {days.map((d) => (
          <div key={d.date.toISOString()} className="bg-white rounded-xl border border-black/[0.07] p-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink/45">
              {d.date.toLocaleDateString(undefined, { weekday: "short" })}
            </p>
            <p className="text-[11px] text-black/35">{d.date.getDate()}</p>
            <p className={`mt-1 font-display text-2xl tracking-wide ${d.sec ? "text-ink" : "text-black/20"}`}>
              {d.sec ? fmtDuration(d.sec) : "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-[22px] border border-black/[0.07] p-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Total This Week</span>
          <p className="mt-1 font-display text-4xl tracking-wide text-ink">{fmtDuration(totalWeek)}</p>
        </div>
        <div className="bg-white rounded-[22px] border border-black/[0.07] p-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Billable</span>
          <p className="mt-1 font-display text-4xl tracking-wide text-brand">{fmtDuration(totalBillable)}</p>
        </div>
      </div>

      {/* Per-project breakdown */}
      <div>
        <h3 className="text-[17px] font-bold text-ink mb-3">Breakdown</h3>
        {byProject.size === 0 ? (
          <div className="bg-white border border-dashed border-black/15 rounded-2xl p-10 text-center">
            <p className="text-black/50">No time logged this week.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[22px] border border-black/[0.07] overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-ink/45 border-b border-black/[0.07]">
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3 text-right">Hours</th>
                  <th className="px-5 py-3 text-right">Billable</th>
                </tr>
              </thead>
              <tbody>
                {[...byProject.values()].map((r, i) => (
                  <tr key={i} className="border-b border-black/[0.05] last:border-0">
                    <td className="px-5 py-3 text-black/60">{r.client}</td>
                    <td className="px-5 py-3 font-semibold text-ink">{r.name}</td>
                    <td className="px-5 py-3 text-right text-ink tabular-nums">{hours(r.sec)}</td>
                    <td className="px-5 py-3 text-right text-brand font-semibold tabular-nums">{hours(r.billableSec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
