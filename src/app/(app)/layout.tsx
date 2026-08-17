import { getCurrentUser } from "@/lib/dal";
import { listNotifications, countUnread } from "@/lib/notifications";
import { getRunningEntry } from "@/lib/time";
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
  // the clock-in button needs any currently-running time entry.
  const [notifications, unreadCount, running] = user
    ? await Promise.all([
        listNotifications(user.id),
        countUnread(user.id),
        getRunningEntry(user.id),
      ])
    : [[], 0, null];

  return (
    <AppShell
      user={{
        name: user?.name ?? "there",
        email: user?.email ?? "",
        role: user?.role ?? "STAFF",
      }}
      notifications={notifications}
      unreadCount={unreadCount}
      running={running ? { startedAt: running.startedAt } : null}
    >
      {children}
    </AppShell>
  );
}
