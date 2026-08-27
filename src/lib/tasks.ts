import "server-only";
import { prisma } from "./prisma";

const taskInclude = {
  project: {
    select: {
      id: true,
      name: true,
      client: { select: { id: true, companyName: true, colorHex: true } },
    },
  },
  assignees: { include: { user: { select: { id: true, name: true } } } },
} as const;

// Cross-project task views (top-level tasks only). Archived tasks are excluded
// from the active views; pass archivedOnly=true to list the archive instead.
export async function listMyTasks(userId: string, archivedOnly = false) {
  return prisma.task.findMany({
    where: { parentId: null, isArchived: archivedOnly, assignees: { some: { userId } } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { position: "asc" }],
    include: taskInclude,
  });
}

export async function listAllTasks(archivedOnly = false) {
  return prisma.task.findMany({
    where: { parentId: null, isArchived: archivedOnly },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { position: "asc" }],
    include: taskInclude,
  });
}
