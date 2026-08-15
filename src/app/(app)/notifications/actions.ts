"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

// Mark a single notification read. Scoped to the current user so one user can
// never mutate another's notifications by guessing an id.
export async function markNotificationRead(id: string) {
  const session = await verifySession();
  await prisma.notification.updateMany({
    where: { id, userId: session.userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/", "layout");
}

// Mark every unread notification for the current user as read.
export async function markAllNotificationsRead() {
  const session = await verifySession();
  await prisma.notification.updateMany({
    where: { userId: session.userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  revalidatePath("/", "layout");
}
