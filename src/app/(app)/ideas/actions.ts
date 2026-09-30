"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { str } from "@/lib/forms";

// Ideas are personal: every action is scoped to the signed-in owner.

export async function createIdea(formData: FormData) {
  const session = await verifySession();
  const text = str(formData.get("text"));
  if (!text) return;
  await prisma.idea.create({ data: { userId: session.userId, text: text.slice(0, 2000) } });
  revalidatePath("/ideas");
}

export async function toggleIdeaStar(formData: FormData) {
  const session = await verifySession();
  const id = str(formData.get("id"));
  if (!id) return;
  const idea = await prisma.idea.findFirst({ where: { id, userId: session.userId } });
  if (!idea) return;
  await prisma.idea.update({ where: { id }, data: { isStarred: !idea.isStarred } });
  revalidatePath("/ideas");
}

// Turn an idea into an inbox task assigned to its owner (once).
export async function ideaToTask(formData: FormData) {
  const session = await verifySession();
  const id = str(formData.get("id"));
  if (!id) return;
  const idea = await prisma.idea.findFirst({ where: { id, userId: session.userId } });
  if (!idea || idea.taskId) return;
  await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: idea.text.slice(0, 300),
        createdById: session.userId,
        assignees: { create: { userId: session.userId } },
      },
    });
    await tx.idea.update({ where: { id }, data: { taskId: task.id } });
  });
  revalidatePath("/ideas");
  revalidatePath("/tasks");
}

export async function deleteIdea(formData: FormData) {
  const session = await verifySession();
  const id = str(formData.get("id"));
  if (!id) return;
  await prisma.idea.deleteMany({ where: { id, userId: session.userId } });
  revalidatePath("/ideas");
}
