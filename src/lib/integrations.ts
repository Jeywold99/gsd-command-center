import "server-only";
import { prisma } from "./prisma";

export async function listApiKeys() {
  return prisma.apiKey.findMany({
    where: { revoked: false },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, lastUsedAt: true, createdAt: true },
  });
}
