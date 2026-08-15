import { getCurrentUser } from "@/lib/dal";
import { listNotifications, countUnread } from "@/lib/notifications";
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

  // The notification bell reads the current user's recent items + unread count.
  const [notifications, unreadCount] = user
    ? await Promise.all([listNotifications(user.id), countUnread(user.id)])
    : [[], 0];

  return (
    <AppShell
      user={{
        name: user?.name ?? "there",
        email: user?.email ?? "",
        role: user?.role ?? "STAFF",
      }}
      notifications={notifications}
      unreadCount={unreadCount}
    >
      {children}
    </AppShell>
  );
}
