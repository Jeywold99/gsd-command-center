import "server-only";

// Best-effort live delivery of notifications. The DB row is the source of truth
// (the bell reads it on load); this just POSTs to the standalone socket server so
// it can relay the notification to the user's personal room and the bell updates
// instantly — no navigation needed. Failures never break the triggering action.

export type LiveNotification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  createdAt: Date;
};

export async function emitNotifications(rows: LiveNotification[]): Promise<void> {
  if (rows.length === 0) return;
  // Reachable from the Next server process; the socket server shares SESSION_SECRET.
  const url = process.env.SOCKET_INTERNAL_URL || "http://localhost:3001";
  const secret = process.env.SESSION_SECRET || "";
  try {
    await fetch(`${url}/internal/emit`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({
        events: rows.map((r) => ({
          userId: r.userId,
          notification: {
            id: r.id,
            type: r.type,
            title: r.title,
            body: r.body,
            linkUrl: r.linkUrl,
            isRead: false,
            createdAt: r.createdAt,
          },
        })),
      }),
      // Don't let a slow/unreachable socket server hold up the request.
      signal: AbortSignal.timeout(2000),
    });
  } catch (err) {
    console.error("emitNotifications failed:", err);
  }
}
