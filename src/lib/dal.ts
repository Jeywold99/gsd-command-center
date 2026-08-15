import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt, SESSION_COOKIE } from "./session";
import { prisma } from "./prisma";
import type { Role } from "./definitions";

// Data Access Layer — the *secure* auth check, run close to the data.
// proxy.ts only does an optimistic redirect; real protection lives here.

// Verify the session cookie. Redirects to /login if missing/invalid.
export const verifySession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  if (!session?.userId) redirect("/login");
  return { userId: session.userId, role: session.role as Role };
});

// The current user (safe columns only — DTO), or null.
export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  try {
    return await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
      },
    });
  } catch (error) {
    console.error("getCurrentUser failed:", error);
    return null;
  }
});

// Guard a route/action to specific roles. Redirects home if unauthorized.
export async function requireRole(...roles: Role[]) {
  const session = await verifySession();
  if (!roles.includes(session.role)) redirect("/");
  return session;
}
