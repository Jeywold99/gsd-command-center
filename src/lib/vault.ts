import "server-only";
import { prisma } from "./prisma";

export async function listDocuments(category?: string) {
  return prisma.document.findMany({
    where: { messageId: null, ...(category ? { category } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      uploadedBy: { select: { name: true } },
      client: { select: { companyName: true } },
      project: { select: { name: true } },
    },
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
