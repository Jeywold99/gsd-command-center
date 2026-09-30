import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Check, Lightbulb, Mic, Trash2 } from "lucide-react";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getVoiceNote } from "@/lib/voice-notes";
import { countsLabel } from "@/lib/voice";
import { taskPath } from "@/lib/task-path";
import LocalTime from "../../_components/local-time";
import PriorityChip from "../../_components/priority-chip";
import CopyButton from "../_components/copy-button";
import { deleteVoiceNote } from "../actions";

const card = "rounded-[22px] border border-black/[0.07] bg-white";
const sectionTitle = "text-xs font-bold uppercase tracking-[0.12em] text-[#6B645D]";

export default async function VoiceNotePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  const { id } = await params;
  const note = await getVoiceNote(session.userId, id);
  if (!note) notFound();

  if (!note.isRead) {
    await prisma.voiceNote.update({ where: { id: note.id }, data: { isRead: true } });
  }

  const reminders = note.createdTasks.filter((t) => t.calendarEvents.length > 0);
  const tasks = note.createdTasks.filter((t) => t.calendarEvents.length === 0);
  const summary = countsLabel({
    tasks: tasks.length,
    reminders: reminders.length,
    ideas: note.createdIdeas.length,
  });

  return (
    <article className="flex flex-col gap-4 lg:rounded-[22px] lg:border lg:border-black/[0.07] lg:bg-white lg:p-7">
      {/* Phones: back to the list */}
      <Link
        href="/voice"
        className="-ml-1 inline-flex min-h-11 items-center gap-0.5 self-start text-[15px] font-semibold text-[#B34100] lg:hidden"
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
        Voice
      </Link>

      <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#6B645D]">
        <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-midnight px-2.5 py-1.5 text-white">
          <Mic className="w-3.5 h-3.5 text-[#FF7A33]" />
          Voice note
        </span>
        <LocalTime date={note.receivedAt} format="datetime" />
        <span>
          · via <span className="capitalize">{note.source}</span>
        </span>
      </div>

      <h1 className="text-[26px] font-bold leading-tight lg:text-[28px]">
        {note.summary || "Untitled voice note"}
      </h1>

      {note.createdTasks.length + note.createdIdeas.length > 0 && (
        <p className="flex items-center gap-2.5 rounded-2xl bg-[#DDF5EA] px-3.5 py-3 text-sm font-semibold text-[#0B5C3D]">
          <Check className="w-[18px] h-[18px] shrink-0" strokeWidth={2.4} />
          Added for you: {summary.toLowerCase()}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {tasks.length > 0 && (
          <section aria-labelledby="vn-tasks" className={`${card} px-4 py-1.5 lg:col-span-2`}>
            <h2 id="vn-tasks" className={`${sectionTitle} mt-2.5 mb-1`}>
              Tasks
            </h2>
            {tasks.map((t, i) => (
              <Link
                key={t.id}
                href={taskPath(t.id, t.projectId)}
                className={`flex min-h-16 items-center gap-3 ${i < tasks.length - 1 ? "border-b border-black/[0.06]" : ""}`}
              >
                <span
                  className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full ${
                    t.status === "DONE" ? "bg-success text-white" : "border-2 border-[#C9C1B8]"
                  }`}
                >
                  {t.status === "DONE" && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[15px] font-semibold ${t.status === "DONE" ? "text-[#6B645D] line-through" : ""}`}
                  >
                    {t.title}
                  </span>
                  <span className="block text-[13px] text-[#6B645D]">
                    {t.dueDate ? (
                      <>
                        Due{" "}
                        {new Date(t.dueDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        })}
                      </>
                    ) : (
                      "No date"
                    )}
                    {t.projectId ? "" : " · Inbox"}
                  </span>
                </span>
                <PriorityChip priority={t.priority} />
                <ChevronRight className="w-4 h-4 shrink-0 text-[#6B645D]" />
              </Link>
            ))}
          </section>
        )}

        {reminders.length > 0 && (
          <section aria-labelledby="vn-rem" className={`${card} px-4 pt-1.5 pb-3.5`}>
            <h2 id="vn-rem" className={`${sectionTitle} mt-2.5 mb-2`}>
              {reminders.length === 1 ? "Reminder" : "Reminders"}
            </h2>
            <div className="flex flex-col gap-3">
              {reminders.map((t) => {
                const at = t.calendarEvents[0].startAt;
                return (
                  <Link key={t.id} href={taskPath(t.id, t.projectId)} className="flex items-center gap-3">
                    <span className="flex h-14 w-[52px] shrink-0 flex-col items-center justify-center rounded-[14px] bg-brand-pale text-[#6E2800]">
                      <LocalTime date={at} format="date" className="text-[11px] font-bold uppercase" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">{t.title}</span>
                      <LocalTime date={at} format="datetime" className="block text-[13px] text-[#6B645D]" />
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0 text-[#6B645D]" />
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-[10px] bg-[#F1ECE6] px-2.5 py-1 text-xs font-semibold text-[#4F4943]">
                On your calendar
              </span>
              <span className="rounded-[10px] bg-[#F1ECE6] px-2.5 py-1 text-xs font-semibold text-[#4F4943]">
                Notifies you at that time
              </span>
            </div>
          </section>
        )}

        {note.createdIdeas.length > 0 && (
          <section aria-labelledby="vn-ideas" className={`${card} px-4 pt-1.5 pb-3.5`}>
            <h2 id="vn-ideas" className={`${sectionTitle} mt-2.5 mb-2`}>
              {note.createdIdeas.length === 1 ? "Idea" : "Ideas"}
            </h2>
            <div className="flex flex-col gap-3">
              {note.createdIdeas.map((idea) => (
                <Link key={idea.id} href="/ideas" className="flex items-center gap-3">
                  <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[13px] bg-brand-pale text-[#B34100]">
                    <Lightbulb className="w-[18px] h-[18px]" />
                  </span>
                  <span className="flex-1 text-[15px] font-semibold">{idea.text}</span>
                  <ChevronRight className="w-4 h-4 shrink-0 text-[#6B645D]" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {note.notes && (
        <section aria-labelledby="vn-notes" className={`${card} px-4 pt-1.5 pb-4`}>
          <h2 id="vn-notes" className={`${sectionTitle} mt-2.5 mb-2`}>
            Notes
          </h2>
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{note.notes}</p>
        </section>
      )}

      {note.transcript && (
        <section aria-labelledby="vn-tr" className="rounded-[22px] bg-midnight p-4 text-white lg:p-5">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 id="vn-tr" className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">
              Transcript
            </h2>
            <CopyButton
              text={note.transcript}
              className="inline-flex h-9 items-center gap-1.5 rounded-[11px] bg-white/[0.12] px-3 text-[13px] font-semibold hover:bg-white/20"
            />
          </div>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-white/[0.88]">{note.transcript}</p>
        </section>
      )}

      <form action={deleteVoiceNote} className="self-center">
        <input type="hidden" name="id" value={note.id} />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center gap-2 px-4 text-sm font-semibold text-[#B42318] hover:underline"
        >
          <Trash2 className="w-4 h-4" />
          Delete transcription
        </button>
        <p className="text-center text-xs text-[#6B645D]">Tasks, reminders and ideas it created are kept.</p>
      </form>
    </article>
  );
}
