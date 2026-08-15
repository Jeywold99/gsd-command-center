import "server-only";
import { prisma } from "./prisma";

// ── CRM reads (server components call these directly) ──

// Active/paused/churned clients (everything that isn't a lead).
export async function listClients() {
  return prisma.client.findMany({
    where: { status: { in: ["ACTIVE", "PAUSED", "CHURNED"] } },
    orderBy: [{ status: "asc" }, { companyName: "asc" }],
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
