"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession, requireRole } from "@/lib/dal";

// Mark every unread inbound message in a thread as read (called when opened).
export async function markThreadRead(threadId: string) {
  await verifySession();
  await prisma.emailMessage.updateMany({
    where: { threadId, direction: "INBOUND", isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/inbox");
}

// Flip the "needs reply" triage flag on a thread's latest inbound message.
export async function toggleThreadNeedsReply(threadId: string) {
  await verifySession();
  const last = await prisma.emailMessage.findFirst({
    where: { threadId, direction: "INBOUND" },
    orderBy: { createdAt: "desc" },
    select: { id: true, needsReply: true },
  });
  if (!last) return;
  await prisma.emailMessage.update({
    where: { id: last.id },
    data: { needsReply: !last.needsReply },
  });
  revalidatePath("/inbox");
}

// Save a reply draft (any team member). One draft per thread — reused/updated.
export async function saveDraft(threadId: string, bodyText: string) {
  const session = await verifySession();
  const text = bodyText.trim();
  const thread = await prisma.emailThread.findUnique({
    where: { id: threadId },
    select: { subject: true },
  });
  if (!thread) return;

  const existing = await prisma.emailMessage.findFirst({
    where: { threadId, status: "DRAFT" },
    select: { id: true },
  });

  if (existing) {
    await prisma.emailMessage.update({
      where: { id: existing.id },
      data: { bodyText: text, authorId: session.userId },
    });
  } else {
    await prisma.emailMessage.create({
      data: {
        threadId,
        direction: "OUTBOUND",
        status: "DRAFT",
        authorId: session.userId,
        fromEmail: process.env.GSD_INBOX_ADDRESS || "",
        toEmails: await replyRecipient(threadId),
        subject: replySubject(thread.subject),
        bodyText: text,
      },
    });
  }
  revalidatePath("/inbox");
}

// Approve + queue a reply for sending. Owner/Manager only — this is client mail
// going out under Jana's name. n8n picks it up from GET /api/emails/outbox.
export async function sendReply(threadId: string, bodyText: string) {
  const session = await requireRole("OWNER", "MANAGER");
  const text = bodyText.trim();
  if (!text) return { error: "Write a reply first." };

  const thread = await prisma.emailThread.findUnique({
    where: { id: threadId },
    select: { subject: true },
  });
  if (!thread) return { error: "Thread not found." };

  const to = await replyRecipient(threadId);
  const data = {
    status: "QUEUED" as const,
    direction: "OUTBOUND" as const,
    authorId: session.userId,
    fromEmail: process.env.GSD_INBOX_ADDRESS || "",
    toEmails: to,
    subject: replySubject(thread.subject),
    bodyText: text,
  };

  // Promote an existing draft, or create the queued message outright.
  const draft = await prisma.emailMessage.findFirst({
    where: { threadId, status: "DRAFT" },
    select: { id: true },
  });
  if (draft) {
    await prisma.emailMessage.update({ where: { id: draft.id }, data });
  } else {
    await prisma.emailMessage.create({ data: { threadId, ...data } });
  }

  // Sending answers the conversation — clear the needs-reply flag + bump order.
  await prisma.emailMessage.updateMany({
    where: { threadId, direction: "INBOUND", needsReply: true },
    data: { needsReply: false },
  });
  await prisma.emailThread.update({
    where: { id: threadId },
    data: { lastMessageAt: new Date() },
  });

  revalidatePath("/inbox");
  return { ok: true };
}

// The reply goes back to whoever last wrote in on the thread.
async function replyRecipient(threadId: string): Promise<string> {
  const last = await prisma.emailMessage.findFirst({
    where: { threadId, direction: "INBOUND" },
    orderBy: { createdAt: "desc" },
    select: { fromEmail: true },
  });
  return last?.fromEmail ?? "";
}

function replySubject(subject: string): string {
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}
