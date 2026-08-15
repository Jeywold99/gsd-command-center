import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { listAllTasks } from "@/lib/tasks";
import { listProjectOptions } from "@/lib/time";
import { listUsers } from "@/lib/projects";
import { quickAddTask } from "../projects/actions";
import { initials } from "../projects/_components/task-badges";
import UserBoard from "./_components/user-board";

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const session = await verifySession();
  const sp = await searchParams;
  const [tasks, projects, users] = await Promise.all([
    listAllTasks(),
    listProjectOptions(),
    listUsers(),
  ]);

  // "everyone" (no filter) vs a specific person's assigned tasks.
  const selected = sp.user && users.some((u) => u.id === sp.user) ? sp.user : null;
  const filtered = selected
    ? tasks.filter((t) => t.assignees.some((a) => a.user.id === selected))
    : tasks;

  const tab = (active: boolean) =>
    `px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition ${
      active ? "bg-midnight text-white" : "text-ink/60 hover:text-ink hover:bg-black/[0.04]"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Person filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          <Link href="/tasks" className={tab(!selected)}>
            Everyone
          </Link>
          {users.map((u) => (
            <Link key={u.id} href={`/tasks?user=${u.id}`} className={tab(selected === u.id)}>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-midnight text-white text-[8px] font-bold inline-flex items-center justify-center">
                  {initials(u.name)}
                </span>
                {u.name}
              </span>
            </Link>
          ))}
        </div>

        {/* New task */}
        <details className="relative shrink-0">
          <summary className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wide text-sm px-4 py-2.5 rounded-full transition-colors cursor-pointer list-none shadow-sm">
            <Plus className="w-4 h-4" /> New Task
          </summary>
          <form
            action={quickAddTask}
            className="absolute right-0 mt-2 w-80 bg-white border border-black/10 rounded-xl shadow-lg p-4 space-y-3 z-30"
          >
            <div>
              <label className={label}>Task title *</label>
              <input name="title" required placeholder="e.g. Draft ad creative brief" className={input} />
            </div>
            <div>
              <label className={label}>Project *</label>
              {projects.length === 0 ? (
                <p className="text-xs text-black/45">
                  No projects yet.{" "}
                  <Link href="/projects/new" className="text-brand font-semibold">Create one first</Link>.
                </p>
              ) : (
                <select name="projectId" required defaultValue="" className={input}>
                  <option value="" disabled>Select project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.client ? `${p.client.companyName} · ` : ""}{p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={label}>Priority</label>
                <select name="priority" defaultValue="MEDIUM" className={input}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className={label}>Due</label>
                <input type="date" name="dueDate" className={input} />
              </div>
            </div>
            <div>
              <label className={label}>Assign to</label>
              <select name="assigneeIds" multiple defaultValue={[session.userId]} className={`${input} h-24`}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-black/40 mt-1">Hold Ctrl/Cmd to pick more than one.</p>
            </div>
            <button
              type="submit"
              disabled={projects.length === 0}
              className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wide py-2 rounded-full transition-colors"
            >
              Add Task
            </button>
          </form>
        </details>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
            <ListChecks className="w-6 h-6" />
          </div>
          <p className="text-black/50">
            {selected ? "Nothing assigned to this person yet." : "No tasks yet."}
          </p>
        </div>
      ) : (
        <UserBoard key={selected ?? "all"} tasks={filtered} />
      )}
    </div>
  );
}
