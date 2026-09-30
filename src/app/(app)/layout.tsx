import { getCurrentUser } from "@/lib/dal";
import { listNotifications, countUnread } from "@/lib/notifications";
import { getRunningEntry } from "@/lib/time";
import { countUnreadVoiceNotes } from "@/lib/voice-notes";
import AppShell from "./_components/app-shell";

// Wraps every authenticated feature route with the GSD shell.
// getCurrentUser() runs the secure DAL check (redirects to /login if no session)
// and provides the user for the sidebar/top bar. Individual pages still verify
// again when they touch data (proxy + layout + page = defense in depth).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // The notification bell reads the current user's recent items + unread count;
  // the clock-in button needs any currently-running time entry; the sidebar
  // badges unread voice notes.
  const [notifications, unreadCount, running, voiceUnread] = user
    ? await Promise.all([
        listNotifications(user.id),
        countUnread(user.id),
        getRunningEntry(user.id),
        countUnreadVoiceNotes(user.id),
      ])
    : [[], 0, null, 0];

  return (
    <AppShell
      user={{
        name: user?.name ?? "there",
        email: user?.email ?? "",
        role: user?.role ?? "STAFF",
        avatarUrl: user?.avatarUrl ?? null,
      }}
      notifications={notifications}
      unreadCount={unreadCount}
      voiceUnread={voiceUnread}
      running={running ? { startedAt: running.startedAt } : null}
    >
      {children}
    </AppShell>
  );
}
