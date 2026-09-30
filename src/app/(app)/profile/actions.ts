"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { str } from "@/lib/forms";
import { saveBuffer, removeFile } from "@/lib/storage";
import { regenerateVoiceKey, getVoiceKey } from "@/lib/voice";
import { sendPush } from "@/lib/push";

export type ProfileState = { error?: string; ok?: string } | undefined;

// ── Name ──
export async function updateName(_s: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await verifySession();
  const name = str(formData.get("name"));
  if (!name) return { error: "Name can't be empty." };
  await prisma.user.update({ where: { id: session.userId }, data: { name: name.slice(0, 80) } });
  revalidatePath("/", "layout");
  return { ok: "Saved." };
}

// ── Password ──
export async function changePassword(_s: ProfileState, formData: FormData): Promise<ProfileState> {
  const session = await verifySession();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    return { error: "Current password is incorrect." };
  }
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: await bcrypt.hash(next, 12) },
  });
  return { ok: "Password changed." };
}

// ── Profile photo ──
// The browser crops + resizes to a 512px square JPEG/WebP before upload, so
// anything bigger than this is not from our uploader.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function avatarKey(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url, "http://x").searchParams.get("v");
  } catch {
    return null;
  }
}

export async function uploadAvatar(formData: FormData): Promise<{ error?: string; url?: string }> {
  const session = await verifySession();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo first." };
  const ext = AVATAR_TYPES[file.type];
  if (!ext) return { error: "Use a JPG, PNG or WebP image." };
  if (file.size > MAX_AVATAR_BYTES) return { error: "That photo is too large." };

  const buf = Buffer.from(await file.arrayBuffer());
  const key = `avatar-${session.userId}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  await saveBuffer(key, buf);

  const before = await prisma.user.findUnique({ where: { id: session.userId }, select: { avatarUrl: true } });
  const url = `/api/avatars/${session.userId}?v=${key}`;
  await prisma.user.update({ where: { id: session.userId }, data: { avatarUrl: url } });
  const old = avatarKey(before?.avatarUrl ?? null);
  if (old) await removeFile(old);

  revalidatePath("/", "layout");
  return { url };
}

export async function removeAvatar() {
  const session = await verifySession();
  const before = await prisma.user.findUnique({ where: { id: session.userId }, select: { avatarUrl: true } });
  await prisma.user.update({ where: { id: session.userId }, data: { avatarUrl: null } });
  const old = avatarKey(before?.avatarUrl ?? null);
  if (old) await removeFile(old);
  revalidatePath("/", "layout");
}

// ── Push ──
export async function sendTestPush() {
  const session = await verifySession();
  await sendPush([session.userId], {
    title: "GSD HQ",
    body: "Notifications are working on this device.",
    url: "/profile",
  });
}

// ── Voice key ──
export async function createVoiceKey(): Promise<string> {
  const session = await verifySession();
  const raw = await regenerateVoiceKey(session.userId);
  revalidatePath("/profile");
  return raw;
}

export async function revealVoiceKey(): Promise<string | null> {
  const session = await verifySession();
  return (await getVoiceKey(session.userId))?.raw ?? null;
}
