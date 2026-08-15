"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { initials } from "../../projects/_components/task-badges";

type Msg = {
  id: string;
  content: string;
  createdAt: string | Date;
  sender: { id: string; name: string };
};

function time(d: string | Date) {
  return new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function ChatRoom({
  channelId,
  channelName,
  initial,
  meId,
}: {
  channelId: string;
  channelName: string;
  initial: Msg[];
  meId: string;
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [val, setVal] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    const s = io(url, { withCredentials: true });
    socketRef.current = s;
    s.on("connect", () => {
      setConnected(true);
      s.emit("join", channelId);
    });
    s.on("disconnect", () => setConnected(false));
    s.on("message", (m: Msg & { channelId: string }) => {
      if (m.channelId !== channelId) return;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    });
    return () => {
      s.emit("leave", channelId);
      s.disconnect();
    };
  }, [channelId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const t = val.trim();
    if (!t || !socketRef.current) return;
    socketRef.current.emit("message", { channelId, content: t });
    setVal("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-black/[0.07] flex items-center justify-between">
        <span className="font-display text-xl tracking-wide text-ink">#{channelName}</span>
        <span className={`text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1.5 ${connected ? "text-success" : "text-black/30"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success animate-pulse" : "bg-black/25"}`} />
          {connected ? "Live" : "Connecting…"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-black/40">No messages yet. Say hi 👋</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex gap-2.5">
              <div className={`w-8 h-8 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${m.sender.id === meId ? "bg-brand text-white" : "bg-midnight text-white"}`}>
                {initials(m.sender.name)}
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-ink">{m.sender.name}</span>
                  <span className="text-[11px] text-black/35">{time(m.createdAt)}</span>
                </div>
                <p className="text-sm text-ink/90 whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="p-3 border-t border-black/[0.07] flex gap-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={`Message #${channelName}`}
          className="flex-1 bg-cream border border-black/10 rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-black/35 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          className="bg-brand hover:bg-brand-hover text-white font-bold uppercase tracking-wide text-sm px-5 rounded-full transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
