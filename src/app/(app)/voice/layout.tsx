import { verifySession } from "@/lib/dal";
import { listVoiceNotes } from "@/lib/voice-notes";
import VoiceSplit from "./_components/voice-split";

// Voice notes: list + detail. On desktop both panes show side by side; on
// phones the list is /voice and the detail is its own screen.
export default async function VoiceLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  const notes = await listVoiceNotes(session.userId);
  const rows = notes.map((n) => ({
    id: n.id,
    summary: n.summary,
    source: n.source,
    isRead: n.isRead,
    receivedAt: n.receivedAt,
    // Reminder tasks each have their REMINDER event; count them separately.
    tasks: n._count.createdTasks - n._count.createdEvents,
    reminders: n._count.createdEvents,
    ideas: n._count.createdIdeas,
  }));
  return <VoiceSplit rows={rows}>{children}</VoiceSplit>;
}
