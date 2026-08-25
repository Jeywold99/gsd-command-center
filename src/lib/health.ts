import "server-only";
import { prisma } from "./prisma";

export type ComputedHealth = {
  health: "GREEN" | "YELLOW" | "RED";
  reasons: string[];
  isOverride: boolean; // true = the client's manual `health` field is set
};

const DAY = 86_400_000;

// Signal thresholds — tune here, nowhere else.
const OVERDUE_RED = 3; // 3+ overdue (non-done, top-level) tasks
const OVERDUE_YELLOW = 1; // 1-2 overdue
const STALE_RED_DAYS = 30; // no activity in 30+ days
const STALE_YELLOW_DAYS = 14; // no activity in 14-29 days
const NEW_CLIENT_GRACE_DAYS = 7; // don't flag "no activity" for a brand-new client
const RENEWAL_SOON_DAYS = 14; // renewal within 14 days, heads-up

// Auto-computed client health for every ACTIVE/PAUSED client, in a handful of
// batched queries (not one query per client). A client's manual `health`
// field — if set — overrides the computed value entirely; that's the escape
// hatch for context the system can't see ("they're quiet but that's normal").
export async function computeClientHealthMap(): Promise<Map<string, ComputedHealth>> {
  const now = new Date();
  const clients = await prisma.client.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] } },
    select: { id: true, health: true, renewalDate: true, createdAt: true },
  });
  if (clients.length === 0) return new Map();
  const clientIds = clients.map((c) => c.id);

  const [overdueTasks, lastNotes, lastProjects, taskActivity] = await Promise.all([
    prisma.task.findMany({
      where: {
        parentId: null,
        isArchived: false,
        status: { not: "DONE" },
        dueDate: { lt: now },
        project: { clientId: { in: clientIds } },
      },
      select: { project: { select: { clientId: true } } },
    }),
    prisma.clientNote.groupBy({
      by: ["clientId"],
      where: { clientId: { in: clientIds } },
      _max: { createdAt: true },
    }),
    prisma.project.groupBy({
      by: ["clientId"],
      where: { clientId: { in: clientIds } },
      _max: { updatedAt: true },
    }),
    prisma.task.findMany({
      where: { parentId: null, isArchived: false, project: { clientId: { in: clientIds } } },
      select: { updatedAt: true, project: { select: { clientId: true } } },
    }),
  ]);

  const overdueCount = new Map<string, number>();
  for (const t of overdueTasks) {
    const cid = t.project?.clientId;
    if (!cid) continue;
    overdueCount.set(cid, (overdueCount.get(cid) ?? 0) + 1);
  }

  const lastActivity = new Map<string, Date>();
  const bump = (id: string | null | undefined, d: Date | null | undefined) => {
    if (!id || !d) return;
    const cur = lastActivity.get(id);
    if (!cur || d > cur) lastActivity.set(id, d);
  };
  for (const n of lastNotes) bump(n.clientId, n._max.createdAt);
  for (const p of lastProjects) bump(p.clientId, p._max.updatedAt);
  for (const t of taskActivity) bump(t.project?.clientId, t.updatedAt);

  const result = new Map<string, ComputedHealth>();
  for (const c of clients) {
    if (c.health) {
      const label = c.health.charAt(0) + c.health.slice(1).toLowerCase();
      result.set(c.id, {
        health: c.health as ComputedHealth["health"],
        reasons: [`Manually set to ${label}`],
        isOverride: true,
      });
      continue;
    }

    const reasons: string[] = [];
    let level: 0 | 1 | 2 = 0; // 0 green, 1 yellow, 2 red

    const overdue = overdueCount.get(c.id) ?? 0;
    if (overdue >= OVERDUE_RED) {
      level = Math.max(level, 2) as 0 | 1 | 2;
      reasons.push(`${overdue} overdue tasks`);
    } else if (overdue >= OVERDUE_YELLOW) {
      level = Math.max(level, 1) as 0 | 1 | 2;
      reasons.push(`${overdue} overdue task${overdue > 1 ? "s" : ""}`);
    }

    const last = lastActivity.get(c.id);
    const clientAgeDays = Math.floor((now.getTime() - c.createdAt.getTime()) / DAY);
    if (!last) {
      if (clientAgeDays > NEW_CLIENT_GRACE_DAYS) {
        level = Math.max(level, 1) as 0 | 1 | 2;
        reasons.push("No recorded activity yet");
      }
    } else {
      const daysSince = Math.floor((now.getTime() - last.getTime()) / DAY);
      if (daysSince >= STALE_RED_DAYS) {
        level = Math.max(level, 2) as 0 | 1 | 2;
        reasons.push(`No activity in ${daysSince} days`);
      } else if (daysSince >= STALE_YELLOW_DAYS) {
        level = Math.max(level, 1) as 0 | 1 | 2;
        reasons.push(`No activity in ${daysSince} days`);
      }
    }

    if (c.renewalDate) {
      const daysToRenewal = Math.floor((c.renewalDate.getTime() - now.getTime()) / DAY);
      if (daysToRenewal >= 0 && daysToRenewal <= RENEWAL_SOON_DAYS) {
        level = Math.max(level, 1) as 0 | 1 | 2;
        reasons.push(`Renewal in ${daysToRenewal} day${daysToRenewal === 1 ? "" : "s"}`);
      }
    }

    result.set(c.id, {
      health: level === 2 ? "RED" : level === 1 ? "YELLOW" : "GREEN",
      reasons: reasons.length ? reasons : ["No issues detected"],
      isOverride: false,
    });
  }
  return result;
}
