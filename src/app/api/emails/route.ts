import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiKey } from "@/lib/apikey";
import { findClientIdByEmail } from "@/lib/email";

// Inbound email ingestion for the shared inbox. n8n pulls Jana's client / lead /
// update emails (filtering out personal mail & OTPs upstream) and POSTs them
// here with an API key. Idempotent on `externalId` so n8n can safely re-POST.
//
// Expected JSON body:
//   externalId?        provider message id (recommended — enables dedupe)
//   threadExternalId?  provider thread id (groups a conversation)
//   fromEmail*         sender address
//   fromName?          sender display name
//   to?                recipient(s): string or string[]
//   cc?                cc(s): string or string[]
//   subject?           subject line
//   bodyText*          plain-text body
//   bodyHtml?          html body
//   receivedAt?        ISO timestamp (defaults to now)
//   needsReply?        boolean triage hint

function joinAddrs(v: unknown): string | null {
  if (Array.isArray(v)) return v.filter(Boolean).join(", ") || null;
  if (typeof v === "string") return v.trim() || null;
  return null;
}

export async function POST(request: Request) {
  if (!(await validateApiKey(request.headers.get("x-api-key")))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fromEmail = typeof body.fromEmail === "string" ? body.fromEmail.trim() : "";
  const bodyText = typeof body.bodyText === "string" ? body.bodyText : "";
  if (!fromEmail || !bodyText) {
    return NextResponse.json(
      { error: "fromEmail and bodyText are required" },
      { status: 400 },
    );
  }

  const externalId = typeof body.externalId === "string" ? body.externalId : null;
  const threadExternalId =
    typeof body.threadExternalId === "string" ? body.threadExternalId : null;
  const subject =
    (typeof body.subject === "string" && body.subject.trim()) || "(no subject)";
  const receivedAt =
    typeof body.receivedAt === "string" && !isNaN(Date.parse(body.receivedAt))
      ? new Date(body.receivedAt)
      : new Date();

  try {
    // Idempotency: if we've already stored this provider message, return it.
    if (externalId) {
      const existing = await prisma.emailMessage.findUnique({
        where: { externalId },
        select: { id: true, threadId: true },
      });
      if (existing) {
        return NextResponse.json(
          { id: existing.id, threadId: existing.threadId, deduped: true },
          { status: 200 },
        );
      }
    }

    const clientId = await findClientIdByEmail(fromEmail);

    // Find or create the thread this message belongs to.
    let thread =
      threadExternalId != null
        ? await prisma.emailThread.findUnique({ where: { externalId: threadExternalId } })
        : null;

    if (!thread) {
      thread = await prisma.emailThread.create({
        data: { subject, externalId: threadExternalId, clientId, lastMessageAt: receivedAt },
      });
    } else {
      // Keep the thread current; backfill a client match if we just found one.
      thread = await prisma.emailThread.update({
        where: { id: thread.id },
        data: {
          lastMessageAt: receivedAt,
          ...(clientId && !thread.clientId ? { clientId } : {}),
        },
      });
    }

    const message = await prisma.emailMessage.create({
      data: {
        threadId: thread.id,
        externalId,
        direction: "INBOUND",
        status: "RECEIVED",
        fromEmail,
        fromName: typeof body.fromName === "string" ? body.fromName : null,
        toEmails: joinAddrs(body.to) ?? "",
        ccEmails: joinAddrs(body.cc),
        subject,
        bodyText,
        bodyHtml: typeof body.bodyHtml === "string" ? body.bodyHtml : null,
        receivedAt,
        needsReply: body.needsReply === true,
      },
    });

    return NextResponse.json(
      { id: message.id, threadId: thread.id, clientId },
      { status: 201 },
    );
  } catch (error) {
    console.error("Email ingest error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
