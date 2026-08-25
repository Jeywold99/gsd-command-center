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
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, GitBranch, Flag, CheckCircle2, Repeat } from "lucide-react";
import { COLUMNS, PRIORITY, initials, fmtDate } from "./task-badges";
import { createTask, moveTask } from "../actions";

type Assignee = { user: { id: string; name: string } };
export type BoardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  milestoneId: string | null;
  recurrence?: string | null;
  assignees: Assignee[];
  _count: { subtasks: number };
};

export type BoardPhase = {
  id: string;
  name: string;
  status: string;
  startDate: Date | string | null;
  dueDate: Date | string | null;
};

// Tasks with no phase live under this synthetic bucket. Never collides with a
// real milestone id (those are uuids — no colons).
const NO_PHASE = "none";
// Container id = "<phaseKey>:<status>" — a compound key so the same generic
// drag machinery that used to move between 4 status containers now also moves
// between phase swimlanes. Colon is safe: uuids and status enums never contain one.
const containerId = (phaseKey: string, status: string) => `${phaseKey}:${status}`;
function parseContainer(id: string): { phaseKey: string; status: string } {
  const i = id.indexOf(":");
  return { phaseKey: id.slice(0, i), status: id.slice(i + 1) };
}

type Cols = Record<string, BoardTask[]>;

function group(tasks: BoardTask[], phaseIds: string[]): Cols {
  const cols: Cols = {};
  for (const phaseKey of [...phaseIds, NO_PHASE]) {
    for (const c of COLUMNS) cols[containerId(phaseKey, c.status)] = [];
  }
  for (const t of tasks) {
    const key = containerId(t.milestoneId ?? NO_PHASE, t.status);
    (cols[key] ??= []).push(t);
  }
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
      {(task.dueDate || task._count.subtasks > 0) && (
        <div className="mt-2 flex items-center gap-3 text-[11px] text-black/40">
          {task.dueDate && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              {fmtDate(task.dueDate)}
            </span>
          )}
          {task._count.subtasks > 0 && (
            <span className="inline-flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              {task._count.subtasks}
            </span>
          )}
        </div>
      )}
    </>
  );
}

function TaskCard({ task, projectId }: { task: BoardTask; projectId: string }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => router.push(`/projects/${projectId}/tasks/${task.id}`)}
      className="bg-white rounded-xl border border-black/10 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-brand/40 transition-colors"
    >
      <CardBody task={task} />
    </div>
  );
}

function AddCard({ container, onAdd }: { container: string; onAdd: (c: string, t: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = val.trim();
        if (!t) return;
        setVal("");
        onAdd(container, t);
      }}
      className="mt-2"
    >
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="+ Add task"
        className="w-full bg-transparent text-sm px-2 py-1.5 rounded-lg border border-transparent hover:border-black/10 focus:border-brand focus:bg-white focus:outline-none placeholder:text-black/35 transition"
      />
    </form>
  );
}

function Column({
  container,
  label,
  tasks,
  projectId,
  onAdd,
}: {
  container: string;
  label: string;
  tasks: BoardTask[];
  projectId: string;
  onAdd: (c: string, t: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: container });
  return (
    <div className="bg-cream rounded-xl border border-black/[0.06] p-2.5 flex flex-col">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink/50">{label}</span>
        <span className="text-[10px] font-bold text-ink/30">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="space-y-2 min-h-[24px]">
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} projectId={projectId} />
          ))}
        </div>
      </SortableContext>
      <AddCard container={container} onAdd={onAdd} />
    </div>
  );
}

const PHASE_STATUS_STYLE: Record<string, string> = {
  DONE: "bg-success/10 text-success",
  IN_PROGRESS: "bg-brand-pale text-brand",
  PENDING: "bg-black/5 text-ink/50",
};

function Swimlane({
  phase,
  bare,
  cols,
  projectId,
  onAdd,
}: {
  phase: BoardPhase | null; // null = the "No Phase" bucket
  // No header at all — used for the "No Phase" lane when a project has no
  // phases defined yet, so the board looks exactly like the old flat one.
  bare?: boolean;
  cols: Cols;
  projectId: string;
  onAdd: (c: string, t: string) => void;
}) {
  const phaseKey = phase?.id ?? NO_PHASE;
  const count = COLUMNS.reduce((n, c) => n + (cols[containerId(phaseKey, c.status)]?.length ?? 0), 0);

  return (
    <div className="space-y-2">
      {!bare && (
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
            phase ? "bg-white border border-black/[0.07]" : "bg-transparent"
          }`}
        >
          {phase ? (
            <Flag className={`w-4 h-4 shrink-0 ${phase.status === "DONE" ? "text-success" : "text-brand"}`} />
          ) : (
            <span className="w-4 h-4 shrink-0" />
          )}
          <span className={`font-bold ${phase ? "text-ink" : "text-ink/40 text-sm uppercase tracking-wide text-xs"}`}>
            {phase ? phase.name : "No Phase"}
          </span>
          {phase && phase.status !== "PENDING" && (
            <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${PHASE_STATUS_STYLE[phase.status] ?? ""}`}>
              {phase.status === "DONE" && <CheckCircle2 className="inline w-2.5 h-2.5 mr-0.5 -mt-0.5" />}
              {phase.status === "DONE" ? "Done" : "In Progress"}
            </span>
          )}
          {phase && (phase.startDate || phase.dueDate) && (
            <span className="text-xs text-black/40">
              {fmtDate(phase.startDate)} – {fmtDate(phase.dueDate)}
            </span>
          )}
          <span className="ml-auto text-xs font-semibold text-black/35">{count} task{count === 1 ? "" : "s"}</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
        {COLUMNS.map((c) => (
          <Column
            key={c.status}
            container={containerId(phaseKey, c.status)}
            label={c.label}
            tasks={cols[containerId(phaseKey, c.status)] ?? []}
            projectId={projectId}
            onAdd={onAdd}
          />
        ))}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  projectId,
  initialTasks,
  phases = [],
}: {
  projectId: string;
  initialTasks: BoardTask[];
  phases?: BoardPhase[];
}) {
  const phaseIds = phases.map((p) => p.id);
  const [cols, setCols] = useState<Cols>(() => group(initialTasks, phaseIds));
  const [activeId, setActiveId] = useState<string | null>(null);
  const colsRef = useRef(cols);
  useEffect(() => {
    colsRef.current = cols;
  }, [cols]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const activeTask = activeId
    ? Object.values(cols).flat().find((t) => t.id === activeId) ?? null
    : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeC = containerOf(colsRef.current, String(active.id));
    const overC = containerOf(colsRef.current, String(over.id));
    if (!activeC || !overC || activeC === overC) return;

    setCols((prev) => {
      const activeItems = prev[activeC];
      const overItems = prev[overC];
      const idx = activeItems.findIndex((t) => t.id === active.id);
      if (idx < 0) return prev;
      const { phaseKey, status } = parseContainer(overC);
      const moved = { ...activeItems[idx], status, milestoneId: phaseKey === NO_PHASE ? null : phaseKey };
      const overIdx = overItems.findIndex((t) => t.id === over.id);
      const insertAt = overIdx >= 0 ? overIdx : overItems.length;
      return {
        ...prev,
        [activeC]: activeItems.filter((t) => t.id !== active.id),
        [overC]: [...overItems.slice(0, insertAt), moved, ...overItems.slice(insertAt)],
      };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const current = colsRef.current;
    const overC = containerOf(current, String(over.id)) ?? containerOf(current, String(active.id));
    if (!overC) return;

    let next = current;
    const items = current[overC];
    const oldIndex = items.findIndex((t) => t.id === active.id);
    const newIndex = items.findIndex((t) => t.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      next = { ...current, [overC]: arrayMove(items, oldIndex, newIndex) };
      setCols(next);
    }

    // By this point onDragOver has already live-reparented the card into
    // `overC` in state (or it never left its own column), so — same as
    // status — we just always persist whatever container it ended up in. No
    // "did it actually change" check needed; setting it to its current value
    // is harmless either way.
    const { phaseKey, status } = parseContainer(overC);
    const orderedIds = next[overC].map((t) => t.id);
    void moveTask(String(active.id), status, orderedIds, phaseKey === NO_PHASE ? null : phaseKey);
  }

  async function handleAdd(container: string, title: string) {
    const { phaseKey, status } = parseContainer(container);
    const milestoneId = phaseKey === NO_PHASE ? null : phaseKey;
    const created = await createTask(projectId, status, title, milestoneId);
    if (created) {
      setCols((prev) => ({
        ...prev,
        [container]: [...(prev[container] ?? []), created as unknown as BoardTask],
      }));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-6">
        {phases.map((phase) => (
          <Swimlane key={phase.id} phase={phase} cols={cols} projectId={projectId} onAdd={handleAdd} />
        ))}
        {/* "No Phase" bucket. Rendered bare (no header) when the project has
            no phases at all, so the board looks exactly like the old flat one. */}
        <Swimlane
          phase={null}
          bare={phases.length === 0}
          cols={cols}
          projectId={projectId}
          onAdd={handleAdd}
        />
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
