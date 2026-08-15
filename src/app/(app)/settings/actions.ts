"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { generateApiKey } from "@/lib/apikey";

// Returns the raw key ONCE — the client shows it and it's never retrievable again.
export async function createApiKey(name: string) {
  const session = await requireRole("OWNER", "MANAGER");
  const { raw, hash } = generateApiKey();
  const key = await prisma.apiKey.create({
    data: { name: name?.trim() || "n8n key", hashedKey: hash, createdById: session.userId },
  });
  revalidatePath("/settings");
  return { id: key.id, name: key.name, raw };
}

export async function revokeApiKey(id: string) {
  await requireRole("OWNER", "MANAGER");
  if (!id) return;
  await prisma.apiKey.update({ where: { id }, data: { revoked: true } });
  revalidatePath("/settings");
}
