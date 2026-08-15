import "server-only";
import { prisma } from "./prisma";

// Team roster for the Settings → Team page (safe columns only — no hashes).
export async function listTeam() {
  return prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export type TeamMember = Awaited<ReturnType<typeof listTeam>>[number];
