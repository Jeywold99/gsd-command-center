"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { gateForAction } from "@/lib/pipeline/access";
import { CURRENCIES } from "@/lib/pipeline/handoff";
import { getApplication, getApplicationLinks, listRequirements } from "@/lib/pipeline/queries";
import { isUuid, sbRpc, userMessage } from "@/lib/pipeline/supabase";
import { REQUIREMENT_LABEL, type HandoffState } from "@/lib/pipeline/types";

// "Hired" -> a client and a project in the Command Center, with the open requirements as starter tasks.
// Writes the Command Center database first (one transaction), then links the ids back in the tracker.
// Safe to press twice: an existing client of the same name is reused, and if only the final link failed the
// retry reuses the client and project that were already created.

const num = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (!isNaN(Number(v)) && Number(v) >= min && Number(v) <= max), "Enter a valid number.");

const optUuid = z.string().trim().refine((v) => v === "" || isUuid(v), "Unknown id.");

const schema = z.object({
  id: z.string().refine(isUuid, "Unknown application."),
  companyName: z
    .string()
    .trim()
    .min(1, "Enter the company name.")
    .max(200, "The company name is too long.")
    .refine((v) => v.toLowerCase() !== "unnamed company", "Enter the real company name."),
  serviceType: z.string().trim().max(200),
  currency: z.string().trim().refine((v) => (CURRENCIES as readonly string[]).includes(v), "Unknown currency."),
  payFrequency: z.enum(["", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
  hourlyRate: num(0, 100_000),
  hoursPerWeek: num(0, 168),
  website: z.string().trim().max(200),
  contactName: z.string().trim().max(200),
  contactEmail: z
    .string()
    .trim()
    .max(320)
    .refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "That contact email does not look right."),
  projectName: z.string().trim().min(1, "Name the project.").max(200),
  startDate: z.string().trim().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "The start date is not valid."),
  createTasks: z.string().optional(),
  reuseClientId: optUuid,
  retryClientId: optUuid,
  retryProjectId: optUuid,
});

function f(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

export async function createClientAndProject(_prev: HandoffState, fd: FormData): Promise<HandoffState> {
  const g = await gateForAction();
  if ("error" in g) return { ok: false, error: g.error };

  // Creating clients in the Command Center is an owner/manager job everywhere else, so it is here too.
  const session = await verifySession();
  if (session.role !== "OWNER" && session.role !== "MANAGER") {
    return { ok: false, error: "Only an owner or manager can create clients and projects." };
  }

  const parsed = schema.safeParse({
    id: f(fd, "id"),
    companyName: f(fd, "companyName"),
    serviceType: f(fd, "serviceType"),
    currency: f(fd, "currency"),
    payFrequency: f(fd, "payFrequency"),
    hourlyRate: f(fd, "hourlyRate"),
    hoursPerWeek: f(fd, "hoursPerWeek"),
    website: f(fd, "website"),
    contactName: f(fd, "contactName"),
    contactEmail: f(fd, "contactEmail"),
    projectName: f(fd, "projectName"),
    startDate: f(fd, "startDate"),
    createTasks: fd.get("createTasks") ? "on" : undefined,
    reuseClientId: f(fd, "reuseClientId"),
    retryClientId: f(fd, "retryClientId"),
    retryProjectId: f(fd, "retryProjectId"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;

  try {
    const app = await getApplication(d.id);
    if (!app) return { ok: false, error: "That application no longer exists." };
    if (app.status !== "hired") return { ok: false, error: "Mark the application as Hired first." };
    const links = await getApplicationLinks(d.id);
    if (links.clientId) return { ok: false, error: "This application is already linked to a client." };

    let clientId = "";
    let projectId = "";
    let note = "";

    if (d.retryClientId && d.retryProjectId) {
      // An earlier attempt created these and only the final link failed: reuse them.
      const [c, p] = await Promise.all([
        prisma.client.findUnique({ where: { id: d.retryClientId }, select: { id: true } }),
        prisma.project.findUnique({ where: { id: d.retryProjectId }, select: { id: true } }),
      ]);
      if (!c || !p) return { ok: false, error: "The client or project from the earlier attempt no longer exists. Reload the page and try again." };
      clientId = c.id;
      projectId = p.id;
    } else {
      const open = d.createTasks
        ? (await listRequirements(d.id)).filter((r) => r.status === "needed" || r.status === "in_progress")
        : [];
      const start = d.startDate ? new Date(`${d.startDate}T00:00:00Z`) : new Date();
      const rate = d.hourlyRate ? Number(d.hourlyRate) : null;
      const hours = d.hoursPerWeek ? Number(d.hoursPerWeek) : null;

      const out = await prisma.$transaction(async (tx) => {
        let client = d.reuseClientId ? await tx.client.findUnique({ where: { id: d.reuseClientId } }) : null;
        const reused = Boolean(client);
        if (!client) {
          client = await tx.client.create({
            data: {
              companyName: d.companyName,
              status: "ACTIVE",
              serviceType: d.serviceType || null,
              currency: d.currency,
              payFrequency: d.payFrequency || null,
              website: d.website || null,
              startDate: start,
            },
          });
          if (rate != null || hours != null) {
            await tx.billingRate.create({
              data: {
                clientId: client.id,
                type: "HOURLY",
                rate,
                hoursPerWeek: hours,
                note: "From the job application",
                createdById: session.userId,
              },
            });
          }
          if (d.contactName) {
            await tx.contact.create({
              data: {
                clientId: client.id,
                name: d.contactName,
                email: d.contactEmail || null,
                isPrimary: true,
              },
            });
          }
        }

        const project = await tx.project.create({
          data: {
            name: d.projectName,
            description: `Created from the job application "${app.role}" at ${app.company}.${app.job_url ? `\nJob post: ${app.job_url}` : ""}`,
            clientId: client.id,
            status: "ACTIVE",
            startDate: start,
          },
        });

        if (open.length) {
          await tx.task.createMany({
            data: open.map((r) => ({
              title: `${REQUIREMENT_LABEL[r.type] ?? r.type}${r.description ? `: ${r.description}` : ""}`.slice(0, 180),
              description: r.description,
              status: "TODO" as const,
              priority: "MEDIUM" as const,
              projectId: project.id,
              dueDate: r.due_at ? new Date(r.due_at) : null,
              createdById: session.userId,
            })),
          });
        }
        return { clientId: client.id, projectId: project.id, reused, tasks: open.length };
      });

      clientId = out.clientId;
      projectId = out.projectId;
      note = `${out.reused ? "Used your existing client" : "Created the client"}, created the project${out.tasks ? ` and ${out.tasks} task${out.tasks === 1 ? "" : "s"}` : ""}.`;
    }

    try {
      await sbRpc("link_application_handoff", {
        p_id: d.id,
        p_client: clientId,
        p_project: projectId,
        p_actor: g.viewer.actor,
      });
    } catch (e) {
      return {
        ok: false,
        error: `The client and project were created in the Command Center, but linking them back to the tracker failed: ${userMessage(e)} Press the button again to finish; nothing will be duplicated.`,
        partial: { clientId, projectId },
      };
    }

    revalidatePath("/pipeline", "layout");
    revalidatePath("/crm");
    revalidatePath("/projects");
    return { ok: true, message: note || "Linked." };
  } catch (e) {
    console.error("[pipeline] handoff failed:", e);
    return { ok: false, error: userMessage(e) };
  }
}
