import "server-only";
import { prisma } from "./prisma";

export type SearchResult = {
  type: "client" | "project" | "task" | "document";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  colorHex: string | null;
};

const LIMIT_EACH = 5;

// Global search across the four things people actually go looking for.
// Respects the same "hidden" rules as everywhere else in the app: churned
// clients, archived projects/tasks, and chat-attachment/task-media documents
// (vault-only) never show up here either.
export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const insensitive = { contains: q, mode: "insensitive" as const };

  const [clients, projects, tasks, documents] = await Promise.all([
    prisma.client.findMany({
      where: { status: { in: ["ACTIVE", "PAUSED", "LEAD"] }, companyName: insensitive },
      take: LIMIT_EACH,
      select: { id: true, companyName: true, colorHex: true, status: true },
    }),
    prisma.project.findMany({
      where: {
        status: { not: "ARCHIVED" },
        name: insensitive,
        OR: [{ clientId: null }, { client: { status: { not: "CHURNED" } } }],
      },
      take: LIMIT_EACH,
      select: { id: true, name: true, client: { select: { companyName: true, colorHex: true } } },
    }),
    prisma.task.findMany({
      where: {
        isArchived: false,
        title: insensitive,
        project: {
          OR: [{ clientId: null }, { client: { status: { not: "CHURNED" } } }],
        },
      },
      take: LIMIT_EACH,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        projectId: true,
        project: { select: { name: true, client: { select: { companyName: true, colorHex: true } } } },
      },
    }),
    prisma.document.findMany({
      where: { isArchived: false, messageId: null, taskId: null, name: insensitive },
      take: LIMIT_EACH,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, category: true, client: { select: { companyName: true } } },
    }),
  ]);

  const results: SearchResult[] = [
    ...clients.map((c) => ({
      type: "client" as const,
      id: c.id,
      title: c.companyName,
      subtitle: c.status === "LEAD" ? "Lead" : "Client",
      href: `/crm/${c.id}`,
      colorHex: c.colorHex,
    })),
    ...projects.map((p) => ({
      type: "project" as const,
      id: p.id,
      title: p.name,
      subtitle: p.client?.companyName ?? "Internal",
      href: `/projects/${p.id}`,
      colorHex: p.client?.colorHex ?? null,
    })),
    ...tasks.map((t) => ({
      type: "task" as const,
      id: t.id,
      title: t.title,
      subtitle: t.project ? `${t.project.client?.companyName ? `${t.project.client.companyName} · ` : ""}${t.project.name}` : "Inbox",
      href: t.projectId ? `/projects/${t.projectId}/tasks/${t.id}` : "/tasks",
      colorHex: t.project?.client?.colorHex ?? null,
    })),
    ...documents.map((d) => ({
      type: "document" as const,
      id: d.id,
      title: d.name,
      subtitle: d.client?.companyName ?? d.category ?? "Vault",
      href: `/vault`,
      colorHex: null,
    })),
  ];

  return results;
}
