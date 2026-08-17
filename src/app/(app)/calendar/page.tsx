import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { listEvents, listTaskDue } from "@/lib/calendar";
import { listActiveClients } from "@/lib/projects";
import { createEvent } from "./actions";
import EventList from "./_components/event-list";
import EventItem from "./_components/event-item";

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const monthParam = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const now = new Date();
  const [y, m] = (month ?? monthParam(now)).split("-").map(Number);
  const year = y;
  const month0 = (m ?? 1) - 1;

  const first = new Date(year, month0, 1);
  const gridStart = new Date(year, month0, 1 - ((first.getDay() + 6) % 7)); // Monday
  const days = Array.from({ length: 42 }, (_, i) =>
    new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i),
  );
  const rangeFrom = days[0];
  const rangeTo = new Date(days[41].getFullYear(), days[41].getMonth(), days[41].getDate() + 1);

  const [events, taskDue, clients] = await Promise.all([
    listEvents(rangeFrom, rangeTo),
    listTaskDue(rangeFrom, rangeTo),
    listActiveClients(),
  ]);

  const prev = monthParam(new Date(year, month0 - 1, 1));
  const next = monthParam(new Date(year, month0 + 1, 1));
  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center rounded-full bg-cream border border-black/10">
          <Link href={`/calendar?month=${prev}`} className="p-2 text-ink/60 hover:text-ink" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="px-3 text-sm font-semibold text-ink min-w-[140px] text-center">{monthLabel}</span>
          <Link href={`/calendar?month=${next}`} className="p-2 text-ink/60 hover:text-ink" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <details className="relative">
          <summary className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wide text-sm px-4 py-2.5 rounded-full transition-colors cursor-pointer list-none">
            <Plus className="w-4 h-4" /> New Event
          </summary>
          <form
            action={createEvent}
            className="absolute right-0 mt-2 w-80 bg-white border border-black/10 rounded-xl shadow-lg p-4 space-y-3 z-30"
          >
            <div>
              <label className={label}>Title *</label>
              <input name="title" required placeholder="Client kickoff call" className={input} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Type</label>
                <select name="type" className={input} defaultValue="MEETING">
                  <option value="MEETING">Meeting</option>
                  <option value="CONTENT_PUBLISH">Content</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className={label}>Client</label>
                <select name="clientId" className={input} defaultValue="">
                  <option value="">—</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={label}>Start *</label>
              <input type="datetime-local" name="start" required className={input} />
            </div>
            <div>
              <label className={label}>End</label>
              <input type="datetime-local" name="end" className={input} />
            </div>
            <div>
              <label className={label}>Meeting link</label>
              <input type="url" name="meetingUrl" placeholder="https://meet…" className={input} />
            </div>
            <div>
              <label className={label}>Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Agenda, notes, context…"
                className={input}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-ink/60">
              <input type="checkbox" name="allDay" className="accent-brand w-4 h-4" /> All day
            </label>
            <button
              type="submit"
              className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold uppercase tracking-wide py-2 rounded-full transition-colors"
            >
              Add Event
            </button>
          </form>
        </details>
      </div>

      {/* Month grid */}
      <div className="bg-white rounded-2xl border border-black/[0.07] overflow-hidden">
        <div className="grid grid-cols-7 border-b border-black/[0.06]">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-ink/40 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const inMonth = day.getMonth() === month0;
            const isToday = sameDay(day, now);
            const dayEvents = events.filter((e) => sameDay(new Date(e.startAt), day));
            const dayTasks = taskDue.filter((t) => t.dueDate && sameDay(new Date(t.dueDate), day));
            const total = dayEvents.length + dayTasks.length;
            // Events first (clickable → details/edit modal), then task-due flags;
            // capped at 3 per cell.
            const shownEvents = dayEvents.slice(0, 3);
            const shownTasks = dayTasks.slice(0, Math.max(0, 3 - shownEvents.length));
            return (
              <div
                key={i}
                className={`min-h-[104px] border-b border-r border-black/[0.05] p-1.5 ${
                  inMonth ? "bg-white" : "bg-cream/40"
                } ${i % 7 === 6 ? "border-r-0" : ""}`}
              >
                <div className="flex justify-end">
                  <span
                    className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? "bg-brand text-white" : inMonth ? "text-ink/60" : "text-ink/25"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {shownEvents.map((e) => (
                    <EventItem key={`e-${e.id}`} event={e} clients={clients} variant="pill" />
                  ))}
                  {shownTasks.map((t) => {
                    const color = t.project?.client?.colorHex ?? "#94a3b8";
                    const href = t.projectId
                      ? `/projects/${t.projectId}/tasks/${t.id}`
                      : null;
                    const pill = (
                      <div
                        className="flex items-center gap-1 text-[11px] text-ink/80 rounded px-1 py-0.5 truncate hover:bg-cream"
                        style={{ borderLeft: `3px solid ${color}` }}
                      >
                        <span className="truncate">⚑ {t.title}</span>
                      </div>
                    );
                    return href ? (
                      <Link key={`t-${t.id}`} href={href} className="block">
                        {pill}
                      </Link>
                    ) : (
                      <div key={`t-${t.id}`}>{pill}</div>
                    );
                  })}
                  {total > 3 && (
                    <div className="text-[10px] text-black/35 px-1">+{total - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda */}
      <div>
        <h3 className="font-display text-2xl tracking-wide text-ink mb-3">Events this month</h3>
        <EventList events={events} clients={clients} />
      </div>
    </div>
  );
}
