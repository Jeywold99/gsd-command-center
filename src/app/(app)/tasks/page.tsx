import Link from "next/link";
import { ListChecks, Plus, LayoutGrid, Table, Archive } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { listAllTasks } from "@/lib/tasks";
import { listProjectOptions } from "@/lib/time";
import { listUsers } from "@/lib/projects";
import { quickAddTask } from "../projects/actions";
import { initials } from "../projects/_components/task-badges";
import UserBoard from "./_components/user-board";
import TaskTable from "./_components/task-table";
import MobileTaskList from "./_components/mobile-task-list";
import AddModal from "../_components/add-modal";

const input =
  "w-full bg-white border border-black/10 rounded-[12px] px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "block text-xs font-semibold text-[#6B645D] mb-1.5";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; view?: string; archived?: string; new?: string }>;
}) {
  const session = await verifySession();
  const sp = await searchParams;
  const archivedOnly = sp.archived === "1";
  const [tasks, projects, users] = await Promise.all([
    listAllTasks(archivedOnly),
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
  const hrefWith = (user?: string, v?: string, archived = archivedOnly) => {
    const p = new URLSearchParams();
    if (user) p.set("user", user);
    if (v) p.set("view", v);
    if (archived) p.set("archived", "1");
    const qs = p.toString();
    return `/tasks${qs ? `?${qs}` : ""}`;
  };

  const tab = (active: boolean) =>
    `inline-flex h-10 items-center px-3.5 rounded-full text-sm font-semibold whitespace-nowrap transition ${
      active ? "bg-midnight text-white" : "bg-white border border-black/[0.08] text-[#4F4943] hover:border-brand/40"
    }`;
  const viewBtn = (active: boolean) =>
    `inline-flex h-9 items-center gap-1.5 px-3 rounded-xl text-sm font-semibold transition ${
      active ? "bg-midnight text-white" : "text-[#4F4943] hover:bg-cream"
    }`;

  const emptyMsg = archivedOnly
    ? "No archived tasks."
    : scope === "all"
      ? "No tasks yet."
      : scope === "everyone"
        ? "No tasks are assigned to the whole team."
        : scope === session.userId
          ? "You have no tasks assigned yet."
          : "Nothing assigned to this person yet.";

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start lg:justify-between lg:gap-4">
        {/* Scope filter */}
        <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5 lg:mx-0 lg:max-w-full lg:px-0 [scrollbar-width:none]">
          {orderedUsers.map((u) => (
            <Link key={u.id} href={hrefWith(u.id, viewParam)} className={tab(scope === u.id)}>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`w-5 h-5 rounded-full text-[9px] font-bold inline-flex items-center justify-center ${
                    scope === u.id ? "bg-brand text-ink" : "bg-midnight text-white"
                  }`}
                >
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Active / Archived toggle */}
          <div className="inline-flex rounded-2xl bg-white border border-black/[0.07] p-1">
            <Link href={hrefWith(sp.user, viewParam, false)} className={viewBtn(!archivedOnly)}>
              Active
            </Link>
            <Link href={hrefWith(sp.user, viewParam, true)} className={viewBtn(archivedOnly)}>
              <Archive className="w-3.5 h-3.5" /> Archived
            </Link>
          </div>

          {/* View toggle (desktop — phones get the grouped list) */}
          <div className="hidden lg:inline-flex rounded-2xl bg-white border border-black/[0.07] p-1">
            <Link href={hrefWith(sp.user, undefined)} className={viewBtn(view === "board")}>
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </Link>
            <Link href={hrefWith(sp.user, "table")} className={viewBtn(view === "table")}>
              <Table className="w-3.5 h-3.5" /> Table
            </Link>
          </div>

          {/* New task */}
          <AddModal
            title="New Task"
            defaultOpen={sp.new === "1"}
            triggerClassName="inline-flex h-11 items-center gap-2 bg-brand hover:bg-brand-hover text-ink font-bold text-sm px-4 rounded-[14px] transition-colors"
            trigger={
              <>
                <Plus className="w-4 h-4" /> New Task
              </>
            }
            panelClassName="max-w-xl"
          >
            <form action={quickAddTask} className="space-y-4">
              <div>
                <label className={label}>Task title *</label>
                <input
                  name="title"
                  required
                  autoFocus
                  placeholder="e.g. Draft ad creative brief"
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Project</label>
                <select name="projectId" defaultValue="" className={input}>
                  <option value="">Inbox (no project)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.client ? `${p.client.companyName} · ` : ""}{p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>Repeats</label>
                  <select name="recurrence" defaultValue="" className={input}>
                    <option value="">Never</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className={label}>Every</label>
                  <input type="number" name="recurrenceInterval" min="1" defaultValue={1} className={input} />
                </div>
              </div>
              <div>
                <label className={label}>Notes</label>
                <textarea
                  name="description"
                  rows={4}
                  placeholder="Anything you already know — context, links, what done looks like…"
                  className={input}
                />
                <p className="text-[10px] text-black/40 mt-1">
                  You&apos;ll land on the task after creating it, where the full Notes editor
                  (uploads, embeds, checklists) is available too.
                </p>
              </div>
              <div>
                <label className={label}>Assign to</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto rounded-lg border border-black/10 p-2.5">
                  {users.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 text-sm text-ink/80 cursor-pointer">
                      <input
                        type="checkbox"
                        name="assigneeIds"
                        value={u.id}
                        defaultChecked={u.id === session.userId}
                        className="accent-brand w-4 h-4 shrink-0"
                      />
                      <span className="truncate">{u.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full h-12 bg-brand hover:bg-brand-hover text-ink text-[15px] font-bold rounded-[14px] transition-colors"
              >
                Create task
              </button>
            </form>
          </AddModal>
        </div>
      </div>

      {archivedOnly && (
        <div className="rounded-xl border border-black/[0.08] bg-cream/60 px-4 py-2.5 text-sm text-ink/60 flex items-center gap-2">
          <Archive className="w-4 h-4 text-ink/40 shrink-0" />
          Viewing archived tasks. Switch to <span className="font-semibold">Table</span> view,
          select tasks, and choose <span className="font-semibold">Restore</span> to bring them back.
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-[22px] p-10 lg:p-14 text-center">
          <div className="w-12 h-12 rounded-2xl bg-brand-pale text-[#B34100] flex items-center justify-center mx-auto mb-4">
            <ListChecks className="w-6 h-6" />
          </div>
          <p className="text-[#6B645D]">{emptyMsg}</p>
        </div>
      ) : (
        <>
          <MobileTaskList key={`m-${scope}-${archivedOnly}`} tasks={filtered} />
          <div className="hidden lg:block">
            {view === "table" ? (
              <TaskTable key={`${scope}-${archivedOnly}`} tasks={filtered} users={users} projects={projects} />
            ) : (
              <UserBoard key={`${scope}-${archivedOnly}`} tasks={filtered} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
