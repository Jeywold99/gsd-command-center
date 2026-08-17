"use client";

import { useState } from "react";
import { Trash2, Pencil, Video, X } from "lucide-react";
import { updateEvent, deleteEvent } from "../actions";

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startAt: Date | string;
  endAt: Date | string | null;
  allDay: boolean;
  location: string | null;
  meetingUrl: string | null;
  clientId: string | null;
  client: { id: string; companyName: string; colorHex: string | null } | null;
};

type ClientOpt = { id: string; companyName: string };

// A datetime-local input value ("YYYY-MM-DDTHH:mm") in the viewer's local time.
function toLocalInput(d: Date | string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function EventRow({ e, clients }: { e: EventItem; clients: ClientOpt[] }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="px-5 py-4">
        <form
          action={updateEvent}
          onSubmit={() => setEditing(false)}
          className="space-y-3"
        >
          <input type="hidden" name="id" value={e.id} />
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand">
              Edit event
            </p>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-ink/40 hover:text-ink"
              aria-label="Cancel edit"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className={label}>Title *</label>
            <input name="title" required defaultValue={e.title} className={input} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>Type</label>
              <select name="type" className={input} defaultValue={e.type}>
                <option value="MEETING">Meeting</option>
                <option value="CONTENT_PUBLISH">Content</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={label}>Client</label>
              <select name="clientId" className={input} defaultValue={e.clientId ?? ""}>
                <option value="">—</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>Start *</label>
              <input
                type="datetime-local"
                name="start"
                required
                defaultValue={toLocalInput(e.startAt)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>End</label>
              <input
                type="datetime-local"
                name="end"
                defaultValue={toLocalInput(e.endAt)}
                className={input}
              />
            </div>
          </div>
          <div>
            <label className={label}>Meeting link</label>
            <input
              name="meetingUrl"
              type="url"
              defaultValue={e.meetingUrl ?? ""}
              placeholder="https://meet…"
              className={input}
            />
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={e.description ?? ""}
              placeholder="Agenda, notes, context…"
              className={input}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-ink/60">
            <input
              type="checkbox"
              name="allDay"
              defaultChecked={e.allDay}
              className="accent-brand w-4 h-4"
            />{" "}
            All day
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="bg-brand hover:bg-brand-hover text-white text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full transition-colors"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs font-semibold text-ink/50 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span
        className="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: e.client?.colorHex ?? "#ff5c00" }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink truncate">{e.title}</p>
        <p className="text-xs text-black/45">
          {new Date(e.startAt).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
          {e.client ? ` · ${e.client.companyName}` : ""}
          {e.type === "CONTENT_PUBLISH" ? " · content" : ""}
        </p>
        {e.description && (
          <p className="mt-1 text-xs text-black/55 whitespace-pre-wrap line-clamp-3">
            {e.description}
          </p>
        )}
        {e.meetingUrl && (
          <a
            href={e.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            <Video className="w-3.5 h-3.5" /> Join meeting
          </a>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-lg text-ink/40 hover:text-brand hover:bg-brand-pale transition"
          title="Edit"
          aria-label="Edit event"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <form action={deleteEvent}>
          <input type="hidden" name="id" value={e.id} />
          <button
            type="submit"
            className="p-1.5 rounded-lg text-ink/40 hover:text-red-600 hover:bg-red-50 transition"
            title="Delete"
            aria-label="Delete event"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function EventList({
  events,
  clients,
}: {
  events: EventItem[];
  clients: ClientOpt[];
}) {
  if (events.length === 0) {
    return (
      <div className="bg-white border border-dashed border-black/15 rounded-2xl p-10 text-center">
        <p className="text-black/50">No events scheduled. Add one with “New Event”.</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-black/[0.07] divide-y divide-black/[0.05]">
      {events.map((e) => (
        <EventRow key={e.id} e={e} clients={clients} />
      ))}
    </div>
  );
}
