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

export async function createCredential(formData: FormData) {
  const session = await verifySession();
  const label = str(formData.get("label"));
  const password = rawPassword(formData);
  if (!label || !password) return;

  const scope = formData.get("scope") === "CLIENT" ? "CLIENT" : "INTERNAL";
  await prisma.credential.create({
    data: {
      label,
      scope,
      category: str(formData.get("category")),
      username: str(formData.get("username")),
      passwordEnc: encryptSecret(password),
      url: str(formData.get("url")),
      notes: str(formData.get("notes")),
      clientId: scope === "CLIENT" ? str(formData.get("clientId")) : null,
      createdById: session.userId,
    },
  });
  revalidatePath("/passwords");
}

export async function updateCredential(formData: FormData) {
  await verifySession();
  const id = str(formData.get("id"));
  const label = str(formData.get("label"));
  if (!id || !label) return;

  const scope = formData.get("scope") === "CLIENT" ? "CLIENT" : "INTERNAL";
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
    clientId: scope === "CLIENT" ? str(formData.get("clientId")) : null,
  };
  // Only replace the password when a new one is entered — blank means "keep".
  if (password) data.passwordEnc = encryptSecret(password);

  await prisma.credential.update({ where: { id }, data });
  revalidatePath("/passwords");
}

export async function deleteCredential(formData: FormData) {
  await verifySession();
  const id = str(formData.get("id"));
  if (!id) return;
  await prisma.credential.delete({ where: { id } });
  revalidatePath("/passwords");
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
