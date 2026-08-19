import "server-only";
import { prisma } from "./prisma";

// List vault credentials WITHOUT the encrypted password — the plaintext is only
// ever produced by the reveal action, so it never rides along in a page payload.
export async function listCredentials(scope?: "INTERNAL" | "CLIENT") {
  return prisma.credential.findMany({
    where: scope ? { scope } : {},
    orderBy: [{ label: "asc" }],
    select: {
      id: true,
      label: true,
      scope: true,
      category: true,
      username: true,
      url: true,
      notes: true,
      clientId: true,
      client: { select: { id: true, companyName: true, colorHex: true } },
      createdBy: { select: { name: true } },
      updatedAt: true,
    },
  });
}

export type CredentialListItem = Awaited<ReturnType<typeof listCredentials>>[number];
