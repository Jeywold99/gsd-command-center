import "server-only";
import { prisma } from "./prisma";
import { emitNotifications } from "./realtime";
import { sendPush } from "./push";
import type { NotificationType } from "@/generated/prisma/client/enums";

// In-app notification center. Other features call `notify()` to drop a row;
// the bell in the app shell reads the recent list + unread count.

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  linkUrl?: string | null;
};

// Create a single notification. Best-effort: a notification failure must never
// break the action that triggered it, so callers can wrap in try/catch or use
// `notifyMany` which already swallows per-user errors.
export async function notify(input: NotifyInput) {
  const row = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      linkUrl: input.linkUrl ?? null,
    },
  });
  await emitNotifications([
    {
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      body: row.body,
      linkUrl: row.linkUrl,
      createdAt: row.createdAt,
    },
  ]);
  await sendPush([row.userId], { title: row.title, body: row.body, url: row.linkUrl });
  return row;
}

// Notify several users at once (e.g. everyone newly assigned to a task, or the
// whole team when a project/event is created). Skips empty lists and never
// throws — notifications are a side effect. Rows are created individually so we
// can push each one live to its recipient's socket room.
export async function notifyMany(
  userIds: string[],
  input: Omit<NotifyInput, "userId">,
) {
  if (userIds.length === 0) return;
  try {
    const rows = await Promise.all(
      userIds.map((userId) =>
        prisma.notification.create({
          data: {
            userId,
            type: input.type,
            title: input.title,
            body: input.body ?? null,
            entityType: input.entityType ?? null,
            entityId: input.entityId ?? null,
            linkUrl: input.linkUrl ?? null,
          },
        }),
      ),
    );
    await emitNotifications(
      rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        type: row.type,
        title: row.title,
        body: row.body,
        linkUrl: row.linkUrl,
        createdAt: row.createdAt,
      })),
    );
    await sendPush(userIds, { title: input.title, body: input.body, url: input.linkUrl });
  } catch (err) {
    console.error("notifyMany failed:", err);
  }
}

// Recent notifications for the bell (newest first).
export async function listNotifications(userId: string, take = 15) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      linkUrl: true,
      isRead: true,
      createdAt: true,
    },
  });
}

export async function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export type NotificationItem = Awaited<
  ReturnType<typeof listNotifications>
>[number];
