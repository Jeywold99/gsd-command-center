import "server-only";
import { sbRpc, sbSelect, isUuid } from "./supabase";
import type {
  ApplicationOverview,
  Digest,
  EventRow,
  PipelineStat,
  RequirementRow,
  UnmatchedEmail,
} from "./types";

// Columns for lists and the board: everything except the big text fields.
const LIST_COLUMNS = [
  "id",
  "person_id",
  "person_name",
  "company",
  "role",
  "job_url",
  "platform",
  "applied_as",
  "status",
  "rate_offered",
  "applied_at",
  "deadline",
  "contact_name",
  "contact_email",
  "next_action",
  "next_action_at",
  "last_contact_at",
  "created_at",
  "updated_at",
  "missing_count",
  "ready_to_send",
  "last_activity_at",
  "days_since_last_contact",
].join(",");

export function listApplications(): Promise<ApplicationOverview[]> {
  return sbSelect<ApplicationOverview>("application_overview", {
    select: LIST_COLUMNS,
    order: "last_activity_at.desc",
    limit: "1000",
  });
}

// Id and label only, for pickers (e.g. "which application is this email about?").
export type ApplicationOption = { id: string; company: string; role: string; status: string };
export function listApplicationOptions(personId: string): Promise<ApplicationOption[]> {
  if (!isUuid(personId)) return Promise.resolve([]);
  return sbSelect<ApplicationOption>("applications", {
    select: "id,company,role,status",
    person_id: `eq.${personId}`,
    order: "updated_at.desc",
    limit: "300",
  });
}

export async function getApplication(id: string): Promise<ApplicationOverview | null> {
  if (!isUuid(id)) return null;
  const rows = await sbSelect<ApplicationOverview>("application_overview", { select: "*", id: `eq.${id}`, limit: "1" });
  return rows[0] ?? null;
}

export function listRequirements(applicationId: string): Promise<RequirementRow[]> {
  if (!isUuid(applicationId)) return Promise.resolve([]);
  return sbSelect<RequirementRow>("requirements", {
    select: "id,application_id,type,description,status,link,due_at,created_at",
    application_id: `eq.${applicationId}`,
    order: "created_at.asc",
  });
}

export function listEvents(applicationId: string, limit = 100): Promise<EventRow[]> {
  if (!isUuid(applicationId)) return Promise.resolve([]);
  return sbSelect<EventRow>("events", {
    select: "id,application_id,type,from_status,to_status,summary,payload,occurred_at,created_by",
    application_id: `eq.${applicationId}`,
    order: "occurred_at.desc",
    limit: String(limit),
  });
}

export async function listPeopleNames(): Promise<string[]> {
  const rows = await sbSelect<{ name: string }>("people", { select: "name", order: "name.asc" });
  return rows.map((r) => r.name);
}

// The Command Center client/project this application was handed off to (set when it was marked hired).
// The application_overview view does not carry these columns, so read the table directly.
export async function getApplicationLinks(
  id: string,
): Promise<{ clientId: string | null; projectId: string | null }> {
  if (!isUuid(id)) return { clientId: null, projectId: null };
  try {
    const rows = await sbSelect<{ external_client_id: string | null; external_project_id: string | null }>("applications", {
      select: "external_client_id,external_project_id",
      id: `eq.${id}`,
      limit: "1",
    });
    return { clientId: rows[0]?.external_client_id ?? null, projectId: rows[0]?.external_project_id ?? null };
  } catch {
    // Older database without the columns yet: treat as "not linked" instead of breaking the page.
    return { clientId: null, projectId: null };
  }
}

export function getDigest(person: string): Promise<Digest> {
  return sbRpc<Digest>("daily_digest", { p_person: person });
}

export function listUnmatchedEmails(personId: string): Promise<UnmatchedEmail[]> {
  if (!isUuid(personId)) return Promise.resolve([]);
  return sbSelect<UnmatchedEmail>("unmatched_emails", {
    select: "id,gmail_message_id,from_address,subject,snippet,classification,received_at,person_id",
    person_id: `eq.${personId}`,
    resolved_at: "is.null",
    order: "received_at.desc.nullslast",
    limit: "50",
  });
}

export function getPipelineStats(): Promise<PipelineStat[]> {
  return sbSelect<PipelineStat>("pipeline_stats", {
    select: "person_id,person_name,total,sent,got_reply,got_interview,hired,reply_rate,interview_rate",
    order: "person_name.asc",
  });
}
