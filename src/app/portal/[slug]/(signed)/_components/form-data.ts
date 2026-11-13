import "server-only";
import { listBusinesses, listTeamOwners, type PTask } from "@/lib/portal/data";
import { addMonths, monthLabel } from "@/lib/portal/shared";

// Everything the task form needs: businesses, team owners, a month list and
// the usual owner per business (whoever owns its most recent task).
export async function taskFormOptions(clientId: string, currentMonth: string, all: PTask[], include?: string) {
  const [businesses, owners] = await Promise.all([listBusinesses(clientId), listTeamOwners()]);
  const keys = new Set<string>();
  for (let n = -2; n <= 12; n++) keys.add(addMonths(currentMonth, n));
  if (include) keys.add(include);
  const months = [...keys].sort().map((key) => ({ key, label: monthLabel(key) }));

  const defaultOwners: Record<string, string> = {};
  const recent = [...all].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  for (const b of businesses) {
    const t = recent.find((x) => x.projectId === b.id && x.owner);
    if (t?.owner) defaultOwners[b.id] = t.owner.id;
  }
  return {
    businesses: businesses.map((b) => ({ id: b.id, name: b.name, workstreams: b.workstreams })),
    owners,
    months,
    defaultOwners,
  };
}
