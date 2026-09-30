import Link from "next/link";
import { ChevronRight, Mic, BellRing, Video, CheckCircle2, ListChecks, Lightbulb } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { getDashboardData } from "@/lib/dashboard";
import { getThisWeekIncome } from "@/lib/income";
import { getHomeData } from "@/lib/home";
import { getRunningEntry } from "@/lib/time";
import { taskPath } from "@/lib/task-path";
import WorldClocks from "./_components/world-clocks";
import HomeClock from "./_components/home-clock";
import LocalTime from "./_components/local-time";
import PriorityChip from "./_components/priority-chip";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const FREQ_LABEL: Record<string, string> = { WEEKLY: "Weekly", BIWEEKLY: "Bi-weekly", MONTHLY: "Monthly" };

// Date-only due dates are stored at UTC midnight — format them in UTC.
const dateOnly = (d: Date) =>
  new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

const card = "rounded-[22px] border border-black/[0.07] bg-white";

function SectionHead({ title, href, link, id }: { title: string; href?: string; link?: string; id: string }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between">
      <h2 id={id} className="text-[17px] font-bold">
        {title}
      </h2>
      {href && (
        <Link href={href} className="text-sm font-semibold text-[#B34100] hover:underline">
          {link}
        </Link>
      )}
    </div>
  );
}

function Stat({
  value,
  label,
  href,
  tone = "plain",
}: {
  value: number;
  label: string;
  href: string;
  tone?: "plain" | "warn" | "dark";
}) {
  const cls =
    tone === "warn"
      ? "bg-brand-pale text-[#8A3200]"
      : tone === "dark"
        ? "bg-midnight text-white"
        : `${card} text-ink`;
  return (
    <Link href={href} className={`flex flex-col gap-0.5 rounded-[20px] p-3.5 lg:px-4.5 lg:py-4 ${cls}`}>
      <span className="font-display text-4xl leading-none lg:text-[44px]">{value}</span>
      <span
        className={`text-xs font-semibold lg:text-[13px] ${tone === "plain" ? "text-[#6B645D]" : tone === "dark" ? "text-white/70" : ""}`}
      >
        {label}
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [h, d, income, running] = await Promise.all([
    getHomeData(user.id),
    getDashboardData(user.id),
    getThisWeekIncome(),
    getRunningEntry(user.id),
  ]);

  // Up next: today's events + tasks due today, date-only tasks first.
  type Item = {
    key: string;
    href: string;
    title: string;
    meta: string;
    at: Date | null;
    dot: string;
    icon?: "voice" | "meet";
    priority?: string;
  };
  const items: Item[] = [
    ...h.events.map<Item>((e) => ({
      key: `e-${e.id}`,
      href: e.type === "REMINDER" && e.taskId ? taskPath(e.taskId, e.task?.projectId) : "/calendar",
      title: e.title,
      meta:
        e.type === "REMINDER"
          ? e.voiceNoteId
            ? "Reminder · from a voice note"
            : "Reminder"
          : [e.type === "MEETING" ? "Meeting" : "Event", e.client?.companyName].filter(Boolean).join(" · "),
      at: e.allDay ? null : e.startAt,
      dot: e.type === "REMINDER" ? "bg-brand" : e.type === "MEETING" ? "bg-community" : "bg-success",
      icon: e.type === "REMINDER" && e.voiceNoteId ? "voice" : e.meetingUrl ? "meet" : undefined,
    })),
    ...h.dueTasks.map<Item>((t) => {
      const timed = t.dueDate && t.dueDate.getTime() !== h.dateStart.getTime();
      return {
        key: `t-${t.id}`,
        href: taskPath(t.id, t.projectId),
        title: t.title,
        meta: ["Task due", t.project?.client?.companyName ?? t.project?.name].filter(Boolean).join(" · "),
        at: timed ? t.dueDate : null,
        dot: "bg-ink",
        priority: t.priority,
      };
    }),
  ].sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));

  const note = h.latestNote;
  const noteCounts = note
    ? {
        tasks: note._count.createdTasks - note._count.createdEvents,
        reminders: note._count.createdEvents,
        ideas: note._count.createdIdeas,
      }
    : null;

  const runningLabel = running?.project
    ? (running.project.client?.companyName ?? running.project.name)
    : null;

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-5">
      {/* ── Left column (desktop) ── */}
      <div className="contents lg:col-span-8 lg:flex lg:flex-col lg:gap-5">
        <div className="order-1 lg:hidden">
          <HomeClock running={running ? { startedAt: running.startedAt } : null} label={runningLabel} />
        </div>

        <div className="order-2 grid grid-cols-3 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
          <Stat value={h.dueTodayCount} label="Due today" href="/tasks" />
          <Stat value={h.overdueCount} label="Overdue" href="/tasks" tone={h.overdueCount > 0 ? "warn" : "plain"} />
          <Stat value={h.unreadNotes} label="New voice notes" href="/voice" tone="dark" />
          <div className="hidden lg:contents">
            <Stat value={d.activeProjects} label="Active projects" href="/projects" />
          </div>
        </div>

        <section aria-labelledby="h-mytasks" className={`order-5 ${card} px-4 py-3.5 lg:px-5.5 lg:py-4.5`}>
          <SectionHead id="h-mytasks" title="My tasks" href="/tasks" link="All tasks" />
          {h.myTasks.length === 0 ? (
            <p className="flex items-center gap-2 py-2 text-sm text-[#6B645D]">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Nothing open. Inbox zero.
            </p>
          ) : (
            h.myTasks.map((t, i) => (
              <Link
                key={t.id}
                href={taskPath(t.id, t.projectId)}
                className={`flex min-h-14 items-center gap-3 ${i < h.myTasks.length - 1 ? "border-b border-black/[0.06]" : ""}`}
              >
                <span className="h-[22px] w-[22px] shrink-0 rounded-full border-2 border-[#C9C1B8]" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
                    <span className="truncate">{t.title}</span>
                    {t.voiceNoteId && <Mic className="w-3.5 h-3.5 shrink-0 text-[#B34100]" aria-label="From a voice note" />}
                  </span>
                  <span className="block truncate text-[13px] text-[#6B645D]">
                    {t.project ? (t.project.client?.companyName ?? t.project.name) : "Inbox"}
                    {t.dueDate && (
                      <>
                        {" · "}
                        {t.dueDate.getUTCHours() === 0 && t.dueDate.getUTCMinutes() === 0 ? (
                          dateOnly(t.dueDate)
                        ) : (
                          <LocalTime date={t.dueDate} format="weekday" />
                        )}
                      </>
                    )}
                  </span>
                </span>
                <PriorityChip priority={t.priority} />
              </Link>
            ))
          )}
        </section>

        <section aria-labelledby="h-income" className={`order-6 ${card} px-4 py-3.5 lg:px-5.5 lg:py-4.5`}>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <h2 id="h-income" className="text-[17px] font-bold">
                This week&apos;s income
              </h2>
              <p className="text-xs text-[#6B645D]">
                {dateOnly(income.weekStart)} – {dateOnly(income.weekEnd)}
              </p>
            </div>
            <p className="font-display text-[34px] leading-none text-[#B34100]">{money(income.total)}</p>
          </div>
          {income.rows.length === 0 ? (
            <p className="py-1 text-sm text-[#6B645D]">No client payments scheduled this week.</p>
          ) : (
            <ul className="max-h-48 divide-y divide-black/[0.06] overflow-y-auto">
              {income.rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/crm/${r.id}`} className="flex min-h-12 items-center gap-3">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.colorHex ?? "#cbd5e1" }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{r.companyName}</span>
                      <span className="text-xs text-[#6B645D]">
                        {dateOnly(r.when)} · {FREQ_LABEL[r.frequency ?? ""] ?? "—"}
                        {r.prorated && " · prorated"}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums">{money(r.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="h-projects" className={`order-7 ${card} px-4 py-3.5 lg:px-5.5 lg:py-4.5`}>
          <SectionHead id="h-projects" title="Active projects" href="/projects" link="View all" />
          {d.activeProjectList.length === 0 ? (
            <p className="text-sm text-[#6B645D]">No active projects.</p>
          ) : (
            <ul className="flex flex-col gap-3.5 pb-1">
              {d.activeProjectList.map((p) => {
                const total = p.tasks.length;
                const done = p.tasks.filter((t) => t.status === "DONE").length;
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="group block">
                      <span className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold group-hover:text-[#B34100]">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.client?.colorHex ?? "#cbd5e1" }} />
                          <span className="truncate">{p.name}</span>
                        </span>
                        <span className="shrink-0 text-xs text-[#6B645D]">
                          {done}/{total}
                        </span>
                      </span>
                      <span className="block h-1.5 overflow-hidden rounded-full bg-cream">
                        <span className="block h-full rounded-full bg-midnight" style={{ width: `${pct}%` }} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ── Right column (desktop) ── */}
      <div className="contents lg:col-span-4 lg:flex lg:flex-col lg:gap-5">
        <section aria-labelledby="h-upnext" className="order-3">
          <SectionHead id="h-upnext" title="Up next" href="/calendar" link="Calendar" />
          <div className={`${card} px-4 py-1.5`}>
            {items.length === 0 ? (
              <p className="py-4 text-sm text-[#6B645D]">Nothing else scheduled today.</p>
            ) : (
              items.map((it, i) => (
                <Link
                  key={it.key}
                  href={it.href}
                  className={`flex min-h-16 items-center gap-3.5 ${i < items.length - 1 ? "border-b border-black/[0.06]" : ""}`}
                >
                  <span className="w-[62px] shrink-0 text-center font-display text-xl leading-none">
                    {it.at ? <LocalTime date={it.at} format="time" /> : "Today"}
                  </span>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${it.dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{it.title}</span>
                    <span className="flex items-center gap-1.5 truncate text-[13px] text-[#6B645D]">
                      {it.icon === "voice" && <Mic className="w-3.5 h-3.5 shrink-0" />}
                      {it.icon === "meet" && <Video className="w-3.5 h-3.5 shrink-0" />}
                      {it.meta}
                    </span>
                  </span>
                  {it.priority && (it.priority === "URGENT" || it.priority === "HIGH") && (
                    <PriorityChip priority={it.priority} />
                  )}
                </Link>
              ))
            )}
          </div>
        </section>

        <section aria-labelledby="h-voice" className="order-4">
          <SectionHead id="h-voice" title="Latest voice note" href="/voice" link="All notes" />
          {note && noteCounts ? (
            <Link href={`/voice/${note.id}`} className={`flex flex-col gap-3 ${card} p-4`}>
              <span className="flex items-center gap-2.5">
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-xl bg-brand-pale text-[#B34100]">
                  <Mic className="w-[18px] h-[18px]" />
                </span>
                <span className="flex-1 text-[13px] text-[#6B645D]">
                  <LocalTime date={note.receivedAt} format="relative" /> · via{" "}
                  <span className="capitalize">{note.source}</span>
                </span>
                <ChevronRight className="w-[18px] h-[18px] text-[#6B645D]" />
              </span>
              <span className="text-base font-semibold leading-snug">{note.summary || "Voice note"}</span>
              <span className="flex flex-wrap gap-1.5">
                {noteCounts.tasks > 0 && (
                  <span className="flex items-center gap-1 rounded-[10px] bg-[#F1ECE6] px-2.5 py-1 text-xs font-semibold">
                    <ListChecks className="w-3.5 h-3.5" />
                    {noteCounts.tasks} task{noteCounts.tasks === 1 ? "" : "s"}
                  </span>
                )}
                {noteCounts.reminders > 0 && (
                  <span className="flex items-center gap-1 rounded-[10px] bg-[#F1ECE6] px-2.5 py-1 text-xs font-semibold">
                    <BellRing className="w-3.5 h-3.5" />
                    {noteCounts.reminders} reminder{noteCounts.reminders === 1 ? "" : "s"}
                  </span>
                )}
                {noteCounts.ideas > 0 && (
                  <span className="flex items-center gap-1 rounded-[10px] bg-[#F1ECE6] px-2.5 py-1 text-xs font-semibold">
                    <Lightbulb className="w-3.5 h-3.5" />
                    {noteCounts.ideas} idea{noteCounts.ideas === 1 ? "" : "s"}
                  </span>
                )}
              </span>
            </Link>
          ) : (
            <Link href="/profile#voice-key" className={`block ${card} p-4 text-sm text-[#6B645D]`}>
              No voice notes yet — set up your voice key to start capturing from your iPhone.
            </Link>
          )}
        </section>

        <section aria-labelledby="h-clocks" className={`order-8 ${card} px-4 py-3.5 lg:px-5 lg:py-4`}>
          <h2 id="h-clocks" className="mb-3 text-[17px] font-bold">
            Client clocks
          </h2>
          <WorldClocks />
        </section>

        {d.atRiskClients.length > 0 && (
          <section aria-labelledby="h-health" className={`order-9 ${card} px-4 py-3.5 lg:px-5 lg:py-4`}>
            <h2 id="h-health" className="mb-2.5 text-[17px] font-bold">
              Client health
            </h2>
            <ul className="flex flex-col gap-1">
              {d.atRiskClients.map((c) => (
                <li key={c.id}>
                  <Link href={`/crm/${c.id}`} title={c.reasons.join(" · ")} className="flex min-h-10 items-center gap-2.5 text-sm">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.health === "RED" ? "bg-[#D92D20]" : "bg-[#F5B000]"}`}
                    />
                    <span className="flex-1 truncate font-medium">{c.companyName}</span>
                    <span className="truncate text-xs text-[#6B645D]">{c.reasons[0]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
