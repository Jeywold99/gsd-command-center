import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/apikey";

// Outbox for n8n: returns replies composed in the command center that are
// approved and QUEUED for sending. n8n polls this, sends each via Jana's Gmail,
// then confirms with POST /api/emails/{id}/sent.
export async function GET(request: Request) {
  if (!(await validateApiKey(request.headers.get("x-api-key")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queued = await prisma.emailMessage.findMany({
    where: { direction: "OUTBOUND", status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    include: {
      thread: {
        select: {
          externalId: true,
          // Latest inbound message with a known provider id — this is the Gmail
          // message the reply threads onto (Gmail's "reply" needs a message id).
          messages: {
            where: { direction: "INBOUND", externalId: { not: null } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { externalId: true },
          },
        },
      },
    },
  });

  const messages = queued.map((m) => ({
    id: m.id,
    to: m.toEmails,
    cc: m.ccEmails,
    subject: m.subject,
    bodyText: m.bodyText,
    bodyHtml: m.bodyHtml,
    // Provider thread id (grouping) + the message id to reply to (threading).
    threadExternalId: m.thread.externalId,
    replyToMessageId: m.thread.messages[0]?.externalId ?? null,
  }));

  return NextResponse.json({ messages }, { status: 200 });
}
