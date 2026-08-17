"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import EventModal, { type CalEvent, type ClientOpt } from "./event-modal";

// A single calendar event that opens a details/edit modal on click. Rendered
// two ways: as a compact "pill" inside a month-grid day cell, or as a "row" in
// the agenda list below the grid.
export default function EventItem({
  event,
  clients,
  variant,
}: {
  event: CalEvent;
  clients: ClientOpt[];
  variant: "pill" | "row";
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
              {new Date(event.startAt).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: event.allDay ? undefined : "numeric",
                minute: event.allDay ? undefined : "2-digit",
              })}
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
        <EventModal event={event} clients={clients} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
