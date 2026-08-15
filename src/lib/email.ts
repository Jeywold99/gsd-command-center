import "server-only";
import { prisma } from "./prisma";

// Shared inbox reads. Inbound messages arrive via POST /api/emails (n8n);
// outbound replies are queued here and delivered by n8n.

export type InboxFilter = "all" | "unread" | "needs-reply";

// Match an incoming sender to a CRM client by a contact's email (case-insensitive).
// Returns the clientId, or null for an unmatched sender (a potential lead).
export async function findClientIdByEmail(email: string): Promise<string | null> {
  const clean = email.trim().toLowerCase();
  if (!clean) return null;
  const contact = await prisma.contact.findFirst({
    where: { email: { equals: clean, mode: "insensitive" } },
    select: { clientId: true },
  });
  return contact?.clientId ?? null;
}

export async function listThreads(filter: InboxFilter = "all") {
  const where =
    filter === "unread"
      ? { messages: { some: { direction: "INBOUND" as const, isRead: false } } }
      : filter === "needs-reply"
        ? { messages: { some: { needsReply: true } } }
        : undefined;

  return prisma.emailThread.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    include: {
      client: { select: { id: true, companyName: true, colorHex: true } },
      // Latest INBOUND message → drives the row's counterparty label, preview,
      // and ⚑ flag, so the list always shows who we're talking to (the client /
      // lead), not our own last reply.
      messages: {
        where: { direction: "INBOUND" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          fromName: true,
          fromEmail: true,
          bodyText: true,
          createdAt: true,
          needsReply: true,
        },
      },
      // Unread inbound count for the bold/dot treatment.
      _count: {
        select: { messages: { where: { direction: "INBOUND", isRead: false } } },
      },
    },
  });
}

export async function getThread(id: string) {
  return prisma.emailThread.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, companyName: true, colorHex: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });
}

// Total unread inbound across the whole inbox (nav badge).
export async function countUnreadInbox(): Promise<number> {
  return prisma.emailMessage.count({
    where: { direction: "INBOUND", isRead: false },
  });
}

export type ThreadListItem = Awaited<ReturnType<typeof listThreads>>[number];
export type ThreadDetail = NonNullable<Awaited<ReturnType<typeof getThread>>>;
