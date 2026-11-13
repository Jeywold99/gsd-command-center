"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { encryptSecret } from "@/lib/secrets";
import { generateTotpSecret, verifyTotp } from "@/lib/totp";
import { requirePortal, logAccess } from "@/lib/portal/dal";
import { PORTAL_SETUP_COOKIE, readPortalPending, signPortalPending } from "@/lib/portal/session";
import { clearFails, isLocked, LOCKED, recordFail } from "@/lib/portal/lockout";

export type SettingsState = { error?: string; ok?: string } | undefined;

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// Checks the signed-in person's current password (with the shared lockout).
async function checkPassword(userId: string, password: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return "Your account wasn't found.";
  if (isLocked(user.email)) return LOCKED;
  if (!(await verifyPassword(password, user.passwordHash))) {
    return recordFail(user.email) ? LOCKED : "Your current password isn't right.";
  }
  clearFails(user.email);
  return null;
}

export async function changePassword(_s: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await requirePortal();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!current || !next) return { error: "Fill in your current and new password." };
  if (next.length < 12) return { error: "Use at least 12 characters for the new password." };
  if (next !== confirm) return { error: "The new passwords don't match." };
  if (next === current) return { error: "Choose a password different from your current one." };
  const bad = await checkPassword(ctx.user.id, current);
  if (bad) return { error: bad };

  await prisma.user.update({ where: { id: ctx.user.id }, data: { passwordHash: await hashPassword(next) } });
  await logAccess(ctx, "changed their password", "Command Center");
  return { ok: "Password changed. Use it next time you sign in." };
}

// Two-step, step 1: make a new secret and show its QR code (kept in a
// short-lived signed cookie until the first code confirms it).
export async function startTwoStep() {
  const ctx = await requirePortal();
  const token = await signPortalPending({
    pu: ctx.user.id,
    slug: ctx.client.portalSlug,
    stage: "enroll",
    sec: generateTotpSecret(),
  });
  (await cookies()).set(PORTAL_SETUP_COOKIE, token, { ...cookieBase, maxAge: 600 });
  revalidatePath("/portal/[slug]", "layout");
}

export async function cancelTwoStep() {
  await requirePortal();
  (await cookies()).delete(PORTAL_SETUP_COOKIE);
  revalidatePath("/portal/[slug]", "layout");
}

// Two-step, step 2: the first code from the app turns it on.
export async function confirmTwoStep(_s: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await requirePortal();
  const jar = await cookies();
  const setup = await readPortalPending(jar.get(PORTAL_SETUP_COOKIE)?.value);
  if (!setup || setup.pu !== ctx.user.id || setup.stage !== "enroll" || !setup.sec) {
    jar.delete(PORTAL_SETUP_COOKIE);
    return { error: "That took too long. Start again." };
  }
  if (!verifyTotp(setup.sec, String(formData.get("code") ?? ""))) {
    return { error: "That code didn't work. Check the 6 digits in your authenticator app and try again." };
  }
  await prisma.user.update({
    where: { id: ctx.user.id },
    data: { totpSecret: encryptSecret(setup.sec), totpEnabledAt: new Date() },
  });
  jar.delete(PORTAL_SETUP_COOKIE);
  await logAccess(ctx, "turned on two-step verification", "Command Center");
  revalidatePath("/portal/[slug]", "layout");
  return { ok: "Two-step verification is on. You'll enter a code each time you sign in." };
}

export async function turnOffTwoStep(_s: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await requirePortal();
  const bad = await checkPassword(ctx.user.id, String(formData.get("current") ?? ""));
  if (bad) return { error: bad };
  await prisma.user.update({ where: { id: ctx.user.id }, data: { totpSecret: null, totpEnabledAt: null } });
  await logAccess(ctx, "turned off two-step verification", "Command Center");
  revalidatePath("/portal/[slug]", "layout");
  return { ok: "Two-step verification is off." };
}
