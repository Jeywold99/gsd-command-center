"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import * as chrono from "chrono-node";
import { CalendarPlus, Check, SendHorizontal } from "lucide-react";
import { initials } from "../../projects/_components/task-badges";
import { addMessageToCalendar } from "../actions";

type User = { id: string; name: string };
type Msg = {
  id: string;
  content: string;
  createdAt: string | Date;
  sender: { id: string; name: string };
};

function time(d: string | Date) {
  return new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// datetime-local wants "YYYY-MM-DDTHH:mm" in LOCAL time.
function toLocalInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtDate(d: Date) {
  return d.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Message text with @mentions highlighted ──
function renderContent(content: string, mentionRegex: RegExp | null) {
  if (!mentionRegex) return content;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const m of content.matchAll(mentionRegex)) {
    const start = m.index ?? 0;
    if (start > last) nodes.push(content.slice(last, start));
    nodes.push(
      <span
        key={start}
        className="rounded bg-brand/12 px-1 font-semibold text-brand"
      >
        {m[0]}
      </span>,
    );
    last = start + m[0].length;
  }
  if (last < content.length) nodes.push(content.slice(last));
  return nodes;
}

// ── "Add to calendar" affordance for a message with a detected date ──
function MessageDateAction({ date, message }: { date: Date; message: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addMessageToCalendar, null);

  if (state?.ok) {
    return (
      <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-success">
        <Check className="h-3.5 w-3.5" />
        Added to calendar ·{" "}
        <Link href="/calendar" className="underline hover:text-success/80">
          View
        </Link>
      </span>
    );
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/5 px-2.5 py-1 text-[11px] font-semibold text-brand hover:bg-brand/10"
      >
        <CalendarPlus className="h-3.5 w-3.5" />
        {fmtDate(date)} · Add to calendar
      </button>

      {open && (
        <form
          action={formAction}
          className="mt-2 w-72 space-y-2 rounded-xl border border-black/10 bg-white p-3 shadow-lg"
        >
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-ink/50">
              Event title
            </label>
            <input
              name="title"
              required
              defaultValue={message.slice(0, 80)}
              className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-ink/50">
              When
            </label>
            <input
              type="datetime-local"
              name="start"
              required
              defaultValue={toLocalInput(date)}
              className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>
          <input
            type="hidden"
            name="description"
            value={`From chat: ${message.slice(0, 200)}`}
          />
          {state?.error && (
            <p className="text-[11px] text-red-600">{state.error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-[14px] bg-brand px-3 py-1.5 text-xs font-bold text-ink hover:bg-brand-hover disabled:opacity-60"
            >
              {pending ? "Adding…" : "Add event"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-ink/50 hover:bg-black/[0.04]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ChatRoom({
  channelId,
  channelName,
  initial,
  meId,
  users,
}: {
  channelId: string;
  channelName: string;
  initial: Msg[];
  meId: string;
  users: User[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [val, setVal] = useState("");
  const [connected, setConnected] = useState(false);
  // Active @mention autocomplete: null = closed.
  const [mention, setMention] = useState<{ query: string; index: number } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Regex that matches "@<member name>" for any current member (longest first).
  const mentionRegex = useMemo(() => {
    const names = users
      .map((u) => u.name)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex);
    if (names.length === 0) return null;
    return new RegExp(`@(${names.join("|")})`, "g");
  }, [users]);

  // Dates detected in each message → drives the "Add to calendar" chip.
  const detected = useMemo(() => {
    const map = new Map<string, Date>();
    for (const m of messages) {
      try {
        const results = chrono.parse(m.content, new Date(m.createdAt), {
          forwardDate: true,
        });
        if (results.length > 0) map.set(m.id, results[0].start.date());
      } catch {
        // ignore parse failures
      }
    }
    return map;
  }, [messages]);

  const filtered = mention
    ? users
        .filter((u) => u.name.toLowerCase().includes(mention.query.toLowerCase()))
        .slice(0, 6)
    : [];

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

  // Detect whether the caret is inside an "@query" token and open/close the menu.
  function syncMention(value: string, caret: number) {
    const before = value.slice(0, caret);
    const m = before.match(/(?:^|\s)@(\w*)$/);
    if (m) setMention({ query: m[1], index: 0 });
    else setMention(null);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVal(e.target.value);
    syncMention(e.target.value, e.target.selectionStart ?? e.target.value.length);
  }

  function pickMention(user: User) {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? val.length;
    const before = val.slice(0, caret);
    const after = val.slice(caret);
    const start = before.lastIndexOf("@");
    if (start < 0) return;
    const next = `${before.slice(0, start)}@${user.name} ${after}`;
    setVal(next);
    setMention(null);
    // Restore focus + caret after the inserted mention.
    const pos = start + user.name.length + 2; // "@" + name + trailing space
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mention && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMention({ ...mention, index: (mention.index + 1) % filtered.length });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMention({
          ...mention,
          index: (mention.index - 1 + filtered.length) % filtered.length,
        });
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pickMention(filtered[mention.index]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
  }

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const t = val.trim();
    if (!t || !socketRef.current) return;
    // Derive mentioned user ids from the message text itself.
    let mentions: string[] = [];
    if (mentionRegex) {
      const names = new Set([...t.matchAll(mentionRegex)].map((m) => m[1]));
      mentions = users.filter((u) => names.has(u.name)).map((u) => u.id);
    }
    socketRef.current.emit("message", { channelId, content: t, mentions });
    setVal("");
    setMention(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-5 py-3 border-b border-black/[0.07] flex items-center justify-between">
        <span className="text-[17px] font-bold text-ink">#{channelName}</span>
        <span className={`text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1.5 ${connected ? "text-success" : "text-black/30"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-success animate-pulse" : "bg-black/25"}`} />
          {connected ? "Live" : "Connecting…"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain bg-cream/50 px-3.5 py-4 space-y-3 lg:px-5">
        {messages.length === 0 ? (
          <p className="text-sm text-[#6B645D]">No messages yet. Say hi 👋</p>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender.id === meId;
            // Consecutive messages from the same person don't repeat the header.
            const grouped = i > 0 && messages[i - 1].sender.id === m.sender.id;
            return (
              <div key={m.id} className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""} ${grouped ? "-mt-1.5" : ""}`}>
                {!mine && (
                  <div
                    className={`w-8 h-8 rounded-full bg-midnight text-white text-[10px] font-bold flex items-center justify-center shrink-0 ${grouped ? "invisible" : ""}`}
                  >
                    {initials(m.sender.name)}
                  </div>
                )}
                <div className={`flex min-w-0 max-w-[80%] flex-col ${mine ? "items-end" : "items-start"}`}>
                  {!grouped && (
                    <div className="mb-1 flex items-baseline gap-2 px-1">
                      {!mine && <span className="text-[13px] font-bold text-ink">{m.sender.name}</span>}
                      <span className="text-[11px] text-[#6B645D]">{time(m.createdAt)}</span>
                    </div>
                  )}
                  <p
                    className={`whitespace-pre-wrap break-words rounded-[18px] px-3.5 py-2.5 text-[15px] leading-snug lg:text-sm ${
                      mine ? "rounded-tr-md bg-midnight text-white" : "rounded-tl-md border border-black/[0.06] bg-white text-ink"
                    }`}
                  >
                    {renderContent(m.content, mentionRegex)}
                  </p>
                  {detected.has(m.id) && (
                    <MessageDateAction date={detected.get(m.id)!} message={m.content} />
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="relative p-2.5 border-t border-black/[0.07] flex gap-2 bg-white">
        {/* @mention autocomplete */}
        {mention && filtered.length > 0 && (
          <div className="absolute bottom-full left-3 mb-1 w-64 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg">
            <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-ink/40">
              Mention
            </p>
            {filtered.map((u, i) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus in the input
                  pickMention(u);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  i === mention.index ? "bg-brand/10 text-ink" : "text-ink/70 hover:bg-cream"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-midnight text-[9px] font-bold text-white">
                  {initials(u.name)}
                </span>
                {u.name}
              </button>
            ))}
          </div>
        )}

        <input
          ref={inputRef}
          value={val}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={`Message #${channelName}  —  @ to mention`}
          aria-label={`Message #${channelName}`}
          className="min-w-0 flex-1 h-11 bg-cream border border-black/10 rounded-[14px] px-4 text-sm text-ink placeholder:text-[#8A827A] focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          aria-label="Send"
          className="flex h-11 items-center gap-1.5 bg-brand hover:bg-brand-hover text-ink font-bold text-sm px-4 rounded-[14px] transition-colors"
        >
          <SendHorizontal className="w-[18px] h-[18px]" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}
