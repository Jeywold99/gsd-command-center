"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, CheckSquare, ChevronRight } from "lucide-react";
import { COLUMNS, PRIORITY, initials, fmtDate, groupByClient } from "../../projects/_components/task-badges";
import { bulkUpdateTasks } from "../../projects/actions";
import { taskPath } from "@/lib/task-path";

type Row = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  project: {
    id: string;
    name: string;
    client: { id: string; companyName: string; colorHex: string | null } | null;
  } | null;
  assignees: { user: { id: string; name: string } }[];
};

type UserOpt = { id: string; name: string };
type ProjectOpt = {
  id: string;
  name: string;
  client: { id: string; companyName: string } | null;
};

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  COLUMNS.map((c) => [c.status, c.label]),
);

const th = "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wide text-ink/45 whitespace-nowrap";
const td = "px-4 py-3 align-top";
const field =
  "w-full bg-white border border-black/10 rounded-lg px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const flabel = "block text-[10px] font-bold uppercase tracking-wide text-white/50 mb-1";

export default function TaskTable({
  tasks,
  users,
  projects,
}: {
  tasks: Row[];
  users: UserOpt[];
  projects: ProjectOpt[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Client groups start closed — same reasoning as the board: opening
  // straight into every client's rows at once is the clutter this grouping
  // exists to avoid. Seeded once from the initial task set; the page
  // remounts this table (key={scope}-{archivedOnly}) whenever you switch to
  // a genuinely different set of tasks, so it re-defaults to closed each time.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(groupByClient(tasks).map((g) => g.key)),
  );

  // Group rows by client so a cross-client view doesn't read as one
  // undifferentiated pile — same treatment as the board. A header only earns
  // its keep once there's more than one client to tell apart.
  const groups = useMemo(() => groupByClient(tasks), [tasks]);
  const showGroupHeaders = groups.length > 1;

  function toggleGroupCollapse(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleGroupSelection(ids: string[], select: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  // Bulk-edit field state ("" = leave unchanged).
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [clientFilter, setClientFilter] = useState(""); // "" all · "internal" · clientId
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [clearDue, setClearDue] = useState(false);
  const [archived, setArchived] = useState(""); // "" | "archive" | "restore"

  const selectAllRef = useRef<HTMLInputElement>(null);

  // Unique clients present among the project options (for the client filter).
  const clients = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) if (p.client) map.set(p.client.id, p.client.companyName);
    return [...map.entries()].map(([id, companyName]) => ({ id, companyName }));
  }, [projects]);

  // Projects shown in the picker, narrowed by the chosen client filter.
  const projectChoices = useMemo(() => {
    if (clientFilter === "") return projects;
    if (clientFilter === "internal") return projects.filter((p) => !p.client);
    return projects.filter((p) => p.client?.id === clientFilter);
  }, [projects, clientFilter]);

  const allSelected = tasks.length > 0 && selected.size === tasks.length;
  const someSelected = selected.size > 0 && !allSelected;
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(tasks.map((t) => t.id)));
  }
  function clearSelection() {
    setSelected(new Set());
  }
  function resetFields() {
    setPriority("");
    setAssigneeId("");
    setClientFilter("");
    setProjectId("");
    setDueDate("");
    setClearDue(false);
    setArchived("");
  }

  function renderRow(t: Row) {
    const href = taskPath(t.id, t.project?.id, "tasks");
    const p = PRIORITY[t.priority] ?? PRIORITY.MEDIUM;
    const isSel = selected.has(t.id);
    return (
      <tr
        key={t.id}
        className={`transition-colors ${isSel ? "bg-brand/[0.05]" : "hover:bg-black/[0.02]"}`}
      >
        <td className={`${td} w-10`}>
          <input
            type="checkbox"
            className="accent-brand w-4 h-4 align-middle"
            checked={isSel}
            onChange={() => toggle(t.id)}
            aria-label={`Select ${t.title}`}
          />
        </td>
        <td className={`${td} max-w-[16rem]`}>
          {href ? (
            <Link href={href} className="font-semibold text-ink hover:text-brand line-clamp-2">
              {t.title}
            </Link>
          ) : (
            <span className="font-semibold text-ink line-clamp-2">{t.title}</span>
          )}
        </td>
        <td className={`${td} whitespace-nowrap text-ink/70`}>
          {t.project?.client?.companyName ?? "—"}
        </td>
        <td className={`${td} whitespace-nowrap text-ink/70`}>
          {t.project?.name ?? "Inbox"}
        </td>
        <td className={`${td} max-w-[22rem] text-ink/55`}>
          <span className="line-clamp-2">{t.description || "—"}</span>
        </td>
        <td className={`${td} whitespace-nowrap`}>
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink/60">
            {STATUS_LABEL[t.status] ?? t.status}
          </span>
        </td>
        <td className={`${td} whitespace-nowrap`}>
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${p.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
            {p.label}
          </span>
        </td>
        <td className={td}>
          {t.assignees.length === 0 ? (
            <span className="text-ink/30 text-xs">—</span>
          ) : (
            <div className="flex -space-x-1.5">
              {t.assignees.slice(0, 4).map((a) => (
                <span
                  key={a.user.id}
                  title={a.user.name}
                  className="w-6 h-6 rounded-full bg-midnight text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
                >
                  {initials(a.user.name)}
                </span>
              ))}
              {t.assignees.length > 4 && (
                <span className="w-6 h-6 rounded-full bg-black/10 text-ink/60 text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                  +{t.assignees.length - 4}
                </span>
              )}
            </div>
          )}
        </td>
        <td className={`${td} whitespace-nowrap text-ink/60`}>
          {t.dueDate ? fmtDate(t.dueDate) : "—"}
        </td>
      </tr>
    );
  }

  const changes: Parameters<typeof bulkUpdateTasks>[1] = {};
  if (priority) changes.priority = priority;
  if (assigneeId) changes.assigneeId = assigneeId;
  if (projectId) changes.projectId = projectId;
  if (clearDue) changes.clearDueDate = true;
  else if (dueDate) changes.dueDate = dueDate;
  if (archived === "archive") changes.archived = true;
  else if (archived === "restore") changes.archived = false;
  const hasChange = Object.keys(changes).length > 0;

  function apply() {
    if (!hasChange || selected.size === 0) return;
    const ids = [...selected];
    startTransition(async () => {
      await bulkUpdateTasks(ids, changes);
      router.refresh();
      clearSelection();
      resetFields();
    });
  }

  return (
    <div className="space-y-3">
      {/* ── Bulk-edit bar ── */}
      {selected.size > 0 && (
        <div className="sticky top-16 z-20 rounded-2xl bg-midnight text-white shadow-lg border border-white/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-2 text-sm font-bold">
              <CheckSquare className="w-4 h-4 text-brand" />
              {selected.size} selected
            </span>
            <button
              type="button"
              onClick={clearSelection}
              className="inline-flex items-center gap-1 text-xs font-semibold text-white/60 hover:text-white"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <div>
              <label className={flabel}>Priority</label>
              <select className={field} value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">— keep —</option>
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                  <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={flabel}>Assignee (replaces)</label>
              <select className={field} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">— keep —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={flabel}>Client (filters project)</label>
              <select
                className={field}
                value={clientFilter}
                onChange={(e) => {
                  setClientFilter(e.target.value);
                  setProjectId(""); // reset project when the client filter changes
                }}
              >
                <option value="">— any —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
                <option value="internal">Internal (no client)</option>
              </select>
            </div>

            <div>
              <label className={flabel}>Move to project</label>
              <select className={field} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">— keep —</option>
                {projectChoices.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.client ? `${p.client.companyName} · ` : ""}{p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={flabel}>Due date</label>
              <input
                type="date"
                className={field}
                value={dueDate}
                disabled={clearDue}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <label className="mt-1 flex items-center gap-1.5 text-[11px] text-white/60">
                <input
                  type="checkbox"
                  className="accent-brand"
                  checked={clearDue}
                  onChange={(e) => setClearDue(e.target.checked)}
                />
                Clear due date
              </label>
            </div>

            <div>
              <label className={flabel}>Archive</label>
              <select className={field} value={archived} onChange={(e) => setArchived(e.target.value)}>
                <option value="">— keep —</option>
                <option value="archive">Archive</option>
                <option value="restore">Restore</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] text-white/45">
              {hasChange ? "Applies to all selected tasks." : "Set at least one field to apply changes."}
            </p>
            <button
              type="button"
              onClick={apply}
              disabled={!hasChange || isPending}
              className="min-h-11 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-ink text-sm font-bold px-8 py-2 rounded-[14px] transition-colors"
            >
              {isPending ? "Applying…" : "Apply"}
            </button>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white rounded-[22px] border border-black/[0.07] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.07]">
                <th className={`${th} w-10`}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="accent-brand w-4 h-4 align-middle"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all tasks"
                  />
                </th>
                <th className={th}>Task</th>
                <th className={th}>Client</th>
                <th className={th}>Project</th>
                <th className={th}>Description</th>
                <th className={th}>Status</th>
                <th className={th}>Priority</th>
                <th className={th}>Assignees</th>
                <th className={th}>Due</th>
              </tr>
            </thead>
            {groups.map((g) => {
              const groupIds = g.items.map((t) => t.id);
              const selectedInGroup = groupIds.filter((id) => selected.has(id)).length;
              const groupAllSelected = groupIds.length > 0 && selectedInGroup === groupIds.length;
              const groupSomeSelected = selectedInGroup > 0 && !groupAllSelected;
              const isCollapsed = showGroupHeaders && collapsedGroups.has(g.key);
              return (
                <tbody key={g.key} className="divide-y divide-black/[0.05]">
                  {showGroupHeaders && (
                    <tr className="bg-cream/70 border-y border-black/[0.06]">
                      <td className={`${td} w-10 py-2`}>
                        <input
                          type="checkbox"
                          className="accent-brand w-4 h-4 align-middle"
                          checked={groupAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = groupSomeSelected;
                          }}
                          onChange={() => toggleGroupSelection(groupIds, !groupAllSelected)}
                          aria-label={`Select all ${g.name} tasks`}
                        />
                      </td>
                      <td colSpan={8} className={`${td} py-2`}>
                        <button
                          type="button"
                          onClick={() => toggleGroupCollapse(g.key)}
                          className="w-full flex items-center gap-2 text-left"
                        >
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-ink/40 shrink-0 transition-transform ${
                              isCollapsed ? "" : "rotate-90"
                            }`}
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: g.color ?? "#94a3b8" }}
                          />
                          <span className="text-xs font-bold uppercase tracking-wide text-ink/60">
                            {g.name}
                          </span>
                          <span className="text-xs font-semibold text-ink/35">{g.items.length}</span>
                        </button>
                      </td>
                    </tr>
                  )}
                  {!isCollapsed && g.items.map(renderRow)}
                </tbody>
              );
            })}
          </table>
        </div>
      </div>
    </div>
  );
}
