"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginSchema, type LoginState, type Role } from "@/lib/definitions";
import { encrypt, SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const errors: { email?: string[]; password?: string[] } = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "email" || key === "password") {
        (errors[key] ??= []).push(issue.message);
      }
    }
    return { errors };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always run a comparison to avoid leaking whether the email exists.
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : false;

  if (!user || !user.isActive || !passwordOk) {
    return { message: "Invalid email or password." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
  const token = await encrypt({
    userId: user.id,
    role: user.role as Role,
    expiresAt: expiresAt.toISOString(),
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });

  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
