import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  PORTAL_COOKIE,
  portalSlugFromHost,
  readPortalSession,
} from "./session";

// The portal's secure access check (the proxy only routes by host).
//   - The client's own account (role CLIENT) may open only its own client's portal.
//   - Team accounts (OWNER / MANAGER / STAFF) may open any portal, with edit tools.
// A session is only ever issued after the two-step code checks out.

export type PortalUser = { id: string; name: string; email: string; role: string };
export type PortalContext = {
  client: { id: string; companyName: string; timezone: string; portalSlug: string };
  firstName: string;
  user: PortalUser;
  isTeam: boolean;
};

export const getPortalClient = cache(async (slug: string) => {
  const client = await prisma.client.findUnique({
    where: { portalSlug: slug },
    select: { id: true, companyName: true, timezone: true, portalSlug: true },
  });
  return client;
});

async function resolve(slug: string): Promise<PortalContext | null> {
  const client = await getPortalClient(slug);
  if (!client) return null;
  const jar = await cookies();
  const session = await readPortalSession(jar.get(PORTAL_COOKIE)?.value);
  if (!session || session.slug !== slug) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.pu },
    select: { id: true, name: true, email: true, role: true, isActive: true, clientId: true, totpEnabledAt: true },
  });
  if (!user || !user.isActive || !user.totpEnabledAt) return null;
  const isTeam = user.role !== "CLIENT";
  if (!isTeam && user.clientId !== client.id) return null;

  return {
    client: {
      id: client.id,
      companyName: client.companyName,
      timezone: client.timezone || "America/New_York",
      portalSlug: client.portalSlug!,
    },
    firstName: client.companyName.split(" ")[0],
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    isTeam,
  };
}

// For pages and layouts: 404 for an unknown portal, sign-in page when not signed in.
export const getPortalContext = cache(async (slug: string): Promise<PortalContext> => {
  if (!(await getPortalClient(slug))) notFound();
  const ctx = await resolve(slug);
  if (!ctx) redirect("/login");
  return ctx;
});

// The portal slug of the current request, from its host (never from form data).
export async function slugFromRequest(): Promise<string | null> {
  const h = await headers();
  return portalSlugFromHost(h.get("x-forwarded-host") ?? h.get("host"));
}

// For server actions and route handlers: throws instead of redirecting.
export async function requirePortal(): Promise<PortalContext> {
  const slug = await slugFromRequest();
  const ctx = slug ? await resolve(slug) : null;
  if (!ctx) throw new Error("Not signed in to this portal.");
  return ctx;
}

// Record who did what in the portal (Vault opens, uploads, deletes, logins).
export async function logAccess(ctx: PortalContext, action: string, target: string) {
  try {
    await prisma.portalAccessLog.create({
      data: { clientId: ctx.client.id, userId: ctx.user.id, action, target },
    });
  } catch (e) {
    console.error("portal access log failed:", e);
  }
}
