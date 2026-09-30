import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trash2, Bell, Repeat, Mic } from "lucide-react";
import { getTask, listUsers } from "@/lib/projects";
import { updateTask, deleteTask, createReminder, deleteReminder } from "../actions";
import { COLUMNS } from "./task-badges";
import AssigneePicker from "./assignee-picker";
import SubtaskList from "./subtask-list";
import TaskNotes from "./task-notes";

// Full task editor. Rendered by both /projects/[id]/tasks/[taskId] (project
// tasks) and /tasks/[taskId] (inbox tasks with no project, e.g. from a voice note).

const input =
  "w-full bg-white border border-black/10 rounded-[14px] px-3.5 py-2.5 text-base text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";
const label = "block text-xs font-bold text-[#6B645D] uppercase tracking-wide mb-1.5";
const card = "bg-white rounded-[22px] border border-black/[0.07] p-5 lg:p-6";
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default async function TaskDetail({
  taskId,
  projectId,
  from,
}: {
  taskId: string;
  projectId: string | null;
  from?: string;
}) {
  const [task, users] = await Promise.all([getTask(taskId), listUsers()]);
  if (!task) notFound();
  const id = projectId ?? "";

  // Where the user came from decides where "Back" returns them: the global
  // Tasks board (?from=tasks, and always for inbox tasks) vs the project board.
  const cameFromTasks = from === "tasks" || !projectId;
  const backHref = cameFromTasks ? "/tasks" : `/projects/${projectId}`;
  const backLabel = cameFromTasks ? "Tasks" : "Board";

  const dueInput = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "";
  const startInput = task.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "";

  return (
    <div className="space-y-5 lg:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={backHref}
          className="-ml-1 inline-flex min-h-11 items-center gap-0.5 text-[15px] font-semibold text-[#B34100]"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
          {backLabel}
        </Link>
        {task.voiceNoteId && (
          <Link
            href={`/voice/${task.voiceNoteId}`}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-midnight px-2.5 py-1.5 text-[13px] font-semibold text-white"
          >
            <Mic className="w-3.5 h-3.5 text-[#FF7A33]" />
            From a voice note
          </Link>
        )}
      </div>

      {/* The task-edit form is DOM-empty here; its fields live in both columns
          below and associate via form="task-edit". This lets the two columns
          flow continuously (Description → Notes → Subtasks on the left) without
          nesting the independent Assignee / Reminder / Delete forms. */}
      <form id="task-edit" action={updateTask} className="hidden">
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="projectId" value={id} />
        <input type="hidden" name="from" value={cameFromTasks ? "tasks" : ""} />
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Left: name / description · Notes · Subtasks ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className={card}>
            <label className={label}>Task Name</label>
            <input
              name="title"
              form="task-edit"
              required
              defaultValue={task.title}
              className={`${input} text-lg font-semibold`}
            />
            <label className={`${label} mt-4`}>Description</label>
            <textarea
              name="description"
              form="task-edit"
              rows={5}
              defaultValue={task.description ?? ""}
              placeholder="Add detail, deliverables, links…"
              className={input}
            />
          </div>

          {/* Notes (Notion-style block editor — supports uploads & embeds) */}
          <div className={card}>
            <h3 className="text-[17px] font-bold text-ink mb-3">Notes</h3>
            <TaskNotes taskId={task.id} initialContent={task.content} />
          </div>

          {/* Subtasks */}
          <div className={card}>
            <h3 className="text-[17px] font-bold text-ink mb-4">Subtasks</h3>
            <SubtaskList
              parentId={task.id}
              projectId={projectId}
              initial={task.subtasks.map((s) => ({
                id: s.id,
                title: s.title,
                done: s.status === "DONE",
              }))}
            />
          </div>
        </div>

        {/* ── Right: Settings · Assignees · Reminders · Danger ── */}
        <div className="space-y-6">
          {/* Sticky: this button also saves the Task Name/Description at the
              top of the LEFT column (via form="task-edit"), not just the
              fields in this card — keeping it in view while you scroll makes
              that scope obvious no matter where you're editing. */}
          <div className={`${card} lg:sticky lg:top-24 z-10`}>
            <h3 className="text-[17px] font-bold text-ink mb-4">Settings</h3>
            <div className="space-y-4">
              <div>
                <label className={label}>Status</label>
                <select name="status" form="task-edit" defaultValue={task.status} className={input}>
                  {COLUMNS.map((c) => (
                    <option key={c.status} value={c.status}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Priority</label>
                <select name="priority" form="task-edit" defaultValue={task.priority} className={input}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Phase</label>
                <select name="milestoneId" form="task-edit" defaultValue={task.milestoneId ?? ""} className={input}>
                  <option value="">— None —</option>
                  {task.project?.milestones.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Start</label>
                  <input type="date" name="startDate" form="task-edit" defaultValue={startInput} className={input} />
                </div>
                <div>
                  <label className={label}>Due</label>
                  <input type="date" name="dueDate" form="task-edit" defaultValue={dueInput} className={input} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`${label} flex items-center gap-1`}>
                    <Repeat className="w-3 h-3" />
                    Repeats
                  </label>
                  <select
                    name="recurrence"
                    form="task-edit"
                    defaultValue={task.recurrence ?? ""}
                    className={input}
                  >
                    <option value="">Never</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Every</label>
                  <input
                    type="number"
                    name="recurrenceInterval"
                    form="task-edit"
                    min="1"
                    defaultValue={task.recurrenceInterval ?? 1}
                    className={input}
                  />
                </div>
              </div>
              {task.recurrence && (
                <p className="text-[11px] text-black/40 -mt-2">
                  Completing this task creates the next occurrence automatically.
                </p>
              )}
              <button
                type="submit"
                form="task-edit"
                className="w-full h-12 bg-brand hover:bg-brand-hover text-ink font-bold rounded-[14px] transition-colors"
              >
                Save Task
              </button>
              <p className="text-center text-[11px] text-black/35">
                Saves the name, description &amp; settings above.
              </p>
            </div>
          </div>

          <div className={card}>
            <h3 className="text-[17px] font-bold text-ink mb-4">Assignees</h3>
            <AssigneePicker
              taskId={task.id}
              projectId={projectId}
              users={users}
              initial={task.assignees.map((a) => a.userId)}
            />
          </div>

          <div className={card}>
            <h3 className="text-[17px] font-bold text-ink mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-brand" />
              Reminders
            </h3>

            {task.reminders.length > 0 && (
              <ul className="space-y-2 mb-4">
                {task.reminders.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-2">
                    <span className="min-w-0 text-sm">
                      <span className="text-ink">
                        {new Date(r.remindAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-black/45">
                        {" · "}
                        {r.user ? r.user.name : "all assignees"}
                      </span>
                      {r.note && (
                        <span className="block text-xs text-black/45 truncate">{r.note}</span>
                      )}
                    </span>
                    <form action={deleteReminder}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="projectId" value={id} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <button
                        type="submit"
                        className="p-1 rounded text-ink/40 hover:text-red-600 hover:bg-red-50 transition"
                        title="Remove reminder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}

            <form action={createReminder} className="space-y-2">
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="projectId" value={id} />
              <input type="datetime-local" name="remindAt" required className={input} />
              <input name="note" placeholder="Note (optional)" className={input} />
              <label className="flex items-center gap-2 text-xs text-black/60">
                <input type="checkbox" name="onlyMe" className="accent-brand" />
                Only remind me (otherwise all assignees)
              </label>
              <button
                type="submit"
                className="w-full h-11 bg-brand hover:bg-brand-hover text-ink text-sm font-bold rounded-[14px] transition-colors"
              >
                Add reminder
              </button>
            </form>
          </div>

          <div className={card}>
            <h3 className="text-[17px] font-bold text-ink mb-3">Danger Zone</h3>
            <form action={deleteTask}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="projectId" value={id} />
              <input type="hidden" name="from" value={cameFromTasks ? "tasks" : ""} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
                Delete task
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
