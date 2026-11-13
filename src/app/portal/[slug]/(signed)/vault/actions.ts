"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveFile, removeFile } from "@/lib/storage";
import { requirePortal, logAccess } from "@/lib/portal/dal";

export type VaultFormState = { error?: string; ok?: string } | undefined;

const MAX_BYTES = 50 * 1024 * 1024;

function str(v: FormDataEntryValue | null) {
  const t = typeof v === "string" ? v.trim() : "";
  return t || null;
}

async function ownBusiness(clientId: string, id: string | null) {
  if (!id) return null;
  return prisma.project.findFirst({ where: { id, clientId, portalShort: { not: null } }, select: { id: true } });
}

export async function uploadPortalDocument(_s: VaultFormState, formData: FormData): Promise<VaultFormState> {
  const ctx = await requirePortal();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > MAX_BYTES) return { error: "That file is over 50 MB. Share a link to it instead." };

  const business = await ownBusiness(ctx.client.id, str(formData.get("projectId")));
  if (!business) return { error: "Pick which business it belongs to." };
  const taskId = str(formData.get("taskId"));
  const task = taskId
    ? await prisma.task.findFirst({ where: { id: taskId, project: { clientId: ctx.client.id } }, select: { id: true } })
    : null;
  const expires = str(formData.get("expiresAt"));

  const { storagePath, sizeBytes } = await saveFile(file);
  await prisma.document.create({
    data: {
      name: file.name,
      storagePath,
      sizeBytes,
      mimeType: file.type || "application/octet-stream",
      category: str(formData.get("category")),
      uploadedById: ctx.user.id,
      clientId: ctx.client.id,
      projectId: business.id,
      taskId: task?.id ?? null,
      portalVisibility: "SHARED",
      expiresAt: expires && /^\d{4}-\d{2}-\d{2}$/.test(expires) ? new Date(`${expires}T00:00:00Z`) : null,
    },
  });
  await logAccess(ctx, "uploaded", file.name);
  revalidatePath("/portal/[slug]", "layout");
  return { ok: `Uploaded ${file.name}.` };
}

export async function deletePortalDocument(formData: FormData) {
  const ctx = await requirePortal();
  const id = String(formData.get("id") ?? "");
  const doc = await prisma.document.findFirst({
    where: { id, clientId: ctx.client.id, portalVisibility: { not: null } },
  });
  if (doc) {
    await prisma.document.delete({ where: { id } });
    await removeFile(doc.storagePath).catch(() => {});
    await logAccess(ctx, "deleted", doc.name);
  }
  redirect("/vault");
}

export async function savePortalLogin(_s: VaultFormState, formData: FormData): Promise<VaultFormState> {
  const ctx = await requirePortal();
  const id = str(formData.get("id"));
  const service = str(formData.get("service"));
  const sharedWith = str(formData.get("sharedWith"));
  if (!service) return { error: "Name the service, e.g. LinkedIn company page." };
  if (!sharedWith) return { error: "Say who has access, e.g. Nathan, Jana." };
  const business = await ownBusiness(ctx.client.id, str(formData.get("projectId")));
  const url = str(formData.get("url"));
  if (url && !/^https?:\/\//i.test(url)) return { error: "The password-manager link must start with https://" };
  const changed = str(formData.get("lastChangedAt"));
  const data = {
    service,
    sharedWith,
    projectId: business?.id ?? null,
    twoFactor: formData.get("twoFactor") === "on",
    url,
    lastChangedAt: changed && /^\d{4}-\d{2}-\d{2}$/.test(changed) ? new Date(`${changed}T00:00:00Z`) : null,
  };
  if (id) {
    const existing = await prisma.portalLogin.findFirst({ where: { id, clientId: ctx.client.id } });
    if (!existing) return { error: "That login isn't in this Command Center." };
    await prisma.portalLogin.update({ where: { id }, data });
    await logAccess(ctx, "updated login details", service);
  } else {
    await prisma.portalLogin.create({ data: { ...data, clientId: ctx.client.id } });
    await logAccess(ctx, "added login details", service);
  }
  redirect("/vault?tab=logins");
}

export async function deletePortalLogin(formData: FormData) {
  const ctx = await requirePortal();
  const id = String(formData.get("id") ?? "");
  const row = await prisma.portalLogin.findFirst({ where: { id, clientId: ctx.client.id } });
  if (row) {
    await prisma.portalLogin.delete({ where: { id } });
    await logAccess(ctx, "removed login details", row.service);
  }
  redirect("/vault?tab=logins");
}

// "Open" a login: records it in the access log, then hands off to the password
// manager (which asks for its own verification). The password never passes here.
export async function openPortalLogin(formData: FormData) {
  const ctx = await requirePortal();
  const id = String(formData.get("id") ?? "");
  const row = await prisma.portalLogin.findFirst({ where: { id, clientId: ctx.client.id } });
  if (!row?.url) redirect("/vault?tab=logins");
  await logAccess(ctx, "opened", row.service);
  redirect(row.url);
}
