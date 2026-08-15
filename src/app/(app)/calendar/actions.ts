"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { str } from "@/lib/forms";

export async function createEvent(formData: FormData) {
  const session = await verifySession();
  const title = str(formData.get("title"));
  const startStr = str(formData.get("start"));
  if (!title || !startStr) return;

  const startAt = new Date(startStr);
  if (isNaN(startAt.getTime())) return;
  const endStr = str(formData.get("end"));
  const endAt = endStr ? new Date(endStr) : null;

  await prisma.calendarEvent.create({
    data: {
      title,
      description: str(formData.get("description")),
      type: (str(formData.get("type")) as never) ?? "MEETING",
      startAt,
      endAt: endAt && !isNaN(endAt.getTime()) ? endAt : null,
      allDay: formData.get("allDay") === "on",
      location: str(formData.get("location")),
      meetingUrl: str(formData.get("meetingUrl")),
      clientId: str(formData.get("clientId")),
      projectId: str(formData.get("projectId")),
      createdById: session.userId,
    },
  });
  revalidatePath("/calendar");
}

export async function deleteEvent(formData: FormData) {
  await verifySession();
  const id = str(formData.get("id"));
  if (!id) return;
  await prisma.calendarEvent.delete({ where: { id } });
  revalidatePath("/calendar");
}
