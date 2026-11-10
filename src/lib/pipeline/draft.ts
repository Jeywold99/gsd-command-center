// The "review before saving" form for a new application (shared by the server and the client form).
// Every value is a plain string so it can sit in form fields; dates are "YYYY-MM-DDTHH:mm" in the team's time zone.

export type DraftRequirement = { type: string; description: string; due: string };

export type Draft = {
  person: string;
  company: string;
  role: string;
  job_url: string;
  platform: string;
  applied_as: string;
  status: string;
  rate_offered: string;
  deadline: string;
  contact_name: string;
  contact_email: string;
  company_domain: string;
  notes: string;
  job_description: string;
  requirements: DraftRequirement[];
};

export const NEW_STATUSES = ["lead", "drafting", "applied"] as const;

export function emptyDraft(person: string): Draft {
  return {
    person,
    company: "",
    role: "",
    job_url: "",
    platform: "",
    applied_as: "",
    status: "drafting",
    rate_offered: "",
    deadline: "",
    contact_name: "",
    contact_email: "",
    company_domain: "",
    notes: "",
    job_description: "",
    requirements: [],
  };
}

export type PreviewResult = { ok: true; draft: Draft } | { ok: false; error: string };
export type SaveNewResult = { ok: false; error: string; existingId?: string };
