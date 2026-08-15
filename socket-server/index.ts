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

const httpServer = createServer((_req, res) => {
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
  socket.on("join", (channelId: string) => {
    if (channelId) socket.join(`ch:${channelId}`);
  });
  socket.on("leave", (channelId: string) => {
    if (channelId) socket.leave(`ch:${channelId}`);
  });
  socket.on("message", async (payload: { channelId?: string; content?: string }) => {
    const channelId = payload?.channelId;
    const content = payload?.content?.trim();
    if (!channelId || !content) return;
    try {
      const msg = await prisma.message.create({
        data: { channelId, senderId: socket.data.userId, content },
        include: { sender: { select: { id: true, name: true } } },
      });
      io.to(`ch:${channelId}`).emit("message", {
        id: msg.id,
        channelId,
        content: msg.content,
        createdAt: msg.createdAt,
        sender: msg.sender,
      });
    } catch (err) {
      console.error("message persist failed", err);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`GSD Socket.IO server listening on :${PORT} (origin ${ORIGIN})`);
});
