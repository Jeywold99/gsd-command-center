"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession, requireRole } from "@/lib/dal";
import { str, date } from "@/lib/forms";
import type { ClientFormState } from "@/lib/definitions";

// ── create ──
export async function createClient(
  _state: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await requireRole("OWNER", "MANAGER");

  const companyName = str(formData.get("companyName"));
  if (!companyName) return { error: "Company name is required." };

  const kind = formData.get("kind") === "LEAD" ? "LEAD" : "CLIENT";
  const status = kind === "LEAD" ? "LEAD" : (str(formData.get("status")) ?? "ACTIVE");
  const pipelineStage =
    kind === "LEAD" ? (str(formData.get("pipelineStage")) ?? "NEW") : null;

  const rateRaw = str(formData.get("billingRate"));
  const contactName = str(formData.get("contactName"));

  let clientId = "";
  await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        companyName,
        status: status as never,
        pipelineStage: pipelineStage as never,
        serviceType: str(formData.get("serviceType")),
        website: str(formData.get("website")),
        health: (str(formData.get("health")) as never) ?? null,
        colorHex: str(formData.get("colorHex")),
        startDate: date(formData.get("startDate")),
        renewalDate: date(formData.get("renewalDate")),
      },
    });
    clientId = client.id;

    if (rateRaw && !isNaN(Number(rateRaw))) {
      const session = await verifySession();
      await tx.billingRate.create({
        data: { clientId, rate: rateRaw, createdById: session.userId },
      });
    }

    if (contactName) {
      await tx.contact.create({
        data: {
          clientId,
          name: contactName,
          email: str(formData.get("contactEmail")),
          phone: str(formData.get("contactPhone")),
          isPrimary: true,
        },
      });
    }
  });

  revalidatePath("/crm");
  redirect(`/crm/${clientId}`);
}

// ── edit basic fields ──
export async function updateClient(
  _state: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await requireRole("OWNER", "MANAGER");
  const id = str(formData.get("id"));
  const companyName = str(formData.get("companyName"));
  if (!id) return { error: "Missing client id." };
  if (!companyName) return { error: "Company name is required." };

  await prisma.client.update({
    where: { id },
    data: {
      companyName,
      serviceType: str(formData.get("serviceType")),
      website: str(formData.get("website")),
      health: (str(formData.get("health")) as never) ?? null,
      colorHex: str(formData.get("colorHex")),
      startDate: date(formData.get("startDate")),
      renewalDate: date(formData.get("renewalDate")),
    },
  });

  revalidatePath(`/crm/${id}`);
  revalidatePath("/crm");
  redirect(`/crm/${id}`);
}

// ── status (Active / Paused / Churned) ──
export async function updateClientStatus(formData: FormData) {
  await requireRole("OWNER", "MANAGER");
  const id = str(formData.get("id"));
  const status = str(formData.get("status"));
  if (!id || !status) return;
  await prisma.client.update({ where: { id }, data: { status: status as never } });
  revalidatePath(`/crm/${id}`);
  revalidatePath("/crm");
}

// ── move a lead through the pipeline ──
export async function updateLeadStage(formData: FormData) {
  await requireRole("OWNER", "MANAGER");
  const id = str(formData.get("id"));
  const stage = str(formData.get("pipelineStage"));
  if (!id || !stage) return;
  await prisma.client.update({
    where: { id },
    data: { pipelineStage: stage as never },
  });
  revalidatePath(`/crm/${id}`);
  revalidatePath("/crm");
}

// ── convert a lead into an active client ──
export async function convertToClient(formData: FormData) {
  await requireRole("OWNER", "MANAGER");
  const id = str(formData.get("id"));
  if (!id) return;
  const existing = await prisma.client.findUnique({ where: { id } });
  await prisma.client.update({
    where: { id },
    data: {
      status: "ACTIVE",
      pipelineStage: null,
      startDate: existing?.startDate ?? new Date(),
    },
  });
  revalidatePath(`/crm/${id}`);
  revalidatePath("/crm");
}

// ── contacts ──
export async function addContact(formData: FormData) {
  await verifySession();
  const clientId = str(formData.get("clientId"));
  const name = str(formData.get("name"));
  if (!clientId || !name) return;
  await prisma.contact.create({
    data: {
      clientId,
      name,
      title: str(formData.get("title")),
      email: str(formData.get("email")),
      phone: str(formData.get("phone")),
      isPrimary: formData.get("isPrimary") === "on",
    },
  });
  revalidatePath(`/crm/${clientId}`);
}

// ── activity notes ──
export async function addNote(formData: FormData) {
  const session = await verifySession();
  const clientId = str(formData.get("clientId"));
  const body = str(formData.get("body"));
  if (!clientId || !body) return;
  await prisma.clientNote.create({
    data: { clientId, body, authorId: session.userId },
  });
  revalidatePath(`/crm/${clientId}`);
}

// ── billing rate (new dated entry) ──
export async function setBillingRate(formData: FormData) {
  const session = await requireRole("OWNER", "MANAGER");
  const clientId = str(formData.get("clientId"));
  const rate = str(formData.get("rate"));
  if (!clientId || !rate || isNaN(Number(rate))) return;
  await prisma.billingRate.create({
    data: {
      clientId,
      rate,
      note: str(formData.get("note")),
      createdById: session.userId,
    },
  });
  revalidatePath(`/crm/${clientId}`);
}
