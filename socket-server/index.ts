import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { jwtVerify } from "jose";
import { PrismaClient } from "../src/generated/prisma/client/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Standalone real-time chat server (separate process from Next.js).
// Auth: reads the httpOnly session cookie from the handshake and verifies the
// JWT with the same SESSION_SECRET the Next app uses.

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
const key = new TextEncoder().encode(process.env.SESSION_SECRET);
const PORT = Number(process.env.SOCKET_PORT || 3001);
const ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const COOKIE = "gsd_session";

function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

async function userIdFromCookie(header?: string): Promise<string | null> {
  const token = parseCookie(header, COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return (payload.userId as string) ?? null;
  } catch {
    return null;
  }
}

// Shared secret so the Next server process can ask us to relay a notification
// live (project/event/task created, etc.). Reuses SESSION_SECRET — both
// processes already share it — so no extra env config is needed.
const INTERNAL_SECRET = process.env.SESSION_SECRET || "";

const httpServer = createServer((req, res) => {
  // Internal relay: Next persists the notification, then POSTs it here so we can
  // push it into the recipient's personal room. Body: { events: [{ userId, notification }] }.
  if (req.method === "POST" && req.url === "/internal/emit") {
    if (!INTERNAL_SECRET || req.headers["x-internal-secret"] !== INTERNAL_SECRET) {
      res.writeHead(401);
      res.end("unauthorized");
      return;
    }
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { events } = JSON.parse(body || "{}");
        if (Array.isArray(events)) {
          for (const ev of events) {
            if (ev?.userId && ev?.notification) {
              io.to(`user:${ev.userId}`).emit("notification", ev.notification);
            }
          }
        }
        res.writeHead(200);
        res.end("ok");
      } catch {
        res.writeHead(400);
        res.end("bad request");
      }
    });
    return;
  }
  res.writeHead(200);
  res.end("GSD chat socket server");
});

const io = new Server(httpServer, {
  cors: { origin: ORIGIN, credentials: true },
});

io.use(async (socket, next) => {
  const userId = await userIdFromCookie(socket.handshake.headers.cookie);
  if (!userId) return next(new Error("unauthorized"));
  socket.data.userId = userId;
  next();
});

io.on("connection", (socket) => {
  // Every connection joins a personal room so we can push notifications to a
  // specific user wherever they are in the app (the bell listens app-wide).
  const uid = socket.data.userId as string;
  if (uid) socket.join(`user:${uid}`);

  socket.on("join", (channelId: string) => {
    if (channelId) socket.join(`ch:${channelId}`);
  });
  socket.on("leave", (channelId: string) => {
    if (channelId) socket.leave(`ch:${channelId}`);
  });
  socket.on(
    "message",
    async (payload: { channelId?: string; content?: string; mentions?: string[] }) => {
      const channelId = payload?.channelId;
      const content = payload?.content?.trim();
      if (!channelId || !content) return;
      const senderId = socket.data.userId as string;
      try {
        const msg = await prisma.message.create({
          data: { channelId, senderId, content },
          include: { sender: { select: { id: true, name: true } } },
        });
        io.to(`ch:${channelId}`).emit("message", {
          id: msg.id,
          channelId,
          content: msg.content,
          createdAt: msg.createdAt,
          sender: msg.sender,
        });

        // Notifications:
        //  · mentioned teammates get a stronger "mentioned you" MENTION,
        //  · every other active teammate gets a CHANNEL_MESSAGE.
        // Never notify the sender. Each row is persisted, then pushed live to
        // that user's room so the bell updates instantly (no navigation needed).
        try {
          const mentioned = new Set(
            (payload.mentions ?? []).filter((id) => id && id !== senderId),
          );
          const channel = await prisma.channel.findUnique({
            where: { id: channelId },
            select: { name: true },
          });
          const channelName = channel?.name ?? "a channel";
          const body = content.slice(0, 140);
          const linkUrl = `/chat?channel=${channelId}`;

          const recipients = await prisma.user.findMany({
            where: { isActive: true, id: { not: senderId } },
            select: { id: true },
          });

          for (const { id: userId } of recipients) {
            const isMention = mentioned.has(userId);
            const notif = await prisma.notification.create({
              data: {
                userId,
                type: isMention ? "MENTION" : "CHANNEL_MESSAGE",
                title: isMention
                  ? `${msg.sender.name} mentioned you in #${channelName}`
                  : `${msg.sender.name} posted in #${channelName}`,
                body,
                entityType: "channel",
                entityId: channelId,
                linkUrl,
              },
            });
            io.to(`user:${userId}`).emit("notification", {
              id: notif.id,
              type: notif.type,
              title: notif.title,
              body: notif.body,
              linkUrl: notif.linkUrl,
              isRead: false,
              createdAt: notif.createdAt,
            });
          }
        } catch (err) {
          console.error("chat notify failed", err);
        }
      } catch (err) {
        console.error("message persist failed", err);
      }
    },
  );
});

httpServer.listen(PORT, () => {
  console.log(`GSD Socket.IO server listening on :${PORT} (origin ${ORIGIN})`);
});
