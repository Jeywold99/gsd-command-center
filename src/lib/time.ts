import "server-only";
import { prisma } from "./prisma";

export async function getRunningEntry(userId: string) {
  return prisma.timeEntry.findFirst({
    where: { userId, endedAt: null },
    orderBy: { startedAt: "desc" },
    include: {
      project: { select: { id: true, name: true, client: { select: { companyName: true } } } },
    },
  });
}

export async function listEntries(userId: string, from: Date, to: Date) {
  return prisma.timeEntry.findMany({
    where: { userId, startedAt: { gte: from, lte: to }, endedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          client: { select: { id: true, companyName: true } },
        },
      },
    },
  });
}

// Excludes archived projects AND projects whose client has churned — those are
// treated as archived too and shouldn't be pickable anywhere (New Task,
// starting a timer, creating a project channel, etc).
export async function listProjectOptions() {
  return prisma.project.findMany({
    where: {
      status: { not: "ARCHIVED" },
      OR: [{ clientId: null }, { client: { status: { not: "CHURNED" } } }],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      client: { select: { id: true, companyName: true } },
    },
  });
}

// Monday 00:00 of the week containing `d`.
export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x;
}

export function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
