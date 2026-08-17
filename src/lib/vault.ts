import "server-only";
import { prisma } from "./prisma";

export async function listDocuments(opts?: { category?: string; clientId?: string }) {
  return prisma.document.findMany({
    where: {
      messageId: null,
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
    where: { documents: { some: { messageId: null } } },
    select: { id: true, companyName: true },
    orderBy: { companyName: "asc" },
  });
}

export async function listCategories() {
  const rows = await prisma.document.findMany({
    where: { messageId: null, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category).filter((c): c is string => !!c);
}
