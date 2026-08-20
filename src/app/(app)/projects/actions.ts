"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession, requireRole } from "@/lib/dal";
import { notifyMany } from "@/lib/notifications";
import { saveFile } from "@/lib/storage";
import { str, date } from "@/lib/forms";
import type { ClientFormState } from "@/lib/definitions";

// ── Projects ──
export async function createProject(
  _state: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const session = await requireRole("OWNER", "MANAGER");
  const name = str(formData.get("name"));
  if (!name) return { error: "Project name is required." };

  const budgetRaw = str(formData.get("budget"));
  const project = await prisma.project.create({
    data: {
      name,
      description: str(formData.get("description")),
      clientId: str(formData.get("clientId")),
      status: (str(formData.get("status")) as never) ?? "PLANNING",
      budget: budgetRaw && !isNaN(Number(budgetRaw)) ? budgetRaw : null,
      startDate: date(formData.get("startDate")),
      dueDate: date(formData.get("dueDate")),
    },
    include: { client: { select: { companyName: true } } },
  });

  // Notify the rest of the team that a new project exists.
  const team = await prisma.user.findMany({
    where: { isActive: true, id: { not: session.userId } },
    select: { id: true },
  });
  await notifyMany(
    team.map((u) => u.id),
    {
      type: "PROJECT_CREATED",
      title: "New project created",
      body: project.client
        ? `${project.client.companyName} · ${project.name}`
        : project.name,
      entityType: "project",
      entityId: project.id,
      linkUrl: `/projects/${project.id}`,
    },
  );

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProject(
  _state: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await requireRole("OWNER", "MANAGER");
  const id = str(formData.get("id"));
  const name = str(formData.get("name"));
  if (!id) return { error: "Missing project id." };
  if (!name) return { error: "Project name is required." };

  const budgetRaw = str(formData.get("budget"));
  await prisma.project.update({
    where: { id },
    data: {
      name,
      description: str(formData.get("description")),
      clientId: str(formData.get("clientId")),
      status: (str(formData.get("status")) as never) ?? "PLANNING",
      budget: budgetRaw && !isNaN(Number(budgetRaw)) ? budgetRaw : null,
      startDate: date(formData.get("startDate")),
      dueDate: date(formData.get("dueDate")),
    },
  });
  revalidatePath(`/projects/${id}`);
  revalidatePath("/projects");
  redirect(`/projects/${id}?saved=1`);
}

// ── Tasks: board interactions (called directly from the client board) ──

// Returns the created task so the client board can append it optimistically.
// By default the creator is assigned to the task they add.
export async function createTask(projectId: string, status: string, title: string) {
  const session = await verifySession();
  if (!title.trim()) return null;
  const max = await prisma.task.aggregate({
    where: { projectId, status: status as never, parentId: null },
    _max: { position: true },
  });
  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      projectId,
      status: status as never,
      position: (max._max.position ?? 0) + 1,
      createdById: session.userId,
      assignees: { create: { userId: session.userId } },
    },
    include: {
      assignees: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { subtasks: true } },
    },
  });
  return task;
}

// Status-only move (used by the global /tasks board, which spans projects so
// per-project column re-indexing doesn't apply).
export async function moveTaskStatus(taskId: string, status: string) {
  await verifySession();
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: status as never,
      completedAt: status === "DONE" ? new Date() : null,
    },
  });
  revalidatePath("/tasks");
}

// Persist a drag: new status for the moved task + re-index the destination column.
export async function moveTask(
  taskId: string,
  status: string,
  orderedIds: string[],
) {
  await verifySession();
  await prisma.$transaction([
    prisma.task.update({
      where: { id: taskId },
      data: {
        status: status as never,
        completedAt: status === "DONE" ? new Date() : null,
      },
    }),
    ...orderedIds.map((id, i) =>
      prisma.task.update({ where: { id }, data: { position: i } }),
    ),
  ]);
}

// ── Task detail edits (server-rendered task page → revalidate) ──
export async function updateTask(formData: FormData) {
  await verifySession();
  const id = str(formData.get("id"));
  const projectId = str(formData.get("projectId"));
  const title = str(formData.get("title"));
  if (!id || !title) return;
  await prisma.task.update({
    where: { id },
    data: {
      title,
      description: str(formData.get("description")),
      status: (str(formData.get("status")) as never) ?? "TODO",
      priority: (str(formData.get("priority")) as never) ?? "MEDIUM",
      dueDate: date(formData.get("dueDate")),
      startDate: date(formData.get("startDate")),
      milestoneId: str(formData.get("milestoneId")),
      completedAt: str(formData.get("status")) === "DONE" ? new Date() : null,
    },
  });
  // Preserve where the user came from (global Tasks board vs project board).
  const fromTasks = str(formData.get("from")) === "tasks";
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks/${id}`);
  const params = new URLSearchParams({ saved: "1" });
  if (fromTasks) params.set("from", "tasks");
  redirect(`/projects/${projectId}/tasks/${id}?${params.toString()}`);
}

export async function deleteTask(formData: FormData) {
  await verifySession();
  const id = str(formData.get("id"));
  const projectId = str(formData.get("projectId"));
  const fromTasks = str(formData.get("from")) === "tasks";
  if (!id) return;
  await prisma.task.delete({ where: { id } });
  // Return to wherever the task was opened from.
  if (fromTasks) {
    revalidatePath("/tasks");
    if (projectId) revalidatePath(`/projects/${projectId}`);
    redirect("/tasks");
  }
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
    redirect(`/projects/${projectId}`);
  }
}

// Replace the full assignee set for a task.
export async function setAssignees(taskId: string, projectId: string, userIds: string[]) {
  const session = await verifySession();

  // Who was already assigned — so we only notify the genuinely new ones.
  const existing = await prisma.taskAssignee.findMany({
    where: { taskId },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((a) => a.userId));

  await prisma.$transaction([
    prisma.taskAssignee.deleteMany({ where: { taskId } }),
    ...(userIds.length
      ? [prisma.taskAssignee.createMany({ data: userIds.map((userId) => ({ taskId, userId })) })]
      : []),
  ]);

  // Notify newly-added assignees (never notify yourself for your own action).
  const newlyAssigned = userIds.filter(
    (id) => !existingIds.has(id) && id !== session.userId,
  );
  if (newlyAssigned.length) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true },
    });
    await notifyMany(newlyAssigned, {
      type: "TASK_ASSIGNED",
      title: "You were assigned a task",
      body: task?.title ?? null,
      entityType: "task",
      entityId: taskId,
      linkUrl: `/projects/${projectId}/tasks/${taskId}`,
    });
  }

  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  revalidatePath(`/projects/${projectId}`);
}

// Bulk-edit several tasks at once from the /tasks table view. Every field is
// optional — only the ones the user set are applied. `assigneeId` REPLACES each
// task's assignee set with that one person. Moving to a project also moves the
// task's client (client is derived from the project).
export async function bulkUpdateTasks(
  taskIds: string[],
  changes: {
    priority?: string;
    assigneeId?: string;
    dueDate?: string;
    clearDueDate?: boolean;
    projectId?: string;
    archived?: boolean;
  },
) {
  const session = await verifySession();
  const ids = [...new Set(taskIds.filter(Boolean))];
  if (ids.length === 0) return;

  // Scalar fields via a single updateMany.
  const data: Record<string, unknown> = {};
  if (changes.priority) data.priority = changes.priority;
  if (changes.projectId) data.projectId = changes.projectId;
  if (changes.archived !== undefined) data.isArchived = changes.archived;
  if (changes.clearDueDate) {
    data.dueDate = null;
  } else if (changes.dueDate) {
    const d = new Date(changes.dueDate);
    if (!isNaN(d.getTime())) data.dueDate = d;
  }
  if (Object.keys(data).length > 0) {
    await prisma.task.updateMany({
      where: { id: { in: ids } },
      data: data as never,
    });
  }

  // Assignee is a relation — replace the set for every selected task.
  if (changes.assigneeId) {
    const assigneeId = changes.assigneeId;
    await prisma.$transaction([
      prisma.taskAssignee.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.taskAssignee.createMany({
        data: ids.map((taskId) => ({ taskId, userId: assigneeId })),
        skipDuplicates: true,
      }),
    ]);
    // One summary notification (skip if you assigned yourself).
    if (assigneeId !== session.userId) {
      await notifyMany([assigneeId], {
        type: "TASK_ASSIGNED",
        title: `You were assigned ${ids.length} task${ids.length > 1 ? "s" : ""}`,
        entityType: "task",
        linkUrl: "/tasks",
      });
    }
  }

  revalidatePath("/tasks");
}

// Returns the created subtask so the client list can append it.
export async function createSubtask(parentId: string, projectId: string, title: string) {
  await verifySession();
  if (!title.trim()) return null;
  const sub = await prisma.task.create({
    data: { title: title.trim(), parentId, projectId, status: "TODO" },
  });
  return { id: sub.id, title: sub.title, done: false };
}

export async function toggleSubtask(subtaskId: string, parentId: string, projectId: string, done: boolean) {
  await verifySession();
  await prisma.task.update({
    where: { id: subtaskId },
    data: { status: done ? "DONE" : "TODO", completedAt: done ? new Date() : null },
  });
  revalidatePath(`/projects/${projectId}/tasks/${parentId}`);
}

// ── Milestones / phases ──
export async function createMilestone(formData: FormData) {
  await requireRole("OWNER", "MANAGER");
  const projectId = str(formData.get("projectId"));
  const name = str(formData.get("name"));
  if (!projectId || !name) return;
  const max = await prisma.milestone.aggregate({
    where: { projectId },
    _max: { order: true },
  });
  await prisma.milestone.create({
    data: {
      projectId,
      name,
      description: str(formData.get("description")),
      startDate: date(formData.get("startDate")),
      dueDate: date(formData.get("dueDate")),
      order: (max._max.order ?? 0) + 1,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteMilestone(formData: FormData) {
  await requireRole("OWNER", "MANAGER");
  const id = str(formData.get("id"));
  const projectId = str(formData.get("projectId"));
  if (!id) return;
  await prisma.milestone.delete({ where: { id } });
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

// ── Reminders (fired by the reminders-worker → notifications) ──
export async function createReminder(formData: FormData) {
  const session = await verifySession();
  const taskId = str(formData.get("taskId"));
  const projectId = str(formData.get("projectId"));
  const remindAt = date(formData.get("remindAt")); // from a datetime-local input
  if (!taskId || !remindAt) return;

  await prisma.reminder.create({
    data: {
      taskId,
      remindAt,
      note: str(formData.get("note")),
      // Checkbox on → only me; off → null = all task assignees.
      userId: formData.get("onlyMe") === "on" ? session.userId : null,
      createdById: session.userId,
    },
  });
  if (projectId) revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
}

export async function deleteReminder(formData: FormData) {
  await verifySession();
  const id = str(formData.get("id"));
  const projectId = str(formData.get("projectId"));
  const taskId = str(formData.get("taskId"));
  if (!id) return;
  await prisma.reminder.delete({ where: { id } });
  if (projectId && taskId) revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
}

// Quick-add a task from the global Tasks page (any authenticated user).
export async function quickAddTask(formData: FormData) {
  const session = await verifySession();
  const projectId = str(formData.get("projectId"));
  const title = str(formData.get("title"));
  if (!projectId || !title) return;

  const status = str(formData.get("status")) ?? "TODO";
  const max = await prisma.task.aggregate({
    where: { projectId, status: status as never, parentId: null },
    _max: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      title,
      projectId,
      status: status as never,
      priority: (str(formData.get("priority")) as never) ?? "MEDIUM",
      dueDate: date(formData.get("dueDate")),
      position: (max._max.position ?? 0) + 1,
      createdById: session.userId,
    },
  });

  // Assign the people picked at creation (deduped). If none were picked, the
  // creator is assigned by default ("whoever added it, unless they change it").
  let assigneeIds = [
    ...new Set(formData.getAll("assigneeIds").map(String).filter(Boolean)),
  ];
  if (assigneeIds.length === 0) assigneeIds = [session.userId];
  if (assigneeIds.length) {
    await prisma.taskAssignee.createMany({
      data: assigneeIds.map((userId) => ({ taskId: task.id, userId })),
    });
    await notifyMany(
      assigneeIds.filter((uid) => uid !== session.userId),
      {
        type: "TASK_ASSIGNED",
        title: "You were assigned a task",
        body: task.title,
        entityType: "task",
        entityId: task.id,
        linkUrl: `/projects/${projectId}/tasks/${task.id}`,
      },
    );
  }

  revalidatePath("/tasks");
  revalidatePath(`/projects/${projectId}`);
}

// ── Notes editor file uploads (BlockNote image/file/video/audio blocks) ──
// Called directly (not as a form action) by the client editor's `uploadFile`
// hook. Stores the file like any document — owned by the task so it is cleaned
// up on task delete — and returns a URL the editor renders inline.
export async function uploadNoteFile(formData: FormData): Promise<string> {
  const session = await verifySession();
  const taskId = str(formData.get("taskId"));
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file provided.");
  }

  const { storagePath, sizeBytes } = await saveFile(file);
  const doc = await prisma.document.create({
    data: {
      name: file.name,
      storagePath,
      mimeType: file.type || "application/octet-stream",
      sizeBytes,
      taskId: taskId || null,
      uploadedById: session.userId,
    },
  });
  // Same-origin URL; the browser sends the session cookie so the auth-gated
  // route serves it. `inline=1` lets images/PDFs render in place.
  return `/api/files/${doc.id}?inline=1`;
}

// Autosave the Notion-style Notes (BlockNote blocks JSON). No revalidate — the
// editor owns its state client-side; this just persists.
export async function updateTaskNotes(taskId: string, content: unknown) {
  await verifySession();
  if (!taskId) return;
  await prisma.task.update({
    where: { id: taskId },
    data: { content: (content ?? undefined) as never },
  });
}
