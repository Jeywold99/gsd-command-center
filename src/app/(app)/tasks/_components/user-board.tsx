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
import { CalendarClock, Repeat, ChevronRight } from "lucide-react";
import { COLUMNS, PRIORITY, initials, fmtDate, groupByClient } from "../../projects/_components/task-badges";
import { moveTaskStatus } from "../../projects/actions";

type BoardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  recurrence?: string | null;
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
  const p = PRIORITY[task.priority] ?? PRIORITY.MEDIUM;
  return (
    <>
      <p className="text-sm font-semibold text-ink leading-snug flex items-center gap-1.5">
        {task.recurrence && (
          <span title="Repeats" className="shrink-0">
            <Repeat className="w-3 h-3 text-black/35" />
          </span>
        )}
        {task.title}
      </p>
      <p className="mt-1 text-[11px] text-black/45 truncate">
        {task.project ? (
          <>
            {task.project.client && (
              <span
                className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                style={{ background: task.project.client.colorHex ?? "#cbd5e1" }}
              />
            )}
            {task.project.client ? `${task.project.client.companyName} · ` : ""}
            {task.project.name}
          </>
        ) : (
          "Inbox"
        )}
      </p>
      <div className="mt-2 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${p.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
          {p.label}
        </span>
        {task.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map((a) => (
              <span
                key={a.user.id}
                title={a.user.name}
                className="w-5 h-5 rounded-full bg-midnight text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
              >
                {initials(a.user.name)}
              </span>
            ))}
          </div>
        )}
      </div>
      {task.dueDate && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-black/40">
          <CalendarClock className="w-3 h-3" />
          {fmtDate(task.dueDate)}
        </div>
      )}
    </>
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
      onClick={() => task.project && router.push(`/projects/${task.project.id}/tasks/${task.id}?from=tasks`)}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className="bg-white rounded-xl border border-black/10 p-3 shadow-sm transition-colors hover:border-brand/40 cursor-grab active:cursor-grabbing"
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
      className={`rounded-2xl border p-3 flex flex-col transition-colors ${
        isOver ? "bg-brand-pale/50 border-brand/30" : "bg-cream border-black/[0.06]"
      }`}
    >
      <div className="flex items-center justify-between px-1 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink/60">{label}</span>
        <span className="text-[11px] font-bold text-ink/35">{tasks.length}</span>
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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
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
