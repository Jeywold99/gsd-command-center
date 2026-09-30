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
        className="inline-flex h-11 items-center gap-3 rounded-[14px] bg-midnight text-white pl-3.5 pr-1.5 transition-opacity disabled:opacity-60"
        title="Clock out"
      >
        <span className="w-2 h-2 rounded-full bg-success" aria-hidden />
        <span className="font-display text-[22px] leading-none tracking-wider tabular-nums">
          {clock(elapsed)}
        </span>
        <span className="inline-flex h-8 items-center gap-1.5 rounded-[10px] bg-brand px-3 text-[13px] font-bold text-ink">
          <Square className="w-3 h-3 fill-current" />
          Stop
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-black/[0.08] bg-white hover:border-brand/40 text-ink font-semibold px-4 text-sm transition-colors disabled:opacity-60"
      title="Clock in"
    >
      <Play className="w-4 h-4 text-brand fill-current" />
      Clock in
    </button>
  );
}
