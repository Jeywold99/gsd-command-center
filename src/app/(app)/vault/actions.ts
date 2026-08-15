"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { saveFile, removeFile } from "@/lib/storage";

export async function uploadDocument(formData: FormData) {
  const session = await verifySession();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const { storagePath, sizeBytes } = await saveFile(file);
  const projectId = (formData.get("projectId") as string) || null;

  await prisma.document.create({
    data: {
      name: file.name,
      storagePath,
      mimeType: file.type || "application/octet-stream",
      sizeBytes,
      category: ((formData.get("category") as string) || "").trim() || null,
      uploadedById: session.userId,
      clientId: (formData.get("clientId") as string) || null,
      projectId,
    },
  });

  revalidatePath("/vault");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function deleteDocument(formData: FormData) {
  await verifySession();
  const id = formData.get("id") as string;
  if (!id) return;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (doc) {
    await removeFile(doc.storagePath);
    await prisma.document.delete({ where: { id } });
    revalidatePath("/vault");
    if (doc.projectId) revalidatePath(`/projects/${doc.projectId}`);
  }
}
