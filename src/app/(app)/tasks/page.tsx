import Link from "next/link";
import { ListChecks, Plus, LayoutGrid, Table } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { listAllTasks } from "@/lib/tasks";
import { listProjectOptions } from "@/lib/time";
import { listUsers } from "@/lib/projects";
import { quickAddTask } from "../projects/actions";
import { initials } from "../projects/_components/task-badges";
import UserBoard from "./_components/user-board";
import TaskTable from "./_components/task-table";

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; view?: string }>;
}) {
  const session = await verifySession();
  const sp = await searchParams;
  const [tasks, projects, users] = await Promise.all([
    listAllTasks(),
    listProjectOptions(),
    listUsers(),
  ]);

  const view = sp.view === "table" ? "table" : "board";

  // Scope: "all" (every task) | "everyone" (assigned to the whole team) | a
  // userId. Default (no ?user) = the logged-in user's own tasks.
  let scope: string;
  if (sp.user === "all") scope = "all";
  else if (sp.user === "everyone") scope = "everyone";
  else if (sp.user && users.some((u) => u.id === sp.user)) scope = sp.user;
  else scope = session.userId;

  const allUserIds = users.map((u) => u.id);
  let filtered;
  if (scope === "all") {
    filtered = tasks;
  } else if (scope === "everyone") {
    // A task counts if every active team member is an assignee.
    filtered = tasks.filter((t) => {
      if (allUserIds.length === 0) return false;
      const set = new Set(t.assignees.map((a) => a.user.id));
      return allUserIds.every((id) => set.has(id));
    });
  } else {
    filtered = tasks.filter((t) => t.assignees.some((a) => a.user.id === scope));
  }

  // Current user first, then the rest.
  const orderedUsers = [
    ...users.filter((u) => u.id === session.userId),
    ...users.filter((u) => u.id !== session.userId),
  ];

  // Build /tasks hrefs, keeping the other param intact.
  const viewParam = view === "table" ? "table" : undefined;
  const hrefWith = (user?: string, v?: string) => {
    const p = new URLSearchParams();
    if (user) p.set("user", user);
    if (v) p.set("view", v);
    const qs = p.toString();
    return `/tasks${qs ? `?${qs}` : ""}`;
  };

  const tab = (active: boolean) =>
    `px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition ${
      active ? "bg-midnight text-white" : "text-ink/60 hover:text-ink hover:bg-black/[0.04]"
    }`;
  const viewBtn = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
      active ? "bg-white text-ink shadow-sm" : "text-ink/50 hover:text-ink"
    }`;

  const emptyMsg =
    scope === "all"
      ? "No tasks yet."
      : scope === "everyone"
        ? "No tasks are assigned to the whole team."
        : scope === session.userId
          ? "You have no tasks assigned yet."
          : "Nothing assigned to this person yet.";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {/* Scope filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          {orderedUsers.map((u) => (
            <Link key={u.id} href={hrefWith(u.id, viewParam)} className={tab(scope === u.id)}>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-midnight text-white text-[8px] font-bold inline-flex items-center justify-center">
                  {initials(u.name)}
                </span>
                {u.id === session.userId ? "My Tasks" : u.name}
              </span>
            </Link>
          ))}
          <span className="w-px h-5 bg-black/10 mx-1 shrink-0" aria-hidden />
          <Link href={hrefWith("everyone", viewParam)} className={tab(scope === "everyone")}>
            Everyone
          </Link>
          <Link href={hrefWith("all", viewParam)} className={tab(scope === "all")}>
            All
          </Link>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          <div className="inline-flex rounded-full bg-cream border border-black/10 p-1">
            <Link href={hrefWith(sp.user, undefined)} className={viewBtn(view === "board")}>
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </Link>
            <Link href={hrefWith(sp.user, "table")} className={viewBtn(view === "table")}>
              <Table className="w-3.5 h-3.5" /> Table
            </Link>
          </div>

          {/* New task */}
          <details className="relative">
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
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
            <ListChecks className="w-6 h-6" />
          </div>
          <p className="text-black/50">{emptyMsg}</p>
        </div>
      ) : view === "table" ? (
        <TaskTable tasks={filtered} />
      ) : (
        <UserBoard key={scope} tasks={filtered} />
      )}
    </div>
  );
}
