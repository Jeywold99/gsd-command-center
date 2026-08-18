import "server-only";
import { prisma } from "./prisma";

// ── CRM reads (server components call these directly) ──

// Active/paused clients (the working roster — leads and churned are separate views).
export async function listClients() {
  return prisma.client.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED"] } },
    orderBy: [{ status: "asc" }, { companyName: "asc" }],
    include: {
      contacts: { where: { isPrimary: true }, take: 1 },
      billingRates: { orderBy: { effectiveFrom: "desc" }, take: 1 },
      _count: { select: { projects: true } },
    },
  });
}

// Churned clients — kept for the record, shown in their own CRM view.
export async function listChurnedClients() {
  return prisma.client.findMany({
    where: { status: "CHURNED" },
    orderBy: { companyName: "asc" },
    include: {
      contacts: { where: { isPrimary: true }, take: 1 },
      billingRates: { orderBy: { effectiveFrom: "desc" }, take: 1 },
      _count: { select: { projects: true } },
    },
  });
}

// Leads, grouped-ready (ordered for the pipeline board).
export async function listLeads() {
  return prisma.client.findMany({
    where: { status: "LEAD" },
    orderBy: { updatedAt: "desc" },
    include: {
      contacts: { take: 1 },
      billingRates: { orderBy: { effectiveFrom: "desc" }, take: 1 },
    },
  });
}

export async function getClientById(id: string) {
  return prisma.client.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
      billingRates: {
        orderBy: { effectiveFrom: "desc" },
        include: { createdBy: { select: { name: true } } },
      },
      projects: { orderBy: { createdAt: "desc" } },
    },
  });
}
