import "server-only";
import { prisma } from "./prisma";

// The Projects section. By default it shows the working set and hides the
// "inactive" ones — ARCHIVED projects and projects whose client has CHURNED.
// Pass showInactive=true for the hidden Archived/Churned view.
export async function listProjects(showInactive = false) {
  return prisma.project.findMany({
    where: showInactive
      ? {
          OR: [
            { status: "ARCHIVED" },
            { client: { is: { status: "CHURNED" } } },
          ],
        }
      : {
          status: { not: "ARCHIVED" },
          OR: [
            { clientId: null },
            { client: { status: { not: "CHURNED" } } },
          ],
        },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      client: { select: { id: true, companyName: true, colorHex: true, status: true } },
      _count: { select: { tasks: true, milestones: true } },
    },
  });
}

export type ClientProjectSummary = {
  id: string | null; // null = the "Internal Projects" bucket
  companyName: string;
  colorHex: string | null;
  status: string | null; // client status; null for the Internal bucket
  timezone: string | null;
  projectCount: number;
  activeCount: number;
  nearestDueDate: Date | null;
};

// One tile per client (+ an "Internal" bucket for un-cliented projects) for
// the /projects directory — so the landing page is "pick a client" instead of
// every project from every client on one page. Same active/non-archived,
// non-churned filter as listProjects's default view.
export async function listClientsWithProjects(): Promise<ClientProjectSummary[]> {
  const projects = await prisma.project.findMany({
    where: {
      status: { not: "ARCHIVED" },
      OR: [{ clientId: null }, { client: { status: { not: "CHURNED" } } }],
    },
    select: {
      status: true,
      dueDate: true,
      clientId: true,
      client: {
        select: { id: true, companyName: true, colorHex: true, status: true, timezone: true },
      },
    },
  });

  const map = new Map<string, ClientProjectSummary>();
  for (const p of projects) {
    const key = p.clientId ?? "__internal__";
    if (!map.has(key)) {
      map.set(key, {
        id: p.clientId,
        companyName: p.client?.companyName ?? "Internal Projects",
        colorHex: p.client?.colorHex ?? null,
        status: p.client?.status ?? null,
        timezone: p.client?.timezone ?? null,
        projectCount: 0,
        activeCount: 0,
        nearestDueDate: null,
      });
    }
    const entry = map.get(key)!;
    entry.projectCount++;
    if (p.status === "ACTIVE") entry.activeCount++;
    if (p.dueDate && (!entry.nearestDueDate || p.dueDate < entry.nearestDueDate)) {
      entry.nearestDueDate = p.dueDate;
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.id === null) return 1;
    if (b.id === null) return -1;
    return a.companyName.localeCompare(b.companyName);
  });
}

// A single client's active projects — the /projects/client/[id] view.
// clientId=null means the "Internal Projects" bucket (no client).
export async function listProjectsForClient(clientId: string | null) {
  return prisma.project.findMany({
    where: { status: { not: "ARCHIVED" }, clientId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      client: { select: { id: true, companyName: true, colorHex: true, status: true } },
      _count: { select: { tasks: true, milestones: true } },
    },
  });
}

// Lightweight client lookup for the per-client project page's header. Returns
// null for a missing OR churned client (churned = treated as archived/hidden,
// same rule as everywhere else) so the page can 404 instead of showing it.
export async function getClientLite(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    select: { id: true, companyName: true, colorHex: true, status: true, timezone: true },
  });
  if (!client || client.status === "CHURNED") return null;
  return client;
}

// Project + its top-level tasks (subtasks are nested, shown in task detail).
export async function getProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, companyName: true, colorHex: true } },
      milestones: { orderBy: { order: "asc" } },
      tasks: {
        where: { parentId: null, isArchived: false },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: {
          assignees: { include: { user: { select: { id: true, name: true } } } },
          _count: { select: { subtasks: true } },
        },
      },
    },
  });
}

export async function getTask(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          milestones: { orderBy: { order: "asc" }, select: { id: true, name: true } },
        },
      },
      assignees: { include: { user: { select: { id: true, name: true } } } },
      subtasks: { orderBy: { createdAt: "asc" } },
      reminders: {
        where: { sent: false },
        orderBy: { remindAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function listActiveClients() {
  return prisma.client.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] } },
    orderBy: { companyName: "asc" },
    select: { id: true, companyName: true },
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });
}
