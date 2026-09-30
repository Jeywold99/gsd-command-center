import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromCookie } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// Save / remove this device's Web Push subscription for the signed-in user.

const subscription = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(1).max(512), auth: z.string().min(1).max(512) }),
});

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = subscription.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

  // An endpoint belongs to one browser; re-subscribing (or another user signing
  // in on the same device) just moves it.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent, userId: session.userId },
    update: { p256dh: keys.p256dh, auth: keys.auth, userAgent, userId: session.userId },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await getSessionFromCookie();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string") return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: session.userId } });
  return NextResponse.json({ ok: true });
}
