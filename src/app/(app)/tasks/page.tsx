import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { listMyTasks, listAllTasks } from "@/lib/tasks";
import { listProjectOptions } from "@/lib/time";
import { quickAddTask } from "../projects/actions";
import { COLUMNS, PriorityTag, initials, fmtDate } from "../projects/_components/task-badges";

type Row = Awaited<ReturnType<typeof listAllTasks>>[number];

const input =
  "w-full bg-white border border-black/10 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const label = "block text-xs font-bold text-ink/60 uppercase tracking-wide mb-1.5";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await verifySession();
  const { filter } = await searchParams;
  const showAll = filter === "all";
  const [tasks, projects] = await Promise.all([
    showAll ? listAllTasks() : listMyTasks(session.userId),
    listProjectOptions(),
  ]);

  const byStatus = COLUMNS.map((c) => ({
    ...c,
    rows: tasks.filter((t) => t.status === c.status),
  }));

  const tabCls = (active: boolean) =>
    `px-4 py-2 rounded-full text-sm font-bold transition ${
      active ? "bg-midnight text-white" : "text-ink/60 hover:text-ink"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full bg-cream border border-black/10 p-1">
          <Link href="/tasks" className={tabCls(!showAll)}>
            My Tasks
          </Link>
          <Link href="/tasks?filter=all" className={tabCls(showAll)}>
            All Tasks
          </Link>
        </div>

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
            <label className="flex items-center gap-2 text-xs text-ink/60">
              <input type="checkbox" name="assignToMe" defaultChecked className="accent-brand w-4 h-4" />
              Assign to me
            </label>
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

      {tasks.length === 0 ? (
        <div className="bg-white border border-dashed border-black/15 rounded-2xl p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-brand-pale text-brand flex items-center justify-center mx-auto mb-4">
            <ListChecks className="w-6 h-6" />
          </div>
          <p className="text-black/50">
            {showAll ? "No tasks yet." : "Nothing assigned to you yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {byStatus.map(
            (col) =>
              col.rows.length > 0 && (
                <section key={col.status}>
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-ink/45 mb-2 px-1">
                    {col.label} ({col.rows.length})
                  </h3>
                  <div className="bg-white rounded-2xl border border-black/[0.07] divide-y divide-black/[0.05]">
                    {col.rows.map((t) => (
                      <TaskRow key={t.id} t={t} />
                    ))}
                  </div>
                </section>
              ),
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ t }: { t: Row }) {
  const inner = (
    <div className="flex items-center gap-4 px-5 py-3 hover:bg-cream/60 transition">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink truncate">{t.title}</p>
        <p className="text-xs text-black/45 mt-0.5">
          {t.project ? (
            <>
              {t.project.client ? (
                <span className="inline-flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: t.project.client.colorHex ?? "#cbd5e1" }}
                  />
                  {t.project.client.companyName} ·{" "}
                </span>
              ) : null}
              {t.project.name}
            </>
          ) : (
            "Inbox"
          )}
        </p>
      </div>
      <PriorityTag priority={t.priority} />
      <div className="flex -space-x-1.5 w-16 justify-end">
        {t.assignees.slice(0, 3).map((a) => (
          <span
            key={a.user.id}
            title={a.user.name}
            className="w-6 h-6 rounded-full bg-midnight text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
          >
            {initials(a.user.name)}
          </span>
        ))}
      </div>
      <span className="text-xs text-black/45 w-16 text-right">{fmtDate(t.dueDate)}</span>
    </div>
  );

  return t.project ? (
    <Link href={`/projects/${t.project.id}/tasks/${t.id}`} className="block">
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
}
