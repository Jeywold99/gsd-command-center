"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePortal, type PortalContext } from "@/lib/portal/dal";
import { notifyMany } from "@/lib/notifications";
import { regenerateIfRecurring } from "@/lib/recurrence";
import { taskPath } from "@/lib/task-path";
import { ASK_TYPES, fmtShort, isMonthKey, monthStart, statusLabel, type PStatus } from "@/lib/portal/shared";

export type TaskFormState = { error?: string } | undefined;

const STATUSES: PStatus[] = ["PLANNED", "IN_PROGRESS", "WAITING", "NEEDS_CLIENT", "DONE"];

function s(v: FormDataEntryValue | null): string | null {
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t : null;
}
function d(v: FormDataEntryValue | null): Date | null {
  const t = s(v);
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const x = new Date(`${t}T00:00:00.000Z`);
  return isNaN(x.getTime()) ? null : x;
}

function toDb(p: PStatus) {
  return p === "DONE" ? "DONE" : p === "NEEDS_CLIENT" ? "IN_REVIEW" : p === "PLANNED" ? "TODO" : "IN_PROGRESS";
}
function fromDb(status: string, waitingOn: string | null): PStatus {
  if (status === "DONE") return "DONE";
  if (status === "IN_REVIEW") return "NEEDS_CLIENT";
  if (waitingOn) return "WAITING";
  return status === "IN_PROGRESS" ? "IN_PROGRESS" : "PLANNED";
}

async function teamIds(exclude?: string) {
  const rows = await prisma.user.findMany({
    where: { isActive: true, role: { not: "CLIENT" }, ...(exclude ? { id: { not: exclude } } : {}) },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

// Tell the team about a change: the task's owner, or everyone if it has none.
// The person making the change is never notified about their own change.
async function tellTeam(
  ctx: PortalContext,
  task: { id: string; projectId: string | null; title: string },
  ownerId: string | null,
  title: string,
) {
  const who = ctx.user.name.split(" ")[0];
  const targets = ownerId ? [ownerId].filter((id) => id !== ctx.user.id) : await teamIds(ctx.user.id);
  if (!targets.length) return;
  await notifyMany(targets, {
    type: ownerId ? "TASK_ASSIGNED" : "SYSTEM",
    title: `${who}: ${title}`,
    body: `${ctx.client.companyName} · ${task.title}`,
    entityType: "task",
    entityId: task.id,
    linkUrl: taskPath(task.id, task.projectId),
  });
}

async function log(taskId: string, ctx: PortalContext, kind: string, text: string) {
  await prisma.taskActivity.create({ data: { taskId, userId: ctx.user.id, kind, text } });
}

// A task in this client's portal, or null (never another client's task).
async function ownTask(ctx: PortalContext, id: string) {
  return prisma.task.findFirst({
    where: { id, project: { clientId: ctx.client.id, portalShort: { not: null } } },
    include: { assignees: { include: { user: { select: { id: true, name: true } } } }, project: { select: { name: true, portalShort: true } } },
  });
}

// ── Create / edit ────────────────────────────────────────────────────────────

export async function saveTask(_st: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const ctx = await requirePortal();
  const id = s(formData.get("id"));

  const projectId = s(formData.get("projectId"));
  const business = projectId
    ? await prisma.project.findFirst({
        where: { id: projectId, clientId: ctx.client.id, portalShort: { not: null } },
        select: { id: true, name: true, workstreams: true },
      })
    : null;
  const title = s(formData.get("title"));
  const month = s(formData.get("month"));
  const ownerId = s(formData.get("ownerId"));
  const dueDate = d(formData.get("dueDate"));
  const statusRaw = s(formData.get("status")) as PStatus | null;
  const status: PStatus = statusRaw && STATUSES.includes(statusRaw) ? statusRaw : "PLANNED";
  const nextAction = s(formData.get("nextAction"));
  const waitingOn = s(formData.get("waitingOn"));
  const chaseDate = d(formData.get("chaseDate"));
  const askRaw = s(formData.get("askType"));
  const askType = askRaw && (ASK_TYPES as readonly string[]).includes(askRaw) ? askRaw : null;
  const workstream = s(formData.get("workstream"));
  const description = s(formData.get("description"));
  const outcome = s(formData.get("outcome"));
  const repeat = s(formData.get("repeat"));

  // The design's "required to save" rules.
  if (!business) return { error: "Pick which business this is for." };
  if (!title) return { error: "Give the task a title." };
  if (!isMonthKey(month)) return { error: "Pick the month this belongs to." };
  if (!ownerId) return { error: "Pick who owns it." };
  if (!dueDate) return { error: "Set a due date." };
  if (status !== "DONE" && !nextAction) return { error: "Write the next action, in one line." };
  if (status === "WAITING" && (!waitingOn || !chaseDate)) {
    return { error: "\"Waiting on\" needs a name and a chase date." };
  }
  if (status === "NEEDS_CLIENT" && !askType) {
    return { error: `Pick what ${ctx.firstName} needs to do: approve, decide or sign.` };
  }
  const owner = await prisma.user.findFirst({
    where: { id: ownerId, isActive: true, role: { not: "CLIENT" } },
    select: { id: true, name: true },
  });
  if (!owner) return { error: "That owner isn't on the team." };

  const recurrence =
    repeat === "WEEKLY" ? "WEEKLY" : repeat === "MONTHLY" || repeat === "YEARLY" ? "MONTHLY" : null;
  const recurrenceInterval = repeat === "YEARLY" ? 12 : null;

  const data = {
    title,
    projectId: business.id,
    workstream: workstream && business.workstreams.includes(workstream) ? workstream : null,
    month: monthStart(month),
    dueDate,
    status: toDb(status),
    nextAction,
    waitingOn: status === "WAITING" ? waitingOn : null,
    chaseDate: status === "WAITING" ? chaseDate : null,
    askType: status === "NEEDS_CLIENT" ? askType : null,
    description,
    outcome,
    recurrence,
    recurrenceInterval,
  } as const;

  if (!id) {
    const max = await prisma.task.aggregate({
      where: { projectId: business.id, status: data.status, parentId: null },
      _max: { position: true },
    });
    const task = await prisma.task.create({
      data: {
        ...data,
        position: (max._max.position ?? 0) + 1,
        completedAt: status === "DONE" ? new Date() : null,
        createdById: ctx.user.id,
        assignees: { create: [{ userId: owner.id }] },
      },
    });
    await log(task.id, ctx, "CREATED", `Created by ${ctx.user.name.split(" ")[0]}`);
    await tellTeam(ctx, task, owner.id, `new task for you`);
    redirect(`/t/${task.id}`);
  }

  const before = await ownTask(ctx, id);
  if (!before) return { error: "That task isn't in this Command Center." };
  const beforeStatus = fromDb(before.status, before.waitingOn);
  const beforeOwner = before.assignees[0]?.user ?? null;

  const becameDone = status === "DONE" && before.status !== "DONE";
  await prisma.$transaction([
    prisma.task.update({
      where: { id },
      data: {
        ...data,
        completedAt: status === "DONE" ? (before.completedAt ?? new Date()) : null,
      },
    }),
    ...(beforeOwner?.id !== owner.id
      ? [
          prisma.taskAssignee.deleteMany({ where: { taskId: id } }),
          prisma.taskAssignee.create({ data: { taskId: id, userId: owner.id } }),
        ]
      : []),
  ]);
  if (becameDone) await regenerateIfRecurring(id);

  // One readable line per thing that changed.
  const changes: string[] = [];
  if (beforeStatus !== status) {
    changes.push(`status ${statusLabel(beforeStatus, ctx.firstName)} → ${statusLabel(status, ctx.firstName)}`);
  }
  if (before.title !== title) changes.push(`title to "${title}"`);
  if ((before.dueDate?.getTime() ?? 0) !== dueDate.getTime()) changes.push(`due date to ${fmtShort(dueDate)}`);
  if (beforeOwner?.id !== owner.id) changes.push(`owner to ${owner.name.split(" ")[0]}`);
  if ((before.nextAction ?? null) !== nextAction && nextAction) changes.push(`next action to "${nextAction}"`);
  if (before.projectId !== business.id) changes.push(`business to ${business.name}`);
  if ((before.waitingOn ?? null) !== data.waitingOn && data.waitingOn) changes.push(`waiting on ${data.waitingOn}`);
  if ((before.outcome ?? null) !== outcome && outcome) changes.push(`outcome to "${outcome}"`);
  const who = ctx.user.name.split(" ")[0];
  const line = changes.length ? `${who} changed ${changes.join(", ")}` : `${who} edited the details`;
  await log(id, ctx, beforeStatus !== status ? "STATUS" : "UPDATED", line);
  await tellTeam(ctx, before, owner.id, changes.length ? `changed ${changes[0]}` : "edited a task");
  redirect(`/t/${id}`);
}

// ── One-click actions on the task card ──────────────────────────────────────

export async function taskQuickAction(formData: FormData) {
  const ctx = await requirePortal();
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  const note = s(formData.get("note"));
  const task = await ownTask(ctx, id);
  if (!task) redirect("/");
  const who = ctx.user.name.split(" ")[0];
  const ownerId = task.assignees[0]?.user.id ?? null;

  if (op === "comment") {
    if (note) {
      await log(id, ctx, "COMMENT", note);
      await tellTeam(ctx, task, ownerId, `commented: "${note.slice(0, 80)}"`);
    }
  } else if (op === "approve" && task.status === "IN_REVIEW") {
    // Approve / decide / sign: hands the task back to its owner to finish.
    // Only while it's actually waiting on the client (a second click is a no-op).
    const verb = task.askType === "SIGN" ? "Signed" : task.askType === "DECIDE" ? "Decided" : "Approved";
    await prisma.task.update({ where: { id }, data: { status: "IN_PROGRESS", askType: null, waitingOn: null, chaseDate: null } });
    await log(id, ctx, "APPROVED", `${verb} by ${who}${note ? `: "${note}"` : ""}`);
    await tellTeam(ctx, task, ownerId, `${verb.toLowerCase()} "${task.title}"`);
  } else if (op === "done") {
    await prisma.task.update({
      where: { id },
      data: { status: "DONE", completedAt: new Date(), waitingOn: null, chaseDate: null, askType: null, ...(note ? { outcome: note } : {}) },
    });
    await regenerateIfRecurring(id);
    await log(id, ctx, "STATUS", `${who} marked it done${note ? `: "${note}"` : ""}`);
    await tellTeam(ctx, task, ownerId, `marked "${task.title}" done`);
  } else if (op === "reopen") {
    await prisma.task.update({ where: { id }, data: { status: "IN_PROGRESS", completedAt: null } });
    await log(id, ctx, "STATUS", `${who} reopened it`);
    await tellTeam(ctx, task, ownerId, `reopened "${task.title}"`);
  } else if (op === "delete") {
    await prisma.task.update({ where: { id }, data: { deletedAt: new Date(), isArchived: true } });
    await log(id, ctx, "DELETED", `${who} deleted it (restorable for 30 days)`);
    await tellTeam(ctx, task, ownerId, `deleted "${task.title}"`);
    redirect("/");
  } else if (op === "restore") {
    await prisma.task.update({ where: { id }, data: { deletedAt: null, isArchived: false } });
    await log(id, ctx, "RESTORED", `${who} restored it`);
    await tellTeam(ctx, task, ownerId, `restored "${task.title}"`);
  }
  redirect(`/t/${id}`);
}
