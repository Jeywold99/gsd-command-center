import "server-only";
import { prisma } from "./prisma";

function nextDueDate(base: Date, frequency: "DAILY" | "WEEKLY" | "MONTHLY", interval: number): Date {
  const next = new Date(base);
  if (frequency === "DAILY") next.setDate(next.getDate() + interval);
  else if (frequency === "WEEKLY") next.setDate(next.getDate() + interval * 7);
  else next.setMonth(next.getMonth() + interval);
  return next;
}

// Call right after a task transitions to DONE. If it's set to repeat, this
// spins up the next occurrence and hands the recurrence off to it — the
// completed task itself stops repeating, so reopening/re-closing the same
// task can't spawn duplicates. Subtasks and Notes are intentionally not
// copied; each occurrence starts fresh.
export async function regenerateIfRecurring(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      title: true,
      description: true,
      projectId: true,
      priority: true,
      milestoneId: true,
      createdById: true,
      dueDate: true,
      recurrence: true,
      recurrenceInterval: true,
      assignees: { select: { userId: true } },
    },
  });
  if (!task || !task.recurrence) return;

  const interval = task.recurrenceInterval ?? 1;
  const nextDue = nextDueDate(task.dueDate ?? new Date(), task.recurrence, interval);

  const max = await prisma.task.aggregate({
    where: { projectId: task.projectId, status: "TODO", parentId: null },
    _max: { position: true },
  });

  await prisma.$transaction([
    prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        projectId: task.projectId,
        priority: task.priority,
        milestoneId: task.milestoneId,
        createdById: task.createdById,
        dueDate: nextDue,
        status: "TODO",
        position: (max._max.position ?? 0) + 1,
        recurrence: task.recurrence,
        recurrenceInterval: task.recurrenceInterval,
        assignees: task.assignees.length
          ? { create: task.assignees.map((a) => ({ userId: a.userId })) }
          : undefined,
      },
    }),
    prisma.task.update({
      where: { id: taskId },
      data: { recurrence: null, recurrenceInterval: null },
    }),
  ]);
}
