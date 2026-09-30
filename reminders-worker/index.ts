import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";
import webpush from "web-push";
import { taskPath } from "../src/lib/task-path";

// Standalone reminders worker (separate process from Next.js). Polls for due,
// unsent reminders and turns each into in-app notifications (+ a Web Push to
// the recipients' installed apps), then marks it sent.
// Catch-up safe: every tick processes ALL reminders whose time has passed, so a
// restart after downtime still delivers anything that came due meanwhile.

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
const INTERVAL_MS = Number(process.env.REMINDER_POLL_MS || 60_000);

// Same VAPID env as the web app (src/lib/push.ts); push is off without them.
const PUSH_ON = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (PUSH_ON) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@localhost",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

async function push(userIds: string[], title: string, body: string | null, url: string) {
  if (!PUSH_ON || userIds.length === 0) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
  const payload = JSON.stringify({ title, body: body ?? "", url });
  await Promise.all(
    subs.map((s) =>
      webpush
        .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 24,
        })
        .catch(async (err: { statusCode?: number }) => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          } else {
            console.error("[reminders] push failed:", err.statusCode ?? err);
          }
        }),
    ),
  );
}

async function tick() {
  const due = await prisma.reminder.findMany({
    where: { sent: false, remindAt: { lte: new Date() } },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          projectId: true,
          assignees: { select: { userId: true } },
        },
      },
    },
  });
  if (due.length === 0) return;

  for (const r of due) {
    try {
      // userId set → just that person; null → every assignee on the task.
      const targets = r.userId ? [r.userId] : r.task.assignees.map((a) => a.userId);
      const recipients = [...new Set(targets)].filter(Boolean);

      if (recipients.length > 0) {
        await prisma.notification.createMany({
          data: recipients.map((userId) => ({
            userId,
            type: "TASK_REMINDER" as const,
            title: `Reminder: ${r.task.title}`,
            body: r.note ?? null,
            entityType: "task",
            entityId: r.task.id,
            linkUrl: taskPath(r.task.id, r.task.projectId),
          })),
        });
        await push(recipients, `Reminder: ${r.task.title}`, r.note, taskPath(r.task.id, r.task.projectId));
      }

      // Mark sent so it fires exactly once.
      await prisma.reminder.update({
        where: { id: r.id },
        data: { sent: true, sentAt: new Date() },
      });
      console.log(`[reminders] fired ${r.id} → ${recipients.length} recipient(s)`);
    } catch (err) {
      // Leave sent=false so a later tick retries this one.
      console.error(`[reminders] failed ${r.id}:`, err);
    }
  }
}

async function main() {
  console.log(`[reminders] worker started (poll every ${INTERVAL_MS}ms)`);
  await tick().catch((e) => console.error("[reminders] tick error:", e));
  const timer = setInterval(
    () => tick().catch((e) => console.error("[reminders] tick error:", e)),
    INTERVAL_MS,
  );

  const stop = async () => {
    clearInterval(timer);
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

main();
