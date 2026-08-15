"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "../notifications/actions";

// Kept in sync with `NotificationItem` in @/lib/notifications, but declared
// locally so this client component never imports the server-only module.
type Item = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: Date;
};

function relativeTime(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: Item[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        panelRef.current?.contains(t) ||
        buttonRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  function handleClickItem(item: Item) {
    setOpen(false);
    startTransition(async () => {
      if (!item.isRead) await markNotificationRead(item.id);
      if (item.linkUrl) router.push(item.linkUrl);
      else router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full text-ink/60 hover:text-ink hover:bg-black/[0.04] transition"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold leading-4 text-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-black/[0.08] z-50 overflow-hidden"
          role="menu"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.06]">
            <p className="font-display text-lg tracking-wide text-ink">
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={isPending}
                className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover disabled:opacity-50"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 mx-auto text-black/15" />
                <p className="mt-2 text-sm text-black/45">
                  You&apos;re all caught up.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-black/[0.05]">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClickItem(n)}
                      className={`w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-black/[0.03] ${
                        n.isRead ? "" : "bg-brand/[0.04]"
                      }`}
                    >
                      <span
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                          n.isRead ? "bg-transparent" : "bg-brand"
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink truncate">
                          {n.title}
                        </span>
                        {n.body && (
                          <span className="block text-xs text-black/55 line-clamp-2">
                            {n.body}
                          </span>
                        )}
                        <span className="block mt-0.5 text-[11px] text-black/40">
                          {relativeTime(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
