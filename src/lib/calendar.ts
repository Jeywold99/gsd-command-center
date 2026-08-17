import "server-only";
import { prisma } from "./prisma";

export async function listEvents(from: Date, to: Date) {
  return prisma.calendarEvent.findMany({
    where: { startAt: { gte: from, lt: to } },
    orderBy: { startAt: "asc" },
    include: {
      client: { select: { id: true, companyName: true, colorHex: true } },
      project: { select: { name: true } },
    },
  });
}

// Task due dates are overlaid on the calendar (not duplicated as events).
export async function listTaskDue(from: Date, to: Date) {
  return prisma.task.findMany({
    where: { parentId: null, isArchived: false, dueDate: { gte: from, lt: to } },
    orderBy: { dueDate: "asc" },
    select: {
      id: true,
      title: true,
      dueDate: true,
      status: true,
      projectId: true,
      project: {
        select: { name: true, client: { select: { companyName: true, colorHex: true } } },
      },
    },
  });
}
