import "server-only";

// Minimal PostgREST client for the job-tracker Supabase project. SERVER ONLY: the secret key
// must never reach the browser, so this file imports "server-only" and nothing in a client
// component may import it. No SDK needed: a plain fetch is enough for select + RPC.
//
// Env (set on the Pi in .env, passed through docker-compose.yml):
//   SUPABASE_URL         https://<project-ref>.supabase.co
//   SUPABASE_SECRET_KEY  the project's secret (service) key

const DEFAULT_TIMEOUT_MS = 15_000;

export type PipelineErrorKind = "config" | "network" | "auth" | "missing-migration" | "rejected" | "db";

// Errors whose message is safe and useful to show to the person using the app.
export class PipelineError extends Error {
  readonly kind: PipelineErrorKind;
  constructor(message: string, kind: PipelineErrorKind = "db") {
    super(message);
    this.name = "PipelineError";
    this.kind = kind;
  }
}

export function pipelineConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SECRET_KEY?.trim());
}

function config() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) {
    throw new PipelineError(
      "The Pipeline is not connected to Supabase yet: SUPABASE_URL and SUPABASE_SECRET_KEY are not set on the server.",
      "config",
    );
  }
  return { url, key };
}

// What a person can read about a failure. The raw database message is only passed on for errors the
// SQL functions raise on purpose (code P0001, e.g. "application not found"); everything else is generic.
function describe(status: number, body: unknown): PipelineError {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const code = typeof b.code === "string" ? b.code : "";
  const message = typeof b.message === "string" ? b.message : "";

  if (code === "P0001" && message) return new PipelineError(message, "rejected");
  if (status === 401 || status === 403) {
    return new PipelineError("Supabase rejected the key. Check SUPABASE_SECRET_KEY on the server.", "auth");
  }
  if (code === "PGRST202" || code === "42883" || code === "42P01" || code === "PGRST205" || code === "42703") {
    return new PipelineError(
      "The database is missing a migration the Pipeline needs. Run `npx supabase db push` from the job-tracker repo.",
      "missing-migration",
    );
  }
  if (code === "22P02" || code === "22007" || code === "22008") {
    return new PipelineError("One of the values was not in a valid format.", "rejected");
  }
  if (code === "23505") return new PipelineError("That already exists.", "rejected");
  if (code === "23514" || code === "23502") return new PipelineError("A required value is missing or not allowed.", "rejected");
  return new PipelineError(`The database returned an error${code ? ` (${code})` : ""}. Try again in a moment.`, "db");
}

async function request(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; timeoutMs?: number },
): Promise<unknown> {
  const { url, key } = config();
  const headers: Record<string, string> = {
    apikey: key,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  // New-style secret keys are not JWTs and must not be sent as a bearer token; legacy keys are JWTs.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${url}/rest/v1/${path}`, {
      method: init.method,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    console.error(`[pipeline] ${init.method} ${path.split("?")[0]} failed:`, aborted ? "timeout" : e);
    throw new PipelineError(
      aborted ? "The database took too long to answer. Try again." : "Could not reach the database.",
      "network",
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!res.ok) {
    console.error(`[pipeline] ${init.method} ${path.split("?")[0]} -> ${res.status}`, json);
    throw describe(res.status, json);
  }
  return json;
}

// SELECT from a table or view. `params` are PostgREST query parameters: select, order, limit, <column>=eq.x ...
export async function sbSelect<T>(
  table: string,
  params: Record<string, string> = {},
  opts: { timeoutMs?: number } = {},
): Promise<T[]> {
  const qs = new URLSearchParams(params).toString();
  const out = await request(`${table}${qs ? `?${qs}` : ""}`, { method: "GET", timeoutMs: opts.timeoutMs });
  return Array.isArray(out) ? (out as T[]) : [];
}

// Call a Postgres function (RPC).
export async function sbRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  return (await request(`rpc/${fn}`, { method: "POST", body: args })) as T;
}

// Text that is safe to show to a person for any thrown value.
export function userMessage(e: unknown): string {
  if (e instanceof PipelineError) return e.message;
  console.error("[pipeline] unexpected error:", e);
  return "Something went wrong. Try again.";
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
