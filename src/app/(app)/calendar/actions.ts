"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { notifyMany } from "@/lib/notifications";
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

  // Whoever creates it is always along for the ride; anyone else checked in
  // the participant list gets added too — this is what makes the event show
  // up on their calendar.
  const attendeeIds = [
    ...new Set(formData.getAll("attendeeIds").map(String).filter(Boolean)),
  ];
  if (!attendeeIds.includes(session.userId)) attendeeIds.push(session.userId);

  const event = await prisma.calendarEvent.create({
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
      attendees: { create: attendeeIds.map((userId) => ({ userId })) },
    },
  });

  // Notify the invited participants — not the whole team, just who's on it.
  const notifyIds = attendeeIds.filter((id) => id !== session.userId);
  if (notifyIds.length) {
    await notifyMany(notifyIds, {
      type: "EVENT_CREATED",
      title: "You were added to an event",
      body: `${event.title} · ${startAt.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`,
      entityType: "event",
      entityId: event.id,
      linkUrl: "/calendar",
    });
  }

  revalidatePath("/calendar");
}

export async function updateEvent(formData: FormData) {
  await verifySession();
  const id = str(formData.get("id"));
  const title = str(formData.get("title"));
  const startStr = str(formData.get("start"));
  if (!id || !title || !startStr) return;

  const startAt = new Date(startStr);
  if (isNaN(startAt.getTime())) return;
  const endStr = str(formData.get("end"));
  const endAt = endStr ? new Date(endStr) : null;

  const existing = await prisma.calendarAttendee.findMany({
    where: { eventId: id },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((a) => a.userId));

  const event = await prisma.calendarEvent.update({
    where: { id },
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
    },
    select: { createdById: true },
  });

  // Replace the full participant set — the organizer always stays on,
  // regardless of whether their own checkbox got unchecked by mistake.
  const attendeeIds = [
    ...new Set(formData.getAll("attendeeIds").map(String).filter(Boolean)),
  ];
  if (!attendeeIds.includes(event.createdById)) attendeeIds.push(event.createdById);

  await prisma.$transaction([
    prisma.calendarAttendee.deleteMany({ where: { eventId: id } }),
    prisma.calendarAttendee.createMany({
      data: attendeeIds.map((userId) => ({ eventId: id, userId })),
      skipDuplicates: true,
    }),
  ]);

  const newlyAdded = attendeeIds.filter((uid) => !existingIds.has(uid));
  if (newlyAdded.length) {
    await notifyMany(newlyAdded, {
      type: "EVENT_CREATED",
      title: "You were added to an event",
      body: `${title} · ${startAt.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`,
      entityType: "event",
      entityId: id,
      linkUrl: "/calendar",
    });
  }

  revalidatePath("/calendar");
}

export async function deleteEvent(formData: FormData) {
  await verifySession();
  const id = str(formData.get("id"));
  if (!id) return;
  await prisma.calendarEvent.delete({ where: { id } });
  revalidatePath("/calendar");
}
