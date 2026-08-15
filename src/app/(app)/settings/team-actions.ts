"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import { str } from "@/lib/forms";
import type { UserFormState } from "@/lib/definitions";

const ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
type RoleValue = (typeof ROLES)[number];
function roleOf(v: FormDataEntryValue | null): RoleValue {
  const r = String(v ?? "");
  return (ROLES as readonly string[]).includes(r) ? (r as RoleValue) : "STAFF";
}

// Create a team member with a temporary password (they change it on first login).
export async function createUser(
  _state: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  await requireRole("OWNER");
  const name = str(formData.get("name"));
  const email = str(formData.get("email"))?.toLowerCase() ?? null;
  const password = str(formData.get("password"));
  const role = roleOf(formData.get("role"));

  if (!name || !email || !password) {
    return { error: "Name, email, and a temporary password are all required." };
  }
  if (password.length < 8) {
    return { error: "Temporary password must be at least 8 characters." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A member with that email already exists." };

  await prisma.user.create({
    data: { name, email, role, passwordHash: await hashPassword(password) },
  });
  revalidatePath("/settings");
  return { ok: true };
}

// Reset a member's password to a new temporary value.
export async function resetUserPassword(formData: FormData) {
  await requireRole("OWNER");
  const id = str(formData.get("id"));
  const password = str(formData.get("password"));
  if (!id || !password || password.length < 8) return;
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password) },
  });
  revalidatePath("/settings");
}

// Change a member's role. Guards against an owner demoting themselves (lockout).
export async function setUserRole(formData: FormData) {
  const session = await requireRole("OWNER");
  const id = str(formData.get("id"));
  const role = roleOf(formData.get("role"));
  if (!id) return;
  if (id === session.userId && role !== "OWNER") return;
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/settings");
}

// Activate / deactivate a member (deactivated users can't log in). Not yourself.
export async function toggleUserActive(formData: FormData) {
  const session = await requireRole("OWNER");
  const id = str(formData.get("id"));
  if (!id || id === session.userId) return;
  const u = await prisma.user.findUnique({ where: { id }, select: { isActive: true } });
  if (u) await prisma.user.update({ where: { id }, data: { isActive: !u.isActive } });
  revalidatePath("/settings");
}
