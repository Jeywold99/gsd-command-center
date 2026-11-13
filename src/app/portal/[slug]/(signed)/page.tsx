import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPortalContext } from "@/lib/portal/dal";
import { listBusinesses, loadClientTasks, tasksForMonth, type MonthTask } from "@/lib/portal/data";
import {
  addMonths,
  fmtDay,
  fmtDayTz,
  fmtStamp,
  isMonthKey,
  monthLabel,
  todayKey,
  tint,
} from "@/lib/portal/shared";
import { BizTag, Dot, MonthSwitcher, ProgressBar, StatusPill } from "./_components/ui";
import { taskQuickAction } from "./actions";

type Week = { label: string; range: string; load: string; tag: string; kind: "done" | "now" | "quiet" | "plan" | "late" };

const WEEK_STYLE: Record<Week["kind"], { bg: string; border: string; fg: string; tagBg: string }> = {
  done: { bg: "#ECFDF5", border: "#A7F3D0", fg: "#065F46", tagBg: "#D1FAE5" },
  now: { bg: "#EFF6FF", border: "#1D4ED8", fg: "#1D4ED8", tagBg: "#DBEAFE" },
  quiet: { bg: "#F9FAFB", border: "#E5E7EB", fg: "#4B5563", tagBg: "#F3F4F6" },
  plan: { bg: "#FFFFFF", border: "#E5E7EB", fg: "#374151", tagBg: "#F3F4F6" },
  late: { bg: "#FFF7ED", border: "#FDBA74", fg: "#9A3412", tagBg: "#FFEDD5" },
};

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Monday-to-Sunday weeks that cover the month, each with its task load.
function buildWeeks(month: string, tasks: MonthTask[], today: string, who: string): Week[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const weeks: Week[] = [];
  let start = new Date(first);
  let n = 1;
  while (start <= last) {
    const dow = (start.getUTCDay() + 6) % 7; // Monday = 0
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + (6 - dow));
    // A month that starts on a Saturday or Sunday folds those days into week 1.
    if (n === 1 && dow >= 5) end.setUTCDate(end.getUTCDate() + 7);
    if (end > last) end.setTime(last.getTime());
    const inWeek = tasks.filter((t) => t.dueDate && iso(t.dueDate) >= iso(start) && iso(t.dueDate) <= iso(end));
    const done = inWeek.filter((t) => t.pstatus === "DONE").length;
    const needs = inWeek.filter((t) => t.pstatus === "NEEDS_CLIENT").length;
    const isNow = today >= iso(start) && today <= iso(end);
    const isPast = iso(end) < today;
    let kind: Week["kind"];
    let tag: string;
    if (isNow) [kind, tag] = ["now", "Now"];
    else if (inWeek.length === 0) [kind, tag] = ["quiet", "Quiet"];
    else if (done === inWeek.length) [kind, tag] = ["done", "Done"];
    else if (isPast) [kind, tag] = ["late", "Open"];
    else [kind, tag] = ["plan", "Planned"];
    const load =
      inWeek.length === 0
        ? "No tasks planned"
        : `${inWeek.length} task${inWeek.length === 1 ? "" : "s"} · ${
            done === inWeek.length ? "all done" : needs ? `${needs} need${needs === 1 && who !== "you" ? "s" : ""} ${who}` : `${done} done`
          }`;
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
    weeks.push({
      label: `Week ${n}`,
      range: iso(start) === iso(end) ? fmt(start) : `${fmt(start)} – ${end.getUTCDate()}`,
      load,
      tag,
      kind,
    });
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() + 1);
    n++;
  }
  return weeks;
}

export default async function OverviewPage({ params, searchParams }: PageProps<"/portal/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await getPortalContext(slug);
  const tz = ctx.client.timezone;
  const today = todayKey(tz);
  const current = today.slice(0, 7);
  const month = isMonthKey(sp.m as string) ? (sp.m as string) : current;
  const asClient = !ctx.isTeam;
  const you = asClient ? "you" : ctx.firstName;

  const [businesses, all, lastActivity] = await Promise.all([
    listBusinesses(ctx.client.id),
    loadClientTasks(ctx.client.id),
    prisma.taskActivity.findFirst({
      where: { task: { project: { clientId: ctx.client.id } } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, user: { select: { name: true } } },
    }),
  ]);
  const tasks = tasksForMonth(all, month, current);
  const live = all.filter((t) => !t.deletedAt && !t.isArchived);
  const done = tasks.filter((t) => t.pstatus === "DONE");
  const needsAll = live.filter((t) => t.pstatus === "NEEDS_CLIENT");
  const overdue = tasks.filter((t) => t.pstatus !== "DONE" && t.dueDate && iso(t.dueDate) < today);
  const weeks = buildWeeks(month, tasks, today, you);
  const bizById = new Map(businesses.map((b) => [b.id, b]));

  const keyDates = tasks
    .filter((t) => t.dueDate && iso(t.dueDate).startsWith(month))
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 8);
  // Recurring work in this month: tasks set to repeat, plus finished
  // occurrences whose next copy has taken over the repeat.
  const repeatingTitles = new Set(live.filter((t) => t.recurrence).map((t) => `${t.projectId}|${t.title}`));
  const recurring = tasks.filter((t) => t.recurrence || repeatingTitles.has(`${t.projectId}|${t.title}`));
  const wins = [...done].sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0)).slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h1 className="p-h1">{monthLabel(month)}</h1>
          <p className="p-muted mt-1 text-[13px]">
            {lastActivity
              ? `Last updated by ${lastActivity.user?.name.split(" ")[0] ?? "the team"} · ${fmtStamp(lastActivity.createdAt, tz)}`
              : "Nothing logged yet."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthSwitcher month={month} prev={addMonths(month, -1)} next={addMonths(month, 1)} label={monthLabel(month)} />
          {month !== current && (
            <Link href="/" className="p-btn p-btn-sm">
              This month
            </Link>
          )}
          <Link href={`/new?m=${month}`} className="p-btn p-btn-primary">
            + New task
          </Link>
        </div>
      </div>

      {/* At a glance */}
      <section className="p-card p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="p-h2">This month at a glance</h2>
          <span className="font-semibold">
            {done.length} of {tasks.length} done
          </span>
          <span className="p-muted">
            · {needsAll.length} need{needsAll.length === 1 ? "s" : ""} {you} · {overdue.length} overdue
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {weeks.map((w) => {
            const st = WEEK_STYLE[w.kind];
            return (
              <div
                key={w.label}
                className="rounded-xl px-3.5 py-3 flex flex-col gap-1"
                style={{ background: st.bg, border: `${w.kind === "now" ? 2 : 1}px solid ${st.border}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[13px]">{w.label}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.tagBg, color: st.fg }}>
                    {w.tag}
                  </span>
                </div>
                <span className="text-[12px] p-faint">{w.range}</span>
                <span className="text-[13px]" style={{ color: st.fg }}>
                  {w.load}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Needs you */}
      <section className="rounded-[14px] border-2 border-[var(--p-needs)] bg-white">
        <div className="px-5 py-3 flex items-center gap-3 bg-[var(--p-needs-bg)] rounded-t-[12px]">
          <h2 className="p-h2 text-[#9A3412]">{asClient ? `Needs you, ${ctx.firstName}` : `Needs ${ctx.firstName}`}</h2>
          <span className="p-pill bg-[#FFEDD5] text-[#9A3412]">{needsAll.length}</span>
        </div>
        {needsAll.length === 0 ? (
          <p className="px-5 py-4 p-muted">Nothing needs {you} right now.</p>
        ) : (
          needsAll.map((t) => {
            const b = t.projectId ? bizById.get(t.projectId) : undefined;
            return (
              <div key={t.id} className="px-5 py-4 border-t border-[var(--p-line)] flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <BizTag short={b?.portalShort} color={b?.portalColor} />
                    <span className="text-[12px] font-bold text-[#9A3412]">{t.askType ?? "APPROVE"}</span>
                    <span className="text-[12px] p-faint">· by {fmtDay(t.dueDate)}</span>
                  </div>
                  <Link href={`/t/${t.id}`} className="font-semibold text-[15px] no-underline hover:underline">
                    {t.title}
                  </Link>
                  {t.nextAction && <p className="p-muted text-[13px]">{t.nextAction}</p>}
                </div>
                <div className="flex gap-2">
                  {t.askType === "DECIDE" ? (
                    <Link href={`/t/${t.id}#ask`} className="p-btn p-btn-approve">
                      Decide
                    </Link>
                  ) : (
                    <form action={taskQuickAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="op" value="approve" />
                      <button className="p-btn p-btn-approve">{t.askType === "SIGN" ? "Mark signed" : "Approve"}</button>
                    </form>
                  )}
                  <Link href={`/t/${t.id}#comment`} className="p-btn">
                    Comment
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </section>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* By business */}
        <section className="flex flex-col gap-3">
          <h2 className="p-h2">This month by business</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {businesses.map((b) => {
              const bt = tasks.filter((t) => t.projectId === b.id);
              const bd = bt.filter((t) => t.pstatus === "DONE").length;
              const order = { NEEDS_CLIENT: 0, WAITING: 1, IN_PROGRESS: 2, PLANNED: 3, DONE: 4 } as const;
              const shown = [...bt].sort((x, y) => order[x.pstatus] - order[y.pstatus]).slice(0, 4);
              return (
                <div key={b.id} className="p-card overflow-hidden flex flex-col">
                  <div className="h-1.5" style={{ background: b.portalColor ?? "#374151" }} />
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-[15px]">{b.name}</h3>
                        <p className="text-[12px] p-faint">{b.portalKind}</p>
                      </div>
                      <span className="text-[13px] font-semibold whitespace-nowrap">{bt.length ? `${bd} of ${bt.length} done` : "—"}</span>
                    </div>
                    <ProgressBar done={bd} total={bt.length} color={b.portalColor} />
                    {bt.length === 0 ? (
                      <p className="p-muted text-[13px]">Nothing scheduled this month.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {shown.map((t) => (
                          <li key={t.id}>
                            <Link href={`/t/${t.id}`} className="flex items-center gap-2 no-underline hover:underline">
                              <StatusPill status={t.pstatus} firstName={ctx.firstName} wide />
                              <span className="text-[13px] truncate">{t.title}</span>
                            </Link>
                          </li>
                        ))}
                        {bt.length > shown.length && <li className="text-[12px] p-faint">+{bt.length - shown.length} more</li>}
                      </ul>
                    )}
                    <Link href={`/b/${b.id}?m=${month}`} className="mt-auto text-[13px] font-semibold no-underline" style={{ color: b.portalColor ?? undefined }}>
                      Open {b.portalShort} →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Side column */}
        <aside className="flex flex-col gap-4">
          <section className="p-card p-4 flex flex-col gap-3">
            <h2 className="p-h2">Key dates this month</h2>
            {keyDates.length === 0 && <p className="p-muted text-[13px]">No due dates this month.</p>}
            {keyDates.map((t) => {
              const b = t.projectId ? bizById.get(t.projectId) : undefined;
              const urgent = t.pstatus === "NEEDS_CLIENT";
              return (
                <Link key={t.id} href={`/t/${t.id}`} className="flex items-center gap-3 no-underline group">
                  <span
                    className="flex-none w-11 text-center py-1.5 rounded-lg leading-tight"
                    style={urgent ? { background: "#FFEDD5", color: "#9A3412" } : { background: "#F3F4F6", color: "#374151" }}
                  >
                    <span className="block text-[10px] font-bold">{monthLabel(month, true).toUpperCase()}</span>
                    <span className="block text-[16px] font-bold">{t.dueDate!.getUTCDate()}</span>
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[13px] font-semibold truncate group-hover:underline ${t.pstatus === "DONE" ? "line-through p-faint" : ""}`}>
                      {t.title}
                    </span>
                    <span className="block text-[12px]" style={{ color: b?.portalColor ?? undefined }}>
                      {b?.portalShort}
                    </span>
                  </span>
                </Link>
              );
            })}
          </section>

          <section className="p-card p-4 flex flex-col gap-2.5">
            <div>
              <h2 className="p-h2">Recurring</h2>
              <p className="text-[12px] p-faint">Repeats automatically; a new one appears when the last is done.</p>
            </div>
            {recurring.length === 0 && <p className="p-muted text-[13px]">No recurring tasks this month.</p>}
            {recurring.map((t) => {
              const b = t.projectId ? bizById.get(t.projectId) : undefined;
              const isDone = t.pstatus === "DONE";
              return (
                <Link key={t.id} href={`/t/${t.id}`} className="flex items-center gap-2.5 no-underline">
                  <span
                    className="flex-none size-4 rounded grid place-items-center text-white text-[11px]"
                    style={isDone ? { background: "#047857", border: "2px solid #047857" } : { background: "#fff", border: "2px solid #9CA3AF" }}
                  >
                    {isDone ? "✓" : ""}
                  </span>
                  <span className="text-[13px] flex-1 truncate">{t.title}</span>
                  <span className="text-[12px]" style={{ color: b?.portalColor ?? undefined }}>
                    {b?.portalShort}
                  </span>
                </Link>
              );
            })}
          </section>

          <section className="p-card p-4 flex flex-col gap-2.5">
            <h2 className="p-h2">Done this month</h2>
            {wins.length === 0 && <p className="p-muted text-[13px]">Nothing finished yet this month.</p>}
            {wins.map((t) => {
              const b = t.projectId ? bizById.get(t.projectId) : undefined;
              return (
                <Link key={t.id} href={`/t/${t.id}`} className="flex flex-col no-underline hover:underline">
                  <span className="text-[13px] font-semibold">{t.title}</span>
                  <span className="text-[12px] p-faint">
                    <span style={tint(b?.portalColor)} className="px-1 rounded">{b?.portalShort}</span> · {t.completedAt ? fmtDayTz(t.completedAt, tz) : ""}
                  </span>
                </Link>
              );
            })}
            <Link href={`/reports?m=${addMonths(month, -1)}`} className="text-[13px] font-semibold no-underline mt-1">
              {monthLabel(addMonths(month, -1)).split(" ")[0]} report →
            </Link>
          </section>
          <p className="text-[12px] p-faint flex items-center gap-2 px-1">
            <Dot color="#C2410C" size={8} /> Due dates are 5:00 PM Eastern.
          </p>
        </aside>
      </div>
    </div>
  );
}
