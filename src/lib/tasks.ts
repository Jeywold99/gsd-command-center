import "server-only";
import { prisma } from "./prisma";

const taskInclude = {
  project: {
    select: {
      id: true,
      name: true,
      client: { select: { companyName: true, colorHex: true } },
    },
  },
  assignees: { include: { user: { select: { id: true, name: true } } } },
} as const;

// Cross-project task views (top-level tasks only).
export async function listMyTasks(userId: string) {
  return prisma.task.findMany({
    where: { parentId: null, assignees: { some: { userId } } },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { position: "asc" }],
    include: taskInclude,
  });
}

export async function listAllTasks() {
  return prisma.task.findMany({
    where: { parentId: null },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { position: "asc" }],
    include: taskInclude,
  });
}
