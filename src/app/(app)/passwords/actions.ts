"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { str } from "@/lib/forms";
import { encryptSecret, decryptSecret } from "@/lib/secrets";

// The raw password value (do NOT trim — passwords can have meaningful spaces).
function rawPassword(formData: FormData): string {
  const v = formData.get("password");
  return typeof v === "string" ? v : "";
}

// /passwords/client/[id] uses "internal" for the no-client bucket; every other
// route segment is a real client id.
function clientRevalidatePath(clientId: string | null): string {
  return `/passwords/client/${clientId ?? "internal"}`;
}

export async function createCredential(formData: FormData) {
  const session = await verifySession();
  const label = str(formData.get("label"));
  const password = rawPassword(formData);
  const scope = formData.get("scope") === "CLIENT" ? "CLIENT" : "INTERNAL";
  const clientId = scope === "CLIENT" ? str(formData.get("clientId")) : null;
  // A "Client" credential without an actual client would be orphaned — it
  // couldn't show up under any client's page, only be findable by luck.
  if (!label || !password || (scope === "CLIENT" && !clientId)) return;

  await prisma.credential.create({
    data: {
      label,
      scope,
      category: str(formData.get("category")),
      username: str(formData.get("username")),
      passwordEnc: encryptSecret(password),
      url: str(formData.get("url")),
      notes: str(formData.get("notes")),
      clientId,
      createdById: session.userId,
    },
  });
  revalidatePath("/passwords");
  revalidatePath(clientRevalidatePath(clientId));
}

export async function updateCredential(formData: FormData) {
  await verifySession();
  const id = str(formData.get("id"));
  const label = str(formData.get("label"));
  const scope = formData.get("scope") === "CLIENT" ? "CLIENT" : "INTERNAL";
  const clientId = scope === "CLIENT" ? str(formData.get("clientId")) : null;
  if (!id || !label || (scope === "CLIENT" && !clientId)) return;

  const before = await prisma.credential.findUnique({ where: { id }, select: { clientId: true } });
  const password = rawPassword(formData);

  const data: {
    label: string;
    scope: "INTERNAL" | "CLIENT";
    category: string | null;
    username: string | null;
    url: string | null;
    notes: string | null;
    clientId: string | null;
    passwordEnc?: string;
  } = {
    label,
    scope,
    category: str(formData.get("category")),
    username: str(formData.get("username")),
    url: str(formData.get("url")),
    notes: str(formData.get("notes")),
    clientId,
  };
  // Only replace the password when a new one is entered — blank means "keep".
  if (password) data.passwordEnc = encryptSecret(password);

  await prisma.credential.update({ where: { id }, data });
  revalidatePath("/passwords");
  revalidatePath(clientRevalidatePath(clientId));
  // Moved to a different client (or to/from Internal) — the page it used to
  // live on needs to drop it too.
  if (before && before.clientId !== clientId) revalidatePath(clientRevalidatePath(before.clientId));
}

export async function deleteCredential(formData: FormData) {
  await verifySession();
  const id = str(formData.get("id"));
  if (!id) return;
  const cred = await prisma.credential.delete({ where: { id }, select: { clientId: true } });
  revalidatePath("/passwords");
  revalidatePath(clientRevalidatePath(cred.clientId));
}

// Decrypt and return one credential's password — server-side, on demand only.
export async function revealPassword(id: string): Promise<string> {
  await verifySession();
  const cred = await prisma.credential.findUnique({
    where: { id },
    select: { passwordEnc: true },
  });
  if (!cred) throw new Error("Credential not found.");
  return decryptSecret(cred.passwordEnc);
}
