"use client";

import { useState, useTransition } from "react";
import { Flag, Trash2, Pencil, X } from "lucide-react";
import { updateMilestone, deleteMilestone } from "../actions";
import { announceSaved } from "../../_components/saved-toast";

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";
const label = "block text-[11px] font-bold uppercase tracking-wide text-ink/50 mb-1";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

function toDateInput(d: Date | string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export type Milestone = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: Date | string | null;
  dueDate: Date | string | null;
};

export default function MilestoneRow({
  milestone,
  projectId,
}: {
  milestone: Milestone;
  projectId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, startSaving] = useTransition();

  function save(formData: FormData) {
    startSaving(async () => {
      await updateMilestone(formData);
      announceSaved("Phase saved");
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <li className="py-3">
        <form action={save} className="space-y-2">
          <input type="hidden" name="id" value={milestone.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand">Edit phase</p>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-ink/40 hover:text-ink"
              aria-label="Cancel edit"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <input name="name" required defaultValue={milestone.name} className={input} placeholder="Phase name *" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={label}>Start</label>
              <input type="date" name="startDate" defaultValue={toDateInput(milestone.startDate)} className={input} />
            </div>
            <div>
              <label className={label}>Due</label>
              <input type="date" name="dueDate" defaultValue={toDateInput(milestone.dueDate)} className={input} />
            </div>
          </div>
          <div>
            <label className={label}>Status</label>
            <select name="status" defaultValue={milestone.status} className={input}>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={milestone.description ?? ""}
              placeholder="What this phase covers…"
              className={input}
            />
          </div>
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
      </li>
    );
  }

  return (
    <li className="py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <Flag className={`w-4 h-4 shrink-0 ${milestone.status === "DONE" ? "text-success" : "text-brand"}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink truncate">{milestone.name}</span>
            {milestone.status !== "PENDING" && (
              <span
                className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${
                  milestone.status === "DONE"
                    ? "bg-success/10 text-success"
                    : "bg-brand-pale text-brand"
                }`}
              >
                {STATUS_LABEL[milestone.status]}
              </span>
            )}
          </div>
          {milestone.description && (
            <p className="text-xs text-black/45 truncate">{milestone.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-black/45 shrink-0">
        <span>
          {fmtDate(milestone.startDate)} – {fmtDate(milestone.dueDate)}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-black/30 hover:text-brand transition"
          aria-label="Edit phase"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <form action={deleteMilestone}>
          <input type="hidden" name="id" value={milestone.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <button type="submit" className="text-black/30 hover:text-red-600 transition" aria-label="Delete phase">
            <Trash2 className="w-4 h-4" />
          </button>
        </form>
      </div>
    </li>
  );
}
