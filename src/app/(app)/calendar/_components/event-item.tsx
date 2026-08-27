"use client";

import { useState } from "react";
import { Video, Users, CalendarClock } from "lucide-react";
import EventModal, { type CalEvent, type ClientOpt, type UserOpt } from "./event-modal";
import { initials } from "../../projects/_components/task-badges";

const TYPE_LABEL: Record<string, string> = {
  MEETING: "Meeting",
  CONTENT_PUBLISH: "Content",
  OTHER: "Other",
};

function fmtWhen(e: CalEvent): string {
  const start = new Date(e.startAt);
  return start.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: e.allDay ? undefined : "numeric",
    minute: e.allDay ? undefined : "2-digit",
  });
}

// A single calendar event that opens a details/edit modal on click. Rendered
// three ways: a compact "pill" inside a month-grid day cell, a "row" in a
// flat list (legacy, unused now but kept simple to restore), or a square
// "card" for the agenda grid below the month view.
export default function EventItem({
  event,
  clients,
  users,
  variant,
}: {
  event: CalEvent;
  clients: ClientOpt[];
  users: UserOpt[];
  variant: "pill" | "row" | "card";
}) {
  const [open, setOpen] = useState(false);
  const color = event.client?.colorHex ?? "#ff5c00";

  return (
    <>
      {variant === "pill" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-1 text-[11px] text-ink/80 rounded px-1 py-0.5 hover:bg-cream text-left"
          style={{ borderLeft: `3px solid ${color}` }}
          title={event.title}
        >
          <span className="truncate">{event.title}</span>
        </button>
      ) : variant === "card" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-white rounded-2xl border border-black/[0.07] p-5 hover:border-brand/40 hover:shadow-sm transition text-left flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
              <h4 className="font-bold text-ink leading-snug line-clamp-2">{event.title}</h4>
            </div>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-ink/40 bg-cream px-1.5 py-0.5 rounded">
              {TYPE_LABEL[event.type] ?? event.type}
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-black/45">
            <CalendarClock className="w-3.5 h-3.5 shrink-0" />
            {fmtWhen(event)}
            {event.allDay ? " · All day" : ""}
          </p>

          {event.client && (
            <p className="text-xs font-semibold text-ink/60 truncate">{event.client.companyName}</p>
          )}

          {event.description && (
            <p className="text-xs text-black/50 line-clamp-2 whitespace-pre-wrap">{event.description}</p>
          )}

          <div className="mt-auto pt-3 border-t border-black/[0.06] flex items-center justify-between gap-2">
            {event.attendees.length > 0 ? (
              <div className="flex items-center -space-x-1.5">
                {event.attendees.slice(0, 4).map((a) => (
                  <span
                    key={a.user.id}
                    title={a.user.name}
                    className="w-6 h-6 rounded-full bg-midnight text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
                  >
                    {initials(a.user.name)}
                  </span>
                ))}
                {event.attendees.length > 4 && (
                  <span className="w-6 h-6 rounded-full bg-cream text-ink/50 text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                    +{event.attendees.length - 4}
                  </span>
                )}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-black/30">
                <Users className="w-3.5 h-3.5" /> No participants
              </span>
            )}
            {event.meetingUrl && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand shrink-0">
                <Video className="w-3.5 h-3.5" /> Link
              </span>
            )}
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-cream/60 transition"
        >
          <span
            className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: color }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink truncate">{event.title}</p>
            <p className="text-xs text-black/45">
              {fmtWhen(event)}
              {event.allDay ? " · All day" : ""}
              {event.client ? ` · ${event.client.companyName}` : ""}
              {event.type === "CONTENT_PUBLISH" ? " · content" : ""}
            </p>
            {event.description && (
              <p className="mt-1 text-xs text-black/55 line-clamp-2 whitespace-pre-wrap">
                {event.description}
              </p>
            )}
            {event.meetingUrl && (
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand">
                <Video className="w-3.5 h-3.5" /> Meeting link
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-ink/35 shrink-0 pt-0.5">
            Details →
          </span>
        </button>
      )}

      {open && (
        <EventModal event={event} clients={clients} users={users} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
