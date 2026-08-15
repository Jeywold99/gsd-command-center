"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { str } from "@/lib/forms";

export async function createChannel(formData: FormData) {
  const session = await verifySession();
  const name = str(formData.get("name"));
  if (!name) return;

  const scope = str(formData.get("scope")) ?? "GENERAL";
  const channel = await prisma.channel.create({
    data: {
      name: name.replace(/^#/, "").replace(/\s+/g, "-").toLowerCase(),
      description: str(formData.get("description")),
      scope: scope as never,
      clientId: scope === "CLIENT" ? str(formData.get("clientId")) : null,
      projectId: scope === "PROJECT" ? str(formData.get("projectId")) : null,
      createdById: session.userId,
    },
  });

  revalidatePath("/chat");
  redirect(`/chat?channel=${channel.id}`);
}

export async function archiveChannel(formData: FormData) {
  await verifySession();
  const id = str(formData.get("id"));
  if (!id) return;
  await prisma.channel.update({ where: { id }, data: { isArchived: true } });
  revalidatePath("/chat");
  redirect("/chat");
}
