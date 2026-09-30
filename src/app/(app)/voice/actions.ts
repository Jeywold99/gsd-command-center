"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { str } from "@/lib/forms";

// Deletes the transcription only. The tasks, calendar events and ideas it
// created are real items the user may be working on, so they stay (their link
// back to the note is cleared by the FK's ON DELETE SET NULL).
export async function deleteVoiceNote(formData: FormData) {
  const session = await verifySession();
  const id = str(formData.get("id"));
  if (!id) return;
  await prisma.voiceNote.deleteMany({ where: { id, userId: session.userId } });
  revalidatePath("/voice");
  redirect("/voice");
}

export async function markAllVoiceNotesRead() {
  const session = await verifySession();
  await prisma.voiceNote.updateMany({
    where: { userId: session.userId, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/voice");
}
