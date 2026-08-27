import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { listEvents, listTaskDates } from "@/lib/calendar";
import { listActiveClients, listUsers } from "@/lib/projects";
import { createEvent } from "./actions";
import EventList from "./_components/event-list";
import EventItem from "./_components/event-item";
import { initials } from "../projects/_components/task-badges";
import AddModal from "../_components/add-modal";

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const monthParam = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// A datetime-local input value ("YYYY-MM-DDTHH:mm") for `day` at `hour`.
function toLocalInput(day: Date, hour: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(hour)}:00`;
}

type UserOpt = { id: string; name: string };

// Shared "New Event" fields — used by both the toolbar's blank New Event
// modal and each day cell's pre-filled one, so the two never drift apart.
function EventFormFields({
  clients,
  users,
  defaultStart,
  defaultAttendeeIds,
}: {
  clients: { id: string; companyName: string }[];
  users: UserOpt[];
  defaultStart?: string;
  defaultAttendeeIds: string[];
}) {
  return (
    <>
      <div>
        <label className={label}>Title *</label>
        <input name="title" required autoFocus placeholder="Client kickoff call" className={input} />
      </div>
      <div className="grid grid-cols-2 gap-3">
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Start *</label>
          <input
            type="datetime-local"
            name="start"
            required
            defaultValue={defaultStart}
            className={input}
          />
        </div>
        <div>
          <label className={label}>End</label>
          <input type="datetime-local" name="end" className={input} />
        </div>
      </div>
      <div>
        <label className={label}>Meeting link</label>
        <input type="url" name="meetingUrl" placeholder="https://meet…" className={input} />
      </div>
      <div>
        <label className={label}>Description</label>
        <textarea name="description" rows={4} placeholder="Agenda, notes, context…" className={input} />
      </div>
      <div>
        <label className={label}>Participants</label>
        <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto rounded-lg border border-black/10 p-2.5">
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-sm text-ink/80 cursor-pointer">
              <input
                type="checkbox"
                name="attendeeIds"
                value={u.id}
                defaultChecked={defaultAttendeeIds.includes(u.id)}
                className="accent-brand w-4 h-4 shrink-0"
              />
              <span className="truncate">{u.name}</span>
            </label>
          ))}
        </div>
        <p className="text-[10px] text-black/40 mt-1">
          Shows up on their calendar too — you&apos;re always included.
        </p>
      </div>
      <label className="flex items-center gap-2 text-xs text-ink/60">
        <input type="checkbox" name="allDay" className="accent-brand w-4 h-4" /> All day
      </label>
      <button
        type="submit"
        className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-bold uppercase tracking-wide py-2.5 rounded-full transition-colors"
      >
        Add Event
      </button>
    </>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; user?: string }>;
}) {
  const session = await verifySession();
  const { month, user } = await searchParams;
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

  const [clients, users] = await Promise.all([listActiveClients(), listUsers()]);

  // Scope: "everyone" (team-wide, unfiltered) | a specific userId. Default
  // (no ?user) = the logged-in user's own calendar.
  let scope: string;
  if (user === "everyone") scope = "everyone";
  else if (user && users.some((u) => u.id === user)) scope = user;
  else scope = session.userId;
  const scopeUserId = scope === "everyone" ? undefined : scope;

  const [events, taskDates] = await Promise.all([
    listEvents(rangeFrom, rangeTo, scopeUserId),
    listTaskDates(rangeFrom, rangeTo, scopeUserId),
  ]);

  // Whoever's calendar is currently open gets pre-checked as a participant
  // when adding a new event from here — scheduling on Bob's calendar should
  // default to inviting Bob.
  const defaultAttendeeIds =
    scopeUserId && scopeUserId !== session.userId
      ? [session.userId, scopeUserId]
      : [session.userId];

  const prev = monthParam(new Date(year, month0 - 1, 1));
  const next = monthParam(new Date(year, month0 + 1, 1));
  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Current user first, then the rest — same convention as /tasks.
  const orderedUsers = [
    ...users.filter((u) => u.id === session.userId),
    ...users.filter((u) => u.id !== session.userId),
  ];
  const hrefWith = (u?: string, mo = month ?? monthParam(now)) => {
    const p = new URLSearchParams();
    if (mo) p.set("month", mo);
    if (u) p.set("user", u);
    return `/calendar?${p.toString()}`;
  };
  const tabCls = (active: boolean) =>
    `px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition ${
      active ? "bg-midnight text-white" : "text-ink/60 hover:text-ink hover:bg-black/[0.04]"
    }`;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center rounded-full bg-cream border border-black/10">
          <Link href={hrefWith(user, prev)} className="p-2 text-ink/60 hover:text-ink" aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="px-3 text-sm font-semibold text-ink min-w-[140px] text-center">{monthLabel}</span>
          <Link href={hrefWith(user, next)} className="p-2 text-ink/60 hover:text-ink" aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <AddModal
          title="New Event"
          triggerClassName="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wide text-sm px-4 py-2.5 rounded-full transition-colors"
          trigger={
            <>
              <Plus className="w-4 h-4" /> New Event
            </>
          }
          panelClassName="max-w-xl"
        >
          <form action={createEvent} className="space-y-4">
            <EventFormFields clients={clients} users={users} defaultAttendeeIds={defaultAttendeeIds} />
          </form>
        </AddModal>
      </div>

      {/* Whose calendar */}
      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
        {orderedUsers.map((u) => (
          <Link key={u.id} href={hrefWith(u.id === session.userId ? undefined : u.id)} className={tabCls(scope === u.id)}>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-midnight text-white text-[8px] font-bold inline-flex items-center justify-center">
                {initials(u.name)}
              </span>
              {u.id === session.userId ? "My Calendar" : u.name}
            </span>
          </Link>
        ))}
        <span className="w-px h-5 bg-black/10 mx-1 shrink-0" aria-hidden />
        <Link href={hrefWith("everyone")} className={tabCls(scope === "everyone")}>
          Everyone
        </Link>
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
            // A task due today always shows as "Due"; it only additionally
            // shows as "Starts" on a DIFFERENT day, so a same-day task
            // doesn't render as two redundant pills.
            const dayDueTasks = taskDates.filter((t) => t.dueDate && sameDay(new Date(t.dueDate), day));
            const dayStartTasks = taskDates.filter(
              (t) =>
                t.startDate &&
                sameDay(new Date(t.startDate), day) &&
                !(t.dueDate && sameDay(new Date(t.dueDate), day)),
            );
            const total = dayEvents.length + dayDueTasks.length + dayStartTasks.length;
            // Events first (clickable → details/edit modal), then task
            // start/due flags; capped at 3 per cell.
            const shownEvents = dayEvents.slice(0, 3);
            const remaining = Math.max(0, 3 - shownEvents.length);
            const shownDue = dayDueTasks.slice(0, remaining);
            const shownStart = dayStartTasks.slice(0, Math.max(0, remaining - shownDue.length));
            return (
              <div
                key={i}
                className={`relative min-h-[104px] border-b border-r border-black/[0.05] p-1.5 ${
                  inMonth ? "bg-white" : "bg-cream/40"
                } ${i % 7 === 6 ? "border-r-0" : ""}`}
              >
                {/* Click anywhere empty in this cell to add an event on this
                    date. Sits behind the day number + pills (position:absolute
                    stacks above position:static by default, so those need
                    their own z-index to stay on top and remain independently
                    clickable) — clicking a pill hits the pill, not this. */}
                <AddModal
                  title={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                  trigger={null}
                  triggerClassName="absolute inset-0 z-0 cursor-pointer"
                  triggerAriaLabel={`Add event on ${day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}`}
                  panelClassName="max-w-xl"
                >
                  <form action={createEvent} className="space-y-4">
                    <EventFormFields
                      clients={clients}
                      users={users}
                      defaultStart={toLocalInput(day, 9)}
                      defaultAttendeeIds={defaultAttendeeIds}
                    />
                  </form>
                </AddModal>

                <div className="relative z-10 flex justify-end">
                  <span
                    className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? "bg-brand text-white" : inMonth ? "text-ink/60" : "text-ink/25"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <div className="relative z-10 mt-0.5 space-y-0.5">
                  {shownEvents.map((e) => (
                    <EventItem key={`e-${e.id}`} event={e} clients={clients} users={users} variant="pill" />
                  ))}
                  {shownDue.map((t) => {
                    const color = t.project?.client?.colorHex ?? "#94a3b8";
                    const href = t.projectId ? `/projects/${t.projectId}/tasks/${t.id}` : null;
                    const pill = (
                      <div
                        className="flex items-center gap-1 text-[11px] text-ink/80 rounded px-1 py-0.5 truncate hover:bg-cream"
                        style={{ borderLeft: `3px solid ${color}` }}
                        title={`Due: ${t.title}`}
                      >
                        <span className="truncate">⚑ {t.title}</span>
                      </div>
                    );
                    return href ? (
                      <Link key={`due-${t.id}`} href={href} className="block">
                        {pill}
                      </Link>
                    ) : (
                      <div key={`due-${t.id}`}>{pill}</div>
                    );
                  })}
                  {shownStart.map((t) => {
                    const color = t.project?.client?.colorHex ?? "#94a3b8";
                    const href = t.projectId ? `/projects/${t.projectId}/tasks/${t.id}` : null;
                    const pill = (
                      <div
                        className="flex items-center gap-1 text-[11px] text-ink/60 rounded px-1 py-0.5 truncate hover:bg-cream"
                        style={{ borderLeft: `3px solid ${color}` }}
                        title={`Starts: ${t.title}`}
                      >
                        <span className="truncate">▸ {t.title}</span>
                      </div>
                    );
                    return href ? (
                      <Link key={`start-${t.id}`} href={href} className="block">
                        {pill}
                      </Link>
                    ) : (
                      <div key={`start-${t.id}`}>{pill}</div>
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
        <EventList events={events} clients={clients} users={users} />
      </div>
    </div>
  );
}
