import "server-only";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "./prisma";
import { hashKey } from "./apikey";
import { encryptSecret, decryptSecret } from "./secrets";
import { notify } from "./notifications";
import type { Priority } from "@/generated/prisma/client/enums";

// Voice notes: the iPhone Shortcut records → n8n transcribes (Groq Whisper) and
// extracts tasks / ideas / reminders → POSTs the result to
// /api/voice-notes/ingest. The audio never reaches the command center.
//
// Every user has one personal voice key. Their Shortcut sends it along (n8n
// forwards it), which is how an incoming transcription is tied to its owner —
// transcriptions are private to the person who recorded them.

// ── Voice keys ───────────────────────────────────────────────────────────────

const KEY_PREFIX = "gsdv_";

function newRawKey(): string {
  return KEY_PREFIX + crypto.randomBytes(24).toString("base64url");
}

// Create (or replace) the user's key. Replacing invalidates the old one at once,
// so a Shortcut still sending it starts getting 401s.
export async function regenerateVoiceKey(userId: string): Promise<string> {
  const raw = newRawKey();
  const data = { hashedKey: hashKey(raw), encryptedKey: encryptSecret(raw), lastUsedAt: null };
  await prisma.voiceKey.upsert({
    where: { userId },
    create: { userId, ...data },
    update: { ...data, createdAt: new Date() },
  });
  return raw;
}

// The user's key in plain text (for the Settings reveal/copy), or null if they
// haven't generated one yet.
export async function getVoiceKey(userId: string) {
  const row = await prisma.voiceKey.findUnique({ where: { userId } });
  if (!row) return null;
  return { raw: decryptSecret(row.encryptedKey), lastUsedAt: row.lastUsedAt, createdAt: row.createdAt };
}

// Resolve a raw key to its (active) owner's id, or null.
export async function resolveVoiceKey(raw: string | null | undefined): Promise<string | null> {
  if (!raw || !raw.startsWith(KEY_PREFIX)) return null;
  const row = await prisma.voiceKey.findUnique({
    where: { hashedKey: hashKey(raw.trim()) },
    select: { id: true, userId: true, user: { select: { isActive: true } } },
  });
  if (!row || !row.user.isActive) return null;
  await prisma.voiceKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } });
  return row.userId;
}

// ── Ingest payload ───────────────────────────────────────────────────────────
// Mirrors n8n's "Parse Note" output. Lenient on purpose: an LLM produced it, so
// a malformed item is dropped rather than failing the whole note.

const text = (max: number) =>
  z
    .unknown()
    .optional()
    .transform((v) => (typeof v === "string" ? v.trim().slice(0, max) : ""));

const nullableText = z
  .unknown()
  .optional()
  .transform((v) => (typeof v === "string" && v.trim() && v.trim() !== "null" ? v.trim() : null));

const taskItem = z.object({ title: text(300), due: nullableText, priority: nullableText });
const ideaItem = z.object({ idea: text(2000) });
const reminderItem = z.object({ text: text(300), datetime: nullableText });

// Keep only well-formed items with non-empty text.
function items<T extends z.ZodTypeAny>(schema: T, max: number) {
  return z
    .unknown()
    .optional()
    .transform((v) => {
      if (!Array.isArray(v)) return [] as z.output<T>[];
      return v
        .slice(0, max)
        .map((x) => schema.safeParse(x))
        .filter((r) => r.success)
        .map((r) => r.data as z.output<T>);
    });
}

export const ingestSchema = z.object({
  summary: text(1000),
  transcript: text(100_000),
  notes: text(10_000),
  tasks: items(taskItem, 50).transform((a) => a.filter((t) => t.title)),
  ideas: items(ideaItem, 50).transform((a) => a.filter((i) => i.idea)),
  reminders: items(reminderItem, 50).transform((a) => a.filter((r) => r.text)),
  source: text(40),
  received_at: nullableText,
  external_id: nullableText,
});

export type IngestPayload = z.output<typeof ingestSchema>;

function toPriority(p: string | null): Priority {
  switch (p?.toLowerCase()) {
    case "urgent":
      return "URGENT";
    case "high":
      return "HIGH";
    case "low":
      return "LOW";
    default:
      return "MEDIUM";
  }
}

function toDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s); // "YYYY-MM-DD" → UTC midnight, same as the app's date inputs
  return isNaN(d.getTime()) ? null : d;
}

const REMINDER_EVENT_MINUTES = 15;

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function countsLabel(c: { tasks: number; reminders: number; ideas: number }) {
  const parts = [
    c.tasks && plural(c.tasks, "task"),
    c.reminders && plural(c.reminders, "reminder"),
    c.ideas && plural(c.ideas, "idea"),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Nothing to action";
}

// Store the transcription and create everything it asked for, owned by and
// assigned to `userId`:
//   task                → Task in the inbox (no project)
//   reminder with time  → Task due then + Reminder (fires a notification) +
//                         REMINDER calendar event on the user's calendar
//   reminder, no time   → plain Task
//   idea                → Idea
export async function ingestVoiceNote(userId: string, p: IngestPayload) {
  if (p.external_id) {
    const existing = await prisma.voiceNote.findUnique({
      where: { externalId: p.external_id },
      select: { id: true, userId: true },
    });
    if (existing && existing.userId === userId) return { id: existing.id, deduped: true as const };
  }

  const receivedAt = toDate(p.received_at) ?? new Date();

  const result = await prisma.$transaction(async (tx) => {
    const note = await tx.voiceNote.create({
      data: {
        userId,
        source: p.source || "shortcut",
        // No summary from the model → the start of what was said.
        summary:
          p.summary ||
          (p.transcript.length > 140 ? `${p.transcript.slice(0, 137).trimEnd()}…` : p.transcript),
        transcript: p.transcript,
        notes: p.notes,
        tasks: p.tasks,
        ideas: p.ideas,
        reminders: p.reminders,
        externalId: p.external_id,
        receivedAt,
      },
    });

    const assign = { assignees: { create: { userId } } };
    let taskCount = 0;
    let reminderCount = 0;

    for (const t of p.tasks) {
      await tx.task.create({
        data: {
          title: t.title,
          priority: toPriority(t.priority),
          dueDate: toDate(t.due),
          createdById: userId,
          voiceNoteId: note.id,
          ...assign,
        },
      });
      taskCount++;
    }

    for (const r of p.reminders) {
      const at = toDate(r.datetime);
      const task = await tx.task.create({
        data: {
          title: r.text,
          dueDate: at,
          createdById: userId,
          voiceNoteId: note.id,
          ...assign,
        },
      });
      if (!at) {
        taskCount++;
        continue;
      }
      await tx.reminder.create({
        data: { taskId: task.id, userId, remindAt: at, createdById: userId, note: "From a voice note" },
      });
      await tx.calendarEvent.create({
        data: {
          title: r.text,
          type: "REMINDER",
          startAt: at,
          endAt: new Date(at.getTime() + REMINDER_EVENT_MINUTES * 60_000),
          taskId: task.id,
          voiceNoteId: note.id,
          createdById: userId,
          attendees: { create: { userId, status: "ACCEPTED" } },
        },
      });
      reminderCount++;
    }

    if (p.ideas.length) {
      await tx.idea.createMany({
        data: p.ideas.map((i) => ({ userId, text: i.idea, voiceNoteId: note.id })),
      });
    }

    return { id: note.id, tasks: taskCount, reminders: reminderCount, ideas: p.ideas.length };
  });

  // Side effects after commit — never fail the ingest because of them.
  try {
    await notify({
      userId,
      type: "VOICE_NOTE",
      title: "Voice note processed",
      body: `${countsLabel(result)}${p.summary ? ` — ${p.summary}` : ""}`,
      entityType: "voice_note",
      entityId: result.id,
      linkUrl: `/voice/${result.id}`,
    });
  } catch (err) {
    console.error("Voice note notify failed:", err);
  }

  return { ...result, deduped: false as const };
}
