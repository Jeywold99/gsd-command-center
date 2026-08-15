"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markThreadRead } from "../actions";

// Fire-and-forget: when a thread is opened with unread inbound mail, mark it
// read. Runs once per (threadId) mount; refreshes so the list dot clears.
export default function MarkThreadRead({
  threadId,
  hasUnread,
}: {
  threadId: string;
  hasUnread: boolean;
}) {
  const router = useRouter();
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!hasUnread || done.current === threadId) return;
    done.current = threadId;
    markThreadRead(threadId).then(() => router.refresh());
  }, [threadId, hasUnread, router]);

  return null;
}
