import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Standalone reminders worker (separate process from Next.js). Polls for due,
// unsent reminders and turns each into in-app notifications, then marks it sent.
// Catch-up safe: every tick processes ALL reminders whose time has passed, so a
// restart after downtime still delivers anything that came due meanwhile.

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
const INTERVAL_MS = Number(process.env.REMINDER_POLL_MS || 60_000);

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
            linkUrl: r.task.projectId
              ? `/projects/${r.task.projectId}/tasks/${r.task.id}`
              : null,
          })),
        });
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
