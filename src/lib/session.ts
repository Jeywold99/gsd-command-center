import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { SessionPayload } from "./definitions";

// Pure JWT helpers — no `server-only`, no `next/headers` — so this module is
// safe to import from proxy.ts (which runs before the request completes).
const secret = process.env.SESSION_SECRET;
if (!secret) {
  // Fail loud at startup rather than silently signing with an empty key,
  // which would make every session token trivially forgeable.
  throw new Error(
    "SESSION_SECRET is not set. Generate one (e.g. `openssl rand -base64 32`) and add it to your environment.",
  );
}
const encodedKey = new TextEncoder().encode(secret);

export const SESSION_COOKIE = "gsd_session";
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
