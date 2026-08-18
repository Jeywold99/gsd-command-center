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
      client: { select: { companyName: true, colorHex: true, status: true } },
      _count: { select: { tasks: true, milestones: true } },
    },
  });
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
