"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ListChecks } from "lucide-react";
import EventItem from "./event-item";
import type { CalEvent, ClientOpt, UserOpt } from "./event-modal";

// Phone calendar: a week strip + the selected day's agenda + what's coming up.
// Everything is placed in the VIEWER's time zone. Desktop keeps the month grid.

export type AgendaTask = {
  id: string;
  title: string;
  dueDate: Date | string;
  href: string;
  subtitle: string | null;
};

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();

// Date-only due dates are stored at UTC midnight → place them on that UTC
// calendar date; timed ones on the viewer's local day.
function taskDay(due: Date): Date {
  return due.getUTCHours() === 0 && due.getUTCMinutes() === 0
    ? new Date(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate())
    : startOfDay(due);
}

export default function MobileAgenda({
  events,
  tasks,
  clients,
  users,
  rangeFrom,
  rangeTo,
}: {
  events: CalEvent[];
  tasks: AgendaTask[];
  clients: ClientOpt[];
  users: UserOpt[];
  rangeFrom: string;
  rangeTo: string;
}) {
  const [selected, setSelected] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- "today" must be the viewer's
    setSelected(startOfDay(new Date()));
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<number, { events: CalEvent[]; tasks: AgendaTask[] }>();
    const slot = (d: Date) => {
      const k = startOfDay(d).getTime();
      if (!map.has(k)) map.set(k, { events: [], tasks: [] });
      return map.get(k)!;
    };
    for (const e of events) slot(new Date(e.startAt)).events.push(e);
    for (const t of tasks) slot(taskDay(new Date(t.dueDate))).tasks.push(t);
    for (const v of map.values()) v.events.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    return map;
  }, [events, tasks]);

  if (!selected) return <div className="min-h-40" />;

  const from = new Date(rangeFrom);
  const to = new Date(rangeTo);
  const monday = new Date(selected.getTime() - ((selected.getDay() + 6) % 7) * DAY);
  const week = Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  const today = startOfDay(new Date());
  const shift = (days: number) => setSelected(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + days));
  const inRange = (d: Date) => d >= from && d < to;

  const upcoming = Array.from({ length: 6 }, (_, i) => new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + i + 1))
    .filter((d) => byDay.has(d.getTime()));

  const label = (d: Date) =>
    sameDay(d, today)
      ? "Today"
      : sameDay(d, new Date(today.getTime() + DAY))
        ? "Tomorrow"
        : d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  const dayList = (d: Date) => {
    const day = byDay.get(d.getTime());
    if (!day) return <p className="rounded-[18px] bg-white px-4 py-4 text-sm text-[#6B645D]">Nothing scheduled.</p>;
    return (
      <div className="flex flex-col gap-2.5">
        {day.tasks.map((t) => (
          <div key={`t-${t.id}`} className="flex gap-3">
            <span className="w-12 shrink-0 pt-3.5 text-right text-[13px] font-semibold text-[#6B645D]">Due</span>
            <Link
              href={t.href}
              className="flex min-h-[60px] flex-1 items-center gap-2.5 rounded-[18px] border border-dashed border-[#C9C1B8] bg-white px-3.5 py-3"
            >
              <ListChecks className="w-[18px] h-[18px] shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-bold">{t.title}</span>
                <span className="block truncate text-[13px] text-[#6B645D]">Task due{t.subtitle ? ` · ${t.subtitle}` : ""}</span>
              </span>
            </Link>
          </div>
        ))}
        {day.events.map((e) => (
          <div key={`e-${e.id}`} className="flex gap-3">
            <span className="w-12 shrink-0 pt-3.5 text-right text-[13px] font-semibold text-[#6B645D]">
              {e.allDay
                ? "All day"
                : new Date(e.startAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M$/i, "")}
            </span>
            <div className="min-w-0 flex-1">
              <EventItem event={e} clients={clients} users={users} variant="agenda" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 lg:hidden">
      <div className="flex items-center gap-1 rounded-[22px] border border-black/[0.07] bg-white px-1.5 py-2.5">
        <button type="button" onClick={() => shift(-7)} aria-label="Previous week" className="flex h-11 w-7 items-center justify-center text-[#6B645D]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {week.map((d) => {
            const isSel = sameDay(d, selected);
            const has = byDay.has(d.getTime());
            return (
              <button
                key={d.getTime()}
                type="button"
                onClick={() => setSelected(d)}
                aria-pressed={isSel}
                aria-label={d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-[14px] ${isSel ? "bg-midnight text-white" : ""}`}
              >
                <span className={`text-[11px] font-semibold ${isSel ? "text-white/70" : "text-[#6B645D]"}`}>
                  {d.toLocaleDateString(undefined, { weekday: "narrow" })}
                </span>
                <span className={`text-[17px] ${sameDay(d, today) ? "font-bold text-brand" : "font-semibold"} ${isSel ? "!text-white" : ""}`}>
                  {d.getDate()}
                </span>
                <span className={`h-[5px] w-[5px] rounded-full ${has ? (isSel ? "bg-[#FF7A33]" : "bg-brand") : "bg-transparent"}`} />
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => shift(7)} aria-label="Next week" className="flex h-11 w-7 items-center justify-center text-[#6B645D]">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {!inRange(selected) ? (
        <p className="rounded-[18px] bg-white px-4 py-4 text-sm text-[#6B645D]">
          Use the month arrows above to load this week.
        </p>
      ) : (
        <>
          <h2 className="text-[17px] font-bold">{label(selected)}</h2>
          {dayList(selected)}
          {upcoming.map((d) => (
            <section key={d.getTime()} className="flex flex-col gap-2.5">
              <h2 className="mt-1 text-[17px] font-bold">{label(d)}</h2>
              {dayList(d)}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
