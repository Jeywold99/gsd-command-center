"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2, Pencil, Video, X, Calendar, Building2, Users } from "lucide-react";
import { updateEvent, deleteEvent } from "../actions";
import { announceSaved } from "../../_components/saved-toast";

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";

export type CalEvent = {
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
  createdById: string;
  client: { id: string; companyName: string; colorHex: string | null } | null;
  attendees: { user: { id: string; name: string } }[];
};

export type ClientOpt = { id: string; companyName: string };
export type UserOpt = { id: string; name: string };

// A datetime-local input value ("YYYY-MM-DDTHH:mm") in the viewer's local time.
function toLocalInput(d: Date | string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

const TYPE_LABEL: Record<string, string> = {
  MEETING: "Meeting",
  CONTENT_PUBLISH: "Content",
  OTHER: "Other",
};

function whenLabel(e: CalEvent): string {
  const start = new Date(e.startAt);
  if (e.allDay) {
    return start.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    }) + " · All day";
  }
  const startStr = start.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (e.endAt) {
    const end = new Date(e.endAt);
    const sameDay =
      start.toDateString() === end.toDateString();
    const endStr = end.toLocaleString(undefined, {
      ...(sameDay ? {} : { month: "long", day: "numeric" }),
      hour: "numeric",
      minute: "2-digit",
    });
    return `${startStr} – ${endStr}`;
  }
  return startStr;
}

export default function EventModal({
  event,
  clients,
  users,
  onClose,
}: {
  event: CalEvent;
  clients: ClientOpt[];
  users: UserOpt[];
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, startSaving] = useTransition();

  function saveEvent(formData: FormData) {
    startSaving(async () => {
      await updateEvent(formData);
      announceSaved("Event saved");
      onClose();
    });
  }

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-black/[0.07] px-6 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className="mt-1.5 w-3 h-3 rounded-full shrink-0"
              style={{ background: event.client?.colorHex ?? "#ff5c00" }}
            />
            <h2 className="font-display text-2xl tracking-wide text-ink leading-tight break-words">
              {event.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink/40 hover:text-ink hover:bg-black/[0.04] shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {editing ? (
          /* ── Edit form ── */
          <form action={saveEvent} className="px-6 py-5 space-y-3">
            <input type="hidden" name="id" value={event.id} />
            <div>
              <label className={label}>Title *</label>
              <input name="title" required defaultValue={event.title} className={input} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Type</label>
                <select name="type" className={input} defaultValue={event.type}>
                  <option value="MEETING">Meeting</option>
                  <option value="CONTENT_PUBLISH">Content</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className={label}>Client</label>
                <select name="clientId" className={input} defaultValue={event.clientId ?? ""}>
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
                  defaultValue={toLocalInput(event.startAt)}
                  className={input}
                />
              </div>
              <div>
                <label className={label}>End</label>
                <input
                  type="datetime-local"
                  name="end"
                  defaultValue={toLocalInput(event.endAt)}
                  className={input}
                />
              </div>
            </div>
            <div>
              <label className={label}>Meeting link</label>
              <input
                name="meetingUrl"
                type="url"
                defaultValue={event.meetingUrl ?? ""}
                placeholder="https://meet…"
                className={input}
              />
            </div>
            <div>
              <label className={label}>Description</label>
              <textarea
                name="description"
                rows={4}
                defaultValue={event.description ?? ""}
                placeholder="Agenda, notes, context…"
                className={input}
              />
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
                      defaultChecked={event.attendees.some((a) => a.user.id === u.id)}
                      className="accent-brand w-4 h-4 shrink-0"
                    />
                    <span className="truncate">{u.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-black/40 mt-1">Shows up on their calendar too.</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-ink/60">
              <input
                type="checkbox"
                name="allDay"
                defaultChecked={event.allDay}
                className="accent-brand w-4 h-4"
              />{" "}
              All day
            </label>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="bg-brand hover:bg-brand-hover text-white text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full transition-colors"
              >
                {saving ? "Saving…" : "Save changes"}
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
        ) : (
          /* ── View ── */
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2.5 text-ink/80">
                <Calendar className="w-4 h-4 text-ink/40 shrink-0" />
                <span>{whenLabel(event)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-ink/80">
                <Building2 className="w-4 h-4 text-ink/40 shrink-0" />
                <span>
                  {event.client?.companyName ?? "No client"}
                  <span className="text-ink/40"> · {TYPE_LABEL[event.type] ?? event.type}</span>
                </span>
              </div>
              {event.location && (
                <p className="text-ink/70 pl-6.5">{event.location}</p>
              )}
              {event.attendees.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <Users className="w-4 h-4 text-ink/40 shrink-0 mt-0.5" />
                  <div className="flex flex-wrap gap-1">
                    {event.attendees.map((a) => (
                      <span
                        key={a.user.id}
                        className={`text-xs rounded-full px-2 py-0.5 ${
                          a.user.id === event.createdById
                            ? "bg-brand-pale text-brand font-semibold"
                            : "bg-cream text-ink/70"
                        }`}
                      >
                        {a.user.name}
                        {a.user.id === event.createdById ? " (organizer)" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {event.meetingUrl && (
              <a
                href={event.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-hover transition-colors"
              >
                <Video className="w-4 h-4" /> Join meeting
              </a>
            )}

            <div>
              <p className={label}>Description</p>
              {event.description ? (
                <p className="text-sm text-ink/80 whitespace-pre-wrap">{event.description}</p>
              ) : (
                <p className="text-sm text-ink/35 italic">No description added.</p>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between border-t border-black/[0.07] pt-4">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-ink/70 hover:text-ink hover:bg-cream transition"
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <form action={deleteEvent} onSubmit={onClose}>
                <input type="hidden" name="id" value={event.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
