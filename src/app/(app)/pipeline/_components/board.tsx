"use client";

import { startTransition, useOptimistic, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CircleAlert, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { changeStatus } from "../actions";
import { CLOSED_STATUSES, OPEN_STATUSES, STATUS_LABEL, isStatus, type Status } from "@/lib/pipeline/types";
import { STATUS_DOT } from "./status-chip";

// One card on the board. Dates are formatted on the server (see board/page.tsx) so the client never
// has to know the team's time zone.
export type BoardApp = {
  id: string;
  company: string;
  role: string;
  status: Status;
  person: string;
  rate: string | null;
  missing: number;
  ready: boolean;
  daysQuiet: number | null;
  nextAction: string | null;
  nextWhen: string | null;
  deadline: string | null;
};

// Collision: prefer the column under the pointer, fall back to overlap (keyboard / fast flicks).
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

function CardBody({ app }: { app: BoardApp }) {
  const quiet = app.daysQuiet != null && app.daysQuiet >= 7 && ["applied", "viewed", "replied"].includes(app.status);
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[15px] font-bold leading-snug text-ink">{app.company}</p>
        <span
          title={app.person}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-midnight text-[11px] font-bold text-white"
        >
          {app.person.slice(0, 1).toUpperCase()}
        </span>
      </div>
      <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[#6B645D]">{app.role}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {app.rate && (
          <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-semibold text-ink/70">{app.rate}</span>
        )}
        {app.ready && (
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-[#0B7A52]">Ready to send</span>
        )}
        {app.missing > 0 && (
          <span className="rounded-full bg-brand-pale px-2 py-0.5 text-[11px] font-bold text-[#B34100]">
            {app.missing} to do
          </span>
        )}
        {quiet && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
            <CircleAlert className="h-3 w-3" aria-hidden />
            {app.daysQuiet}d quiet
          </span>
        )}
      </div>

      {(app.nextAction || app.deadline) && (
        <div className="mt-2.5 space-y-0.5 border-t border-black/[0.06] pt-2 text-[12px] text-[#6B645D]">
          {app.nextAction && (
            <p className="line-clamp-2">
              <span className="font-bold text-ink/80">Next:</span> {app.nextAction}
              {app.nextWhen ? ` · ${app.nextWhen}` : ""}
            </p>
          )}
          {app.deadline && (
            <p>
              <span className="font-bold text-ink/80">Due:</span> {app.deadline}
            </p>
          )}
        </div>
      )}
    </>
  );
}

function Card({ app }: { app: BoardApp }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: app.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => router.push(`/pipeline/applications/${app.id}`)}
      className={`cursor-grab rounded-2xl border border-transparent bg-white p-3.5 shadow-[0_1px_2px_rgba(26,26,26,0.06)] transition-colors hover:border-brand/40 active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <CardBody app={app} />
    </div>
  );
}

function Column({ status, apps, dim }: { status: Status; apps: BoardApp[]; dim?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      aria-label={STATUS_LABEL[status]}
      className={`flex w-[78%] shrink-0 snap-start flex-col rounded-[20px] p-3 transition-colors sm:w-[272px] ${
        isOver ? "bg-brand-pale" : dim ? "bg-[#F1ECE6]" : "bg-[#EFE9E2]"
      }`}
    >
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
        <h3 className="flex-1 text-sm font-bold text-ink">{STATUS_LABEL[status]}</h3>
        <span className="text-[13px] font-semibold text-[#6B645D]">{apps.length}</span>
      </div>
      <div ref={setNodeRef} className="min-h-[56px] space-y-2">
        {apps.map((a) => (
          <Card key={a.id} app={a} />
        ))}
        {apps.length === 0 && (
          <p className="rounded-2xl border border-dashed border-black/10 px-3 py-4 text-center text-xs text-[#6B645D]">
            Drop here
          </p>
        )}
      </div>
    </section>
  );
}

export default function Board({ apps }: { apps: BoardApp[] }) {
  // Moves show instantly; if the server rejects one, React drops the optimistic change by itself.
  const [shown, applyMove] = useOptimistic(apps, (state: BoardApp[], m: { id: string; status: Status }) =>
    state.map((a) => (a.id === m.id ? { ...a, status: m.status } : a)),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const sensors = useSensors(
    // Mouse drags after 6px; a touch needs a short press so swiping still scrolls the columns.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const byStatus = new Map<Status, BoardApp[]>();
  for (const a of shown) byStatus.set(a.status, [...(byStatus.get(a.status) ?? []), a]);
  const closedCount = CLOSED_STATUSES.reduce((n, s) => n + (byStatus.get(s)?.length ?? 0), 0);
  const active = activeId ? (shown.find((a) => a.id === activeId) ?? null) : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setError(null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const target = e.over ? String(e.over.id) : null;
    const app = shown.find((a) => a.id === id);
    if (!app || !target || !isStatus(target) || target === app.status) return;
    startTransition(async () => {
      applyMove({ id, status: target });
      const res = await changeStatus(id, target);
      if (!res.ok) setError(res.error);
    });
  }

  const columns = showClosed ? [...OPEN_STATUSES, ...CLOSED_STATUSES] : OPEN_STATUSES;

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-[12px] bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          Could not move it: {error}
        </p>
      )}

      <DndContext
        id="pipeline-board"
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 items-start gap-2.5 overflow-x-auto px-4 pb-3 sm:-mx-5 sm:scroll-px-5 sm:px-5 lg:-mx-9 lg:px-9 [scrollbar-width:thin]">
          {columns.map((s) => (
            <Column key={s} status={s} apps={byStatus.get(s) ?? []} dim={CLOSED_STATUSES.includes(s)} />
          ))}
        </div>
        <DragOverlay>
          {active ? (
            <div className="w-[260px] rotate-2 rounded-2xl border border-brand/50 bg-white p-3.5 shadow-lg">
              <CardBody app={active} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <button
        type="button"
        onClick={() => setShowClosed((v) => !v)}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-[#B34100] hover:underline"
        aria-expanded={showClosed}
      >
        {showClosed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {showClosed ? "Hide closed columns" : `Show closed columns (${closedCount})`}
        <span className="font-medium text-[#6B645D]">· on hold, rejected, ghosted, withdrawn, declined</span>
      </button>
      <p className="flex items-center gap-1.5 text-xs text-[#6B645D]">
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        Tap a card to open it. Drag (press and hold on a phone) to change its status.
      </p>
    </div>
  );
}
