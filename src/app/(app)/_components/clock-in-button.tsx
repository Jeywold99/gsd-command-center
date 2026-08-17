"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Square } from "lucide-react";
import { clockIn, stopTimer } from "../time/actions";

function clock(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Clock in / out from the top nav. Not project- or task-bound — it just tracks
// timed work. `running.startedAt` is the current entry's start (null when idle).
export default function ClockInButton({
  running,
}: {
  running: { startedAt: string | Date } | null;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!running) return;
    const start = new Date(running.startedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [running]);

  const toggle = () => {
    startTransition(async () => {
      if (running) await stopTimer();
      else await clockIn();
      router.refresh();
    });
  };

  if (running) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-full bg-brand/10 hover:bg-brand/15 text-brand font-bold pl-2.5 pr-3 py-1.5 text-sm transition-colors disabled:opacity-60"
        title="Clock out"
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white">
          <Square className="w-3 h-3" />
        </span>
        <span className="tabular-nums">{clock(elapsed)}</span>
        <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-wide">
          Clock out
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-full border border-black/10 hover:border-brand/40 hover:bg-brand-pale text-ink/70 hover:text-brand font-bold px-3 py-1.5 text-sm transition-colors disabled:opacity-60"
      title="Clock in"
    >
      <Play className="w-4 h-4" />
      <span className="hidden sm:inline text-[11px] font-bold uppercase tracking-wide">
        Clock in
      </span>
    </button>
  );
}
