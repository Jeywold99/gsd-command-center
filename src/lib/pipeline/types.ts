// Shared (server + client) types and vocabularies for the Pipeline section. No secrets, no server-only imports.

export const STATUSES = [
  "lead",
  "drafting",
  "applied",
  "viewed",
  "replied",
  "interview",
  "trial_task",
  "offer",
  "hired",
  "rejected",
  "ghosted",
  "withdrawn",
  "offer_declined",
  "on_hold",
] as const;
export type Status = (typeof STATUSES)[number];

export const isStatus = (v: unknown): v is Status =>
  typeof v === "string" && (STATUSES as readonly string[]).includes(v);

export const STATUS_LABEL: Record<Status, string> = {
  lead: "Lead",
  drafting: "Drafting",
  applied: "Applied",
  viewed: "Viewed",
  replied: "Replied",
  interview: "Interview",
  trial_task: "Trial task",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
  ghosted: "Ghosted",
  withdrawn: "Withdrawn",
  offer_declined: "Offer declined",
  on_hold: "On hold",
};

// Left to right on the board: the forward pipeline first, then the places an application can end up.
export const OPEN_STATUSES: Status[] = [
  "lead",
  "drafting",
  "applied",
  "viewed",
  "replied",
  "interview",
  "trial_task",
  "offer",
  "hired",
];
export const CLOSED_STATUSES: Status[] = ["on_hold", "rejected", "ghosted", "withdrawn", "offer_declined"];
// Statuses that count as "still alive" for lists and counts.
export const ACTIVE_STATUSES: Status[] = [
  "lead",
  "drafting",
  "applied",
  "viewed",
  "replied",
  "interview",
  "trial_task",
  "offer",
  "on_hold",
];

export const PLATFORMS = ["onlinejobs", "upwork", "linkedin", "direct", "referral", "other"] as const;
export const PLATFORM_LABEL: Record<string, string> = {
  onlinejobs: "OnlineJobs.ph",
  upwork: "Upwork",
  linkedin: "LinkedIn",
  direct: "Direct",
  referral: "Referral",
  other: "Other",
};

export const APPLIED_AS = ["personal", "gsd_hq"] as const;
export const APPLIED_AS_LABEL: Record<string, string> = { personal: "Personal", gsd_hq: "GSD HQ" };

export const REQUIREMENT_TYPES = [
  "loom",
  "portfolio_link",
  "resume",
  "cover_letter",
  "screening_answers",
  "test_task",
  "special_instruction",
  "expected_rate",
  "availability",
  "references",
  "other",
] as const;
export type RequirementType = (typeof REQUIREMENT_TYPES)[number];
export const REQUIREMENT_LABEL: Record<string, string> = {
  loom: "Loom video",
  portfolio_link: "Portfolio link",
  resume: "Resume",
  cover_letter: "Cover letter",
  screening_answers: "Screening answers",
  test_task: "Test task",
  special_instruction: "Special instruction",
  expected_rate: "Expected rate",
  availability: "Availability",
  references: "References",
  other: "Other",
};

export const REQUIREMENT_STATUSES = ["needed", "in_progress", "done", "not_applicable"] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];
export const REQUIREMENT_STATUS_LABEL: Record<RequirementStatus, string> = {
  needed: "To do",
  in_progress: "In progress",
  done: "Done",
  not_applicable: "Not needed",
};

export const ASSET_TYPES = ["loom", "resume", "portfolio", "case_study", "other"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];
export const ASSET_LABEL: Record<AssetType, string> = {
  loom: "Loom video",
  resume: "Resume",
  portfolio: "Portfolio",
  case_study: "Case study",
  other: "Other",
};

export type AssetRow = {
  id: string;
  person_id: string;
  type: AssetType;
  title: string;
  url: string | null;
  notes: string | null;
  created_at: string;
};

// Things a person can record by hand (the rest are written by the system).
export const ACTIVITY_TYPES = [
  { value: "note", label: "Note" },
  { value: "follow_up_sent", label: "Follow-up sent" },
  { value: "email_sent", label: "Email sent" },
  { value: "email_received", label: "Reply received" },
  { value: "interview_scheduled", label: "Interview scheduled" },
] as const;

export type ApplicationOverview = {
  id: string;
  person_id: string;
  person_name: string;
  company: string;
  role: string;
  job_url: string | null;
  platform: string | null;
  applied_as: string | null;
  status: Status;
  rate_offered: string | null;
  applied_at: string | null;
  deadline: string | null;
  contact_name: string | null;
  contact_email: string | null;
  company_domain: string | null;
  next_action: string | null;
  next_action_at: string | null;
  last_contact_at: string | null;
  notes: string | null;
  job_description?: string | null;
  gmail_thread_ids?: string[];
  created_at: string;
  updated_at: string;
  missing_count: number;
  ready_to_send: boolean;
  last_activity_at: string;
  days_since_last_contact: number | null;
};

export type RequirementRow = {
  id: string;
  application_id: string;
  type: string;
  description: string | null;
  status: RequirementStatus;
  link: string | null;
  due_at: string | null;
  created_at: string;
};

export type EventRow = {
  id: string;
  application_id: string;
  type: string;
  from_status: Status | null;
  to_status: Status | null;
  summary: string | null;
  payload: Record<string, unknown> | null;
  occurred_at: string;
  created_by: string;
};

export type EmailClassification = {
  is_job_related?: boolean;
  category?: string;
  company?: string | null;
  suggested_status?: string | null;
  confidence?: string;
  summary?: string;
  match_note?: string;
  error?: string;
} | null;

export type UnmatchedEmail = {
  id: string;
  gmail_message_id: string;
  from_address: string | null;
  subject: string | null;
  snippet: string | null;
  classification: EmailClassification;
  received_at: string | null;
  person_id: string;
};

export type PipelineStat = {
  person_id: string;
  person_name: string;
  total: number;
  sent: number;
  got_reply: number;
  got_interview: number;
  hired: number;
  reply_rate: number | null;
  interview_rate: number | null;
};

export type Digest = {
  person: string;
  generated_at: string;
  follow_ups: {
    application_id: string;
    company: string;
    role: string;
    status: Status;
    days_since_last_contact: number | null;
    contact_name: string | null;
    contact_email: string | null;
    next_action: string | null;
  }[];
  stuck_drafting: {
    application_id: string;
    company: string;
    role: string;
    missing_count: number;
    open_requirements: { type: string; description: string | null; status: string; due_at: string | null }[];
  }[];
  requirements_due: {
    application_id: string;
    company: string;
    role: string;
    requirement_type: string;
    description: string | null;
    due_at: string;
    overdue: boolean;
  }[];
  upcoming: {
    application_id: string;
    company: string;
    role: string;
    status: Status;
    next_action: string | null;
    next_action_at: string | null;
  }[];
  unmatched_count: number;
  status_changes: {
    company: string;
    role: string;
    from_status: Status | null;
    to_status: Status | null;
    summary: string | null;
    occurred_at: string;
    created_by: string;
  }[];
  empty: boolean;
};

export type Viewer = {
  personId: string;
  person: string; // "Eldwin" / "Jana", as in the people table
  actor: string; // lower-case name, recorded as events.created_by
};

// Result of a server action that is called directly (not through a form).
export type ActionResult = { ok: true } | { ok: false; error: string };
// State of a form wired to useActionState.
export type FormState = { ok?: boolean; error?: string; message?: string };
// Hired -> client + project. `partial` is set when the client and project were created but linking back to the
// tracker failed, so pressing the button again only finishes the link instead of creating duplicates.
export type HandoffState = FormState & { partial?: { clientId: string; projectId: string } };
