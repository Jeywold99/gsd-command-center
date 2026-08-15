import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/apikey";

// n8n callback: mark a queued reply as sent once Gmail has delivered it.
// Optional body { externalId } records the provider message id of the sent mail.
export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/emails/[id]/sent">,
) {
  if (!(await validateApiKey(request.headers.get("x-api-key")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  let externalId: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.externalId === "string") externalId = body.externalId;
  } catch {
    // no body is fine
  }

  // Only transition messages that are still QUEUED — avoids double-sends.
  const res = await prisma.emailMessage.updateMany({
    where: { id, direction: "OUTBOUND", status: "QUEUED" },
    data: { status: "SENT", sentAt: new Date(), ...(externalId ? { externalId } : {}) },
  });

  if (res.count === 0) {
    return NextResponse.json(
      { error: "No queued message with that id" },
      { status: 404 },
    );
  }
  return NextResponse.json({ id, status: "SENT" }, { status: 200 });
}
