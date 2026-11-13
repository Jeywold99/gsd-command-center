import "server-only";
import { prisma } from "@/lib/prisma";
import { monthKey, monthOfDate, type PStatus } from "./shared";

// Reads for the client portal. A client's data volume is small (tens of tasks
// a month), so we load the client's tasks once and slice them in memory.

export async function listBusinesses(clientId: string) {
  return prisma.project.findMany({
    where: { clientId, portalShort: { not: null } },
    orderBy: [{ portalOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      portalShort: true,
      portalKind: true,
      portalColor: true,
      portalNote: true,
      workstreams: true,
    },
  });
}
export type Business = Awaited<ReturnType<typeof listBusinesses>>[number];

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  projectId: true,
  workstream: true,
  month: true,
  dueDate: true,
  nextAction: true,
  waitingOn: true,
  chaseDate: true,
  askType: true,
  outcome: true,
  recurrence: true,
  recurrenceInterval: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  isArchived: true,
  deletedAt: true,
  assignees: { select: { user: { select: { id: true, name: true } } } },
} as const;

export async function loadClientTasks(clientId: string) {
  const rows = await prisma.task.findMany({
    where: { parentId: null, project: { clientId, portalShort: { not: null } } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    select: taskSelect,
  });
  return rows.map(enrich);
}
export type PTask = Awaited<ReturnType<typeof loadClientTasks>>[number];

function enrich<T extends {
  status: string;
  waitingOn: string | null;
  month: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  completedAt: Date | null;
  assignees: { user: { id: string; name: string } }[];
}>(t: T) {
  const pstatus: PStatus =
    t.status === "DONE"
      ? "DONE"
      : t.status === "IN_REVIEW"
        ? "NEEDS_CLIENT"
        : t.waitingOn
          ? "WAITING"
          : t.status === "IN_PROGRESS"
            ? "IN_PROGRESS"
            : "PLANNED";
  // The month a task is planned for: its explicit month, else its due date,
  // else when it was created.
  const planned = monthKey(t.month ?? t.dueDate ?? t.createdAt);
  // A finished task counts in the month it was finished (if later), so work
  // carried over and then done shows up where it was actually done.
  const done = t.completedAt ? monthOfDate(t.completedAt) : null;
  const viewMonth = pstatus === "DONE" && done && done > planned ? done : planned;
  return {
    ...t,
    pstatus,
    plannedMonth: planned,
    viewMonth,
    owner: t.assignees[0]?.user ?? null,
  };
}

// The tasks to show for a month. In the current month, unfinished tasks from
// earlier months roll in and are flagged "carried over".
export function tasksForMonth(all: PTask[], month: string, currentMonth: string) {
  const live = all.filter((t) => !t.deletedAt && !t.isArchived);
  return live
    .filter(
      (t) =>
        t.viewMonth === month ||
        (month === currentMonth && t.pstatus !== "DONE" && t.plannedMonth < month),
    )
    .map((t) => ({ ...t, carried: t.plannedMonth < month && t.pstatus !== "DONE" }));
}
export type MonthTask = ReturnType<typeof tasksForMonth>[number];

export async function getPortalTask(clientId: string, id: string) {
  const t = await prisma.task.findFirst({
    where: { id, parentId: null, project: { clientId, portalShort: { not: null } } },
    select: {
      ...taskSelect,
      project: { select: { id: true, name: true, portalShort: true, portalColor: true, workstreams: true } },
      documents: {
        where: { portalVisibility: { not: null } },
        select: { id: true, name: true, portalVisibility: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, kind: true, text: true, createdAt: true, user: { select: { name: true } } },
      },
    },
  });
  return t ? enrich(t) : null;
}

export async function listTeamOwners() {
  return prisma.user.findMany({
    where: { isActive: true, role: { not: "CLIENT" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listPortalDocuments(clientId: string) {
  return prisma.document.findMany({
    where: { clientId, portalVisibility: { not: null }, messageId: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      mimeType: true,
      sizeBytes: true,
      category: true,
      createdAt: true,
      expiresAt: true,
      portalVisibility: true,
      projectId: true,
      taskId: true,
      uploadedBy: { select: { name: true } },
    },
  });
}
export type PortalDoc = Awaited<ReturnType<typeof listPortalDocuments>>[number];

export async function listPortalLogins(clientId: string) {
  return prisma.portalLogin.findMany({
    where: { clientId },
    orderBy: { service: "asc" },
    select: {
      id: true,
      service: true,
      sharedWith: true,
      twoFactor: true,
      lastChangedAt: true,
      url: true,
      projectId: true,
    },
  });
}

export async function listAccessLog(clientId: string, take = 12) {
  return prisma.portalAccessLog.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, action: true, target: true, createdAt: true, user: { select: { name: true } } },
  });
}

// Deleted tasks are kept 30 days, then removed for good. Run lazily whenever
// the trash is looked at, so no scheduler is needed.
export const TRASH_DAYS = 30;
export async function purgeOldTrash(clientId: string) {
  const cutoff = new Date(Date.now() - TRASH_DAYS * 86_400_000);
  await prisma.task.deleteMany({
    where: { deletedAt: { lt: cutoff }, project: { clientId } },
  });
}
