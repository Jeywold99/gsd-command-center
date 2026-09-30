import "server-only";
import { prisma } from "./prisma";
import { todayRange } from "./tz";

// Personal "Today" data for the Home screen: what's due, what's next, and the
// latest voice note. (Team-wide widgets still come from lib/dashboard.ts.)

export async function getHomeData(userId: string) {
  const now = new Date();
  const { start, end, dateStart, dateEnd } = todayRange(now);
  const mine = { assignees: { some: { userId } } };
  const open = { parentId: null, isArchived: false, status: { not: "DONE" as const } };
  // Due today = a date-only due date of today's date, or a timed one inside today.
  const dueToday = {
    OR: [
      { dueDate: { gte: dateStart, lt: dateEnd } },
      { dueDate: { gte: start, lt: end } },
    ],
  };

  const [dueTodayCount, overdueCount, events, dueTasks, myTasks, latestNote, unreadNotes] =
    await Promise.all([
      prisma.task.count({ where: { ...open, ...mine, ...dueToday } }),
      prisma.task.count({ where: { ...open, ...mine, dueDate: { lt: dateStart } } }),
      prisma.calendarEvent.findMany({
        where: {
          startAt: { gte: start, lt: end },
          OR: [{ createdById: userId }, { attendees: { some: { userId } } }],
        },
        orderBy: { startAt: "asc" },
        select: {
          id: true,
          title: true,
          type: true,
          startAt: true,
          allDay: true,
          meetingUrl: true,
          voiceNoteId: true,
          taskId: true,
          task: { select: { projectId: true } },
          client: { select: { companyName: true, colorHex: true } },
        },
      }),
      prisma.task.findMany({
        where: { ...open, ...mine, ...dueToday, calendarEvents: { none: { type: "REMINDER" } } },
        orderBy: { dueDate: "asc" },
        take: 8,
        select: {
          id: true,
          title: true,
          priority: true,
          dueDate: true,
          projectId: true,
          project: { select: { name: true, client: { select: { companyName: true } } } },
        },
      }),
      prisma.task.findMany({
        where: { ...open, ...mine },
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          title: true,
          priority: true,
          dueDate: true,
          projectId: true,
          voiceNoteId: true,
          project: { select: { name: true, client: { select: { companyName: true } } } },
        },
      }),
      prisma.voiceNote.findFirst({
        where: { userId },
        orderBy: { receivedAt: "desc" },
        select: {
          id: true,
          summary: true,
          source: true,
          receivedAt: true,
          _count: { select: { createdTasks: true, createdEvents: true, createdIdeas: true } },
        },
      }),
      prisma.voiceNote.count({ where: { userId, isRead: false } }),
    ]);

  return {
    dueTodayCount,
    overdueCount,
    events,
    dueTasks,
    myTasks,
    latestNote,
    unreadNotes,
    dateStart,
  };
}
