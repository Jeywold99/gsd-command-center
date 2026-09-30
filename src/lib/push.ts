import "server-only";
import webpush from "web-push";
import { prisma } from "./prisma";

// Web Push to installed PWAs (iPhone Home Screen app, desktop Chrome/Edge).
// Every in-app notification is mirrored here (see lib/notifications.ts), so a
// processed voice note, a reminder or a new assignment reaches the phone even
// when the app is closed.
//
// Needs VAPID keys (generate once: `npx web-push generate-vapid-keys`):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@domain)
// Without them push is simply off; in-app notifications still work.

let configured: boolean | null = null;

export function pushPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@localhost", pub, priv);
  return (configured = true);
}

export type PushPayload = { title: string; body?: string | null; url?: string | null };

// Best-effort: never throws. Subscriptions the push service reports as gone
// (404/410 — app uninstalled, permission revoked) are deleted.
export async function sendPush(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0 || !ensureConfigured()) return;
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
    const body = JSON.stringify({ title: payload.title, body: payload.body ?? "", url: payload.url ?? "/" });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: 60 * 60 * 24 },
          );
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) {
            await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          } else {
            console.error("push send failed:", code ?? err);
          }
        }
      }),
    );
  } catch (err) {
    console.error("sendPush failed:", err);
  }
}
