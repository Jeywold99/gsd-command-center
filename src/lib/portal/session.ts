import { SignJWT, jwtVerify, type JWTPayload } from "jose";

// Client-portal sessions. Kept apart from the team's `gsd_session`:
//   - a different cookie name (and the portal runs on its own host, so the
//     browser keeps the two cookies apart anyway),
//   - a different JWT audience, so a portal token is never accepted as a team
//     token or the other way round,
//   - no `userId` claim, so even the team decrypt() can't read one as a session.
// Edge-safe (no server-only / next/headers) so proxy.ts may import the names.

export const PORTAL_COOKIE = "gsd_portal";
// Short-lived cookie between "password OK" and "code OK".
export const PORTAL_PENDING_COOKIE = "gsd_portal_pending";
// Holds a new authenticator secret while someone turns on two-step in Settings.
export const PORTAL_SETUP_COOKIE = "gsd_portal_setup";

export const PORTAL_SESSION_HOURS = 24 * 7;
const PENDING_MINUTES = 10;

const AUD_SESSION = "gsd-portal";
const AUD_PENDING = "gsd-portal-pending";

function key(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

export type PortalSession = { pu: string; slug: string };
export type PortalPending = { pu: string; slug: string; stage: "verify" | "enroll"; sec?: string };

export async function signPortalSession(p: PortalSession): Promise<string> {
  return new SignJWT(p as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUD_SESSION)
    .setIssuedAt()
    .setExpirationTime(`${PORTAL_SESSION_HOURS}h`)
    .sign(key());
}

export async function readPortalSession(token?: string): Promise<PortalSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience: AUD_SESSION });
    if (typeof payload.pu !== "string" || typeof payload.slug !== "string") return null;
    return { pu: payload.pu, slug: payload.slug };
  } catch {
    return null;
  }
}

export async function signPortalPending(p: PortalPending): Promise<string> {
  return new SignJWT(p as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUD_PENDING)
    .setIssuedAt()
    .setExpirationTime(`${PENDING_MINUTES}m`)
    .sign(key());
}

export async function readPortalPending(token?: string): Promise<PortalPending | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], audience: AUD_PENDING });
    if (typeof payload.pu !== "string" || typeof payload.slug !== "string") return null;
    const stage = payload.stage === "enroll" ? "enroll" : "verify";
    return {
      pu: payload.pu,
      slug: payload.slug,
      stage,
      sec: typeof payload.sec === "string" ? payload.sec : undefined,
    };
  } catch {
    return null;
  }
}

// Which portal (if any) a request's host belongs to. "nathan.getshtdonehq.com"
// → "nathan"; "nathan.localhost:3000" → "nathan" (for local dev). The team's
// own host label (gsd) and a few reserved labels are never portals.
const RESERVED = new Set(
  (process.env.PORTAL_RESERVED_LABELS || "gsd,www,api,app,n8n,lms")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
);

export function portalSlugFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const h = host.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  const base = (process.env.PORTAL_BASE_DOMAIN || "getshtdonehq.com").toLowerCase();
  let label: string | null = null;
  if (h.endsWith(".localhost")) label = h.slice(0, -".localhost".length);
  else if (h.endsWith(`.${base}`)) label = h.slice(0, -(base.length + 1));
  if (!label || label.includes(".") || !/^[a-z0-9-]+$/.test(label)) return null;
  return RESERVED.has(label) ? null : label;
}
