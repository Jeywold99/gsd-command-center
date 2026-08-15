import "server-only";
import { prisma } from "./prisma";

export async function listChannels() {
  return prisma.channel.findMany({
    where: { isArchived: false },
    orderBy: [{ scope: "asc" }, { name: "asc" }],
    include: {
      client: { select: { companyName: true, colorHex: true } },
      project: { select: { name: true } },
    },
  });
}

export async function getChannel(id: string) {
  return prisma.channel.findUnique({
    where: { id },
    include: {
      client: { select: { companyName: true, colorHex: true } },
      project: { select: { name: true } },
    },
  });
}

export async function getMessages(channelId: string) {
  return prisma.message.findMany({
    where: { channelId },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { sender: { select: { id: true, name: true } } },
  });
}
