"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CalendarClock, Repeat, ChevronRight, Mic } from "lucide-react";
import { COLUMNS, initials, fmtDate, groupByClient } from "../../projects/_components/task-badges";
import PriorityChip from "../../_components/priority-chip";

const STATUS_DOT: Record<string, string> = {
  TODO: "bg-[#6B645D]",
  IN_PROGRESS: "bg-brand",
  IN_REVIEW: "bg-community",
  DONE: "bg-success",
};
import { moveTaskStatus } from "../../projects/actions";
import { taskPath } from "@/lib/task-path";

type BoardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  recurrence?: string | null;
  voiceNoteId?: string | null;
  project: {
    id: string;
    name: string;
    client: { id: string; companyName: string; colorHex: string | null } | null;
  } | null;
  assignees: { user: { id: string; name: string } }[];
};

type Cols = Record<string, BoardTask[]>;

function group(tasks: BoardTask[]): Cols {
  const cols: Cols = {};
  for (const c of COLUMNS) cols[c.status] = [];
  for (const t of tasks) (cols[t.status] ??= []).push(t);
  return cols;
}
function containerOf(cols: Cols, id: string): string | null {
  if (id in cols) return id;
  return Object.keys(cols).find((k) => cols[k].some((t) => t.id === id)) ?? null;
}

function CardBody({ task }: { task: BoardTask }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#6B645D]">
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {task.voiceNoteId && !task.project && <Mic className="w-3 h-3 shrink-0 text-[#B34100]" aria-label="From a voice note" />}
          {task.project?.client && (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: task.project.client.colorHex ?? "#cbd5e1" }} />
          )}
          <span className="truncate">
            {task.project
              ? task.project.client
                ? `${task.project.client.companyName} · ${task.project.name}`
                : task.project.name
              : task.voiceNoteId
                ? "Voice · Inbox"
                : "Inbox"}
          </span>
        </span>
        <PriorityChip priority={task.priority} />
      </div>
      <p className="flex items-center gap-1.5 text-[15px] font-semibold leading-snug text-ink">
        {task.recurrence && (
          <span title="Repeats" className="shrink-0">
            <Repeat className="w-3.5 h-3.5 text-[#6B645D]" />
          </span>
        )}
        {task.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold text-[#6B645D]">
          {task.dueDate && (
            <>
              <CalendarClock className="w-3.5 h-3.5" />
              {fmtDate(task.dueDate)}
            </>
          )}
        </span>
        {task.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map((a) => (
              <span
                key={a.user.id}
                title={a.user.name}
                className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-midnight text-[10px] font-bold text-white ring-2 ring-white"
              >
                {initials(a.user.name)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: BoardTask }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => router.push(taskPath(task.id, task.project?.id, "tasks"))}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="bg-white rounded-2xl border border-transparent p-3.5 shadow-[0_1px_2px_rgba(26,26,26,0.06)] transition-colors hover:border-brand/40 cursor-grab active:cursor-grabbing"
    >
      <CardBody task={task} />
    </div>
  );
}

function Column({
  status,
  label,
  tasks,
  collapsed,
  onToggleGroup,
}: {
  status: string;
  label: string;
  tasks: BoardTask[];
  collapsed: Set<string>;
  onToggleGroup: (key: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const clientGroups = groupByClient(tasks);
  // A client sub-header per group only earns its keep once there's more than
  // one client to tell apart in this column — otherwise it's just noise.
  const showGroupHeaders = clientGroups.length > 1;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-[22px] border p-3 flex flex-col transition-colors ${
        isOver ? "bg-brand-pale border-brand/30" : "bg-[#EFE9E2] border-transparent"
      }`}
    >
      <div className="flex items-center gap-2 px-1.5 mb-3">
        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[status] ?? "bg-[#6B645D]"}`} />
        <span className="flex-1 text-sm font-bold text-ink">{label}</span>
        <span className="text-[13px] font-semibold text-[#6B645D]">{tasks.length}</span>
      </div>
      <div className="space-y-3 min-h-[40px]">
        {clientGroups.map((g) => {
          const groupKey = `${status}:${g.key}`;
          const isCollapsed = showGroupHeaders && collapsed.has(groupKey);
          return (
            <div key={g.key}>
              {showGroupHeaders && (
                <button
                  type="button"
                  onClick={() => onToggleGroup(groupKey)}
                  className="w-full flex items-center gap-1.5 px-1 py-1 text-left hover:bg-black/[0.03] rounded-lg transition"
                >
                  <ChevronRight
                    className={`w-3 h-3 text-ink/35 shrink-0 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                  />
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: g.color ?? "#94a3b8" }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-ink/50 truncate">
                    {g.name}
                  </span>
                  <span className="text-[10px] font-semibold text-ink/30 ml-auto shrink-0">
                    {g.items.length}
                  </span>
                </button>
              )}
              {!isCollapsed && (
                <div className="space-y-2 mt-1">
                  {g.items.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UserBoard({ tasks }: { tasks: BoardTask[] }) {
  const [cols, setCols] = useState<Cols>(() => group(tasks));
  const [activeId, setActiveId] = useState<string | null>(null);
  // Client sub-groups start closed — with several clients' work stacked into
  // one column, opening straight into every card at once is the clutter this
  // grouping exists to avoid. Seeded once from the initial task set; the page
  // remounts this board (key={scope}-{archivedOnly}) whenever you switch to a
  // genuinely different set of tasks, so it re-defaults to closed each time.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const c of COLUMNS) {
      const colTasks = tasks.filter((t) => t.status === c.status);
      for (const g of groupByClient(colTasks)) {
        initial.add(`${c.status}:${g.key}`);
      }
    }
    return initial;
  });
  const colsRef = useRef(cols);
  useEffect(() => {
    colsRef.current = cols;
  }, [cols]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const activeTask = activeId
    ? Object.values(cols).flat().find((t) => t.id === activeId) ?? null
    : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const from = containerOf(colsRef.current, String(active.id));
    const to = String(over.id); // dropped onto a column
    if (!from || !(to in colsRef.current) || from === to) return;

    setCols((prev) => {
      const item = prev[from].find((t) => t.id === active.id);
      if (!item) return prev;
      return {
        ...prev,
        [from]: prev[from].filter((t) => t.id !== active.id),
        [to]: [...prev[to], { ...item, status: to }],
      };
    });
    void moveTaskStatus(String(active.id), to);
  }

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <DndContext
      id="tasks-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((c) => (
          <Column
            key={c.status}
            status={c.status}
            label={c.label}
            tasks={cols[c.status] ?? []}
            collapsed={collapsed}
            onToggleGroup={toggleGroup}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="bg-white rounded-xl border border-brand/50 p-3 shadow-lg rotate-2">
            <CardBody task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
