import "server-only";
import { PipelineError } from "./supabase";
import { toInputLocal } from "./format";
import { emptyDraft, type Draft } from "./draft";
import { PLATFORMS, REQUIREMENT_TYPES } from "./types";

// Reads a job post with the n8n intake workflow in PREVIEW mode: it extracts company, role, rate, deadline,
// contact and requirements with the AI and returns them WITHOUT saving anything. The Command Center shows the
// result for review and saves it itself.
//
// Env (Pi .env, passed through docker-compose.yml):
//   N8N_INTAKE_URL    the workflow's production webhook, e.g. http://192.168.100.26:5678/webhook/job-intake
//   N8N_INTAKE_TOKEN  the same secret as the n8n credential "Job intake webhook secret" (sent as X-Intake-Token)

const TIMEOUT_MS = 95_000; // the AI call itself is allowed up to 120 s in n8n; stay under Cloudflare's 100 s

export function intakeConfigured(): boolean {
  return Boolean(process.env.N8N_INTAKE_URL?.trim() && process.env.N8N_INTAKE_TOKEN?.trim());
}

const asString = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

// Turns the workflow's `payload` into the review form. Defensive: any field may be missing or odd.
function draftFromPayload(person: string, jobUrl: string, payload: unknown): Draft {
  const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const a = (p.application && typeof p.application === "object" ? p.application : {}) as Record<string, unknown>;
  const reqs = Array.isArray(p.requirements) ? p.requirements : [];
  const platform = asString(a.platform);
  const company = asString(a.company);

  return {
    ...emptyDraft(person),
    company: company.toLowerCase() === "unnamed company" ? "" : company,
    role: asString(a.role),
    job_url: jobUrl || asString(a.job_url),
    platform: (PLATFORMS as readonly string[]).includes(platform) ? platform : "",
    rate_offered: asString(a.rate_offered),
    deadline: toInputLocal(asString(a.deadline) || null),
    contact_name: asString(a.contact_name),
    contact_email: asString(a.contact_email),
    company_domain: asString(a.company_domain),
    notes: asString(a.notes),
    job_description: asString(a.job_description).slice(0, 60_000),
    requirements: reqs.slice(0, 40).map((r) => {
      const o = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
      const type = asString(o.type);
      return {
        type: (REQUIREMENT_TYPES as readonly string[]).includes(type) ? type : "other",
        description: asString(o.description),
        due: toInputLocal(asString(o.due_at) || null),
      };
    }),
  };
}

export async function readJobPost(input: { person: string; jobUrl: string; jobText: string }): Promise<Draft> {
  const url = process.env.N8N_INTAKE_URL?.trim();
  const token = process.env.N8N_INTAKE_TOKEN?.trim();
  if (!url || !token) {
    throw new PipelineError(
      "Reading posts with the AI is not set up on the server yet (N8N_INTAKE_URL and N8N_INTAKE_TOKEN). You can still fill the form in by hand.",
      "config",
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Intake-Token": token },
      body: JSON.stringify({
        person: input.person,
        job_url: input.jobUrl,
        job_text: input.jobText,
        preview: true,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    console.error("[pipeline] n8n intake call failed:", aborted ? "timeout" : e);
    throw new PipelineError(
      aborted
        ? "The AI took too long to read the post. Try again, or fill the form in by hand."
        : "Could not reach the n8n intake workflow. Check N8N_INTAKE_URL, or fill the form in by hand.",
      "network",
    );
  } finally {
    clearTimeout(timer);
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }

  if (res.status === 401 || res.status === 403) {
    throw new PipelineError("n8n rejected the intake token. Check N8N_INTAKE_TOKEN matches the credential 'Job intake webhook secret'.", "auth");
  }
  if (res.status === 404) {
    throw new PipelineError(
      "The n8n intake webhook was not found. Check N8N_INTAKE_URL and that the Job intake workflow is published.",
      "config",
    );
  }
  if (!res.ok || !body || body.ok !== true) {
    console.error("[pipeline] n8n intake answered", res.status, body);
    const msg = body && typeof body.message === "string" ? body.message : `The reader answered with an error (HTTP ${res.status}).`;
    throw new PipelineError(msg, "rejected");
  }
  if (body.preview !== true || !body.payload) {
    throw new PipelineError(
      "The n8n workflow did not return a preview. Re-import the latest n8n/intake.json so it supports preview mode.",
      "config",
    );
  }
  return draftFromPayload(input.person, input.jobUrl, body.payload);
}
