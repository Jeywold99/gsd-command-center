import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, Bell } from "lucide-react";
import { getTask, listUsers } from "@/lib/projects";
import { updateTask, deleteTask, createReminder, deleteReminder } from "../../../actions";
import { COLUMNS } from "../../../_components/task-badges";
import AssigneePicker from "../../../_components/assignee-picker";
import SubtaskList from "../../../_components/subtask-list";

const input =
  "w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-ink placeholder:text-black/30 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition";
const label = "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id, taskId } = await params;
  const [task, users] = await Promise.all([getTask(taskId), listUsers()]);
  if (!task) notFound();

  const dueInput = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "";
  const startInput = task.startDate ? new Date(task.startDate).toISOString().slice(0, 10) : "";

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href={`/projects/${id}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/50 hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to board
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <form action={updateTask} className="space-y-4">
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="projectId" value={id} />

              <div>
                <label className={label}>Title</label>
                <input name="title" required defaultValue={task.title} className={input} />
              </div>

              <div>
                <label className={label}>Description</label>
                <textarea
                  name="description"
                  rows={5}
                  defaultValue={task.description ?? ""}
                  placeholder="Add detail, deliverables, links…"
                  className={input}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={label}>Status</label>
                  <select name="status" defaultValue={task.status} className={input}>
                    {COLUMNS.map((c) => (
                      <option key={c.status} value={c.status}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Priority</label>
                  <select name="priority" defaultValue={task.priority} className={input}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Due Date</label>
                  <input type="date" name="dueDate" defaultValue={dueInput} className={input} />
                </div>
                <div>
                  <label className={label}>Start Date</label>
                  <input type="date" name="startDate" defaultValue={startInput} className={input} />
                </div>
                <div>
                  <label className={label}>Phase</label>
                  <select name="milestoneId" defaultValue={task.milestoneId ?? ""} className={input}>
                    <option value="">— None —</option>
                    {task.project?.milestones.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wide px-6 py-2.5 rounded-full transition-colors shadow-sm"
              >
                Save
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <h3 className="font-display text-2xl tracking-wide text-ink mb-4">Subtasks</h3>
            <SubtaskList
              parentId={task.id}
              projectId={id}
              initial={task.subtasks.map((s) => ({
                id: s.id,
                title: s.title,
                done: s.status === "DONE",
              }))}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <h3 className="font-display text-2xl tracking-wide text-ink mb-4">Assignees</h3>
            <AssigneePicker
              taskId={task.id}
              projectId={id}
              users={users}
              initial={task.assignees.map((a) => a.userId)}
            />
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <h3 className="font-display text-2xl tracking-wide text-ink mb-4 flex items-center gap-2">
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
                className="w-full bg-brand hover:bg-brand-hover text-white text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-full transition-colors"
              >
                Add reminder
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.07] p-6">
            <h3 className="font-display text-2xl tracking-wide text-ink mb-3">Danger Zone</h3>
            <form action={deleteTask}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="projectId" value={id} />
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
