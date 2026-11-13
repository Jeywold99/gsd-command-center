"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { decryptSecret } from "@/lib/secrets";
import { verifyTotp } from "@/lib/totp";
import {
  PORTAL_COOKIE,
  PORTAL_PENDING_COOKIE,
  PORTAL_SESSION_HOURS,
  readPortalPending,
  signPortalPending,
  signPortalSession,
} from "@/lib/portal/session";
import { getPortalClient, slugFromRequest } from "@/lib/portal/dal";
import { clearFails, isLocked, LOCKED, recordFail } from "@/lib/portal/lockout";

export type SignInState = { error?: string } | undefined;

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const GENERIC = "That email and password don't match an account for this Command Center.";

// Issue the portal session, log it, and go to the overview.
async function finishSignIn(userId: string, slug: string): Promise<never> {
  const jar = await cookies();
  jar.delete(PORTAL_PENDING_COOKIE);
  jar.set(PORTAL_COOKIE, await signPortalSession({ pu: userId, slug }), {
    ...cookieBase,
    maxAge: PORTAL_SESSION_HOURS * 3600,
  });
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  const client = await getPortalClient(slug);
  if (client) {
    await prisma.portalAccessLog.create({
      data: { clientId: client.id, userId, action: "signed in", target: "Command Center" },
    });
  }
  redirect("/");
}

// Step 1: email + password. People who turned on two-step verification (in
// Settings) go on to the code step; everyone else is signed straight in.
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
  clearFails(email);

  if (!(user.totpEnabledAt && user.totpSecret)) return finishSignIn(user.id, slug);

  const token = await signPortalPending({ pu: user.id, slug, stage: "verify" });
  (await cookies()).set(PORTAL_PENDING_COOKIE, token, { ...cookieBase, maxAge: 600 });
  redirect("/login");
}

// Step 2 (only with two-step on): the 6-digit code from the authenticator app.
export async function portalVerifyCode(_s: SignInState, formData: FormData): Promise<SignInState> {
  const slug = await slugFromRequest();
  const jar = await cookies();
  const pending = await readPortalPending(jar.get(PORTAL_PENDING_COOKIE)?.value);
  if (!slug || !pending || pending.slug !== slug || pending.stage !== "verify") {
    jar.delete(PORTAL_PENDING_COOKIE);
    return { error: "That took too long. Sign in again." };
  }
  const user = await prisma.user.findUnique({ where: { id: pending.pu } });
  if (!user || !user.isActive || !user.totpSecret) return { error: GENERIC };
  if (isLocked(user.email)) {
    jar.delete(PORTAL_PENDING_COOKIE);
    return { error: LOCKED };
  }
  if (!verifyTotp(decryptSecret(user.totpSecret), String(formData.get("code") ?? ""))) {
    if (recordFail(user.email)) {
      jar.delete(PORTAL_PENDING_COOKIE);
      return { error: LOCKED };
    }
    return { error: "That code didn't work. Check the 6 digits in your authenticator app and try again." };
  }
  clearFails(user.email);
  return finishSignIn(user.id, slug);
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
