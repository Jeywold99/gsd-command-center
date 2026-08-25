import "server-only";
import { prisma } from "./prisma";
import { computeClientHealthMap } from "./health";

export async function getDashboardData(userId: string) {
  const now = new Date();

  const [
    activeClients,
    leads,
    activeProjects,
    overdueTasks,
    myOpenTasks,
    recentNotes,
    activeProjectList,
    atRiskCandidates,
    healthMap,
  ] = await Promise.all([
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.client.count({ where: { status: "LEAD" } }),
    prisma.project.count({
      where: {
        status: "ACTIVE",
        OR: [{ clientId: null }, { client: { status: { not: "CHURNED" } } }],
      },
    }),
    prisma.task.count({
      where: {
        parentId: null,
        isArchived: false,
        status: { not: "DONE" },
        dueDate: { lt: now },
      },
    }),
    prisma.task.findMany({
      where: {
        parentId: null,
        isArchived: false,
        status: { not: "DONE" },
        assignees: { some: { userId } },
      },
      orderBy: [{ dueDate: "asc" }],
      take: 8,
      include: {
        project: {
          select: { id: true, name: true, client: { select: { companyName: true } } },
        },
      },
    }),
    prisma.clientNote.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        client: { select: { id: true, companyName: true } },
        author: { select: { name: true } },
      },
    }),
    prisma.project.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ clientId: null }, { client: { status: { not: "CHURNED" } } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        client: { select: { companyName: true, colorHex: true } },
        tasks: { where: { parentId: null }, select: { status: true } },
      },
    }),
    prisma.client.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, companyName: true, colorHex: true },
    }),
    computeClientHealthMap(),
  ]);

  const atRiskClients = atRiskCandidates
    .map((c) => {
      const h = healthMap.get(c.id);
      return h && h.health !== "GREEN" ? { ...c, health: h.health, reasons: h.reasons } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => (a.health === b.health ? 0 : a.health === "RED" ? -1 : 1))
    .slice(0, 5);

  return {
    activeClients,
    leads,
    activeProjects,
    overdueTasks,
    myOpenTasks,
    recentNotes,
    activeProjectList,
    atRiskClients,
  };
}

// Weekly income moved to lib/income.ts (getThisWeekIncome) — schedule-aware.
