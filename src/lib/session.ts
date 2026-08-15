import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { SessionPayload } from "./definitions";

// Pure JWT helpers — no `server-only`, no `next/headers` — so this module is
// safe to import from proxy.ts (which runs before the request completes).

// Resolved lazily (not at module load) so `next build` — which evaluates these
// modules without the runtime environment — doesn't trip the guard. The check
// still fires the first time a session is signed or verified at runtime, so a
// missing secret fails loud rather than silently signing with an empty key.
function encodedKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Generate one (e.g. `openssl rand -base64 32`) and add it to your environment.",
    );
  }
  return new TextEncoder().encode(secret);
}

export const SESSION_COOKIE = "gsd_session";
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey());
}

export async function decrypt(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
