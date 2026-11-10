import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { PipelineError, pipelineConfigured, sbSelect } from "./supabase";
import type { Viewer } from "./types";

// Who may open the Pipeline: a signed-in, active Command Center user whose login email equals the
// email of a person in the job tracker (Supabase `people`). Today that is Eldwin and Jana, nobody else.
// Checked in the Pipeline layout AND at the top of every Pipeline server action, because actions can
// be called directly without the layout ever running.

type Person = { id: string; name: string; email: string | null };

// The people list is tiny and almost never changes. Cache it so the sidebar check does not hit Supabase
// on every page view, and remember a failure briefly so an outage cannot slow down the whole app.
const OK_TTL_MS = 10 * 60_000;
const FAIL_TTL_MS = 30_000;
const LOOKUP_TIMEOUT_MS = 4_000;
let cached: { at: number; people: Person[] | null; reason: string | null } | null = null;

async function loadPeople(): Promise<{ people: Person[] | null; reason: string | null }> {
  const now = Date.now();
  if (cached && now - cached.at < (cached.people ? OK_TTL_MS : FAIL_TTL_MS)) return cached;
  try {
    const people = await sbSelect<Person>("people", { select: "id,name,email" }, { timeoutMs: LOOKUP_TIMEOUT_MS });
    cached = { at: now, people, reason: null };
  } catch (e) {
    // Keep serving an older good list if we have one.
    if (cached?.people) return cached;
    cached = { at: now, people: null, reason: e instanceof PipelineError ? e.message : "The Pipeline could not check access." };
  }
  return cached;
}

export type PipelineAccess =
  | { kind: "ok"; viewer: Viewer }
  | { kind: "denied" }
  | { kind: "unavailable"; reason: string };

export const getPipelineAccess = cache(async (): Promise<PipelineAccess> => {
  if (!pipelineConfigured()) {
    return {
      kind: "unavailable",
      reason: "The Pipeline is not connected to Supabase yet (SUPABASE_URL and SUPABASE_SECRET_KEY are not set).",
    };
  }
  const user = await getCurrentUser(); // redirects to /login when there is no session
  if (!user || !user.isActive || !user.email) return { kind: "denied" };

  const { people, reason } = await loadPeople();
  if (!people) return { kind: "unavailable", reason: reason ?? "The Pipeline could not check access." };

  const email = user.email.trim().toLowerCase();
  const person = people.find((p) => p.email && p.email.trim().toLowerCase() === email);
  if (!person) return { kind: "denied" };
  return { kind: "ok", viewer: { personId: person.id, person: person.name, actor: person.name.trim().toLowerCase() } };
});

// For server actions and pages that must never run for anyone else.
export async function requirePipelineAccess(): Promise<Viewer> {
  const access = await getPipelineAccess();
  if (access.kind === "ok") return access.viewer;
  if (access.kind === "unavailable") throw new PipelineError(access.reason, "config");
  redirect("/");
}
