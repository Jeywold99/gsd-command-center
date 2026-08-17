import "server-only";
import { prisma } from "./prisma";

// The Vault is the deliberate document library: files uploaded directly here or
// into a project folder. Task-owned files (Notes/attachments, taskId set) and
// chat attachments (messageId set) are scoped to their task/message and excluded.
const VAULT_SCOPE = { messageId: null, taskId: null } as const;

export async function listDocuments(opts?: { category?: string; clientId?: string }) {
  return prisma.document.findMany({
    where: {
      ...VAULT_SCOPE,
      ...(opts?.category ? { category: opts.category } : {}),
      ...(opts?.clientId ? { clientId: opts.clientId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { name: true } },
      client: { select: { companyName: true } },
      project: { select: { name: true } },
    },
  });
}

// Clients that have at least one vault document — powers the "per client" filter.
export async function listClientsWithDocuments() {
  return prisma.client.findMany({
    where: { documents: { some: VAULT_SCOPE } },
    select: { id: true, companyName: true },
    orderBy: { companyName: "asc" },
  });
}

export async function listCategories() {
  const rows = await prisma.document.findMany({
    where: { ...VAULT_SCOPE, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category).filter((c): c is string => !!c);
}
