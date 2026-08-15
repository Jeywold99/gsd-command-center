import "server-only";
import { prisma } from "./prisma";
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
  return prisma.notification.create({
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
}

// Notify several users at once (e.g. everyone newly assigned to a task).
// Skips empty lists and never throws — notifications are a side effect.
export async function notifyMany(
  userIds: string[],
  input: Omit<NotifyInput, "userId">,
) {
  if (userIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        linkUrl: input.linkUrl ?? null,
      })),
    });
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
