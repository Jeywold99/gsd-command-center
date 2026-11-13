"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { encryptSecret, decryptSecret } from "@/lib/secrets";
import { generateTotpSecret, verifyTotp } from "@/lib/totp";
import {
  PORTAL_COOKIE,
  PORTAL_PENDING_COOKIE,
  PORTAL_SESSION_HOURS,
  readPortalPending,
  signPortalPending,
  signPortalSession,
} from "@/lib/portal/session";
import { getPortalClient, slugFromRequest } from "@/lib/portal/dal";

export type SignInState = { error?: string } | undefined;

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// Simple lockout: 5 wrong passwords or codes for one account → 15 minutes off.
// In memory (one web container), so a restart clears it; that's acceptable here.
const failures = new Map<string, { n: number; until: number }>();
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
function isLocked(key: string) {
  const f = failures.get(key);
  return !!f && f.until > Date.now();
}
function recordFail(key: string): boolean {
  const f = failures.get(key);
  const n = (f && f.until <= Date.now() && f.n >= MAX_FAILS ? 0 : f?.n ?? 0) + 1;
  failures.set(key, { n, until: n >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
  return n >= MAX_FAILS;
}
const LOCKED = "Too many tries. Wait 15 minutes, then sign in again.";

const GENERIC = "That email and password don't match an account for this Command Center.";

// Step 1: email + password. On success, moves to the code step (or to setting
// up the authenticator app the first time).
export async function portalSignIn(_s: SignInState, formData: FormData): Promise<SignInState> {
  const slug = await slugFromRequest();
  const client = slug ? await getPortalClient(slug) : null;
  if (!slug || !client) return { error: "This Command Center address isn't set up." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  if (isLocked(email)) return { error: LOCKED };

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  const allowed =
    !!user && user.isActive && (user.role === "CLIENT" ? user.clientId === client.id : true);
  if (!user || !ok || !allowed) {
    return { error: recordFail(email) ? LOCKED : GENERIC };
  }
  failures.delete(email);

  const enrolled = !!(user.totpEnabledAt && user.totpSecret);
  const token = await signPortalPending({
    pu: user.id,
    slug,
    stage: enrolled ? "verify" : "enroll",
    sec: enrolled ? undefined : generateTotpSecret(),
  });
  (await cookies()).set(PORTAL_PENDING_COOKIE, token, { ...cookieBase, maxAge: 600 });
  redirect("/login");
}

// Step 2: the 6-digit code. First time, this also saves the authenticator secret.
export async function portalVerifyCode(_s: SignInState, formData: FormData): Promise<SignInState> {
  const slug = await slugFromRequest();
  const jar = await cookies();
  const pending = await readPortalPending(jar.get(PORTAL_PENDING_COOKIE)?.value);
  if (!slug || !pending || pending.slug !== slug) {
    jar.delete(PORTAL_PENDING_COOKIE);
    return { error: "That took too long. Sign in again." };
  }
  const code = String(formData.get("code") ?? "");
  const user = await prisma.user.findUnique({ where: { id: pending.pu } });
  if (!user || !user.isActive) return { error: GENERIC };
  if (isLocked(user.email)) {
    jar.delete(PORTAL_PENDING_COOKIE);
    return { error: LOCKED };
  }

  let secret: string | null = null;
  if (pending.stage === "enroll") secret = pending.sec ?? null;
  else if (user.totpSecret) secret = decryptSecret(user.totpSecret);
  if (!secret || !verifyTotp(secret, code)) {
    if (recordFail(user.email)) {
      jar.delete(PORTAL_PENDING_COOKIE);
      return { error: LOCKED };
    }
    return { error: "That code didn't work. Check the 6 digits in your authenticator app and try again." };
  }

  failures.delete(user.email);
  if (pending.stage === "enroll") {
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: encryptSecret(secret), totpEnabledAt: new Date() },
    });
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  jar.delete(PORTAL_PENDING_COOKIE);
  jar.set(PORTAL_COOKIE, await signPortalSession({ pu: user.id, slug }), {
    ...cookieBase,
    maxAge: PORTAL_SESSION_HOURS * 3600,
  });
  const client = await getPortalClient(slug);
  if (client) {
    await prisma.portalAccessLog.create({
      data: { clientId: client.id, userId: user.id, action: "signed in", target: "Command Center" },
    });
  }
  redirect("/");
}

export async function portalCancelSignIn() {
  (await cookies()).delete(PORTAL_PENDING_COOKIE);
  redirect("/login");
}

export async function portalSignOut() {
  const jar = await cookies();
  jar.delete(PORTAL_COOKIE);
  redirect("/login");
}

