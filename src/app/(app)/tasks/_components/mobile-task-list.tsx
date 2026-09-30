"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Mic, Inbox } from "lucide-react";
import { moveTaskStatus } from "../../projects/actions";
import { taskPath } from "@/lib/task-path";
import PriorityChip from "../../_components/priority-chip";

// Phone Tasks view: grouped by client (voice-note tasks first), tap the circle
// to complete. Desktop keeps the board / table.

export type ListTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  voiceNoteId: string | null;
  project: { id: string; name: string; client: { id: string; companyName: string; colorHex: string | null } | null } | null;
};

type Filter = "open" | "today" | "upcoming" | "done";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "done", label: "Done" },
];

// Date-only due dates live at UTC midnight → compare on their UTC date.
function dueDay(d: Date): Date {
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0
    ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dueLabel(raw: Date | string, today: Date): { text: string; urgent: boolean } {
  const d = new Date(raw);
  const day = dueDay(d);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  const timed = !(d.getUTCHours() === 0 && d.getUTCMinutes() === 0);
  const time = timed ? `, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : "";
  if (diff < 0) return { text: `Overdue · ${day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, urgent: true };
  if (diff === 0) return { text: `Today${time}`, urgent: true };
  if (diff === 1) return { text: `Tomorrow${time}`, urgent: false };
  return { text: day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + time, urgent: false };
}

type Group = { key: string; label: string; badge: React.ReactNode; tasks: ListTask[] };

export default function MobileTaskList({ tasks }: { tasks: ListTask[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("open");
  const [today, setToday] = useState<Date | null>(null);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [, start] = useTransition();

  useEffect(() => {
    const n = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- "today" is the viewer's
    setToday(new Date(n.getFullYear(), n.getMonth(), n.getDate()));
  }, []);

  const isDone = (t: ListTask) => done[t.id] ?? t.status === "DONE";

  const groups = useMemo<Group[]>(() => {
    if (!today) return [];
    const shown = tasks.filter((t) => {
      const d = done[t.id] ?? t.status === "DONE";
      if (filter === "done") return d;
      if (d && !(t.id in done)) return false; // keep just-ticked rows visible until refresh
      if (filter === "open") return true;
      if (!t.dueDate) return false;
      const diff = dueDay(new Date(t.dueDate)).getTime() - today.getTime();
      return filter === "today" ? diff <= 0 : diff > 0;
    });
    const map = new Map<string, Group>();
    const add = (key: string, label: string, badge: React.ReactNode, t: ListTask) => {
      if (!map.has(key)) map.set(key, { key, label, badge, tasks: [] });
      map.get(key)!.tasks.push(t);
    };
    for (const t of shown) {
      const c = t.project?.client;
      if (!t.project && t.voiceNoteId)
        add("voice", "From voice notes", <Mic className="w-4 h-4" />, t);
      else if (!t.project) add("inbox", "Inbox", <Inbox className="w-4 h-4" />, t);
      else if (c)
        add(
          c.id,
          c.companyName,
          <span className="font-display text-[15px] leading-none">
            {c.companyName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
          </span>,
          t,
        );
      else add("internal", "Internal", <span className="font-display text-[15px] leading-none">IN</span>, t);
    }
    const order = (g: Group) => (g.key === "voice" ? 0 : g.key === "inbox" ? 1 : g.key === "internal" ? 3 : 2);
    return [...map.values()].sort((a, b) => order(a) - order(b) || a.label.localeCompare(b.label));
  }, [tasks, filter, today, done]);

  const toggle = (t: ListTask) => {
    const next = !isDone(t);
    setDone((s) => ({ ...s, [t.id]: next }));
    start(async () => {
      await moveTaskStatus(t.id, next ? "DONE" : "TODO");
      router.refresh();
    });
  };

  const colorOf = (g: Group) => {
    if (g.key === "voice") return "bg-brand-pale text-[#B34100]";
    if (g.key === "inbox") return "bg-[#F1ECE6] text-ink";
    return "bg-midnight text-white";
  };

  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <div role="tablist" aria-label="Filter tasks" className="grid grid-cols-4 gap-1 rounded-2xl border border-black/[0.07] bg-white p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`h-[38px] rounded-xl text-sm font-semibold ${filter === f.key ? "bg-midnight text-white" : "text-[#4F4943]"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {today && groups.length === 0 && (
        <p className="rounded-[22px] border border-dashed border-black/15 bg-white p-6 text-center text-sm text-[#6B645D]">
          {filter === "done" ? "Nothing completed yet." : filter === "open" ? "No open tasks." : "Nothing here."}
        </p>
      )}

      {groups.map((g, gi) => {
        const open = openGroups[g.key] ?? (g.key === "voice" || gi === 0 || filter !== "open");
        const clientColor = g.tasks[0]?.project?.client?.colorHex;
        return (
          <section key={g.key} className="overflow-hidden rounded-[22px] border border-black/[0.07] bg-white">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenGroups((s) => ({ ...s, [g.key]: !open }))}
              className={`flex min-h-[54px] w-full items-center gap-2.5 px-4 text-left ${g.key === "voice" ? "bg-[#FFF6EF]" : ""}`}
            >
              <span
                className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] ${colorOf(g)}`}
                style={clientColor && g.key !== "voice" && g.key !== "inbox" ? { background: clientColor } : undefined}
              >
                {g.badge}
              </span>
              <span className="flex-1 truncate text-[15px] font-bold">{g.label}</span>
              <span className="text-[13px] font-semibold text-[#6B645D]">{g.tasks.length}</span>
              <ChevronDown className={`w-[18px] h-[18px] text-[#6B645D] transition-transform ${open ? "" : "-rotate-90"}`} />
            </button>
            {open && (
              <ul className="px-4">
                {g.tasks.map((t) => {
                  const d = isDone(t);
                  const due = t.dueDate && today ? dueLabel(t.dueDate, today) : null;
                  return (
                    <li key={t.id} className="flex min-h-16 items-center gap-3 border-t border-black/[0.06]">
                      <button
                        type="button"
                        onClick={() => toggle(t)}
                        aria-label={d ? `Mark “${t.title}” not done` : `Complete “${t.title}”`}
                        aria-pressed={d}
                        className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center"
                      >
                        <span
                          className={`flex h-[26px] w-[26px] items-center justify-center rounded-full transition-colors ${
                            d ? "bg-success text-white" : "border-2 border-[#C9C1B8] bg-white"
                          }`}
                        >
                          {d && <Check className="w-[15px] h-[15px]" strokeWidth={3} />}
                        </span>
                      </button>
                      <Link href={taskPath(t.id, t.project?.id, "tasks")} className="min-w-0 flex-1 py-2.5">
                        <span className={`block truncate text-[15px] font-semibold ${d ? "text-[#6B645D] line-through" : ""}`}>
                          {t.title}
                        </span>
                        <span
                          className={`block truncate text-[13px] ${due?.urgent && !d ? "font-semibold text-[#B34100]" : "text-[#6B645D]"}`}
                        >
                          {[due?.text ?? (t.dueDate ? "" : "No date"), t.project?.name].filter(Boolean).join(" · ")}
                        </span>
                      </Link>
                      {!d && <PriorityChip priority={t.priority} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
