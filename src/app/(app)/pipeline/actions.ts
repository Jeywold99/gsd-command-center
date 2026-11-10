"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getPipelineAccess } from "@/lib/pipeline/access";
import { fromInputLocal } from "@/lib/pipeline/format";
import { isUuid, sbRpc, userMessage } from "@/lib/pipeline/supabase";
import {
  ACTIVITY_TYPES,
  APPLIED_AS,
  PLATFORMS,
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
  STATUS_LABEL,
  isStatus,
  type ActionResult,
  type FormState,
  type Status,
  type Viewer,
} from "@/lib/pipeline/types";

// Every Pipeline write goes through here. Each action first re-checks that the caller is one of the two
// tracker people (a server action can be called directly, bypassing the layout), then calls a Supabase
// function that records the change under that person's name in the history.

async function gate(): Promise<{ viewer: Viewer } | { error: string }> {
  const access = await getPipelineAccess();
  if (access.kind === "ok") return { viewer: access.viewer };
  if (access.kind === "unavailable") return { error: access.reason };
  redirect("/");
}

const fail = (e: unknown): { ok: false; error: string } => ({ ok: false, error: userMessage(e) });
const failState = (e: unknown): FormState => ({ ok: false, error: userMessage(e) });
const refresh = () => revalidatePath("/pipeline", "layout");

function field(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

// ── status (board drag, status picker) ─────────────────────────────────────────────────────────────
export async function changeStatus(id: string, status: string): Promise<ActionResult> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };
  if (!isUuid(id)) return { ok: false, error: "Unknown application." };
  if (!isStatus(status)) return { ok: false, error: "Unknown status." };
  try {
    await sbRpc("update_application", { p_id: id, p_patch: { status }, p_actor: g.viewer.actor });
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true };
}

// ── edit details ────────────────────────────────────────────────────────────────────────────────────
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Too long (max ${max} characters).`)
    .transform((v) => (v === "" ? null : v));

const detailsSchema = z.object({
  id: z.string().refine(isUuid, "Unknown application."),
  company: optText(200),
  role: z.string().trim().min(1, "The role is required.").max(200, "The role is too long."),
  job_url: optText(2000).refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "The job link must start with http:// or https://"),
  platform: optText(40).refine((v) => v === null || (PLATFORMS as readonly string[]).includes(v), "Unknown platform."),
  applied_as: optText(40).refine((v) => v === null || (APPLIED_AS as readonly string[]).includes(v), "Unknown value for 'Applied as'."),
  rate_offered: optText(200),
  contact_name: optText(200),
  contact_email: optText(320).refine(
    (v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v),
    "That contact email does not look right.",
  ),
  company_domain: optText(200),
  next_action: optText(500),
  notes: optText(20000),
});

function cleanDomain(v: string | null): string | null {
  if (!v) return null;
  const d = v
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^@/, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");
  return d || null;
}

// A datetime-local / date field: "" means "clear it", a bad value is an error.
function dateField(fd: FormData, name: string, label: string): { value: string | null } | { error: string } {
  const raw = field(fd, name);
  if (!raw) return { value: null };
  const iso = fromInputLocal(raw);
  return iso ? { value: iso } : { error: `${label} is not a valid date.` };
}

export async function saveDetails(_prev: FormState, fd: FormData): Promise<FormState> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };

  const parsed = detailsSchema.safeParse({
    id: field(fd, "id"),
    company: field(fd, "company"),
    role: field(fd, "role"),
    job_url: field(fd, "job_url"),
    platform: field(fd, "platform"),
    applied_as: field(fd, "applied_as"),
    rate_offered: field(fd, "rate_offered"),
    contact_name: field(fd, "contact_name"),
    contact_email: field(fd, "contact_email"),
    company_domain: field(fd, "company_domain"),
    next_action: field(fd, "next_action"),
    notes: field(fd, "notes"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };

  const applied = dateField(fd, "applied_at", "The applied date");
  if ("error" in applied) return { ok: false, error: applied.error };
  const deadline = dateField(fd, "deadline", "The deadline");
  if ("error" in deadline) return { ok: false, error: deadline.error };
  const nextAt = dateField(fd, "next_action_at", "The next-action date");
  if ("error" in nextAt) return { ok: false, error: nextAt.error };

  const { id, ...v } = parsed.data;
  const patch = {
    company: v.company,
    role: v.role,
    job_url: v.job_url,
    platform: v.platform,
    applied_as: v.applied_as,
    rate_offered: v.rate_offered,
    contact_name: v.contact_name,
    contact_email: v.contact_email ? v.contact_email.toLowerCase() : null,
    company_domain: cleanDomain(v.company_domain),
    next_action: v.next_action,
    notes: v.notes,
    applied_at: applied.value,
    deadline: deadline.value,
    next_action_at: nextAt.value,
  };
  try {
    await sbRpc("update_application", { p_id: id, p_patch: patch, p_actor: g.viewer.actor });
  } catch (e) {
    return failState(e);
  }
  refresh();
  return { ok: true, message: "Saved." };
}

// ── requirements ────────────────────────────────────────────────────────────────────────────────────
export async function setRequirementStatus(id: string, status: string): Promise<ActionResult> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };
  if (!isUuid(id)) return { ok: false, error: "Unknown requirement." };
  if (!(REQUIREMENT_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Unknown status." };
  try {
    await sbRpc("set_requirement_status", { p_id: id, p_status: status, p_actor: g.viewer.actor });
  } catch (e) {
    return fail(e);
  }
  refresh();
  return { ok: true };
}

export async function addRequirement(_prev: FormState, fd: FormData): Promise<FormState> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };

  const applicationId = field(fd, "application_id");
  const type = field(fd, "type");
  const description = field(fd, "description");
  if (!isUuid(applicationId)) return { ok: false, error: "Unknown application." };
  if (!(REQUIREMENT_TYPES as readonly string[]).includes(type)) return { ok: false, error: "Pick what kind of requirement it is." };
  if (description.length > 1000) return { ok: false, error: "The description is too long." };
  const due = dateField(fd, "due_at", "The due date");
  if ("error" in due) return { ok: false, error: due.error };

  try {
    await sbRpc("add_requirement", {
      p_application: applicationId,
      p_type: type,
      p_description: description || null,
      p_due_at: due.value,
      p_actor: g.viewer.actor,
    });
  } catch (e) {
    return failState(e);
  }
  refresh();
  return { ok: true, message: "Added." };
}

// ── activity log ────────────────────────────────────────────────────────────────────────────────────
const DEFAULT_ACTIVITY_SUMMARY: Record<string, string> = {
  follow_up_sent: "Follow-up sent",
  email_sent: "Email sent",
  email_received: "Reply received",
  interview_scheduled: "Interview scheduled",
};

export async function logActivity(_prev: FormState, fd: FormData): Promise<FormState> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };

  const applicationId = field(fd, "application_id");
  const type = field(fd, "type");
  const summary = field(fd, "summary");
  if (!isUuid(applicationId)) return { ok: false, error: "Unknown application." };
  if (!ACTIVITY_TYPES.some((t) => t.value === type)) return { ok: false, error: "Pick what happened." };
  if (summary.length > 500) return { ok: false, error: "Keep it under 500 characters." };
  if (type === "note" && !summary) return { ok: false, error: "Write the note first." };

  try {
    await sbRpc("log_activity", {
      p_application: applicationId,
      p_type: type,
      p_summary: summary || DEFAULT_ACTIVITY_SUMMARY[type] || null,
      p_actor: g.viewer.actor,
    });
  } catch (e) {
    return failState(e);
  }
  refresh();
  return { ok: true, message: "Logged." };
}

// ── emails the watcher could not match ──────────────────────────────────────────────────────────────
type ResolveOutcome = {
  outcome?: string;
  company?: string;
  status_changed?: boolean;
  status_after?: string;
};

export async function resolveEmail(_prev: FormState, fd: FormData): Promise<FormState> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };

  const id = field(fd, "unmatched_id");
  const applicationId = field(fd, "application_id");
  if (!isUuid(id)) return { ok: false, error: "Unknown email." };
  if (!isUuid(applicationId)) return { ok: false, error: "Choose which application this email is about." };

  try {
    const out = await sbRpc<ResolveOutcome>("resolve_unmatched_email", {
      p_id: id,
      p_application: applicationId,
      p_actor: g.viewer.actor,
    });
    refresh();
    const moved =
      out?.status_changed && out.status_after && isStatus(out.status_after)
        ? `, status moved to ${STATUS_LABEL[out.status_after as Status]}`
        : "";
    return { ok: true, message: `Logged on ${out?.company ?? "the application"}${moved}.` };
  } catch (e) {
    return failState(e);
  }
}

export async function dismissEmail(_prev: FormState, fd: FormData): Promise<FormState> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };

  const id = field(fd, "unmatched_id");
  if (!isUuid(id)) return { ok: false, error: "Unknown email." };
  try {
    await sbRpc("dismiss_unmatched_email", { p_id: id, p_actor: g.viewer.actor });
  } catch (e) {
    return failState(e);
  }
  refresh();
  return { ok: true, message: "Dismissed." };
}
