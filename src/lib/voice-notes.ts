import "server-only";
import { prisma } from "./prisma";

// Read side of voice notes (the write side — keys + ingest — is lib/voice.ts).
// Every query is scoped to the owner: transcriptions are private.

export async function countUnreadVoiceNotes(userId: string) {
  return prisma.voiceNote.count({ where: { userId, isRead: false } });
}

export async function listVoiceNotes(userId: string, take = 100) {
  return prisma.voiceNote.findMany({
    where: { userId },
    orderBy: { receivedAt: "desc" },
    take,
    select: {
      id: true,
      summary: true,
      source: true,
      isRead: true,
      receivedAt: true,
      _count: { select: { createdTasks: true, createdEvents: true, createdIdeas: true } },
    },
  });
}

export type VoiceNoteListItem = Awaited<ReturnType<typeof listVoiceNotes>>[number];

export async function getVoiceNote(userId: string, id: string) {
  return prisma.voiceNote.findFirst({
    where: { id, userId },
    include: {
      createdTasks: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          dueDate: true,
          projectId: true,
          calendarEvents: { where: { type: "REMINDER" }, select: { id: true, startAt: true } },
        },
      },
      createdIdeas: { orderBy: { createdAt: "asc" }, select: { id: true, text: true, taskId: true } },
    },
  });
}

export type VoiceNoteDetail = NonNullable<Awaited<ReturnType<typeof getVoiceNote>>>;

export async function latestVoiceNote(userId: string) {
  return prisma.voiceNote.findFirst({
    where: { userId },
    orderBy: { receivedAt: "desc" },
    select: {
      id: true,
      summary: true,
      source: true,
      receivedAt: true,
      _count: { select: { createdTasks: true, createdEvents: true, createdIdeas: true } },
    },
  });
}

export async function listIdeas(userId: string) {
  return prisma.idea.findMany({
    where: { userId },
    orderBy: [{ isStarred: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      text: true,
      isStarred: true,
      createdAt: true,
      voiceNoteId: true,
      taskId: true,
    },
  });
}

export type IdeaItem = Awaited<ReturnType<typeof listIdeas>>[number];
