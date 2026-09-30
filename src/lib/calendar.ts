import "server-only";
import { prisma } from "./prisma";

// userId scopes to one person's calendar (their own events — created or
// invited to — and their own assigned tasks). Omit it for the team-wide
// "Everyone" view.
export async function listEvents(from: Date, to: Date, userId?: string) {
  return prisma.calendarEvent.findMany({
    where: {
      startAt: { gte: from, lt: to },
      ...(userId ? { OR: [{ createdById: userId }, { attendees: { some: { userId } } }] } : {}),
    },
    orderBy: { startAt: "asc" },
    include: {
      client: { select: { id: true, companyName: true, colorHex: true } },
      project: { select: { name: true } },
      createdBy: { select: { id: true, name: true } },
      attendees: { include: { user: { select: { id: true, name: true } } } },
    },
  });
}

// Task start + due dates, overlaid on the calendar (not duplicated as
// events). A task with both dates in range can appear on two different day
// cells — once marking its start, once its due date.
export async function listTaskDates(from: Date, to: Date, userId?: string) {
  return prisma.task.findMany({
    where: {
      parentId: null,
      isArchived: false,
      OR: [{ startDate: { gte: from, lt: to } }, { dueDate: { gte: from, lt: to } }],
      // A voice-note reminder already shows as its REMINDER event — don't
      // overlay its backing task a second time.
      calendarEvents: { none: { type: "REMINDER" } },
      ...(userId ? { assignees: { some: { userId } } } : {}),
    },
    orderBy: { dueDate: "asc" },
    select: {
      id: true,
      title: true,
      startDate: true,
      dueDate: true,
      status: true,
      projectId: true,
      project: {
        select: { name: true, client: { select: { companyName: true, colorHex: true } } },
      },
    },
  });
}
