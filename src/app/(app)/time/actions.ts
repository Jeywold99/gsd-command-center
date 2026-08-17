"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

async function stopRunning(userId: string) {
  const running = await prisma.timeEntry.findFirst({
    where: { userId, endedAt: null },
  });
  if (running) {
    const endedAt = new Date();
    await prisma.timeEntry.update({
      where: { id: running.id },
      data: {
        endedAt,
        durationSeconds: Math.max(
          1,
          Math.round((endedAt.getTime() - running.startedAt.getTime()) / 1000),
        ),
      },
    });
  }
}

export async function startTimer(formData: FormData) {
  const session = await verifySession();
  const projectId = (formData.get("projectId") as string) || null;
  if (!projectId) return;
  await stopRunning(session.userId); // one running timer per user
  await prisma.timeEntry.create({
    data: {
      userId: session.userId,
      projectId,
      startedAt: new Date(),
      source: "TIMER",
      note: (formData.get("note") as string) || null,
    },
  });
  revalidatePath("/time");
}

export async function stopTimer() {
  const session = await verifySession();
  await stopRunning(session.userId);
  revalidatePath("/time");
  revalidatePath("/timesheet");
}

// Global "clock in" from the top nav — tracks timed work with no project/task
// attached. Reuses the one-running-timer-per-user rule; stop with stopTimer.
export async function clockIn() {
  const session = await verifySession();
  await stopRunning(session.userId);
  await prisma.timeEntry.create({
    data: {
      userId: session.userId,
      startedAt: new Date(),
      source: "TIMER",
    },
  });
  revalidatePath("/time");
  revalidatePath("/timesheet");
}

export async function addManualEntry(formData: FormData) {
  const session = await verifySession();
  const projectId = (formData.get("projectId") as string) || null;
  const hours = parseFloat((formData.get("hours") as string) || "0");
  const dateStr = (formData.get("date") as string) || "";
  if (!projectId || !hours || hours <= 0) return;

  const day = dateStr ? new Date(dateStr) : new Date();
  day.setHours(12, 0, 0, 0);
  const durationSeconds = Math.round(hours * 3600);

  await prisma.timeEntry.create({
    data: {
      userId: session.userId,
      projectId,
      startedAt: day,
      endedAt: new Date(day.getTime() + durationSeconds * 1000),
      durationSeconds,
      source: "MANUAL",
      billable: formData.get("billable") === "on",
      note: (formData.get("note") as string) || null,
    },
  });
  revalidatePath("/time");
  revalidatePath("/timesheet");
}

export async function deleteEntry(formData: FormData) {
  await verifySession();
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.timeEntry.delete({ where: { id } });
  revalidatePath("/time");
  revalidatePath("/timesheet");
}
