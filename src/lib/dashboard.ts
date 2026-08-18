import "server-only";
import { prisma } from "./prisma";

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
    atRiskClients,
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
      where: { status: "ACTIVE", health: { in: ["RED", "YELLOW"] } },
      orderBy: { health: "asc" },
      take: 5,
      select: { id: true, companyName: true, health: true, colorHex: true },
    }),
  ]);

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

export type WeeklyIncomeRow = {
  id: string;
  companyName: string;
  colorHex: string | null;
  billingType: "HOURLY" | "FIXED" | null;
  rate: number | null;
  hoursPerWeek: number | null;
  payFrequency: string | null;
  // Computed income for a single week; null when it can't be computed yet.
  weekly: number | null;
};

// Number of weeks in one pay period (used to convert a FIXED retainer, which is
// quoted per pay period, into a weekly figure).
function weeksPerPeriod(freq: string | null): number {
  switch (freq) {
    case "BIWEEKLY":
      return 2;
    case "MONTHLY":
      return 52 / 12; // ≈ 4.333
    default:
      return 1; // WEEKLY or unset
  }
}

// Projected weekly income per active client, plus the team total.
//  · HOURLY  → hourly rate × agreed hours/week
//  · FIXED   → retainer normalised to a weekly amount by pay frequency
export async function getWeeklyIncome(): Promise<{
  rows: WeeklyIncomeRow[];
  total: number;
}> {
  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    orderBy: { companyName: "asc" },
    select: {
      id: true,
      companyName: true,
      colorHex: true,
      payFrequency: true,
      billingRates: {
        orderBy: { effectiveFrom: "desc" },
        take: 1,
        select: { type: true, rate: true, hoursPerWeek: true },
      },
    },
  });

  const rows: WeeklyIncomeRow[] = clients.map((c) => {
    const b = c.billingRates[0];
    const rate = b?.rate != null ? Number(b.rate) : null;
    const hoursPerWeek = b?.hoursPerWeek != null ? Number(b.hoursPerWeek) : null;
    const billingType = (b?.type as "HOURLY" | "FIXED" | undefined) ?? null;

    let weekly: number | null = null;
    if (billingType === "HOURLY") {
      weekly = rate != null && hoursPerWeek != null ? rate * hoursPerWeek : null;
    } else if (billingType === "FIXED") {
      weekly = rate != null ? rate / weeksPerPeriod(c.payFrequency) : null;
    }

    return {
      id: c.id,
      companyName: c.companyName,
      colorHex: c.colorHex,
      billingType,
      rate,
      hoursPerWeek,
      payFrequency: c.payFrequency,
      weekly,
    };
  });

  const total = rows.reduce((sum, r) => sum + (r.weekly ?? 0), 0);
  return { rows, total };
}
